import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { fetchIntegration, fetchIntegrations } from '../api/fetch.js'
import { compile } from './compile.js'
import type { IntegrationCompiled, CompileOptions } from './types.js'

const INTEGRATIONS_PATH = resolve(__dirname, '../../../../integrations')

const baseOptions: CompileOptions = {
  projectName: 'test-project',
  framework: 'react',
  mode: 'file-router',
  typescript: true,
  tailwind: true,
  packageManager: 'pnpm',
  chosenIntegrations: [],
  integrationOptions: {},
}

describe('compile with real integrations', () => {
  describe('TanStack Query integration', () => {
    let queryIntegration: IntegrationCompiled

    beforeAll(async () => {
      queryIntegration = await fetchIntegration('tanstack-query', INTEGRATIONS_PATH)
    })

    it('should load integration from local path', () => {
      expect(queryIntegration.id).toBe('tanstack-query')
      expect(queryIntegration.name).toBe('TanStack Query')
      expect(queryIntegration.hooks).toHaveLength(2)
    })

    it('should have provider hook', () => {
      const provider = queryIntegration.hooks?.find(
        (i) => i.type === 'root-provider',
      )
      expect(provider).toBeDefined()
      expect(provider?.jsName).toBe('QueryProvider')
    })

    it('should have devtools hook', () => {
      const devtools = queryIntegration.hooks?.find(
        (i) => i.type === 'devtools',
      )
      expect(devtools).toBeDefined()
      expect(devtools?.jsName).toBe('queryDevtoolsPlugin')
    })

    it('should include integration files in compile output', () => {
      const output = compile({
        ...baseOptions,
        chosenIntegrations: [queryIntegration],
      })

      expect(output.files).toHaveProperty(
        'src/integrations/query/provider.tsx',
      )
      expect(output.files).toHaveProperty(
        'src/integrations/query/devtools.tsx',
      )
      expect(output.files).toHaveProperty('src/routes/demo/query.tsx')
    })

    it('should inject provider into __root.tsx', () => {
      const output = compile({
        ...baseOptions,
        chosenIntegrations: [queryIntegration],
      })

      const rootRoute = output.files['src/routes/__root.tsx']!
      expect(rootRoute).toContain('QueryProvider')
    })

    it('should inject devtools into __root.tsx', () => {
      const output = compile({
        ...baseOptions,
        chosenIntegrations: [queryIntegration],
      })

      const rootRoute = output.files['src/routes/__root.tsx']!
      expect(rootRoute).toContain('queryDevtoolsPlugin')
    })
  })

  describe('Shadcn integration', () => {
    let shadcnIntegration: IntegrationCompiled

    beforeAll(async () => {
      shadcnIntegration = await fetchIntegration('shadcn', INTEGRATIONS_PATH)
    })

    it('should load shadcn integration', () => {
      expect(shadcnIntegration.id).toBe('shadcn')
      expect(shadcnIntegration.name).toBe('shadcn/ui')
    })

    it('should include shadcn files', () => {
      const output = compile({
        ...baseOptions,
        chosenIntegrations: [shadcnIntegration],
      })

      // Shadcn should have components.json or similar config files
      expect(Object.keys(output.files).some((f) => f.includes('components'))).toBe(true)
    })
  })

  describe('Multiple integrations', () => {
    let integrations: Array<IntegrationCompiled>

    beforeAll(async () => {
      integrations = await fetchIntegrations(
        ['tanstack-query', 'tanstack-form'],
        INTEGRATIONS_PATH,
      )
    })

    it('should load multiple integrations', () => {
      expect(integrations).toHaveLength(2)
      expect(integrations.map((a) => a.id)).toEqual(['tanstack-query', 'tanstack-form'])
    })

    it('should compile with multiple integrations', () => {
      const output = compile({
        ...baseOptions,
        chosenIntegrations: integrations,
      })

      // Both integration files should be present
      expect(output.files).toHaveProperty(
        'src/integrations/query/provider.tsx',
      )
      // TanStack Form doesn't have a provider, just a demo route
      expect(output.files).toHaveProperty(
        'src/routes/demo/form.tsx',
      )
    })

    it('should merge all integration dependencies', () => {
      const output = compile({
        ...baseOptions,
        chosenIntegrations: integrations,
      })

      // Check that dependencies from both integrations are merged
      expect(output.packages.dependencies).toHaveProperty('@tanstack/react-query')
      expect(output.packages.dependencies).toHaveProperty('@tanstack/react-form')
    })
  })

  describe('Vite plugin integration (Sentry)', () => {
    let sentryIntegration: IntegrationCompiled

    beforeAll(async () => {
      sentryIntegration = await fetchIntegration('sentry', INTEGRATIONS_PATH)
    })

    it('should load sentry integration', () => {
      expect(sentryIntegration.id).toBe('sentry')
    })

    it('should inject vite plugin if sentry has one', () => {
      const vitePlugin = sentryIntegration.hooks?.find(
        (i) => i.type === 'vite-plugin',
      )

      if (vitePlugin) {
        const output = compile({
          ...baseOptions,
          chosenIntegrations: [sentryIntegration],
        })

        const viteConfig = output.files['vite.config.ts']!
        expect(viteConfig).toContain(vitePlugin.jsName || vitePlugin.code)
      }
    })
  })

  describe('Toolchain integration (ESLint)', () => {
    let eslintIntegration: IntegrationCompiled

    beforeAll(async () => {
      eslintIntegration = await fetchIntegration('eslint', INTEGRATIONS_PATH)
    })

    it('should load eslint integration', () => {
      expect(eslintIntegration.id).toBe('eslint')
      expect(eslintIntegration.type).toBe('toolchain')
      expect(eslintIntegration.phase).toBe('setup')
    })

    it('should add eslint config files', () => {
      const output = compile({
        ...baseOptions,
        chosenIntegrations: [eslintIntegration],
      })

      // ESLint should add config file
      const hasEslintConfig = Object.keys(output.files).some(
        (f) => f.includes('eslint') || f.includes('.eslintrc'),
      )
      expect(hasEslintConfig).toBe(true)
    })

    it('should add eslint scripts to package.json', () => {
      const output = compile({
        ...baseOptions,
        chosenIntegrations: [eslintIntegration],
      })

      const pkg = JSON.parse(output.files['package.json']!)
      expect(pkg.scripts.lint).toBeDefined()
    })
  })

  describe('Deployment integration (Vercel)', () => {
    let vercelIntegration: IntegrationCompiled

    beforeAll(async () => {
      vercelIntegration = await fetchIntegration('vercel', INTEGRATIONS_PATH)
    })

    it('should load vercel integration', () => {
      expect(vercelIntegration.id).toBe('vercel')
      expect(vercelIntegration.type).toBe('deployment')
    })
  })
})

