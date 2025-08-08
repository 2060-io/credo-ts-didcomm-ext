import { fromBER, Sequence, Set } from 'asn1js'
import { ContentInfo, SignedData, Certificate } from 'pkijs'
import { X509Certificate } from '@peculiar/x509'
import * as os from 'os'
import * as path from 'path'
import {
  AgentContext,
  ConsoleLogger,
  FileSystem,
  inject,
  InjectionSymbols,
  LogLevel,
  type Logger,
} from '@credo-ts/core'
import { DidCommMrtdModuleConfig } from '../config/DidCommMrtdModuleConfig'

/**
 * Service for loading and parsing ICAO Master List files (LDIF format) to extract CSCA certificates
 * and provide trust anchors for eMRTD authenticity verification.
 */
export class MasterListService {
  private trustStore: Map<string, X509Certificate> = new Map()
  private isInitialized = false
  private logger: Logger
  private readonly sourceLocation: string
  private readonly cacheFilePath: string

  /**
   * Initialize a new MasterListService for a given source.
   * @param sourceLocation Path or URL to the Master List LDIF file.
   * @throws If the location is not defined.
   */
  constructor(
    @inject(DidCommMrtdModuleConfig) private readonly config: DidCommMrtdModuleConfig,
    @inject(AgentContext) private agentContext: AgentContext,
  ) {
    this.logger = new ConsoleLogger(LogLevel.info)
    const sourceLocation = this.config.masterListCscaLocation
    if (!sourceLocation) {
      throw new Error('The Master List location (URL or file path) cannot be null or undefined.')
    }
    this.sourceLocation = sourceLocation
    this.cacheFilePath = path.join(os.tmpdir(), 'icaopkd-master-list.ldif')
    this.logger.info(`[MasterListService] Initialized with source: ${this.sourceLocation}`)
  }

  /**
   * Loads and parses the Master List, extracting CSCA trust anchors.
   * Can only be called once per instance.
   * @throws If any error occurs reading or parsing the Master List file.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.info('[MasterListService] initialize - MasterListService has already been initialized.')
      return
    }
    this.logger.info(`MasterListService: loading from ${this.sourceLocation}`)
    const fileSystem = this.agentContext.dependencyManager.resolve<FileSystem>(InjectionSymbols.FileSystem)

    let ldifContent: string
    try {
      if (this.sourceLocation.startsWith('http://') || this.sourceLocation.startsWith('https://')) {
        if (await fileSystem.exists(this.cacheFilePath)) {
          this.logger.info(`[MasterListService] initialize - cache found at ${this.cacheFilePath}, using cached file.`)
        } else {
          this.logger.info(
            `[MasterListService] initialize - downloading and caching via FileSystem: ${this.sourceLocation}`,
          )
          await fileSystem.downloadToFile(this.sourceLocation, this.cacheFilePath)
          this.logger.info(`[MasterListService] initialize - download complete and cached to ${this.cacheFilePath}`)
        }
        ldifContent = await fileSystem.read(this.cacheFilePath)
      } else {
        this.logger.info(`[MasterListService] initialize - Reading Master List from local file: ${this.sourceLocation}`)
        ldifContent = await fileSystem.read(this.sourceLocation)
      }

      this.logger.info('[MasterListService] initialize - Parsing and extracting CSCA certificates...')
      await this._extractCSCACertsFromLDIF(ldifContent)

      this.isInitialized = true
      this.logger.info(
        `[MasterListService] initialize - Initialization complete. Loaded ${this.trustStore.size} CSCA certificates into the trust store.`,
      )
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.logger.error(
        `[MasterListService] initialize - Error initializing from "${this.sourceLocation}": ${errorMsg}`,
      )
      throw new Error('Could not initialize MasterListService. eMRTD verification will not be available.')
    }
  }

  /**
   * Gets the list of X509 CSCA trust anchors extracted from the Master List.
   * @returns Array of X509Certificate objects.
   * @throws If not initialized.
   */
  public getTrustAnchors(): X509Certificate[] {
    if (!this.isInitialized) {
      throw new Error('MasterListService has not been initialized. Call initialize() first.')
    }
    return Array.from(this.trustStore.values())
  }

