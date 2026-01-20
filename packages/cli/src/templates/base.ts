/**
 * Base TanStack Start template files
 * These provide the foundation for every project
 */

import { relativePath } from '../engine/template.js'
import type { CompileOptions, Hook } from '../engine/types.js'

/**
 * Hook with integration source tracking
 */
export type TrackedHook = Hook & { integrationId: string }

/**
 * Gitignore pattern with integration source tracking
 */
type TrackedGitignorePattern = { pattern: string; integrationId: string }

/**
 * Collect all hooks from integrations, grouped by type
 */
export function collectHooks(options: CompileOptions): {
  vitePlugins: Array<TrackedHook>
  rootProviders: Array<TrackedHook>
  devtoolsPlugins: Array<TrackedHook>
  entryClientInits: Array<TrackedHook>
} {
  const hooks: Array<TrackedHook> = []
  for (const integration of options.chosenIntegrations) {
    if (integration.hooks) {
      for (const hook of integration.hooks) {
        hooks.push({ ...hook, integrationId: integration.id })
      }
    }
  }

  return {
    vitePlugins: hooks.filter((i) => i.type === 'vite-plugin'),
    rootProviders: hooks.filter((i) => i.type === 'root-provider'),
    devtoolsPlugins: hooks.filter((i) => i.type === 'devtools'),
    entryClientInits: hooks.filter((i) => i.type === 'entry-client'),
  }
}

/**
 * Generate vite.config.ts content with line attribution
 */
export function generateViteConfig(
  options: CompileOptions,
  vitePlugins: Array<TrackedHook>,
): { content: string; lineAttributions: Array<{ line: number; integrationId: string }> } {
  const { tailwind } = options
  const lines: Array<{ text: string; integrationId: string }> = []

  // Base imports
  lines.push({ text: `import { defineConfig } from 'vite'`, integrationId: 'base' })
  lines.push({ text: `import { tanstackStart } from '@tanstack/react-start/plugin/vite'`, integrationId: 'base' })
  lines.push({ text: `import viteReact from '@vitejs/plugin-react'`, integrationId: 'base' })
  lines.push({ text: `import viteTsConfigPaths from 'vite-tsconfig-paths'`, integrationId: 'base' })

  if (tailwind) {
    lines.push({ text: `import tailwindcss from '@tailwindcss/vite'`, integrationId: 'base' })
  }

  // Plugin imports
  for (const plugin of vitePlugins) {
    // Use custom import if provided, otherwise generate one
    if (plugin.import) {
      lines.push({ text: plugin.import, integrationId: plugin.integrationId })
    } else {
      const importPath = relativePath(
        'vite.config.ts',
        plugin.path || `src/integrations/${plugin.integrationId}/vite-plugin.ts`,
        true,
      )
      lines.push({ text: `import ${plugin.jsName} from '${importPath}'`, integrationId: plugin.integrationId })
    }
  }

  lines.push({ text: '', integrationId: 'base' })
  lines.push({ text: `export default defineConfig({`, integrationId: 'base' })
  lines.push({ text: `  plugins: [`, integrationId: 'base' })
  lines.push({ text: `    viteTsConfigPaths({`, integrationId: 'base' })
  lines.push({ text: `      projects: ['./tsconfig.json'],`, integrationId: 'base' })
  lines.push({ text: `    }),`, integrationId: 'base' })

  if (tailwind) {
    lines.push({ text: `    tailwindcss(),`, integrationId: 'base' })
  }

  lines.push({ text: `    tanstackStart(),`, integrationId: 'base' })
  lines.push({ text: `    viteReact(),`, integrationId: 'base' })

  // Plugin calls
  for (const plugin of vitePlugins) {
    // Use custom code if provided, otherwise call jsName()
    const pluginCall = plugin.code || `${plugin.jsName}()`
    lines.push({ text: `    ${pluginCall},`, integrationId: plugin.integrationId })
  }

  lines.push({ text: `  ],`, integrationId: 'base' })
  lines.push({ text: `})`, integrationId: 'base' })

  const content = lines.map((l) => l.text).join('\n')
  const lineAttributions = lines.map((l, i) => ({ line: i + 1, integrationId: l.integrationId }))

  return { content, lineAttributions }
}

/**
 * Generate entry-client.tsx content with line attribution
 */
