import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  fetchManifest,
  fetchIntegration,
  fetchIntegrations,
  fetchIntegrationInfo,
  fetchIntegrationFiles,
} from './fetch.js'

const INTEGRATIONS_PATH = resolve(__dirname, '../../../../integrations')

describe('fetch API', () => {
  describe('fetchManifest', () => {
    it('should fetch manifest from local path', async () => {
      const manifest = await fetchManifest(INTEGRATIONS_PATH)

      expect(manifest).toBeDefined()
      expect(manifest.integrations).toBeInstanceOf(Array)
      expect(manifest.integrations.length).toBeGreaterThan(0)
    })

    it('should have integrations with required fields', async () => {
      const manifest = await fetchManifest(INTEGRATIONS_PATH)

      for (const integration of manifest.integrations) {
        expect(integration.id).toBeDefined()
        expect(integration.name).toBeDefined()
        expect(integration.modes).toBeInstanceOf(Array)
      }
    })

    it('should throw for non-existent path', async () => {
      await expect(fetchManifest('/non/existent/path')).rejects.toThrow()
    })
  })

  describe('fetchIntegrationInfo', () => {
    it('should fetch integration info from local path', async () => {
      const info = await fetchIntegrationInfo('tanstack-query', INTEGRATIONS_PATH)

      expect(info.name).toBe('TanStack Query')
      expect(info.type).toBe('integration')
      expect(info.modes).toContain('file-router')
    })

    it('should throw for non-existent integration', async () => {
      await expect(
        fetchIntegrationInfo('non-existent', INTEGRATIONS_PATH),
      ).rejects.toThrow()
    })
  })

  describe('fetchIntegrationFiles', () => {
    it('should fetch integration files from local path', async () => {
      const files = await fetchIntegrationFiles('tanstack-query', INTEGRATIONS_PATH)

      expect(Object.keys(files).length).toBeGreaterThan(0)
      // Files are in assets/src/integrations/query/
      expect(files).toHaveProperty('src/integrations/query/provider.tsx')
    })

    it('should return empty object for integration without assets', async () => {
      // This tests the case where assets dir doesn't exist
      const files = await fetchIntegrationFiles('non-existent', INTEGRATIONS_PATH)
      expect(files).toEqual({})
    })
  })

  describe('fetchIntegration', () => {
    it('should fetch complete integration', async () => {
      const integration = await fetchIntegration('tanstack-query', INTEGRATIONS_PATH)

      expect(integration.id).toBe('tanstack-query')
      expect(integration.name).toBe('TanStack Query')
      expect(integration.files).toBeDefined()
      expect(Object.keys(integration.files).length).toBeGreaterThan(0)
    })

    it('should include hooks if defined', async () => {
      const integration = await fetchIntegration('tanstack-query', INTEGRATIONS_PATH)

      expect(integration.hooks).toBeDefined()
      expect(integration.hooks!.length).toBeGreaterThan(0)
    })

    it('should merge package.json into packageAdditions', async () => {
      const integration = await fetchIntegration('tanstack-query', INTEGRATIONS_PATH)

      expect(integration.packageAdditions).toBeDefined()
      expect(integration.packageAdditions?.dependencies).toHaveProperty(
        '@tanstack/react-query',
      )
    })
  })

  describe('fetchIntegrations', () => {
    it('should fetch multiple integrations in parallel', async () => {
      const integrations = await fetchIntegrations(
        ['tanstack-query', 'tanstack-form'],
        INTEGRATIONS_PATH,
      )

      expect(integrations).toHaveLength(2)
      expect(integrations[0]?.id).toBe('tanstack-query')
      expect(integrations[1]?.id).toBe('tanstack-form')
    })

    it('should return empty array for empty input', async () => {
      const integrations = await fetchIntegrations([], INTEGRATIONS_PATH)
      expect(integrations).toEqual([])
    })
  })
})
