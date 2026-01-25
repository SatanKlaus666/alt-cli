import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import {
  IntegrationCompiledSchema,
  IntegrationInfoSchema,
  ManifestSchema
} from '../engine/types.js'
import { fetchWithCache } from '../cache/index.js'
import type { IntegrationCompiled, IntegrationInfo, Manifest } from '../engine/types.js'

const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/TanStack/cli/main/integrations'

// 1 hour cache TTL for remote fetches
const CACHE_TTL_MS = 60 * 60 * 1000

// Binary file extensions that should be read as base64
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pdf', '.zip', '.tar', '.gz',
  '.mp3', '.mp4', '.wav', '.ogg', '.webm',
])

// Prefix for base64-encoded binary files
export const BINARY_PREFIX = 'base64:'

/**
 * Check if a file should be treated as binary based on extension
 */
function isBinaryFile(filePath: string): boolean {
  return BINARY_EXTENSIONS.has(extname(filePath).toLowerCase())
}

/**
 * Check if a path is a local directory
 */
function isLocalPath(path: string): boolean {
  return path.startsWith('/') || path.startsWith('./') || path.startsWith('..')
}

/**
 * Fetch the integration manifest from GitHub or local path (with caching for remote)
 */
export async function fetchManifest(
  baseUrl: string = GITHUB_RAW_BASE,
): Promise<Manifest> {
  if (isLocalPath(baseUrl)) {
    const manifestPath = join(baseUrl, 'manifest.json')
    if (!existsSync(manifestPath)) {
      throw new Error(`Manifest not found at ${manifestPath}`)
    }
    const data = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    return ManifestSchema.parse(data)
  }

  const cacheKey = `manifest_${baseUrl.replace(/[^a-zA-Z0-9]/g, '_')}`

  return fetchWithCache(
    cacheKey,
    async () => {
      const url = `${baseUrl}/manifest.json`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.statusText}`)
      }

      const data = await response.json()
      return ManifestSchema.parse(data)
    },
    CACHE_TTL_MS,
  )
}

/**
 * Fetch integration info.json from GitHub or local path (with caching for remote)
 */
export async function fetchIntegrationInfo(
  integrationId: string,
  baseUrl: string = GITHUB_RAW_BASE,
): Promise<IntegrationInfo> {
  if (isLocalPath(baseUrl)) {
    const infoPath = join(baseUrl, integrationId, 'info.json')
    if (!existsSync(infoPath)) {
      throw new Error(`Integration info not found at ${infoPath}`)
    }
    const data = JSON.parse(readFileSync(infoPath, 'utf-8'))
    return IntegrationInfoSchema.parse(data)
  }

  const cacheKey = `integration_info_${integrationId}_${baseUrl.replace(/[^a-zA-Z0-9]/g, '_')}`

  return fetchWithCache(
    cacheKey,
    async () => {
      const url = `${baseUrl}/${integrationId}/info.json`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch integration ${integrationId}: ${response.statusText}`)
      }

      const data = await response.json()
      return IntegrationInfoSchema.parse(data)
    },
    CACHE_TTL_MS,
  )
}

/**
 * Recursively read all files from a directory
 * Binary files are read as base64 with a prefix marker
 */
function readDirRecursive(
  dir: string,
  basePath: string = '',
): Record<string, string> {
  const files: Record<string, string> = {}

  if (!existsSync(dir)) return files

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const relativePath = basePath ? `${basePath}/${entry}` : entry
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      Object.assign(files, readDirRecursive(fullPath, relativePath))
    } else if (isBinaryFile(relativePath)) {
      // Read binary files as base64 with prefix
      const buffer = readFileSync(fullPath)
      files[relativePath] = BINARY_PREFIX + buffer.toString('base64')
    } else {
      files[relativePath] = readFileSync(fullPath, 'utf-8')
    }
  }

  return files
}

