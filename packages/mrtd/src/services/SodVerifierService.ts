import { Hasher, inject, injectable, InjectionSymbols, TypedArrayEncoder, type Logger } from '@credo-ts/core'
import { X509Certificate, X509ChainBuilder } from '@peculiar/x509'
import { fromBER, Sequence, OctetString, ObjectIdentifier, Integer } from 'asn1js'
import { Certificate, ContentInfo, SignedData } from 'pkijs'

import { SodVerification } from '../models/SodVerification'

import { CscaMasterListService } from './CscaMasterListService'

/**
 * Utility class to verify SOD (EF.SOD) authenticity and integrity.
 * Requires CSCA trust anchors loaded from MasterListService.
 */
@injectable()
export class SodVerifierService {
  private trustAnchors: X509Certificate[]
  private logger: Logger

  /**
   * @param trustAnchors List of X509 CSCA certificates for signature verification.
   */
  public constructor(
    @inject(CscaMasterListService) private readonly mlService: CscaMasterListService,
    @inject(InjectionSymbols.Logger) logger: Logger,
  ) {
    this.logger = logger
    this.trustAnchors = []
  }

  /**
   * Verifies authenticity and integrity of the SOD.
   * @param sodBuffer Buffer containing DER-encoded EF.SOD
   * @param dataGroups Record<string, Buffer> mapping DGx filenames (e.g. 'DG1') to their raw data
   * @returns Object with authenticity and integrity flags, and optional error.
   */
  public async verifySod(sodBuffer: Buffer, dataGroups: Record<string, Buffer>): Promise<SodVerification> {
    try {
      await this.mlService.initialize()

      this.trustAnchors = this.mlService.getTrustAnchors()

      if (this.trustAnchors.length === 0) {
        this.logger.warn(
          '[SodVerifierService] verifySod - No CSCA trust anchors loaded. Please initialize CscaMasterListService first.',
        )
        return { authenticity: false, integrity: false, details: 'No CSCA trust anchors loaded' }
      }

      this.logger.info('[SodVerifierService] verifySod - Step 1: Extracting DER from TLV (if present)')
      sodBuffer = this.extractDerFromTlv(sodBuffer)

      this.logger.info('[SodVerifierService] verifySod - Step 2: Decoding ASN.1 structure from SOD buffer')
      const sodAsn1 = fromBER(sodBuffer.buffer.slice(sodBuffer.byteOffset, sodBuffer.byteOffset + sodBuffer.byteLength))
      this.logger.debug('[SodVerifierService] verifySod - ASN.1 decoding result...')
      if (sodAsn1.offset === -1) throw new Error('Invalid ASN.1 structure in SOD')

      this.logger.info('[SodVerifierService] verifySod - Step 3: Parsing CMS/PKCS7 content')
      const cms = new ContentInfo({ schema: sodAsn1.result })
      const signedData = new SignedData({ schema: cms.content })
      this.logger.debug(`[SodVerifierService] verifySod - SignedData ${JSON.stringify(signedData, null, 2)}`)

      this.logger.info('[SodVerifierService] verifySod - Step 4: Extracting encapsulated LDS Security Object')

      const ldsContent = signedData.encapContentInfo.eContent?.valueBlock.valueHex
      if (!ldsContent) {
        throw new Error('Invalid LDS content in SOD')
      }
      const ldsASN1 = fromBER(ldsContent)
      if (ldsASN1.offset === -1) throw new Error('Invalid LDS ASN.1 in SOD content')

      this.logger.info('[SodVerifierService] verifySod - Step 5: Parsing LDS SEQUENCE')
      const sodSeq = ldsASN1.result as Sequence
      const hashAlgorithmSeq = sodSeq.valueBlock.value[1] as Sequence
      const hashAlgorithmOid = (hashAlgorithmSeq.valueBlock.value[0] as ObjectIdentifier).valueBlock.toString()
      const hashAlgorithm = this.oidToHashAlgo(hashAlgorithmOid)

      this.logger.info(
        `[SodVerifierService] verifySod - Step 5: Digest algorithm OID: ${hashAlgorithmOid} => ${hashAlgorithm}`,
      )

      this.logger.info('[SodVerifierService] verifySod - Step 6: Extracting Data Group hashes')
      const dgHashesSeq = sodSeq.valueBlock.value[2] as Sequence
      const dgHashMap: Record<string, Buffer> = {}
      for (const dgHashEntry of dgHashesSeq.valueBlock.value) {
        const entrySeq = dgHashEntry as Sequence

        // Validate and extract the DG number safely
        const dgNumberObj = entrySeq.valueBlock.value[0]
        if (!(dgNumberObj instanceof Integer)) {
          throw new Error('DG number is not Integer')
        }
        const dgNumber = dgNumberObj.valueBlock.valueDec as number

        // Validate and extract the DG hash safely
        const dgHashObj = entrySeq.valueBlock.value[1]
        if (!(dgHashObj instanceof OctetString)) {
          throw new Error('DG hash is not OctetString')
        }
        const dgHash = dgHashObj.valueBlock.valueHex as ArrayBuffer

        dgHashMap[`DG${dgNumber}`] = Buffer.from(dgHash)
        this.logger.info(
          `[SodVerifierService] verifySod - Step 6: Found hash for DG${dgNumber}: ${Buffer.from(dgHash).toString('hex').slice(0, 16)}...`,
        )
      }

      this.logger.info('[SodVerifierService] verifySod - Step 7: Verifying DataGroup integrity')
      let integrity = true
      for (const dgName in dgHashMap) {
        if (dataGroups[dgName]) {
          // Always check and remove TLV for every DG before hashing
          const cleanDataGroup = this.extractDerFromTlv(dataGroups[dgName])
          const computed = Hasher.hash(cleanDataGroup, hashAlgorithm)
          const matches = Buffer.compare(computed, dgHashMap[dgName]) === 0

          this.logger.info(
            `[SodVerifierService] verifySod - Step 7: Integrity check for ${dgName}: ${matches ? 'OK' : 'FAIL'}`,
          )
          if (!matches) {
            const expectedHex = dgHashMap[dgName].toString('hex')
            const actualHex = TypedArrayEncoder.toHex(computed)
            this.logger.warn(`[SodVerifierService] verifySod - [FAIL] Hash mismatch for ${dgName}:`)
            this.logger.warn(`[SodVerifierService] verifySod -   Expected (from SOD): ${expectedHex}`)
            this.logger.warn(`[SodVerifierService] verifySod -   Actual  (computed): ${actualHex}`)
            integrity = false
          }
        } else {
          this.logger.warn(
            `[SodVerifierService] verifySod - DataGroup ${dgName} missing from input. Skipping integrity check.`,
          )
        }
      }

      // Step 8: Authenticity verification using X509ChainBuilder (ICAO trust chain)
      this.logger.info('[SodVerifierService] verifySod - Step 8: Authenticity verification (DSC signature)')

      const sodSignerCerts = signedData.certificates as Certificate[]
      const signerInfo = signedData.signerInfos[0]

      // Try to find the Document Signer Certificate (DSC) using SID (issuer+serial)
      // ICAO fallback: if not found but only one certificate is present, use it
      let docSignerCert: Certificate | undefined = undefined
      if (Array.isArray(sodSignerCerts)) {
        docSignerCert = sodSignerCerts.find(
          (cert) =>
            cert &&
            cert.issuer &&
            cert.serialNumber &&
            signerInfo.sid &&
            signerInfo.sid.issuer &&
            signerInfo.sid.serialNumber &&
            typeof cert.issuer.isEqual === 'function' &&
            typeof cert.serialNumber.isEqual === 'function' &&
            cert.issuer.isEqual(signerInfo.sid.issuer) &&
            cert.serialNumber.isEqual(signerInfo.sid.serialNumber),
        )
      }
      if (!docSignerCert && sodSignerCerts && sodSignerCerts.length === 1) {
        docSignerCert = sodSignerCerts[0]
        this.logger.warn(
          '[SodVerifierService] verifySod - No SID match for document signer, but only one certificate present. Using as self-signed (ICAO fallback).',
        )
      }
      if (!docSignerCert) {
        this.logger.error(
          '[SodVerifierService] verifySod - No matching document signer certificate found in SOD. Certificates:',
          sodSignerCerts,
        )
        throw new Error('No matching document signer certificate found in SOD')
      }
      this.logger.info('[SodVerifierService] verifySod - Document signer certificate selected for chain verification.')

      const docSignerX509 = new X509Certificate(Buffer.from(docSignerCert.toSchema().toBER(false)))
      const chainBuilder = new X509ChainBuilder({ certificates: this.trustAnchors })

      let authenticity = false
      try {
        const chain = await chainBuilder.build(docSignerX509)
        if (chain && chain.length > 0) {
          authenticity = true
          this.logger.info(
            `[SodVerifierService] verifySod - Authenticity verified: Document signer is trusted by a CSCA (chain length: ${chain.length})`,
          )
        } else {
          this.logger.warn(
            '[SodVerifierService] verifySod - Authenticity verification FAILED: No valid trust chain found for DSC.',
          )
        }
      } catch (error) {
        this.logger.error(
          '[SodVerifierService] verifySod - Authenticity chain validation error: ' +
            (error instanceof Error ? error.message : String(error)),
        )
      }

      this.logger.info('[SodVerifierService] verifySod - Step 9: Verification finished')
      return { authenticity, integrity }
    } catch (error) {
      this.logger.error(
        '[SodVerifierService] verifySod - Verification failed: ' +
          (error instanceof Error ? error.message : String(error)),
      )
      return {
        authenticity: false,
        integrity: false,
        details: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Helper to map OID string to Node.js hash algorithm.
   * @param oid Algorithm OID string
   * @returns Node.js hash algorithm string
   */
  private oidToHashAlgo(oid: string): string {
    switch (oid) {
      case '2.16.840.1.101.3.4.2.1':
        return 'sha-256'
      case '2.16.840.1.101.3.4.2.3':
        return 'sha-512'
      case '1.3.14.3.2.26':
        return 'sha-1'
      default:
        throw new Error(`[SodVerifierService] oidToHashAlgo - Unsupported hash algorithm OID: ${oid}`)
    }
  }

  /**
   * Extracts DER content from a TLV-wrapped EF.SOD buffer if present.
   * If the buffer is already DER, returns it unchanged.
   * @param sodBuffer The buffer to check and extract from.
   * @returns Buffer containing the DER SOD.
   */
  private extractDerFromTlv(sodBuffer: Buffer): Buffer {
    try {
      // Typical TLV for EF.SOD starts with 0x77
      if (sodBuffer.length > 4 && sodBuffer[0] === 0x77) {
        // Read the length (could be 2 or more bytes)
        let length = sodBuffer[1]
        let offset = 2
        if (length & 0x80) {
          // Long form length
          const lenBytes = length & 0x7f
          length = 0
          for (let i = 0; i < lenBytes; i++) {
            length = (length << 8) | sodBuffer[offset]
            offset++
          }
        }
        // Check bounds before slicing
        if (offset + length > sodBuffer.length) {
          this.logger.error('[SodVerifierService] extractDerFromTlv - Extracted length exceeds buffer size.')
          throw new Error('Corrupted TLV: extracted length out of bounds.')
        }
        this.logger.info('[SodVerifierService] extractDerFromTlv - TLV header detected, extracting DER portion.')
        return sodBuffer.slice(offset, offset + length)
      }
      // Already DER format, no extraction needed
      this.logger.info('[SodVerifierService] extractDerFromTlv - Buffer is already in DER format.')
      return sodBuffer
    } catch (error) {
      this.logger.error(
        '[SodVerifierService] extractDerFromTlv - Failed to extract DER from TLV: ' +
          (error instanceof Error ? error.message : String(error)),
      )
      throw new Error('Failed to extract DER from TLV: ' + (error instanceof Error ? error.message : String(error)))
    }
  }
}