export function generateEntryClient(
  _options: CompileOptions,
  entryClientInits: Array<TrackedHook>,
): { content: string; lineAttributions: Array<{ line: number; integrationId: string }> } {
  const lines: Array<{ text: string; integrationId: string }> = []

  lines.push({ text: `import { hydrateRoot } from 'react-dom/client'`, integrationId: 'base' })
  lines.push({ text: `import { StartClient } from '@tanstack/react-start'`, integrationId: 'base' })
  lines.push({ text: `import { getRouter } from './router'`, integrationId: 'base' })

  // Hook imports
  for (const init of entryClientInits) {
    const importPath = relativePath(
      'src/entry-client.tsx',
      init.path || `src/integrations/${init.integrationId}/client.ts`,
      true,
    )
    lines.push({ text: `import { ${init.jsName} } from '${importPath}'`, integrationId: init.integrationId })
  }

  lines.push({ text: '', integrationId: 'base' })

  // Hook calls
  if (entryClientInits.length > 0) {
    lines.push({ text: `// Initialize integrations`, integrationId: 'base' })
    for (const init of entryClientInits) {
      lines.push({ text: `${init.jsName}()`, integrationId: init.integrationId })
    }
    lines.push({ text: '', integrationId: 'base' })
  }

  lines.push({ text: `const router = getRouter()`, integrationId: 'base' })
  lines.push({ text: '', integrationId: 'base' })
  lines.push({ text: `hydrateRoot(document.getElementById('root')!, <StartClient router={router} />)`, integrationId: 'base' })

  const content = lines.map((l) => l.text).join('\n')
  const lineAttributions = lines.map((l, i) => ({ line: i + 1, integrationId: l.integrationId }))

  return { content, lineAttributions }
}

/**
 * Generate __root.tsx content with line attribution
 */
export function generateRootRoute(
  _options: CompileOptions,
  rootProviders: Array<TrackedHook>,
  devtoolsPlugins: Array<TrackedHook>,
): { content: string; lineAttributions: Array<{ line: number; integrationId: string }> } {
  const lines: Array<{ text: string; integrationId: string }> = []

  if (devtoolsPlugins.length > 0) {
    lines.push({ text: `import React from 'react'`, integrationId: 'base' })
  }
  lines.push({ text: `import { Outlet, createRootRoute } from '@tanstack/react-router'`, integrationId: 'base' })
  lines.push({ text: `import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'`, integrationId: 'base' })

  lines.push({ text: `import '../styles.css'`, integrationId: 'base' })

  // Provider imports
  for (const provider of rootProviders) {
    const importPath = relativePath(
      'src/routes/__root.tsx',
      provider.path || `src/integrations/${provider.integrationId}/provider.tsx`,
      true,
    )
    lines.push({ text: `import { ${provider.jsName} } from '${importPath}'`, integrationId: provider.integrationId })
  }

  // Devtools imports
  for (const devtools of devtoolsPlugins) {
    const importPath = relativePath(
      'src/routes/__root.tsx',
      devtools.path || `src/integrations/${devtools.integrationId}/devtools.tsx`,
      true,
    )
    lines.push({ text: `import { ${devtools.jsName} } from '${importPath}'`, integrationId: devtools.integrationId })
  }

  // Devtools array
  if (devtoolsPlugins.length > 0) {
    lines.push({ text: '', integrationId: 'base' })
    lines.push({ text: `const devtoolsPlugins = [`, integrationId: 'base' })
    for (const devtools of devtoolsPlugins) {
      lines.push({ text: `  ${devtools.jsName},`, integrationId: devtools.integrationId })
    }
    lines.push({ text: `]`, integrationId: 'base' })
  }

  lines.push({ text: '', integrationId: 'base' })
  lines.push({ text: `export const Route = createRootRoute({`, integrationId: 'base' })
  lines.push({ text: `  component: RootComponent,`, integrationId: 'base' })
  lines.push({ text: `})`, integrationId: 'base' })
  lines.push({ text: '', integrationId: 'base' })
  lines.push({ text: `function RootComponent() {`, integrationId: 'base' })
  lines.push({ text: `  return (`, integrationId: 'base' })
  lines.push({ text: `    <>`, integrationId: 'base' })

  // Build provider tree
  const indent = '      '
  let currentIndent = indent
  for (const provider of rootProviders) {
    lines.push({ text: `${currentIndent}<${provider.jsName}>`, integrationId: provider.integrationId })
    currentIndent += '  '
  }

  lines.push({ text: `${currentIndent}<Outlet />`, integrationId: 'base' })

  for (const provider of [...rootProviders].reverse()) {
    currentIndent = currentIndent.slice(0, -2)
    lines.push({ text: `${currentIndent}</${provider.jsName}>`, integrationId: provider.integrationId })
  }

  lines.push({ text: `      <TanStackRouterDevtools />`, integrationId: 'base' })

  if (devtoolsPlugins.length > 0) {
    lines.push({ text: `      {devtoolsPlugins.map((plugin, i) => (`, integrationId: 'base' })
    lines.push({ text: `        <React.Fragment key={i}>{plugin.render}</React.Fragment>`, integrationId: 'base' })
    lines.push({ text: `      ))}`, integrationId: 'base' })
  }

  lines.push({ text: `    </>`, integrationId: 'base' })
  lines.push({ text: `  )`, integrationId: 'base' })
  lines.push({ text: `}`, integrationId: 'base' })

  const content = lines.map((l) => l.text).join('\n')
  const lineAttributions = lines.map((l, i) => ({ line: i + 1, integrationId: l.integrationId }))

  return { content, lineAttributions }
}