/**
 * Fetch all files for an integration from GitHub or local path (with caching for remote)
 */
export async function fetchIntegrationFiles(
  integrationId: string,
  baseUrl: string = GITHUB_RAW_BASE,
): Promise<Record<string, string>> {
  if (isLocalPath(baseUrl)) {
    const assetsPath = join(baseUrl, integrationId, 'assets')
    return readDirRecursive(assetsPath)
  }

  const cacheKey = `integration_files_${integrationId}_${baseUrl.replace(/[^a-zA-Z0-9]/g, '_')}`

  return fetchWithCache(
    cacheKey,
    async () => {
      // First fetch the file list (we'll need a files.json or similar)
      const filesUrl = `${baseUrl}/${integrationId}/files.json`
      const response = await fetch(filesUrl)

      if (!response.ok) {
        // No files.json, return empty
        return {}
      }

      const fileList: Array<string> = await response.json()
      const files: Record<string, string> = {}

      // Fetch each file
      await Promise.all(
        fileList.map(async (filePath) => {
          const fileUrl = `${baseUrl}/${integrationId}/assets/${filePath}`
          const fileResponse = await fetch(fileUrl)

          if (fileResponse.ok) {
            if (isBinaryFile(filePath)) {
              // Fetch binary files as arrayBuffer and convert to base64
              const buffer = await fileResponse.arrayBuffer()
              files[filePath] = BINARY_PREFIX + Buffer.from(buffer).toString('base64')
            } else {
              files[filePath] = await fileResponse.text()
            }
          }
        }),
      )

      return files
    },
    CACHE_TTL_MS,
  )
}

/**
 * Fetch integration package.json if it exists
 */
async function fetchIntegrationPackageJson(
  integrationId: string,
  baseUrl: string,
): Promise<{
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
} | null> {
  if (isLocalPath(baseUrl)) {
    const pkgPath = join(baseUrl, integrationId, 'package.json')
    if (existsSync(pkgPath)) {
      return JSON.parse(readFileSync(pkgPath, 'utf-8'))
    }
    return null
  }

  const url = `${baseUrl}/${integrationId}/package.json`
  const response = await fetch(url)

  if (!response.ok) {
    return null
  }

  return response.json()
}

/**
 * Fetch a complete compiled integration from GitHub
 */
export async function fetchIntegration(
  integrationId: string,
  baseUrl: string = GITHUB_RAW_BASE,
): Promise<IntegrationCompiled> {
  const [info, files, pkgJson] = await Promise.all([
    fetchIntegrationInfo(integrationId, baseUrl),
    fetchIntegrationFiles(integrationId, baseUrl),
    fetchIntegrationPackageJson(integrationId, baseUrl),
  ])

  // Merge package.json into packageAdditions if present
  const packageAdditions = info.packageAdditions ?? {}
  if (pkgJson) {
    if (pkgJson.dependencies) {
      packageAdditions.dependencies = {
        ...packageAdditions.dependencies,
        ...pkgJson.dependencies,
      }
    }
    if (pkgJson.devDependencies) {
      packageAdditions.devDependencies = {
        ...packageAdditions.devDependencies,
        ...pkgJson.devDependencies,
      }
    }
    if (pkgJson.scripts) {
      packageAdditions.scripts = {
        ...packageAdditions.scripts,
        ...pkgJson.scripts,
      }
    }
  }

  return IntegrationCompiledSchema.parse({
    ...info,
    id: integrationId,
    files,
    packageAdditions:
      Object.keys(packageAdditions).length > 0 ? packageAdditions : undefined,
    deletedFiles: [],
  })
}

/**
 * Fetch multiple integrations in parallel
 */
export async function fetchIntegrations(
  integrationIds: Array<string>,
  baseUrl: string = GITHUB_RAW_BASE,
): Promise<Array<IntegrationCompiled>> {
  return Promise.all(integrationIds.map((id) => fetchIntegration(id, baseUrl)))
}
