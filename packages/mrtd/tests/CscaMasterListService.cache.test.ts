import type { DependencyManager } from '@credo-ts/core/build/plugins/DependencyManager'
import type { FileSystem } from '@credo-ts/core/build/storage/FileSystem'
import type { InjectionToken } from 'tsyringe'

import { InjectionSymbols, LogLevel, type AgentContext, type Logger } from '@credo-ts/core'

import { DidCommMrtdModuleConfig } from '../src/config/DidCommMrtdModuleConfig'
import { CscaMasterListService } from '../src/services/CscaMasterListService'

type ResolveFn = <T>(token: InjectionToken<T>) => T

const createTestLogger = (): Logger => ({
  logLevel: LogLevel.test,
  test: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
})

const createService = (options: {
  sourceLocation: string
  metadata?: Record<string, unknown>
  fsOverrides?: Partial<{
    read: jest.Mock
    write: jest.Mock
    downloadToFile: jest.Mock
    exists: jest.Mock
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
    jest.fn(async (requestedPath: string) => {
      if (requestedPath === metadataPath) return metadataString
      if (requestedPath === cacheFilePath) return 'dummy-ldif'
      throw new Error(`Unexpected read path ${requestedPath}`)
    })
  const downloadToFileMock = options.fsOverrides?.downloadToFile ?? jest.fn(async () => {})
  const writeMock = options.fsOverrides?.write ?? jest.fn(async () => {})
  const existsMock =
    options.fsOverrides?.exists ??
    jest.fn(async (requestedPath: string) => {
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
    delete: jest.fn(async () => {}),
    copyFile: jest.fn(async () => {}),
    createDirectory: jest.fn(async () => {}),
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
    resolve: jest.fn(resolve),
  } as unknown as DependencyManager

  const logger = createTestLogger()

  const agentContext = {
    dependencyManager,
    config: {
      logger,
    },
  } as unknown as AgentContext

  const service = new CscaMasterListService(agentContext)

  const extractSpy = jest.spyOn(
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
    jest.restoreAllMocks()
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
      downloadToFile: jest.fn(async () => {}),
      write: jest.fn(async () => {}),
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
    const downloadToFile = jest.fn(async () => {})
    const write = jest.fn(async () => {})
    const exists = jest.fn(async (requestedPath: string) => {
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