describe('compile output validation', () => {
  it('should generate valid vite.config.ts syntax', async () => {
    const queryIntegration = await fetchIntegration('tanstack-query', INTEGRATIONS_PATH)
    const output = compile({
      ...baseOptions,
      chosenIntegrations: [queryIntegration],
    })

    const viteConfig = output.files['vite.config.ts']!

    // Basic syntax checks
    expect(viteConfig).toContain('export default defineConfig')
    expect(viteConfig).toContain('plugins:')

    // Should have balanced braces
    const openBraces = (viteConfig.match(/\{/g) || []).length
    const closeBraces = (viteConfig.match(/\}/g) || []).length
    expect(openBraces).toBe(closeBraces)

    // Should have balanced brackets
    const openBrackets = (viteConfig.match(/\[/g) || []).length
    const closeBrackets = (viteConfig.match(/\]/g) || []).length
    expect(openBrackets).toBe(closeBrackets)
  })

  it('should generate valid __root.tsx syntax', async () => {
    const queryIntegration = await fetchIntegration('tanstack-query', INTEGRATIONS_PATH)
    const output = compile({
      ...baseOptions,
      chosenIntegrations: [queryIntegration],
    })

    const rootRoute = output.files['src/routes/__root.tsx']!

    // Basic syntax checks
    expect(rootRoute).toContain('createRootRoute')
    expect(rootRoute).toContain('export const Route')

    // Should have balanced JSX tags (roughly - this is a simple check)
    const openTags = (rootRoute.match(/<[A-Z][^/>]*>/g) || []).length
    const closeTags = (rootRoute.match(/<\/[A-Z][^>]*>/g) || []).length
    const selfClosingTags = (rootRoute.match(/<[A-Z][^>]*\/>/g) || []).length
    // Open tags should equal close tags + self-closing tags (approximately)
    expect(Math.abs(openTags - closeTags - selfClosingTags)).toBeLessThanOrEqual(2)
  })

  it('should generate valid package.json', async () => {
    const integrations = await fetchIntegrations(
      ['tanstack-query', 'tanstack-form'],
      INTEGRATIONS_PATH,
    )
    const output = compile({
      ...baseOptions,
      chosenIntegrations: integrations,
    })

    const pkg = JSON.parse(output.files['package.json']!)

    // Required fields
    expect(pkg.name).toBe('test-project')
    expect(pkg.type).toBe('module')
    expect(pkg.scripts).toBeDefined()
    expect(pkg.dependencies).toBeDefined()
    expect(pkg.devDependencies).toBeDefined()

    // No duplicate keys (JSON.parse would fail otherwise, but let's be explicit)
    expect(typeof pkg.dependencies).toBe('object')
    expect(typeof pkg.devDependencies).toBe('object')
  })
})
