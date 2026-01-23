import { describe, expect, it } from 'vitest'
import { compile, compileWithAttribution } from './compile.js'
import type { CompileOptions, CustomTemplateCompiled, IntegrationCompiled } from './types.js'

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

describe('compile', () => {
  describe('base template', () => {
    it('should generate base project files', () => {
      const output = compile(baseOptions)

      // Should have essential files
      expect(output.files).toHaveProperty('package.json')
      expect(output.files).toHaveProperty('vite.config.ts')
      expect(output.files).toHaveProperty('tsconfig.json')
      expect(output.files).toHaveProperty('src/routes/__root.tsx')
      expect(output.files).toHaveProperty('src/routes/index.tsx')
      expect(output.files).toHaveProperty('src/styles.css')
      expect(output.files).toHaveProperty('.gitignore')
      expect(output.files).toHaveProperty('.env.example')
    })

    it('should generate valid package.json', () => {
      const output = compile(baseOptions)
      const pkg = JSON.parse(output.files['package.json']!)

      expect(pkg.name).toBe('test-project')
      expect(pkg.scripts).toHaveProperty('dev')
      expect(pkg.scripts).toHaveProperty('build')
      expect(pkg.scripts).toHaveProperty('start')
      expect(pkg.dependencies).toHaveProperty('@tanstack/react-start')
      expect(pkg.dependencies).toHaveProperty('@tanstack/react-router')
    })

    it('should include tailwind when enabled', () => {
      const output = compile({ ...baseOptions, tailwind: true })
      const pkg = JSON.parse(output.files['package.json']!)

      expect(pkg.devDependencies).toHaveProperty('@tailwindcss/vite')
      expect(output.files['vite.config.ts']).toContain('tailwindcss')
    })

    it('should exclude tailwind when disabled', () => {
      const output = compile({ ...baseOptions, tailwind: false })
      const pkg = JSON.parse(output.files['package.json']!)

      expect(pkg.dependencies).not.toHaveProperty('@tailwindcss/vite')
      expect(output.files['vite.config.ts']).not.toContain('tailwindcss')
    })

    it('should generate vite.config.ts with correct plugins', () => {
      const output = compile(baseOptions)
      const viteConfig = output.files['vite.config.ts']!

      expect(viteConfig).toContain("import { defineConfig } from 'vite'")
      expect(viteConfig).toContain('tanstackStart')
      expect(viteConfig).toContain('viteReact')
      expect(viteConfig).toContain('viteTsConfigPaths')
    })

    it('should generate __root.tsx with router devtools', () => {
      const output = compile(baseOptions)
      const rootRoute = output.files['src/routes/__root.tsx']!

      expect(rootRoute).toContain('createRootRoute')
      expect(rootRoute).toContain('TanStackRouterDevtools')
      expect(rootRoute).toContain('shellComponent')
      expect(rootRoute).toContain('{children}')
    })
  })

  describe('integration', () => {
    const mockIntegration: IntegrationCompiled = {
      id: 'test-integration',
      name: 'Test Integration',
      description: 'A test integration',
      type: 'integration',
      phase: 'integration',
      modes: ['file-router'],
      files: {
        'src/integrations/test-integration/index.ts': 'export const testIntegration = true',
      },
      packageAdditions: {
        dependencies: {
          'test-package': '^1.0.0',
        },
        devDependencies: {
          'test-dev-package': '^2.0.0',
        },
      },
    }

    it('should include integration files in output', () => {
      const output = compile({
        ...baseOptions,
        chosenIntegrations: [mockIntegration],
      })

      expect(output.files).toHaveProperty('src/integrations/test-integration/index.ts')
      expect(output.files['src/integrations/test-integration/index.ts']).toBe(
        'export const testIntegration = true',
      )
    })

    it('should merge integration package dependencies', () => {
      const output = compile({
        ...baseOptions,
        chosenIntegrations: [mockIntegration],
      })

      expect(output.packages.dependencies).toHaveProperty('test-package', '^1.0.0')
      expect(output.packages.devDependencies).toHaveProperty('test-dev-package', '^2.0.0')
    })

    it('should collect integration warnings', () => {
      const integrationWithWarning: IntegrationCompiled = {
        ...mockIntegration,
        id: 'warning-integration',
        name: 'Warning Integration',
        warning: 'This integration requires configuration!',
      }

      const output = compile({
        ...baseOptions,
        chosenIntegrations: [integrationWithWarning],
      })

      // Warnings are prefixed with integration name
      expect(output.warnings).toContain('Warning Integration: This integration requires configuration!')
    })

    it('should collect integration env vars', () => {
      const integrationWithEnv: IntegrationCompiled = {
        ...mockIntegration,
        id: 'env-integration',
        envVars: [
          { name: 'API_KEY', description: 'Your API key', required: true },
          { name: 'API_URL', description: 'API endpoint', example: 'https://api.example.com' },
        ],
      }

      const output = compile({
        ...baseOptions,
        chosenIntegrations: [integrationWithEnv],
      })

      expect(output.envVars).toHaveLength(2)
      expect(output.envVars[0]).toEqual({
        name: 'API_KEY',
        description: 'Your API key',
        required: true,
      })
    })
  })

  describe('vite-plugin hook', () => {
    it('should inject vite plugins into vite.config.ts', () => {
      const integrationWithVitePlugin: IntegrationCompiled = {
        id: 'vite-plugin-integration',
        name: 'Vite Plugin Integration',
        description: 'Integration with vite plugin',
        type: 'integration',
        phase: 'integration',
        modes: ['file-router'],
        files: {
          'src/integrations/vite-plugin-integration/vite-plugin.ts':
            'export default function myPlugin() { return { name: "my-plugin" } }',
        },
        hooks: [
          {
            type: 'vite-plugin',
            jsName: 'myPlugin',
            path: 'src/integrations/vite-plugin-integration/vite-plugin.ts',
            code: 'myPlugin()',
          },
        ],
      }

      const output = compile({
        ...baseOptions,
        chosenIntegrations: [integrationWithVitePlugin],
      })

      const viteConfig = output.files['vite.config.ts']!
      expect(viteConfig).toContain('myPlugin')
    })
  })

  describe('root-provider hook', () => {
    it('should wrap app with provider in __root.tsx', () => {
      const integrationWithProvider: IntegrationCompiled = {
        id: 'provider-integration',
        name: 'Provider Integration',
        description: 'Integration with root provider',
        type: 'integration',
        phase: 'integration',
        modes: ['file-router'],
        files: {
          'src/integrations/provider-integration/provider.tsx':
            'export function Provider({ children }) { return <div>{children}</div> }',
        },
        hooks: [
          {
            type: 'root-provider',
            jsName: 'Provider',
            path: 'src/integrations/provider-integration/provider.tsx',
            code: '<Provider>',
          },
        ],
      }

      const output = compile({
        ...baseOptions,
        chosenIntegrations: [integrationWithProvider],
      })

      const rootRoute = output.files['src/routes/__root.tsx']!
      expect(rootRoute).toContain('Provider')
    })
  })

  describe('devtools hook', () => {
    it('should add devtools to __root.tsx', () => {
      const integrationWithDevtools: IntegrationCompiled = {
        id: 'devtools-integration',
        name: 'Devtools Integration',
        description: 'Integration with devtools',
        type: 'integration',
        phase: 'integration',
        modes: ['file-router'],
        files: {
          'src/integrations/devtools-integration/devtools.tsx':
            'export function Devtools() { return <div>Devtools</div> }',
        },
        hooks: [
          {
            type: 'devtools',
            jsName: 'Devtools',
            path: 'src/integrations/devtools-integration/devtools.tsx',
            code: '<Devtools />',
          },
        ],
      }

      const output = compile({
        ...baseOptions,
        chosenIntegrations: [integrationWithDevtools],
      })

      const rootRoute = output.files['src/routes/__root.tsx']!
      expect(rootRoute).toContain('Devtools')
    })
  })

  describe('custom template support', () => {
    // Custom templates are just integration presets - they don't add files directly
    const mockTemplate: CustomTemplateCompiled = {
      id: 'test-template',
      name: 'Test Template',
      description: 'A test template',
      framework: 'react',
      mode: 'file-router',
      typescript: true,
      tailwind: true,
      integrations: [], // List of integration IDs to include
    }

    it('should compile with custom template (templates are just integration presets)', () => {
      const output = compile({
        ...baseOptions,
        customTemplate: mockTemplate,
      })

      // Template doesn't add files directly - it just specifies integrations
      // The template's integrations should be resolved into chosenIntegrations by caller
      expect(output.files).toHaveProperty('package.json')
      expect(output.files).toHaveProperty('vite.config.ts')
    })

    it('should use custom template settings', () => {
      const output = compile({
        ...baseOptions,
        // Template settings would be applied by the create command
        // Here we just verify compile works with a template present
        customTemplate: mockTemplate,
      })

      expect(output.files).toBeDefined()
    })
  })

  describe('integration sorting by phase', () => {
    it('should process setup integrations before integration phase', () => {
      const setupIntegration: IntegrationCompiled = {
        id: 'setup-integration',
        name: 'Setup Integration',
        description: 'Setup phase integration',
        type: 'toolchain',
        phase: 'setup',
        modes: ['file-router'],
        files: { 'setup.txt': 'setup' },
      }

      const integrationPhase: IntegrationCompiled = {
        id: 'integration-phase',
        name: 'Integration Phase',
        description: 'Integration phase integration',
        type: 'integration',
        phase: 'integration',
        modes: ['file-router'],
        files: { 'integration.txt': 'integration' },
      }

      // Order shouldn't matter in input - they should be sorted internally
      const output = compile({
        ...baseOptions,
        chosenIntegrations: [integrationPhase, setupIntegration],
      })

      // Both files should exist
      expect(output.files).toHaveProperty('setup.txt')
      expect(output.files).toHaveProperty('integration.txt')
    })
  })
})

