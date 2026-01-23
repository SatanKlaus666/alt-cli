import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { compile } from '../engine/compile.js'
import { fetchIntegrations, fetchManifest } from '../api/fetch.js'
import type { RouterMode } from '../engine/types.js'

const INTEGRATIONS_PATH = resolve(__dirname, '../../../../integrations')
const TEST_DIR = resolve(__dirname, '__test_mcp__')

/**
 * These tests verify the core logic used by the MCP server tools
 * without testing the actual MCP transport layer.
 */
describe('MCP server tools logic', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  describe('listTanStackIntegrations logic', () => {
    it('should list integrations from manifest', async () => {
      const manifest = await fetchManifest(INTEGRATIONS_PATH)
      const integrations = manifest.integrations
        .filter((a) => a.modes.includes('file-router'))
        .map((integration) => ({
          id: integration.id,
          name: integration.name,
          description: integration.description,
          category: integration.category,
          dependsOn: integration.dependsOn,
          exclusive: integration.exclusive,
          hasOptions: integration.hasOptions,
        }))

      expect(integrations.length).toBeGreaterThan(0)
      
      const query = integrations.find((i) => i.id === 'tanstack-query')
      expect(query).toBeDefined()
      expect(query!.name).toBe('TanStack Query')
      expect(query!.category).toBe('tanstack')
    })

    it('should include dependency and exclusive type info', async () => {
      const manifest = await fetchManifest(INTEGRATIONS_PATH)
      const integrations = manifest.integrations.filter((a) =>
        a.modes.includes('file-router'),
      )

      const trpc = integrations.find((i) => i.id === 'trpc')
      expect(trpc?.dependsOn).toContain('tanstack-query')

      const clerk = integrations.find((i) => i.id === 'clerk')
      expect(clerk?.exclusive).toContain('auth')
    })
  })

  describe('createTanStackApplication logic', () => {
    it('should compile project without integrations', () => {
      const output = compile({
        projectName: 'test-app',
        framework: 'react',
        mode: 'file-router' as RouterMode,
        typescript: true,
        tailwind: true,
        packageManager: 'pnpm',
        chosenIntegrations: [],
        integrationOptions: {},
      })

      expect(output.files).toHaveProperty('package.json')
      expect(output.files).toHaveProperty('vite.config.ts')
      expect(output.files).toHaveProperty('src/routes/__root.tsx')
    })

    it('should compile project with integrations', async () => {
      const chosenIntegrations = await fetchIntegrations(
        ['tanstack-query'],
        INTEGRATIONS_PATH,
      )

      const output = compile({
        projectName: 'test-app',
        framework: 'react',
        mode: 'file-router' as RouterMode,
        typescript: true,
        tailwind: true,
        packageManager: 'pnpm',
        chosenIntegrations,
        integrationOptions: {},
      })

      // Should include integration files
      expect(output.files).toHaveProperty('src/integrations/query/provider.tsx')
      
      // Should have provider in __root.tsx
      expect(output.files['src/routes/__root.tsx']).toContain('QueryProvider')
    })

    it('should return env vars from integrations', async () => {
      const chosenIntegrations = await fetchIntegrations(
        ['clerk'],
        INTEGRATIONS_PATH,
      )

      const output = compile({
        projectName: 'test-app',
        framework: 'react',
        mode: 'file-router' as RouterMode,
        typescript: true,
        tailwind: true,
        packageManager: 'pnpm',
        chosenIntegrations,
        integrationOptions: {},
      })

      expect(output.envVars.length).toBeGreaterThan(0)
      expect(output.envVars.some((e) => e.name.includes('CLERK'))).toBe(true)
    })

    it('should write files to target directory', async () => {
      const output = compile({
        projectName: 'test-app',
        framework: 'react',
        mode: 'file-router' as RouterMode,
        typescript: true,
        tailwind: false,
        packageManager: 'npm',
        chosenIntegrations: [],
        integrationOptions: {},
      })

      // Simulate writing files
      const { writeFileSync } = await import('node:fs')
      const { resolve: pathResolve } = await import('node:path')

      for (const [filePath, content] of Object.entries(output.files)) {
        const fullPath = pathResolve(TEST_DIR, filePath)
        const dir = pathResolve(fullPath, '..')
        mkdirSync(dir, { recursive: true })
        writeFileSync(fullPath, content, 'utf-8')
      }

      // Verify files were written
      const pkg = JSON.parse(readFileSync(resolve(TEST_DIR, 'package.json'), 'utf-8'))
      expect(pkg.name).toBe('test-app')
    })
  })
})
