import type { X509Certificate } from '@peculiar/x509'

/**
 * Interface describing the minimal surface required by the CSCA Master List service
 * for testing purposes. It mirrors the methods consumed by SodVerifierService.
 */
export interface ICscaMasterListService {
  /**
   * Initializes the service (no-op for mocks).
   * @returns A promise that resolves when initialization completes.
   */
  initialize(): Promise<void>

  /**
   * Returns the list of X.509 CSCA trust anchors.
   * @returns Array of X509Certificate instances.
   */
  getTrustAnchors(): X509Certificate[]
}

/**
 * Mock implementation of the CSCA Master List service used in tests.
 * Keeps test doubles in a single place to promote reuse across test files.
 */
export class MockCscaMasterListService implements ICscaMasterListService {
  /**
   * Creates a new mock instance.
   * @param anchors X.509 trust anchors to be returned by the mock.
   */
  public constructor(private readonly anchors: X509Certificate[]) {}

  /**
   * Initialize the mock service.
   * Intentionally a no-op to match the real API without side effects.
   */
  public async initialize(): Promise<void> {
    /* no-op */
  }

  /**
   * Returns the provided trust anchors.
   */
  public getTrustAnchors(): X509Certificate[] {
    return this.anchors
  }
}
