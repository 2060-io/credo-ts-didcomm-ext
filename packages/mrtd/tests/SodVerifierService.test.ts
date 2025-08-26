import { ConsoleLogger, LogLevel, type Logger } from '@credo-ts/core'
import { X509Certificate } from '@peculiar/x509'
import { promises as fs } from 'fs'
import path from 'path'

import { SodVerifierService } from '../src/services'

import { MockCscaMasterListService } from './__mocks__/CscaMasterListService.mock'

// Test vector taken from German BSI TR-03105-5 ReferenceDataSet
// https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Publikationen/TechnischeRichtlinien/TR03105/BSI_TR-03105-5_ReferenceDataSet_zip.html

// Fixtures
const FIXTURES = {
  // CSCA (PEM or DER)
  CERT: path.resolve(__dirname, './certs/dsc_de_0142fd5cf927.cer'),
  // EF.SOD (TLV/DER or base64 text)
  SOD: path.resolve(__dirname, './dgs/EF_SOD.bin'),
  // Optional DG files
  DGS_DIR: path.resolve(__dirname, './dgs'),
}

// Helpers

/**
 * Load a certificate in DER format from a file that may be PEM or DER.
 * @param file Absolute path to certificate.
 */
async function loadCertDER(file: string): Promise<Buffer> {
  const raw = await fs.readFile(file)
  const txt = raw.toString('utf8')
  if (txt.includes('-----BEGIN CERTIFICATE-----')) {
    const base64 = txt
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s+/g, '')
    return Buffer.from(base64, 'base64')
  }
  return raw // assume DER
}

/**
 * Load a file that may be raw DER/BER or base64-encoded.
 * @param file Absolute path to SOD or DG file.
 */
async function loadMaybeBase64(file: string): Promise<Buffer> {
  const raw = await fs.readFile(file)
  const txt = raw.toString('utf8').trim()
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(txt) && txt.length > 100) {
    return Buffer.from(txt.replace(/\s+/g, ''), 'base64')
  }
  return raw
}

/**
 * Load DG files from a directory. Supports .bin/.der (binary) and .b64 (base64).
 * @param dir Directory path.
 */
async function loadDGs(dir: string): Promise<Record<string, Buffer>> {
  const result: Record<string, Buffer> = {}
  try {
    const entries = await fs.readdir(dir)
    for (const name of entries) {
      const m = /^DG(\d+)\.(bin|der|b64)$/i.exec(name)
      if (!m) continue

      const dgName = `DG${m[1]}`
      const fp = path.join(dir, name)
      const buf = await fs.readFile(fp)

      if (name.toLowerCase().endsWith('.b64')) {
        result[dgName] = Buffer.from(buf.toString('utf8').replace(/\s+/g, ''), 'base64')
      } else {
        result[dgName] = buf // binary DER/TLV
      }
    }
  } catch {
    // DG directory is optional in the test
  }
  return result
}

// Test
describe('SodVerifierService Testing', () => {
  let service: SodVerifierService

  beforeAll(async () => {
    // Load CSCA trust anchor
    const certDER = await loadCertDER(FIXTURES.CERT)
    const trustAnchor = new X509Certificate(certDER)

    // Build DI dependencies
    const mlService = new MockCscaMasterListService([trustAnchor])
    const logger: Logger = new ConsoleLogger(LogLevel.info)
    type MlDep = ConstructorParameters<typeof SodVerifierService>[0]

    // Instantiate the service
    service = new SodVerifierService(mlService as unknown as MlDep, logger)
  })

  it('returns a positive verification (authenticity true; integrity true if DGs match or are omitted)', async () => {
    const sod = await loadMaybeBase64(FIXTURES.SOD)
    const dataGroups = await loadDGs(FIXTURES.DGS_DIR) // leave folder empty to skip integrity hashing

    const result = await service.verifySod(sod, dataGroups)

    expect(result.authenticity).toBe(true)
    expect(result.integrity).toBe(true)

    if (!result.authenticity || !result.integrity) {
      // eslint-disable-next-line no-console
      console.log('Verification details:', result.details ?? '(no extra details)')
    }
  })
})
