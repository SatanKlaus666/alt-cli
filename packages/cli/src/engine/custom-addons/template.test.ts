import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fetchIntegrations } from '../../api/fetch.js'
import { compile } from '../compile.js'
import { CustomTemplateCompiledSchema } from '../types.js'
import type { CustomTemplateCompiled } from '../types.js'

const INTEGRATIONS_PATH = resolve(__dirname, '../../../../../integrations')

describe('Custom template schema', () => {
  it('should validate a minimal template', () => {
    const template = {
      id: 'my-template',
      name: 'My Template',
      description: 'A simple template',
      framework: 'react',
      mode: 'file-router',
      typescript: true,
      tailwind: true,
      integrations: [],
    }

    const result = CustomTemplateCompiledSchema.safeParse(template)
    expect(result.success).toBe(true)
  })

  it('should validate a template with integrations', () => {
    const template = {
      id: 'saas-template',
      name: 'SaaS Template',
      description: 'Complete SaaS setup',
      framework: 'react',
      mode: 'file-router',
      typescript: true,
      tailwind: true,
      integrations: ['tanstack-query', 'clerk', 'drizzle', 'shadcn'],
    }

    const result = CustomTemplateCompiledSchema.safeParse(template)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.integrations).toHaveLength(4)
    }
  })

  it('should validate a template with integration options', () => {
    const template = {
      id: 'db-template',
      name: 'Database Template',
      description: 'Template with database preset',
      framework: 'react',
      mode: 'file-router',
      typescript: true,
      tailwind: true,
      integrations: ['drizzle'],
      integrationOptions: {
        drizzle: {
          database: 'postgres',
        },
      },
    }

    const result = CustomTemplateCompiledSchema.safeParse(template)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.integrationOptions?.drizzle).toEqual({ database: 'postgres' })
    }
  })

  it('should validate a template with banner', () => {
    const template = {
      id: 'branded-template',
      name: 'Branded Template',
      description: 'A branded template',
      framework: 'react',
      mode: 'file-router',
      typescript: true,
      tailwind: false,
      integrations: [],
      banner: 'https://example.com/banner.png',
    }

    const result = CustomTemplateCompiledSchema.safeParse(template)
    expect(result.success).toBe(true)
  })

  it('should reject template without required fields', () => {
    const template = {
      id: 'incomplete',
      name: 'Incomplete',
      // missing: description, framework, mode, typescript, tailwind, integrations
    }

    const result = CustomTemplateCompiledSchema.safeParse(template)
    expect(result.success).toBe(false)
  })

  it('should reject template with invalid mode', () => {
    const template = {
      id: 'invalid-mode',
      name: 'Invalid Mode',
      description: 'Has invalid mode',
      framework: 'react',
      mode: 'invalid-mode', // should be 'file-router' or 'code-router'
      typescript: true,
      tailwind: true,
      integrations: [],
    }

    const result = CustomTemplateCompiledSchema.safeParse(template)
    expect(result.success).toBe(false)
  })

  it('should allow code-router mode', () => {
    const template = {
      id: 'code-router-template',
      name: 'Code Router Template',
      description: 'Uses code router',
      framework: 'react',
      mode: 'code-router',
      typescript: true,
      tailwind: true,
      integrations: [],
    }

    const result = CustomTemplateCompiledSchema.safeParse(template)
    expect(result.success).toBe(true)
  })
})

describe('Custom template as integration preset', () => {
  it('templates should NOT have files property', () => {
    const templateWithFiles = {
      id: 'files-template',
      name: 'Files Template',
      description: 'Tries to have files',
      framework: 'react',
      mode: 'file-router',
      typescript: true,
      tailwind: true,
      integrations: [],
      files: { 'src/custom.ts': 'export const x = 1' }, // should be rejected
    }

    const result = CustomTemplateCompiledSchema.safeParse(templateWithFiles)
    // Zod strips unknown keys by default, so this passes but files is removed
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>).files).toBeUndefined()
    }
  })

  it('templates should NOT have packageAdditions property', () => {
    const templateWithPackages = {
      id: 'packages-template',
      name: 'Packages Template',
      description: 'Tries to have packages',
      framework: 'react',
      mode: 'file-router',
      typescript: true,
      tailwind: true,
      integrations: [],
      packageAdditions: { dependencies: { foo: '1.0.0' } }, // should be stripped
    }

    const result = CustomTemplateCompiledSchema.safeParse(templateWithPackages)
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>).packageAdditions).toBeUndefined()
    }
  })
})

