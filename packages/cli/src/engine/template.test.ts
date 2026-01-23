import { describe, expect, it } from 'vitest'
import {
  createTemplateContext,
  processTemplateFile,
  relativePath,
} from './template.js'
import type { CompileOptions } from './types.js'

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

describe('relativePath', () => {
  it('should calculate relative path between files in same directory', () => {
    expect(relativePath('src/routes/index.tsx', 'src/routes/about.tsx')).toBe(
      './about.tsx',
    )
  })

  it('should calculate relative path going up directories', () => {
    expect(
      relativePath('src/routes/demo/test.tsx', 'src/integrations/query/client.ts'),
    ).toBe('../../integrations/query/client.ts')
  })

  it('should calculate relative path going down directories', () => {
    expect(relativePath('src/index.tsx', 'src/routes/demo/test.tsx')).toBe(
      './routes/demo/test.tsx',
    )
  })

  it('should strip extension when requested', () => {
    expect(
      relativePath('src/routes/index.tsx', 'src/integrations/query/client.ts', true),
    ).toBe('../integrations/query/client')
  })
})

describe('createTemplateContext', () => {
  it('should create context with correct project config', () => {
    const ctx = createTemplateContext(baseOptions, 'src/index.tsx')

    expect(ctx.projectName).toBe('test-project')
    expect(ctx.packageManager).toBe('pnpm')
    expect(ctx.typescript).toBe(true)
    expect(ctx.tailwind).toBe(true)
    expect(ctx.js).toBe('ts')
    expect(ctx.jsx).toBe('tsx')
  })

  it('should set router mode flags correctly for file-router', () => {
    const ctx = createTemplateContext(baseOptions, 'src/index.tsx')

    expect(ctx.fileRouter).toBe(true)
    expect(ctx.codeRouter).toBe(false)
  })

  it('should set router mode flags correctly for code-router', () => {
    const ctx = createTemplateContext(
      { ...baseOptions, mode: 'code-router' },
      'src/index.tsx',
    )

    expect(ctx.fileRouter).toBe(false)
    expect(ctx.codeRouter).toBe(true)
  })

  it('should generate correct package manager scripts for pnpm', () => {
    const ctx = createTemplateContext(baseOptions, 'src/index.tsx')

    expect(ctx.getPackageManagerAddScript('react')).toBe('pnpm add react')
    expect(ctx.getPackageManagerAddScript('vitest', true)).toBe('pnpm add -D vitest')
    expect(ctx.getPackageManagerRunScript('dev')).toBe('pnpm dev')
  })

  it('should generate correct package manager scripts for npm', () => {
    const ctx = createTemplateContext(
      { ...baseOptions, packageManager: 'npm' },
      'src/index.tsx',
    )

    expect(ctx.getPackageManagerAddScript('react')).toBe('npm install react')
    expect(ctx.getPackageManagerAddScript('vitest', true)).toBe('npm install -D vitest')
    expect(ctx.getPackageManagerRunScript('dev')).toBe('npm run dev')
  })

  it('should collect hooks from integrations', () => {
    const ctx = createTemplateContext(
      {
        ...baseOptions,
        chosenIntegrations: [
          {
            id: 'test',
            name: 'Test',
            description: 'Test integration',
            type: 'integration',
            phase: 'integration',
            modes: ['file-router'],
            files: {},
            deletedFiles: [],
            hooks: [
              { type: 'root-provider', jsName: 'TestProvider', path: 'src/test.tsx' },
            ],
          },
        ],
      },
      'src/index.tsx',
    )

    expect(ctx.hooks).toHaveLength(1)
    expect(ctx.hooks[0]?.jsName).toBe('TestProvider')
  })

  it('should build integrationEnabled map', () => {
    const ctx = createTemplateContext(
      {
        ...baseOptions,
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
      },
      'src/index.tsx',
    )

    expect(ctx.integrationEnabled['tanstack-query']).toBe(true)
    expect(ctx.integrationEnabled['clerk']).toBeUndefined()
  })
})

describe('processTemplateFile', () => {
  it('should pass through non-EJS files unchanged', () => {
    const result = processTemplateFile(
      'src/utils.ts',
      'export const foo = 1',
      baseOptions,
    )

    expect(result).not.toBeNull()
    expect(result!.path).toBe('src/utils.ts')
    expect(result!.content).toBe('export const foo = 1')
    expect(result!.append).toBe(false)
  })

  it('should process EJS templates', () => {
    const result = processTemplateFile(
      'src/config.ts.ejs',
      'export const name = "<%= projectName %>"',
      baseOptions,
    )

    expect(result).not.toBeNull()
    expect(result!.path).toBe('src/config.ts')
    expect(result!.content).toBe('export const name = "test-project"')
  })

  it('should convert _dot_ prefix to dot', () => {
    const result = processTemplateFile(
      '_dot_gitignore',
      'node_modules',
      baseOptions,
    )

    expect(result).not.toBeNull()
    expect(result!.path).toBe('.gitignore')
  })

  it('should handle .append suffix', () => {
    const result = processTemplateFile(
      'src/styles.css.append',
      '.new-class { }',
      baseOptions,
    )

    expect(result).not.toBeNull()
    expect(result!.path).toBe('src/styles.css')
    expect(result!.append).toBe(true)
  })

  it('should convert .ts to .js when typescript is disabled', () => {
    const result = processTemplateFile('src/utils.ts', 'const x = 1', {
      ...baseOptions,
      typescript: false,
    })

    expect(result).not.toBeNull()
    expect(result!.path).toBe('src/utils.js')
  })

  it('should convert .tsx to .jsx when typescript is disabled', () => {
    const result = processTemplateFile(
      'src/App.tsx',
      'export default () => <div />',
      { ...baseOptions, typescript: false },
    )

    expect(result).not.toBeNull()
    expect(result!.path).toBe('src/App.jsx')
  })

  it('should return null when ignoreFile() is called', () => {
    const result = processTemplateFile(
      'src/conditional.ts.ejs',
      '<% ignoreFile() %>',
      baseOptions,
    )

    expect(result).toBeNull()
  })

  it('should process conditional EJS based on integrations', () => {
    const withQuery = processTemplateFile(
      'src/test.ts.ejs',
      '<% if (integrationEnabled["tanstack-query"]) { %>query enabled<% } else { %>no query<% } %>',
      {
        ...baseOptions,
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
      },
    )

    const withoutQuery = processTemplateFile(
      'src/test.ts.ejs',
      '<% if (integrationEnabled["tanstack-query"]) { %>query enabled<% } else { %>no query<% } %>',
      baseOptions,
    )

    expect(withQuery!.content).toBe('query enabled')
    expect(withoutQuery!.content).toBe('no query')
  })
})