/**
 * Generate .gitignore content with line attribution
 */
export function generateGitignore(
  integrationPatterns: Array<TrackedGitignorePattern>,
): { content: string; lineAttributions: Array<{ line: number; integrationId: string }> } {
  const lines: Array<{ text: string; integrationId: string }> = []

  // Dependencies
  lines.push({ text: '# Dependencies', integrationId: 'base' })
  lines.push({ text: 'node_modules/', integrationId: 'base' })
  lines.push({ text: '.pnpm-store/', integrationId: 'base' })
  lines.push({ text: '', integrationId: 'base' })

  // Build outputs
  lines.push({ text: '# Build outputs', integrationId: 'base' })
  lines.push({ text: 'dist/', integrationId: 'base' })
  lines.push({ text: '.output/', integrationId: 'base' })
  lines.push({ text: '.vinxi/', integrationId: 'base' })
  lines.push({ text: '.vercel/', integrationId: 'base' })
  lines.push({ text: '.netlify/', integrationId: 'base' })
  lines.push({ text: '', integrationId: 'base' })

  // Environment
  lines.push({ text: '# Environment', integrationId: 'base' })
  lines.push({ text: '.env', integrationId: 'base' })
  lines.push({ text: '.env.*', integrationId: 'base' })
  lines.push({ text: '!.env.example', integrationId: 'base' })
  lines.push({ text: '', integrationId: 'base' })

  // IDE
  lines.push({ text: '# IDE', integrationId: 'base' })
  lines.push({ text: '.idea/', integrationId: 'base' })
  lines.push({ text: '.vscode/', integrationId: 'base' })
  lines.push({ text: '*.swp', integrationId: 'base' })
  lines.push({ text: '*.swo', integrationId: 'base' })
  lines.push({ text: '', integrationId: 'base' })

  // OS
  lines.push({ text: '# OS', integrationId: 'base' })
  lines.push({ text: '.DS_Store', integrationId: 'base' })
  lines.push({ text: 'Thumbs.db', integrationId: 'base' })
  lines.push({ text: '', integrationId: 'base' })

  // Logs
  lines.push({ text: '# Logs', integrationId: 'base' })
  lines.push({ text: '*.log', integrationId: 'base' })
  lines.push({ text: 'npm-debug.log*', integrationId: 'base' })
  lines.push({ text: 'pnpm-debug.log*', integrationId: 'base' })
  lines.push({ text: '', integrationId: 'base' })

  // Generated
  lines.push({ text: '# Generated', integrationId: 'base' })
  lines.push({ text: 'src/routeTree.gen.ts', integrationId: 'base' })

  // Integration patterns
  if (integrationPatterns.length > 0) {
    lines.push({ text: '', integrationId: 'base' })
    lines.push({ text: '# Integration-specific', integrationId: 'base' })
    for (const { pattern, integrationId } of integrationPatterns) {
      lines.push({ text: pattern, integrationId })
    }
  }

  const content = lines.map((l) => l.text).join('\n')
  const lineAttributions = lines.map((l, i) => ({ line: i + 1, integrationId: l.integrationId }))

  return { content, lineAttributions }
}

/**
 * Get base template files (static files without hook injection)
 */