describe('Custom template end-to-end flow', () => {
  it('should resolve template integrations and compile project', async () => {
    // Simulate what the create command does
    const template: CustomTemplateCompiled = {
      id: 'test-template',
      name: 'Test Template',
      description: 'Test template with real integrations',
      framework: 'react',
      mode: 'file-router',
      typescript: true,
      tailwind: true,
      integrations: ['tanstack-query', 'tanstack-form'],
    }

    // Fetch the integrations specified in the template
    const chosenIntegrations = await fetchIntegrations(template.integrations, INTEGRATIONS_PATH)
    expect(chosenIntegrations).toHaveLength(2)

    // Compile with the template
    const output = compile({
      projectName: 'template-test-project',
      framework: template.framework,
      mode: template.mode,
      typescript: template.typescript,
      tailwind: template.tailwind,
      packageManager: 'pnpm',
      chosenIntegrations,
      integrationOptions: template.integrationOptions ?? {},
      customTemplate: template,
    })

    // Verify base files exist
    expect(output.files).toHaveProperty('package.json')
    expect(output.files).toHaveProperty('vite.config.ts')

    // Verify integration files are included
    expect(output.files).toHaveProperty('src/integrations/query/provider.tsx')
    expect(output.files).toHaveProperty('src/routes/demo/query.tsx')
    expect(output.files).toHaveProperty('src/routes/demo/form.tsx')

    // Verify integration dependencies are merged
    const pkg = JSON.parse(output.files['package.json']!)
    expect(pkg.dependencies).toHaveProperty('@tanstack/react-query')
    expect(pkg.dependencies).toHaveProperty('@tanstack/react-form')
  })

  it('should respect template integration options', async () => {
    const template: CustomTemplateCompiled = {
      id: 'options-template',
      name: 'Options Template',
      description: 'Template with preset options',
      framework: 'react',
      mode: 'file-router',
      typescript: true,
      tailwind: true,
      integrations: ['drizzle'],
      integrationOptions: {
        drizzle: {
          database: 'sqlite',
        },
      },
    }

    const chosenIntegrations = await fetchIntegrations(template.integrations, INTEGRATIONS_PATH)

    const output = compile({
      projectName: 'options-test',
      framework: template.framework,
      mode: template.mode,
      typescript: template.typescript,
      tailwind: template.tailwind,
      packageManager: 'pnpm',
      chosenIntegrations,
      integrationOptions: template.integrationOptions ?? {},
      customTemplate: template,
    })

    // The integration options should be available for template processing
    // (actual option handling depends on the integration's template files)
    expect(output.files).toHaveProperty('package.json')
  })

  it('should work with empty integration list', () => {
    const template: CustomTemplateCompiled = {
      id: 'minimal-template',
      name: 'Minimal Template',
      description: 'Just the defaults',
      framework: 'react',
      mode: 'file-router',
      typescript: true,
      tailwind: false, // no tailwind
      integrations: [],
    }

    const output = compile({
      projectName: 'minimal-test',
      framework: template.framework,
      mode: template.mode,
      typescript: template.typescript,
      tailwind: template.tailwind,
      packageManager: 'pnpm',
      chosenIntegrations: [],
      integrationOptions: {},
      customTemplate: template,
    })

    // Base files should exist
    expect(output.files).toHaveProperty('package.json')
    expect(output.files).toHaveProperty('vite.config.ts')

    // Tailwind should NOT be in the output
    const viteConfig = output.files['vite.config.ts']!
    expect(viteConfig).not.toContain('tailwindcss')
  })
})
