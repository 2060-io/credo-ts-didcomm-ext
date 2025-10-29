# eMRTD Authenticity & Integrity Verification

This module adds authenticity and integrity verification for electronic Machine Readable Travel Documents (eMRTD) such as passports and national ID cards, following ICAO Doc 9303. It validates EF.SOD (CMS/PKCS#7) and the hash values of all included Data Groups (DGs) using a trust store built from the ICAO Master List (CSCA certificates).

---

## Features

- **ICAO Master List ingestion** (LDIF): from local file path or via URL.
- **Automatic CSCA extraction**: parses Master List and loads CSCA certificates into an in‑memory trust store.
- **TLV/DER support**: EF.SOD may arrive as raw DER or TLV‑wrapped (tag `0x77`) – both are handled.
- **Integrity checks**: hashes each provided DG and compares against the SOD.
- **Authenticity checks**: validates the document signer certificate chain against CSCA trust anchors.
- **Agent‑native I/O**: uses the Agent’s `FileSystem` and `fetch` (no extra HTTP/fs deps).
- **Lazy, optional setup**: if no Master List is configured, authenticity is skipped.

---

## Architecture (high level)

- **`CscaMasterListService`**

  - Lazily resolves `DidCommMrtdModuleConfig` and `FileSystem` inside `initialize()`.

- If `masterListCscaLocation` is an **HTTP(S) URL**, downloads once to `FileSystem.cachePath` and reuses the cached file. A metadata file records the original filename so the cache can be refreshed whenever the configured source name changes.

  - Extracts all CSCA certificates from the LDIF Master List into an internal trust store.

- **`SodVerifierService`**

  - Depends on `CscaMasterListService`.
  - `verifySod(sodBuffer: Buffer, dataGroups: Record<string, Buffer>)` → `{ authenticity, integrity, details? }`.
  - Parses SOD (CMS SignedData), extracts LDS hashes, checks DG integrity, and validates DSC chain against CSCA anchors.

- **`DidCommMrtdService`**

  - `processEMrtdData(...)` parses base64 DGs, ensures the Master List is initialized once, delegates SOD verification to `SodVerifierService`, then emits `EMrtdDataReceived` with both parsed fields and the verification outcome.
  - Event payload shape:

    ```ts
    {
      connection,
      dataGroups: {
        raw: Record<string, string> // base64
        parsed: {
          valid: boolean
          fields?: ParsedEMrtdData
          verification?: { authenticity: boolean; integrity: boolean; details?: string }
        }
      },
      threadId
    }
    ```

---

## Configuration

```ts
// DidCommMrtdModuleConfigOptions
export interface DidCommMrtdModuleConfigOptions {
  /** URL or local file path to the CSCA Master List (LDIF). Optional. */
  masterListCscaLocation?: string
}
```

Register the module (the config is optional — omit it to disable authenticity):

```ts
import { Agent } from '@credo-ts/core'
import { DidCommMrtdModule, DidCommMrtdModuleConfig } from '@2060.io/credo-ts-didcomm-mrtd'

const agent = new Agent({
  config: {
    /* ... */
  },
  dependencies: agentDependencies,
  modules: {
    mrtd: new DidCommMrtdModule(
      new DidCommMrtdModuleConfig({
        // Local path OR HTTPS URL (LDIF). Omit to skip authenticity.
        masterListCscaLocation: 'https://example.org/icao-master-list.ldif',
      }),
    ),
  },
})
```

- **Notes**

- For HTTP(S) sources, the Master List is downloaded to `FileSystem.cachePath` and reused on subsequent starts. A sidecar metadata file (`icao-master-list.ldif.metadata.json`) records the download timestamp and filename so the cache can be refreshed automatically when the configured source filename differs from the cached one. If download fails and no cache exists, `initialize()` throws `CscaMasterListInitializationError`; if a cache exists it is reused.

- If `masterListCscaLocation` is not provided, `CscaMasterListService.initialize()` logs a warning and short‑circuits; `SodVerifierService.verifySod` now throws when no CSCA anchors are available, signalling callers to handle the missing trust store.

---

## Direct service usage example

When you want to verify outside of a DIDComm flow, you can call the services directly:

```ts
import * as fs from 'fs'
import { CscaMasterListService, SodVerifierService } from '@2060.io/credo-ts-didcomm-mrtd/dist/services'

// Resolve from agent container instead in a real app
const ml = container.resolve(CscaMasterListService)
await ml.initialize() // idempotent; loads config + caches file if URL

const verifier = container.resolve(SodVerifierService)

// Build inputs (base64 → Buffer)
const json = JSON.parse(fs.readFileSync('csca-certs/example.txt', 'utf8'))
const data = json.dataGroupsBase64 ?? json

const sod = Buffer.from(data.SOD, 'base64')
const dgs: Record<string, Buffer> = {}
for (const [k, v] of Object.entries<string>(data)) if (k !== 'SOD') dgs[k] = Buffer.from(v, 'base64')

const result = await verifier.verifySod(sod, dgs)
```

### Input JSON format

```json
{
  "DG1": "<base64>",
  "DG2": "<base64>",
  "SOD": "<base64>"
}
```

---

## Using `DidCommMrtdService` in a flow

`processEMrtdData(messageContext)` will:

1. Parse the base64 DGs to structured fields.
2. Ensure the Master List is initialized once (cached in memory by the CSCA service).
3. Delegate SOD verification to `SodVerifierService`.
4. Emit `EMrtdDataReceived` with `{ raw, parsed }`, where `parsed.verification` contains `{ authenticity, integrity, details? }`.

You can subscribe to the event via the agent’s `EventEmitter` and react accordingly.

---

## Notes on SOD & TLV

- EF.SOD may be TLV‑wrapped (tag `0x77`). The verifier auto‑detects and extracts the inner DER before decoding CMS.
- DG buffers can also be TLV or DER; the verifier strips an outer TLV before hashing.

---

## Output semantics

- **authenticity**: `true` if a valid chain from the document signer to a CSCA in the Master List is found.
- **integrity**: `true` if all provided DGs match the hashes in EF.SOD.
- **details**: optional error/mismatch message to aid debugging.