export function getBaseFiles(options: CompileOptions): Record<string, string> {
  const { projectName, typescript, tailwind, packageManager } = options

  const files: Record<string, string> = {}

  // Collect hooks
  const { vitePlugins, rootProviders, devtoolsPlugins, entryClientInits } =
    collectHooks(options)

  // tsconfig.json
  if (typescript) {
    files['tsconfig.json'] = JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          moduleDetection: 'force',
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true,
          noUncheckedIndexedAccess: true,
          paths: {
            '~/*': ['./src/*'],
          },
        },
        include: ['src'],
      },
      null,
      2,
    )
  }

  // vite.config.ts (with hooks)
  const viteConfig = generateViteConfig(options, vitePlugins)
  files[typescript ? 'vite.config.ts' : 'vite.config.js'] = viteConfig.content

  // Note: index.html is NOT needed - TanStack Start generates it automatically

  // src/entry-client.tsx - only if there are hooks that need it
  if (entryClientInits.length > 0) {
    const entryClient = generateEntryClient(options, entryClientInits)
    files[`src/entry-client.${typescript ? 'tsx' : 'jsx'}`] = entryClient.content
  }

  // src/router.tsx - required by TanStack Start
  files[`src/router.${typescript ? 'tsx' : 'jsx'}`] = `import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
`

  // src/routes/__root.tsx (with hooks)
  const rootRoute = generateRootRoute(options, rootProviders, devtoolsPlugins)
  files[`src/routes/__root.${typescript ? 'tsx' : 'jsx'}`] = rootRoute.content

  // src/routes/index.tsx
  files[`src/routes/index.${typescript ? 'tsx' : 'jsx'}`] = tailwind
    ? `import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4">
          Welcome to TanStack Start
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Full-stack React framework powered by TanStack Router
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="https://tanstack.com/start"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors"
          >
            Documentation
          </a>
          <a
            href="https://github.com/tanstack/router"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </div>
  )
}
`
    : `import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Welcome to TanStack Start</h1>
        <p style={styles.subtitle}>
          Full-stack React framework powered by TanStack Router
        </p>
        <div style={styles.buttons}>
          <a
            href="https://tanstack.com/start"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.primaryButton}
          >
            Documentation
          </a>
          <a
            href="https://github.com/tanstack/router"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.secondaryButton}
          >
            GitHub
          </a>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom right, #111827, #1f2937)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '3rem',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '1rem',
  },
  subtitle: {
    fontSize: '1.25rem',
    color: '#d1d5db',
    marginBottom: '2rem',
  },
  buttons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
  },
  primaryButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#06b6d4',
    color: 'white',
    borderRadius: '0.5rem',
    fontWeight: 500,
    textDecoration: 'none',
  },
  secondaryButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#374151',
    color: 'white',
    borderRadius: '0.5rem',
    fontWeight: 500,
    textDecoration: 'none',
  },
}
`

  // styles.css
  if (tailwind) {
    files['src/styles.css'] = `@import 'tailwindcss';
`
  } else {
    files['src/styles.css'] = `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.5;
}
`
  }

  // .gitignore - collect integration patterns
  const gitignorePatterns: Array<TrackedGitignorePattern> = []
  for (const integration of options.chosenIntegrations) {
    if (integration.gitignorePatterns) {
      for (const pattern of integration.gitignorePatterns) {
        gitignorePatterns.push({ pattern, integrationId: integration.id })
      }
    }
  }
  const gitignore = generateGitignore(gitignorePatterns)
  files['.gitignore'] = gitignore.content

  // .env.example
  files['.env.example'] = `# Add your environment variables here
# Copy this file to .env.local and fill in your values

# Example:
# DATABASE_URL=postgresql://user:password@localhost:5432/db
`

  // README.md
  files['README.md'] = `# ${projectName}

A full-stack React application built with [TanStack Start](https://tanstack.com/start).

## Getting Started

\`\`\`bash
# Install dependencies
${packageManager} install

# Start development server
${packageManager}${packageManager === 'npm' ? ' run' : ''} dev
\`\`\`

## Scripts

- \`dev\` - Start development server
- \`build\` - Build for production
- \`start\` - Start production server

## Learn More

- [TanStack Start Documentation](https://tanstack.com/start)
- [TanStack Router Documentation](https://tanstack.com/router)
`

  return files
}

/**
 * Get base files WITH line-by-line attribution for files that have hooks
 */
export function getBaseFilesWithAttribution(options: CompileOptions): {
  files: Record<string, string>
  attributions: Record<string, Array<{ line: number; integrationId: string }>>
} {
  const { typescript } = options
  const files = getBaseFiles(options)
  const attributions: Record<string, Array<{ line: number; integrationId: string }>> = {}

  // Collect hooks
  const { vitePlugins, rootProviders, devtoolsPlugins, entryClientInits } =
    collectHooks(options)

  // Generate attributed versions
  const viteConfig = generateViteConfig(options, vitePlugins)
  attributions[typescript ? 'vite.config.ts' : 'vite.config.js'] = viteConfig.lineAttributions

  // Only attribute entry-client if it was generated
  if (entryClientInits.length > 0) {
    const entryClient = generateEntryClient(options, entryClientInits)
    attributions[`src/entry-client.${typescript ? 'tsx' : 'jsx'}`] = entryClient.lineAttributions
  }

  const rootRoute = generateRootRoute(options, rootProviders, devtoolsPlugins)
  attributions[`src/routes/__root.${typescript ? 'tsx' : 'jsx'}`] = rootRoute.lineAttributions

  // Gitignore attribution
  const gitignorePatterns: Array<TrackedGitignorePattern> = []
  for (const integration of options.chosenIntegrations) {
    if (integration.gitignorePatterns) {
      for (const pattern of integration.gitignorePatterns) {
        gitignorePatterns.push({ pattern, integrationId: integration.id })
      }
    }
  }
  const gitignore = generateGitignore(gitignorePatterns)
  attributions['.gitignore'] = gitignore.lineAttributions

  return { files, attributions }
}
