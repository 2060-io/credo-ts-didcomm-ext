import type { DependencyManager } from '@credo-ts/core/build/plugins/DependencyManager'
import type { FileSystem } from '@credo-ts/core/build/storage/FileSystem'
import type { InjectionToken } from 'tsyringe'

import { InjectionSymbols, LogLevel, type AgentContext, type Logger } from '@credo-ts/core'
import { afterEach, describe, expect, test, vi, type Mock } from 'vitest'

import { DidCommMrtdModuleConfig } from '../src/config/DidCommMrtdModuleConfig'
import { CscaMasterListService } from '../src/services/CscaMasterListService'

type ResolveFn = <T>(token: InjectionToken<T>) => T

const createTestLogger = (): Logger => ({
  logLevel: LogLevel.test,
  test: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
})

const createService = (options: {
  sourceLocation: string
  metadata?: Record<string, unknown>
  fsOverrides?: Partial<{
    read: Mock
    write: Mock
    downloadToFile: Mock
    exists: Mock
  }>
}) => {
  const cachePath = '/tmp/cache'
  const cacheFilePath = `${cachePath}/icao-master-list.ldif`
  const metadataPath = `${cacheFilePath}.metadata.json`

  const metadataString =
    options.metadata !== undefined
      ? JSON.stringify(
          {
            downloadedAt: new Date().toISOString(),
            ...options.metadata,
          },
          null,
          2,
        )
      : JSON.stringify({ downloadedAt: new Date().toISOString() }, null, 2)
  const readMock =
    options.fsOverrides?.read ??
    vi.fn(async (requestedPath: string) => {
      if (requestedPath === metadataPath) return metadataString
      if (requestedPath === cacheFilePath) return 'dummy-ldif'
      throw new Error(`Unexpected read path ${requestedPath}`)
    })
  const downloadToFileMock = options.fsOverrides?.downloadToFile ?? vi.fn(async () => {})
  const writeMock = options.fsOverrides?.write ?? vi.fn(async () => {})
  const existsMock =
    options.fsOverrides?.exists ??
    vi.fn(async (requestedPath: string) => {
      if (requestedPath === cacheFilePath) return true
      if (requestedPath === metadataPath) return true
      return false
    })

  const fileSystem: FileSystem = {
    cachePath,
    dataPath: cachePath,
    tempPath: cachePath,
    downloadToFile: downloadToFileMock,
    write: writeMock,
    read: readMock,
    exists: existsMock,
    delete: vi.fn(async () => {}),
    copyFile: vi.fn(async () => {}),
    createDirectory: vi.fn(async () => {}),
  }

  const config = new DidCommMrtdModuleConfig({
    masterListCscaLocation: options.sourceLocation,
  })

  const resolve: ResolveFn = <T>(token: InjectionToken<T>) => {
    if (token === DidCommMrtdModuleConfig) return config as T
    if (token === InjectionSymbols.FileSystem) return fileSystem as T
    throw new Error(`Unexpected dependency resolution for token ${token.toString()}`)
  }

  const dependencyManager = {
    resolve: vi.fn(resolve),
  } as unknown as DependencyManager

  const logger = createTestLogger()

  const agentContext = {
    dependencyManager,
    config: {
      logger,
    },
  } as unknown as AgentContext

  const service = new CscaMasterListService(agentContext)

  const extractSpy = vi.spyOn(
    service as unknown as { _extractCSCACertsFromLDIF: (ldifContent: string) => Promise<void> },
    '_extractCSCACertsFromLDIF',
  )
  extractSpy.mockImplementation(async () => {})

  return {
    service,
    dependencyManager,
    fileSystem,
    cacheFilePath,
    metadataPath,
    downloadToFile: downloadToFileMock,
    write: writeMock,
    read: readMock,
    exists: existsMock,
  }
}

describe('CscaMasterListService cache metadata handling', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('downloads new master list when metadata filename differs', async () => {
    const { service, downloadToFile, write } = createService({
      sourceLocation: 'https://example.com/icaopkd-002-complete-000317.ldif',
      metadata: { downloadedFileName: 'icaopkd-002-complete-000316.ldif' },
    })

    await service.initialize()

    expect(downloadToFile).toHaveBeenCalledTimes(1)
    expect(write).toHaveBeenCalledTimes(1)

    const metadataWritten = JSON.parse(write.mock.calls[0][1] as string)
    expect(metadataWritten.downloadedFileName).toBe('icaopkd-002-complete-000317.ldif')
  })

  test('reuses cached master list when metadata filename matches', async () => {
    const fileSystemOverrides = {
      downloadToFile: vi.fn(async () => {}),
      write: vi.fn(async () => {}),
    }

    const { service, downloadToFile, write } = createService({
      sourceLocation: 'https://example.com/icaopkd-002-complete-000317.ldif',
      metadata: { downloadedFileName: 'icaopkd-002-complete-000317.ldif' },
      fsOverrides: fileSystemOverrides,
    })

    await service.initialize()

    expect(downloadToFile).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  })

  test('downloads master list and creates metadata when cache is empty', async () => {
    const downloadToFile = vi.fn(async () => {})
    const write = vi.fn(async () => {})
    const exists = vi.fn(async (requestedPath: string) => {
      if (requestedPath.endsWith('.metadata.json')) return false
      if (requestedPath.endsWith('.ldif')) return false
      return false
    })

    const {
      service,
      downloadToFile: downloadOverride,
      write: writeOverride,
    } = createService({
      sourceLocation: 'https://example.com/icaopkd-002-complete-000318.ldif',
      fsOverrides: { downloadToFile, write, exists },
    })

    await service.initialize()

    expect(downloadOverride).toHaveBeenCalledTimes(1)
    expect(writeOverride).toHaveBeenCalledTimes(1)
  })
})