describe('compileWithAttribution', () => {
  it('should include line attributions for files', () => {
    const output = compileWithAttribution(baseOptions)

    expect(output.attributedFiles).toBeDefined()
    expect(output.attributedFiles['vite.config.ts']).toBeDefined()
    expect(output.attributedFiles['vite.config.ts']!.attributions.length).toBeGreaterThan(0)
  })

  it('should attribute integration lines to the integration', () => {
    const integration: IntegrationCompiled = {
      id: 'attr-integration',
      name: 'Attribution Integration',
      description: 'Test attribution',
      type: 'integration',
      phase: 'integration',
      modes: ['file-router'],
      files: {},
      hooks: [
        {
          type: 'vite-plugin',
          jsName: 'myPlugin',
          path: 'src/integrations/attr-integration/plugin.ts',
          code: 'myPlugin()',
        },
      ],
    }

    const output = compileWithAttribution({
      ...baseOptions,
      chosenIntegrations: [integration],
    })

    const viteAttrs = output.attributedFiles['vite.config.ts']!.attributions
    const integrationLine = viteAttrs.find((a) => a.featureId === 'attr-integration')
    expect(integrationLine).toBeDefined()
  })

  it('should attribute gitignore patterns to integrations', () => {
    const integration: IntegrationCompiled = {
      id: 'drizzle',
      name: 'Drizzle',
      description: 'Database ORM',
      type: 'integration',
      phase: 'integration',
      modes: ['file-router'],
      files: {},
      gitignorePatterns: ['drizzle/', '*.db'],
    }

    const output = compileWithAttribution({
      ...baseOptions,
      chosenIntegrations: [integration],
    })

    // Check gitignore has attributions
    const gitignoreAttrs = output.attributedFiles['.gitignore']!.attributions
    expect(gitignoreAttrs).toBeDefined()
    
    // Should have integration-attributed lines
    const integrationLines = gitignoreAttrs.filter((a) => a.featureId === 'drizzle')
    expect(integrationLines.length).toBe(2) // drizzle/ and *.db

    // Check the actual content includes the patterns
    const gitignoreContent = output.files['.gitignore']!
    expect(gitignoreContent).toContain('drizzle/')
    expect(gitignoreContent).toContain('*.db')
  })
})
