export type SodVerification = {
  /** True if DSC is trusted by a CSCA chain */
  authenticity: boolean
  /** True if all hashed Data Groups match */
  integrity: boolean
  /** Optional extra details (e.g., mismatch info or errors) */
  details?: string
}