  /**
   * Helper: Extracts all base64-encoded MasterListContent blocks from LDIF text.
   * @param ldifContent Raw LDIF file content as string.
   * @returns Array of Buffers containing DER-encoded MasterListContent CMS objects.
   */
  private extractMasterListBase64Blocks(ldifContent: string): Buffer[] {
    const blocks: Buffer[] = []
    // Regex to find all pkdMasterListContent:: <base64> lines and their wrapped lines
    const regex = /^pkdMasterListContent:: ([A-Za-z0-9+/= \r\n]+)(?:\n(?!\w+::).+)*$/gm

    let match: RegExpExecArray | null
    while ((match = regex.exec(ldifContent)) !== null) {
      let b64 = match[1].replace(/\r/g, '').replace(/\n/g, '').replace(/ /g, '')
      try {
        const buf = Buffer.from(b64, 'base64')
        if (buf.length > 10000) {
          blocks.push(buf)
        }
      } catch (error) {
        // Skip malformed base64 block
      }
    }
    return blocks
  }

  /**
   * Parses the MasterListContent CMS and extracts all CSCA certificates.
   * @param ldifContent Raw LDIF file content.
   * @throws If no valid MasterListContent blocks found or none parse as valid Master List.
   */
  private async _extractCSCACertsFromLDIF(ldifContent: string): Promise<void> {
    const masterListBlobs = this.extractMasterListBase64Blocks(ldifContent)
    if (masterListBlobs.length === 0) {
      throw new Error('No pkdMasterListContent blocks found in LDIF file')
    }

    let validMasterLists = 0
    let extractedCSCA = 0

    for (const buffer of masterListBlobs) {
      try {
        // Step 1: Parse CMS SignedData
        const cmsAsn1 = fromBER(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
        if (cmsAsn1.offset === -1) throw new Error('Invalid ASN.1 structure (CMS)')

        const contentInfo = new ContentInfo({ schema: cmsAsn1.result })
        const signedData = new SignedData({ schema: contentInfo.content })

        // Step 2: Extract encapsulated ASN.1 (OCTET STRING) payload
        const eci = signedData.encapContentInfo
        // @ts-ignore
        const masterListDER: ArrayBuffer = eci.eContent.valueBlock.valueHex

        // Step 3: Parse Master List
        const mlASN1 = fromBER(masterListDER)
        if (mlASN1.offset === -1) throw new Error('Invalid ASN.1 Master List')
        const seq = mlASN1.result
        if (!(seq instanceof Sequence)) throw new Error('Master List is not a SEQUENCE')
        if (!seq.valueBlock || !Array.isArray(seq.valueBlock.value) || seq.valueBlock.value.length < 2) {
          throw new Error('Master List ASN.1 structure is invalid')
        }
        // The second element is the SET OF Certificates
        const certSet = seq.valueBlock.value[1]
        if (!(certSet instanceof Set)) throw new Error('Expected SET OF Certificates')
        if (!Array.isArray(certSet.valueBlock.value)) throw new Error('SET block missing value array')

        let loadedCount = 0
        for (const certASN1 of certSet.valueBlock.value) {
          try {
            const pkijsCert = new Certificate({ schema: certASN1 })
            const der = Buffer.from(pkijsCert.toSchema().toBER(false))
            const x509Cert = new X509Certificate(der)
            const thumbprint = Buffer.from(await x509Cert.getThumbprint('SHA-256')).toString('hex')
            if (!this.trustStore.has(thumbprint)) {
              this.trustStore.set(thumbprint, x509Cert)
              loadedCount++
            }
          } catch (error) {
            // Corrupt cert, skip
          }
        }

        if (loadedCount > 0) {
          validMasterLists++
          extractedCSCA += loadedCount
          this.logger.info(
            `[MasterListService] extractCSCACerts - Extracted ${loadedCount} CSCA certificates from one Master List entry.`,
          )
        }
      } catch (error) {
        // Most entries are invalid, just skip and continue
        this.logger.warn('[MasterListService] extractCSCACerts - Skipping invalid Master List entry.')
      }
    }

    if (validMasterLists === 0) throw new Error('No valid Master List found in LDIF file')
    this.logger.info(
      `[MasterListService] extractCSCACerts - Extracted ${extractedCSCA} CSCA certificates from ${validMasterLists} valid Master List entries.`,
    )
  }
}
