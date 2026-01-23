import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const CACHE_DIR = join(homedir(), '.tanstack', 'cache')
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true })
  }
}

function getCachePath(key: string): string {
  // Sanitize key to be filesystem-safe
  const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, '_')
  return join(CACHE_DIR, `${safeKey}.json`)
}

export function getCached<T>(key: string): T | null {
  const cachePath = getCachePath(key)
  
  if (!existsSync(cachePath)) {
    return null
  }

  try {
    const raw = readFileSync(cachePath, 'utf-8')
    const entry: CacheEntry<T> = JSON.parse(raw)
    
    const age = Date.now() - entry.timestamp
    if (age > entry.ttl) {
      return null // Expired
    }
    
    return entry.data
  } catch {
    return null
  }
}

export function setCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  ensureCacheDir()
  const cachePath = getCachePath(key)
  
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  }
  
  writeFileSync(cachePath, JSON.stringify(entry, null, 2), 'utf-8')
}

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  // Try cache first
  const cached = getCached<T>(key)
  if (cached !== null) {
    return cached
  }
  
  // Fetch fresh data
  const data = await fetcher()
  
  // Cache it
  setCache(key, data, ttlMs)
  
  return data
}

export function clearCache(): void {
  if (existsSync(CACHE_DIR)) {
    rmSync(CACHE_DIR, { recursive: true, force: true })
  }
}

export function getCacheDir(): string {
  return CACHE_DIR
}
