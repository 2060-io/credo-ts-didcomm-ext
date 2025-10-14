import { AgentContext, FileSystem, inject, injectable, InjectionSymbols, type Logger } from '@credo-ts/core'
import { X509Certificate } from '@peculiar/x509'
import { fromBER, Sequence, Set } from 'asn1js'
import { ContentInfo, SignedData, Certificate } from 'pkijs'

import { DidCommMrtdModuleConfig } from '../config/DidCommMrtdModuleConfig'

/**
 * Service for loading and parsing ICAO Master List files (LDIF format) to extract CSCA certificates
 * and provide trust anchors for eMRTD authenticity verification.
 */
@injectable()
export class CscaMasterListService {
  private trustStore: Map<string, X509Certificate> = new Map()
  private isInitialized = false
  private logger: Logger
  private sourceLocation?: string
  private cacheFilePath?: string
  private fileSystem?: FileSystem

  /**
   * Initialize a new CscaMasterListService for a given source.
   * @param sourceLocation Path or URL to the Master List LDIF file.
   * @throws If the location is not defined.
   */
  public constructor(@inject(AgentContext) private agentContext: AgentContext) {
    this.logger = agentContext.config.logger
  }

  /**
   * Loads and parses the Master List, extracting CSCA trust anchors.
   * Can only be called once per instance.
   * @throws If any error occurs reading or parsing the Master List file.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.info('[CscaMasterListService] initialize - CscaMasterListService has already been initialized.')
      return
    }

    const config = this.agentContext.dependencyManager.resolve(DidCommMrtdModuleConfig)

    const sourceLocation = config.masterListCscaLocation
    if (!sourceLocation) {
      this.isInitialized = true
      this.logger?.warn(
        '[CscaMasterListService] initialize - No "masterListCscaLocation" configured. Authenticity verification will be disabled.',
      )
      return
    }

    this.sourceLocation = sourceLocation

    this.logger.info(`[CscaMasterListService] Initialized with source: ${this.sourceLocation}`)

    this.fileSystem = this.agentContext.dependencyManager.resolve<FileSystem>(InjectionSymbols.FileSystem)
    const clearCacheTtlSeconds = config.masterListCscaClearCacheTtlSeconds

    let ldifContent: string
    try {
      if (this.sourceLocation.startsWith('http://') || this.sourceLocation.startsWith('https://')) {
        this.cacheFilePath = `${this.fileSystem.cachePath}/icao-master-list.ldif`
        const metadataPath = `${this.cacheFilePath}.metadata.json` // For storing download timestamp
        const cacheExists = await this.fileSystem.exists(this.cacheFilePath)
        const refreshCachedMl = !cacheExists || (await this.refreshCachedMasterList(clearCacheTtlSeconds, metadataPath))

        if (refreshCachedMl) {
          await this.downloadAndCacheMasterList(metadataPath)
        } else {
          this.logger.info(
            `[CscaMasterListService] initialize - cache found at ${this.cacheFilePath}, using cached file.`,
          )
        }
        ldifContent = await this.fileSystem.read(this.cacheFilePath)
      } else {
        this.logger.info(
          `[CscaMasterListService] initialize - Reading Master List from local file: ${this.sourceLocation}`,
        )
        ldifContent = await this.fileSystem.read(this.sourceLocation)
      }

      this.logger.info('[CscaMasterListService] initialize - Parsing and extracting CSCA certificates...')
      await this._extractCSCACertsFromLDIF(ldifContent)

      this.isInitialized = true
      this.logger.info(
        `[CscaMasterListService] initialize - Initialization complete. Loaded ${this.trustStore.size} CSCA certificates into the trust store.`,
      )
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.logger.error(
        `[CscaMasterListService] initialize - Error initializing from "${this.sourceLocation}": ${errorMsg}`,
      )
      throw new Error('Could not initialize CscaMasterListService. eMRTD verification will not be available.')
    }
  }

  /**
   * Gets the list of X509 CSCA trust anchors extracted from the Master List.
   * @returns Array of X509Certificate objects.
   * @throws If not initialized.
   */
  public getTrustAnchors(): X509Certificate[] {
    if (!this.isInitialized) {
      throw new Error('CscaMasterListService has not been initialized. Call initialize() first.')
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
      const b64 = match[1].replace(/\r/g, '').replace(/\n/g, '').replace(/ /g, '')
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
        const cmsAsn1 = fromBER(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength))
        if (cmsAsn1.offset === -1) throw new Error('Invalid ASN.1 structure (CMS)')

        const contentInfo = new ContentInfo({ schema: cmsAsn1.result })
        const signedData = new SignedData({ schema: contentInfo.content })

        // Step 2: Extract encapsulated ASN.1 (OCTET STRING) payload
        const eci = signedData.encapContentInfo

        const masterListDER = eci.eContent?.valueBlock.valueHex
        if (!masterListDER) throw new Error('Invalid DER Master List')

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

        validMasterLists++
        if (loadedCount > 0) {
          extractedCSCA += loadedCount
        }
        this.logger.info(
          `[CscaMasterListService] extractCSCACerts - Extracted ${loadedCount} CSCA certificates from one Master List entry.`,
        )
      } catch (error) {
        // Most entries are invalid, just skip and continue
        this.logger.warn('[CscaMasterListService] extractCSCACerts - Skipping invalid Master List entry.')
      }
    }

    this.logger.info(`[CscaMasterListService] extractCSCACerts - Processed ${validMasterLists} Master List entries.`)
    if (validMasterLists === 0) throw new Error('No valid Master List found in LDIF file')
    this.logger.info(
      `[CscaMasterListService] extractCSCACerts - Extracted ${extractedCSCA} CSCA certificates from ${validMasterLists} valid Master List entries.`,
    )
  }

  /**
   * Decides whether the cached Master List is stale and needs a remote refresh.
   * @returns true when the cache must be refreshed, false to reuse the cached file.
   */
  private async refreshCachedMasterList(
    clearCacheTtlSeconds: number | undefined,
    metadataPath: string,
  ): Promise<boolean> {
    // If no FileSystem is available, we cannot manage a cache, so always reuse existing file if present.
    if (!this.fileSystem) {
      this.logger.debug(
        '[CscaMasterListService] initialize - FileSystem not available. Reusing cached Master List if present.',
      )
      return true
    }
    // Undefined TTL means indefinite reuse of cached file.
    if (clearCacheTtlSeconds === undefined) {
      this.logger.info(
        '[CscaMasterListService] initialize - No cache TTL configured. Reusing cached Master List indefinitely.',
      )
      return false
    }
    // Reject NaN and negative values as invalid, causing indefinite reuse of cached file.
    if (Number.isNaN(clearCacheTtlSeconds)) {
      this.logger.debug(
        '[CscaMasterListService] initialize - Received NaN cache TTL configuration. Reusing cached Master List.',
      )
      return false
    }
    // Negative TTL means indefinite reuse of cached file.
    if (clearCacheTtlSeconds < 0) {
      this.logger.debug(
        '[CscaMasterListService] initialize - Received negative cache TTL configuration. Reusing cached Master List.',
      )
      return false
    }
    // Zero TTL means always refresh the cached file.
    if (clearCacheTtlSeconds === 0) {
      this.logger.info(
        '[CscaMasterListService] initialize - Cache TTL set to 0. Refreshing remote Master List on every initialization.',
      )
      return true
    }

    try {
      if (!(await this.fileSystem.exists(metadataPath))) {
        // No metadata means we cannot determine age; fetch a fresh copy.
        this.logger.info(
          '[CscaMasterListService] initialize - No metadata found for cached Master List. Refreshing remote copy.',
        )
        return true
      }

      const metadataRaw = await this.fileSystem.read(metadataPath)
      const metadata = JSON.parse(metadataRaw) as { downloadedAt?: string }
      const downloadedAt = metadata?.downloadedAt
      const downloadedAtMs = downloadedAt ? Date.parse(downloadedAt) : NaN

      if (Number.isNaN(downloadedAtMs)) {
        // Invalid timestamp indicates the metadata is corrupt, so refresh to recover.
        this.logger.info(
          '[CscaMasterListService] initialize - Cached Master List metadata invalid. Refreshing remote copy.',
        )
        return true
      }

      const ageSeconds = (Date.now() - downloadedAtMs) / 1000
      this.logger.info(
        `[CscaMasterListService] initialize - Cached Master List age: ${ageSeconds.toFixed(
          0,
        )}s (TTL: ${clearCacheTtlSeconds}s)`,
      )
      // Cached file has exceeded TTL and must be replaced.
      if (ageSeconds >= clearCacheTtlSeconds) {
        this.logger.info(
          `[CscaMasterListService] initialize - Cached Master List older than ${clearCacheTtlSeconds}s. Refreshing remote copy.`,
        )
        return true
      }

      return false
    } catch (error) {
      this.logger.error(
        '[CscaMasterListService] initialize - Failed to read cache metadata. Refreshing remote Master List.',
      )
      return true
    }
  }

  /**
   * Downloads the Master List from the remote URL and caches it locally.
   * Also writes metadata with the download timestamp.
   * @param metadataPath Path to write metadata JSON file.
   * @throws If download or file write fails.
   */
  private async downloadAndCacheMasterList(metadataPath: string): Promise<void> {
    if (!this.fileSystem || !this.cacheFilePath || !this.sourceLocation) {
      throw new Error('CscaMasterListService is not properly configured to download the Master List.')
    }

    this.logger.info(
      `[CscaMasterListService] initialize - downloading and caching via FileSystem: ${this.sourceLocation}`,
    )
    await this.fileSystem.downloadToFile(this.sourceLocation, this.cacheFilePath, {})
    // Write metadata with download timestamp
    await this.fileSystem.write(metadataPath, JSON.stringify({ downloadedAt: new Date().toISOString() }))
    this.logger.info(`[CscaMasterListService] initialize - download complete and cached to ${this.cacheFilePath}`)
  }
}
