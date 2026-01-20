import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CONFIG_FILE, readConfigFile, writeConfigFile } from './config-file.js'
import type { CompileOptions } from './types.js'

const TEST_DIR = resolve(__dirname, '__test_config_file__')

const baseOptions: CompileOptions = {
  projectName: 'test-project',
  framework: 'react',
  mode: 'file-router',
  typescript: true,
  tailwind: true,
  packageManager: 'pnpm',
  chosenIntegrations: [
    {
      id: 'tanstack-query',
      name: 'TanStack Query',
      description: 'Data fetching',
      type: 'integration',
      phase: 'integration',
      modes: ['file-router'],
      files: {},
      deletedFiles: [],
    },
  ],
  integrationOptions: {},
}

describe('config-file', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  describe('writeConfigFile', () => {
    it('should write config file with correct structure', async () => {
      await writeConfigFile(TEST_DIR, baseOptions)

      const config = await readConfigFile(TEST_DIR)
      expect(config).not.toBeNull()
      expect(config!.version).toBe(1)
      expect(config!.projectName).toBe('test-project')
      expect(config!.framework).toBe('react')
      expect(config!.mode).toBe('file-router')
      expect(config!.typescript).toBe(true)
      expect(config!.tailwind).toBe(true)
      expect(config!.packageManager).toBe('pnpm')
    })

    it('should persist integration IDs', async () => {
      await writeConfigFile(TEST_DIR, baseOptions)

      const config = await readConfigFile(TEST_DIR)
      expect(config!.chosenIntegrations).toEqual(['tanstack-query'])
    })

    it('should persist custom template ID if provided', async () => {
      await writeConfigFile(TEST_DIR, {
        ...baseOptions,
        customTemplate: {
          id: 'my-template',
          name: 'My Template',
          description: 'Test template',
          framework: 'react',
          mode: 'file-router',
          typescript: true,
          tailwind: true,
          integrations: [],
        },
      })

      const config = await readConfigFile(TEST_DIR)
      expect(config!.customTemplate).toBe('my-template')
    })
  })

  describe('readConfigFile', () => {
    it('should return null if config file does not exist', async () => {
      const config = await readConfigFile(TEST_DIR)
      expect(config).toBeNull()
    })

    it('should return null for invalid JSON', async () => {
      writeFileSync(resolve(TEST_DIR, CONFIG_FILE), 'not valid json')

      const config = await readConfigFile(TEST_DIR)
      expect(config).toBeNull()
    })

    it('should read valid config file', async () => {
      writeFileSync(
        resolve(TEST_DIR, CONFIG_FILE),
        JSON.stringify({
          version: 1,
          projectName: 'existing-project',
          framework: 'react',
          mode: 'file-router',
          typescript: true,
          tailwind: false,
          packageManager: 'npm',
          chosenIntegrations: ['clerk'],
        }),
      )

      const config = await readConfigFile(TEST_DIR)
      expect(config).not.toBeNull()
      expect(config!.projectName).toBe('existing-project')
      expect(config!.tailwind).toBe(false)
      expect(config!.packageManager).toBe('npm')
      expect(config!.chosenIntegrations).toEqual(['clerk'])
    })
  })
})
