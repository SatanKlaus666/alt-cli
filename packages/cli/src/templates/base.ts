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
 * This generates a full document route with shellComponent for proper SSR
 */
export function generateRootRoute(
  options: CompileOptions,
  rootProviders: Array<TrackedHook>,
  devtoolsPlugins: Array<TrackedHook>,
): { content: string; lineAttributions: Array<{ line: number; integrationId: string }> } {
  const lines: Array<{ text: string; integrationId: string }> = []
  const hasHeader = options.chosenIntegrations.length > 0

  lines.push({ text: `import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'`, integrationId: 'base' })
  lines.push({ text: `import { TanStackDevtools } from '@tanstack/react-devtools'`, integrationId: 'base' })
  lines.push({ text: `import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'`, integrationId: 'base' })

  lines.push({ text: `import appCss from '../styles.css?url'`, integrationId: 'base' })
  if (hasHeader) {
    lines.push({ text: `import { Header } from '../components/Header'`, integrationId: 'base' })
  }

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

  lines.push({ text: '', integrationId: 'base' })
  lines.push({ text: `export const Route = createRootRoute({`, integrationId: 'base' })
  lines.push({ text: `  head: () => ({`, integrationId: 'base' })
  lines.push({ text: `    meta: [`, integrationId: 'base' })
  lines.push({ text: `      { charSet: 'utf-8' },`, integrationId: 'base' })
  lines.push({ text: `      { name: 'viewport', content: 'width=device-width, initial-scale=1' },`, integrationId: 'base' })
  lines.push({ text: `      { title: 'TanStack Start Starter' },`, integrationId: 'base' })
  lines.push({ text: `    ],`, integrationId: 'base' })
  lines.push({ text: `    links: [{ rel: 'stylesheet', href: appCss }],`, integrationId: 'base' })
  lines.push({ text: `  }),`, integrationId: 'base' })
  lines.push({ text: `  shellComponent: RootDocument,`, integrationId: 'base' })
  lines.push({ text: `})`, integrationId: 'base' })
  lines.push({ text: '', integrationId: 'base' })
  lines.push({ text: `function RootDocument({ children }: { children: React.ReactNode }) {`, integrationId: 'base' })
  lines.push({ text: `  return (`, integrationId: 'base' })
  lines.push({ text: `    <html lang="en">`, integrationId: 'base' })
  lines.push({ text: `      <head>`, integrationId: 'base' })
  lines.push({ text: `        <HeadContent />`, integrationId: 'base' })
  lines.push({ text: `      </head>`, integrationId: 'base' })
  lines.push({ text: `      <body>`, integrationId: 'base' })

  // Build provider tree
  const indent = '        '
  let currentIndent = indent
  for (const provider of rootProviders) {
    lines.push({ text: `${currentIndent}<${provider.jsName}>`, integrationId: provider.integrationId })
    currentIndent += '  '
  }

  if (hasHeader) {
    lines.push({ text: `${currentIndent}<Header />`, integrationId: 'base' })
  }
  lines.push({ text: `${currentIndent}{children}`, integrationId: 'base' })

  // TanStack unified devtools with plugins
  lines.push({ text: `${currentIndent}<TanStackDevtools`, integrationId: 'base' })
  lines.push({ text: `${currentIndent}  config={{ position: 'bottom-right' }}`, integrationId: 'base' })
  lines.push({ text: `${currentIndent}  plugins={[`, integrationId: 'base' })
  lines.push({ text: `${currentIndent}    { name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel /> },`, integrationId: 'base' })
  for (const devtools of devtoolsPlugins) {
    lines.push({ text: `${currentIndent}    ${devtools.jsName},`, integrationId: devtools.integrationId })
  }
  lines.push({ text: `${currentIndent}  ]}`, integrationId: 'base' })
  lines.push({ text: `${currentIndent}/>`, integrationId: 'base' })

  for (const provider of [...rootProviders].reverse()) {
    currentIndent = currentIndent.slice(0, -2)
    lines.push({ text: `${currentIndent}</${provider.jsName}>`, integrationId: provider.integrationId })
  }

  lines.push({ text: `        <Scripts />`, integrationId: 'base' })
  lines.push({ text: `      </body>`, integrationId: 'base' })
  lines.push({ text: `    </html>`, integrationId: 'base' })
  lines.push({ text: `  )`, integrationId: 'base' })
  lines.push({ text: `}`, integrationId: 'base' })

  const content = lines.map((l) => l.text).join('\n')
  const lineAttributions = lines.map((l, i) => ({ line: i + 1, integrationId: l.integrationId }))

  return { content, lineAttributions }
}

/**
 * Collect routes from integrations for navigation
 */
function collectRoutes(options: CompileOptions): Array<{ url: string; name: string; icon: string }> {
  const routes: Array<{ url: string; name: string; icon: string }> = []
  for (const integration of options.chosenIntegrations) {
    if (integration.routes) {
      for (const route of integration.routes) {
        if (route.url && route.name) {
          routes.push({
            url: route.url,
            name: route.name,
            icon: route.icon || 'Globe',
          })
        }
      }
    }
  }
  return routes
}

/**
 * Generate Header component with slide-out drawer navigation
 */
export function generateHeader(
  options: CompileOptions,
): { content: string; lineAttributions: Array<{ line: number; integrationId: string }> } {
  const lines: Array<{ text: string; integrationId: string }> = []
  const routes = collectRoutes(options)

  // Collect unique icons
  const icons = new Set(['Menu', 'X', 'Home'])
  for (const route of routes) {
    icons.add(route.icon)
  }

  lines.push({ text: `import { useState } from 'react'`, integrationId: 'base' })
  lines.push({ text: `import { Link } from '@tanstack/react-router'`, integrationId: 'base' })
  lines.push({ text: `import { ${Array.from(icons).sort().join(', ')} } from 'lucide-react'`, integrationId: 'base' })
  lines.push({ text: '', integrationId: 'base' })
  lines.push({ text: `export function Header() {`, integrationId: 'base' })
  lines.push({ text: `  const [isOpen, setIsOpen] = useState(false)`, integrationId: 'base' })
  lines.push({ text: '', integrationId: 'base' })
  lines.push({ text: `  return (`, integrationId: 'base' })
  lines.push({ text: `    <>`, integrationId: 'base' })
  lines.push({ text: `      <header className="p-4 flex items-center bg-gray-800 text-white shadow-lg">`, integrationId: 'base' })
  lines.push({ text: `        <button`, integrationId: 'base' })
  lines.push({ text: `          onClick={() => setIsOpen(true)}`, integrationId: 'base' })
  lines.push({ text: `          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"`, integrationId: 'base' })
  lines.push({ text: `          aria-label="Open menu"`, integrationId: 'base' })
  lines.push({ text: `        >`, integrationId: 'base' })
  lines.push({ text: `          <Menu size={24} />`, integrationId: 'base' })
  lines.push({ text: `        </button>`, integrationId: 'base' })
  lines.push({ text: `        <h1 className="ml-4 text-xl font-semibold">`, integrationId: 'base' })
  lines.push({ text: `          <Link to="/">`, integrationId: 'base' })
  lines.push({ text: `            <img`, integrationId: 'base' })
  lines.push({ text: `              src="/tanstack-logo-light.svg"`, integrationId: 'base' })
  lines.push({ text: `              alt="TanStack Logo"`, integrationId: 'base' })
  lines.push({ text: `              className="h-10"`, integrationId: 'base' })
  lines.push({ text: `            />`, integrationId: 'base' })
  lines.push({ text: `          </Link>`, integrationId: 'base' })
  lines.push({ text: `        </h1>`, integrationId: 'base' })
  lines.push({ text: `      </header>`, integrationId: 'base' })
  lines.push({ text: '', integrationId: 'base' })
  lines.push({ text: `      <aside`, integrationId: 'base' })
  lines.push({ text: `        className={\`fixed top-0 left-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col \${`, integrationId: 'base' })
  lines.push({ text: `          isOpen ? 'translate-x-0' : '-translate-x-full'`, integrationId: 'base' })
  lines.push({ text: `        }\`}`, integrationId: 'base' })
  lines.push({ text: `      >`, integrationId: 'base' })
  lines.push({ text: `        <div className="flex items-center justify-between p-4 border-b border-gray-700">`, integrationId: 'base' })
  lines.push({ text: `          <h2 className="text-xl font-bold">Navigation</h2>`, integrationId: 'base' })
  lines.push({ text: `          <button`, integrationId: 'base' })
  lines.push({ text: `            onClick={() => setIsOpen(false)}`, integrationId: 'base' })
  lines.push({ text: `            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"`, integrationId: 'base' })
  lines.push({ text: `            aria-label="Close menu"`, integrationId: 'base' })
  lines.push({ text: `          >`, integrationId: 'base' })
  lines.push({ text: `            <X size={24} />`, integrationId: 'base' })
  lines.push({ text: `          </button>`, integrationId: 'base' })
  lines.push({ text: `        </div>`, integrationId: 'base' })
  lines.push({ text: '', integrationId: 'base' })
  lines.push({ text: `        <nav className="flex-1 p-4 overflow-y-auto">`, integrationId: 'base' })
  lines.push({ text: `          <Link`, integrationId: 'base' })
  lines.push({ text: `            to="/"`, integrationId: 'base' })
  lines.push({ text: `            onClick={() => setIsOpen(false)}`, integrationId: 'base' })
  lines.push({ text: `            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"`, integrationId: 'base' })
  lines.push({ text: `            activeProps={{`, integrationId: 'base' })
  lines.push({ text: `              className: 'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',`, integrationId: 'base' })
  lines.push({ text: `            }}`, integrationId: 'base' })
  lines.push({ text: `          >`, integrationId: 'base' })
  lines.push({ text: `            <Home size={20} />`, integrationId: 'base' })
  lines.push({ text: `            <span className="font-medium">Home</span>`, integrationId: 'base' })
  lines.push({ text: `          </Link>`, integrationId: 'base' })

  // Add integration routes
  for (const route of routes) {
    const integrationId = options.chosenIntegrations.find(i =>
      i.routes?.some(r => r.url === route.url)
    )?.id || 'base'

    lines.push({ text: '', integrationId })
    lines.push({ text: `          <Link`, integrationId })
    lines.push({ text: `            to="${route.url}"`, integrationId })
    lines.push({ text: `            onClick={() => setIsOpen(false)}`, integrationId })
    lines.push({ text: `            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"`, integrationId })
    lines.push({ text: `            activeProps={{`, integrationId })
    lines.push({ text: `              className: 'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',`, integrationId })
    lines.push({ text: `            }}`, integrationId })
    lines.push({ text: `          >`, integrationId })
    lines.push({ text: `            <${route.icon} size={20} />`, integrationId })
    lines.push({ text: `            <span className="font-medium">${route.name}</span>`, integrationId })
    lines.push({ text: `          </Link>`, integrationId })
  }

  lines.push({ text: `        </nav>`, integrationId: 'base' })
  lines.push({ text: `      </aside>`, integrationId: 'base' })
  lines.push({ text: '', integrationId: 'base' })
  lines.push({ text: `      {isOpen && (`, integrationId: 'base' })
  lines.push({ text: `        <div`, integrationId: 'base' })
  lines.push({ text: `          className="fixed inset-0 bg-black/50 z-40"`, integrationId: 'base' })
  lines.push({ text: `          onClick={() => setIsOpen(false)}`, integrationId: 'base' })
  lines.push({ text: `        />`, integrationId: 'base' })
  lines.push({ text: `      )}`, integrationId: 'base' })
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

  // src/components/Header.tsx - only when there are integrations
  const hasHeader = options.chosenIntegrations.length > 0
  if (hasHeader && tailwind) {
    const header = generateHeader(options)
    files[`src/components/Header.${typescript ? 'tsx' : 'jsx'}`] = header.content
  }

  // src/routes/index.tsx
  // When there's a header, we need to account for its height
  const indexRouteWithHeader = `import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="min-h-[calc(100vh-72px)] bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
      <div className="text-center px-4">
        <img
          src="/tanstack-logo-dark.svg"
          alt="TanStack Logo"
          className="h-24 mx-auto mb-8"
        />
        <h1 className="text-5xl font-bold text-white mb-4">
          Welcome to TanStack Start
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Full-stack React framework powered by TanStack Router
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
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

  const indexRouteNoHeader = `import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
      <div className="text-center px-4">
        <img
          src="/tanstack-logo-dark.svg"
          alt="TanStack Logo"
          className="h-24 mx-auto mb-8"
        />
        <h1 className="text-5xl font-bold text-white mb-4">
          Welcome to TanStack Start
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Full-stack React framework powered by TanStack Router
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
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

  const indexRouteNoTailwind = `import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <img
          src="/tanstack-logo-dark.svg"
          alt="TanStack Logo"
          style={styles.logo}
        />
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
    padding: '0 1rem',
  },
  logo: {
    height: '6rem',
    marginBottom: '2rem',
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
    flexWrap: 'wrap' as const,
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

  if (tailwind) {
    files[`src/routes/index.${typescript ? 'tsx' : 'jsx'}`] = hasHeader
      ? indexRouteWithHeader
      : indexRouteNoHeader
  } else {
    files[`src/routes/index.${typescript ? 'tsx' : 'jsx'}`] = indexRouteNoTailwind
  }

  // styles.css
  if (tailwind) {
    files['src/styles.css'] = `@import 'tailwindcss';

body {
  @apply m-0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
`
  } else {
    files['src/styles.css'] = `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.5;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
`
  }

  // Public assets - TanStack logos
  // Light version (white fill) for dark backgrounds like header
  files['public/tanstack-logo-light.svg'] = `<svg height="660" viewBox="0 0 663 660" width="663" xmlns="http://www.w3.org/2000/svg"><path d="m305.114318.62443771c8.717817-1.14462121 17.926803-.36545135 26.712694-.36545135 32.548987 0 64.505987 5.05339923 95.64868 14.63098274 39.74418 12.2236582 76.762804 31.7666864 109.435876 57.477568 40.046637 31.5132839 73.228974 72.8472109 94.520714 119.2362609 39.836383 86.790386 39.544267 191.973146-1.268422 278.398081-26.388695 55.880442-68.724007 102.650458-119.964986 136.75724-41.808813 27.828603-90.706831 44.862601-140.45707 50.89341-63.325458 7.677926-131.784923-3.541603-188.712259-32.729444-106.868873-54.795293-179.52309291-165.076271-180.9604082-285.932068-.27660564-23.300971.08616998-46.74071 4.69884909-69.814998 7.51316071-37.57857 20.61272131-73.903917 40.28618971-106.877282 21.2814003-35.670293 48.7704861-67.1473767 81.6882804-92.5255597 38.602429-29.7610135 83.467691-51.1674988 130.978372-62.05777669 11.473831-2.62966514 22.9946-4.0869914 34.57273-5.4964306l3.658171-.44480576c3.050084-.37153079 6.104217-.74794222 9.162589-1.14972654zm-110.555861 549.44131429c-14.716752 1.577863-30.238964 4.25635-42.869928 12.522173 2.84343.683658 6.102369.004954 9.068638 0 7.124652-.011559 14.317732-.279903 21.434964.032202 17.817402.781913 36.381729 3.63214 53.58741 8.350042 22.029372 6.040631 41.432961 17.928687 62.656049 25.945156 22.389644 8.456554 44.67706 11.084675 68.427 11.084675 11.96813 0 23.845573-.035504 35.450133-3.302696-6.056202-3.225083-14.72582-2.619864-21.434964-3.963236-14.556814-2.915455-28.868774-6.474936-42.869928-11.470264-10.304996-3.676672-20.230803-8.214291-30.11097-12.848661l-6.348531-2.985046c-9.1705-4.309263-18.363277-8.560752-27.845391-12.142608-24.932161-9.418465-52.560181-14.071964-79.144482-11.221737zm22.259385-62.614168c-29.163917 0-58.660076 5.137344-84.915434 18.369597-6.361238 3.206092-12.407546 7.02566-18.137277 11.258891-1.746125 1.290529-4.841829 2.948483-5.487351 5.191839-.654591 2.275558 1.685942 4.182039 3.014086 5.637703 6.562396-3.497556 12.797498-7.199878 19.78612-9.855246 45.19892-17.169893 99.992458-13.570779 145.098218 2.172348 22.494346 7.851335 43.219483 19.592421 65.129314 28.800338 24.503461 10.297807 49.53043 16.975034 75.846795 20.399104 31.04195 4.037546 66.433549.7654 94.808495-13.242161 9.970556-4.921843 23.814245-12.422267 28.030337-23.320339-5.207047.454947-9.892236 2.685918-14.83959 4.224149-7.866632 2.445646-15.827248 4.51974-23.908229 6.138887-27.388113 5.486604-56.512458 6.619429-84.091013 1.639788-25.991939-4.693152-50.142596-14.119246-74.179513-24.03502l-3.068058-1.268177c-2.045137-.846788-4.089983-1.695816-6.135603-2.544467l-3.069142-1.272366c-12.279956-5.085721-24.606928-10.110797-37.210937-14.51024-24.485325-8.546552-50.726667-13.784628-76.671218-13.784628zm51.114145-447.9909432c-34.959602 7.7225298-66.276908 22.7605319-96.457338 41.7180089-17.521434 11.0054099-34.281927 22.2799893-49.465301 36.4444283-22.5792616 21.065423-39.8360564 46.668751-54.8866988 73.411509-15.507372 27.55357-25.4498976 59.665686-30.2554517 90.824149-4.7140432 30.568106-5.4906485 62.70747-.0906864 93.301172 6.7503648 38.248526 19.5989769 74.140579 39.8896436 107.337631 6.8187918-3.184625 11.659796-10.445603 17.3128555-15.336896 11.4149428-9.875888 23.3995608-19.029311 36.2745548-26.928535 4.765981-2.923712 9.662222-5.194315 14.83959-7.275014 1.953055-.785216 5.14604-1.502727 6.06527-3.647828 1.460876-3.406732-1.240754-9.335897-1.704904-12.865654-1.324845-10.095517-2.124534-20.362774-1.874735-30.549941.725492-29.668947 6.269727-59.751557 16.825623-87.521453 7.954845-20.924233 20.10682-39.922168 34.502872-56.971512 4.884699-5.785498 10.077731-11.170545 15.437296-16.512656 3.167428-3.157378 7.098271-5.858983 9.068639-9.908915-10.336599.006606-20.674847 2.987289-30.503603 6.013385-21.174447 6.519522-41.801477 16.19312-59.358362 29.841512-8.008432 6.226409-13.873368 14.387371-21.44733 20.939921-2.32322 2.010516-6.484901 4.704691-9.695199 3.187928-4.8500728-2.29042-4.1014979-11.835213-4.6571581-16.222019-2.1369011-16.873476 4.2548401-38.216325 12.3778671-52.843142 13.039878-23.479694 37.150915-43.528712 65.467327-42.82854 12.228647.302197 22.934587 4.551115 34.625711 7.324555-2.964621-4.211764-6.939158-7.28162-10.717482-10.733763-9.257431-8.459031-19.382979-16.184864-30.503603-22.028985-4.474136-2.350694-9.291232-3.77911-14.015169-5.506421-2.375159-.867783-5.36616-2.062533-6.259834-4.702213-1.654614-4.888817 7.148561-9.416813 10.381943-11.478522 12.499882-7.969406 27.826705-14.525258 42.869928-14.894334 23.509209-.577147 46.479246 12.467678 56.162903 34.665926 3.404469 7.803171 4.411273 16.054969 5.079109 24.382907l.121749 1.56229.174325 2.345587c.01913.260708.038244.521433.057403.782164l.11601 1.56437.120128 1.563971c7.38352-6.019164 12.576553-14.876995 19.78612-21.323859 16.861073-15.07846 39.936636-21.7722 61.831627-14.984333 19.786945 6.133107 36.984382 19.788105 47.105807 37.959541 2.648042 4.754231 10.035685 16.373942 4.698379 21.109183-4.177345 3.707277-9.475079.818243-13.880788-.719162-3.33605-1.16376-6.782939-1.90214-10.241828-2.585698l-1.887262-.369639c-.629089-.122886-1.257979-.246187-1.886079-.372129-11.980496-2.401886-25.91652-2.152533-37.923398-.041284-7.762754 1.364839-15.349083 4.127545-23.083807 5.271929v1.651348c21.149714.175043 41.608563 12.240618 52.043268 30.549941 4.323267 7.585468 6.482428 16.267431 8.138691 24.770223 2.047864 10.50918.608423 21.958802-2.263037 32.201289-.962925 3.433979-2.710699 9.255807-6.817143 10.046802-2.902789.558982-5.36781-2.330878-7.024898-4.279468-4.343878-5.10762-8.475879-9.96341-13.573278-14.374161-12.895604-11.157333-26.530715-21.449361-40.396663-31.373138-7.362086-5.269452-15.425755-12.12007-23.908229-15.340199 2.385052 5.745041 4.721463 11.086326 5.532694 17.339156 2.385876 18.392716-5.314223 35.704625-16.87179 49.540445-3.526876 4.222498-7.29943 8.475545-11.744712 11.755948-1.843407 1.360711-4.156734 3.137561-6.595373 2.752797-7.645687-1.207961-8.555849-12.73272-9.728176-18.637115-3.970415-19.998652-2.375984-39.861068 3.132802-59.448534-4.901187 2.485279-8.443727 7.923994-11.521293 12.385111-6.770975 9.816439-12.645804 20.199291-16.858599 31.375615-16.777806 44.519521-16.616219 96.664142 5.118834 139.523233 2.427098 4.786433 6.110614 4.144058 10.894733 4.144058.720854 0 1.44257-.004515 2.164851-.010924l2.168232-.022283c4.338648-.045438 8.686803-.064635 12.979772.508795 2.227588.297243 5.320818.032202 7.084256 1.673642 2.111344 1.966755.986008 5.338808.4996 7.758859-1.358647 6.765574-1.812904 12.914369-1.812904 19.816178 9.02412-1.398692 11.525415-15.866153 14.724172-23.118874 3.624982-8.216283 7.313444-16.440823 10.667192-24.770223 1.648843-4.093692 3.854171-8.671229 3.275427-13.210785-.649644-5.10184-4.335633-10.510831-6.904531-14.862134-4.86244-8.234447-10.389363-16.70834-13.969002-25.595896-2.861567-7.104926-.197036-15.983399 7.871579-18.521521 4.450228-1.400344 9.198073 1.345848 12.094266 4.562675 6.07269 6.74328 9.992815 16.777697 14.401823 24.692609l34.394873 61.925556c2.920926 5.243856 5.848447 10.481933 8.836976 15.687808 1.165732 2.031158 2.352075 5.167068 4.740424 6.0332 2.127008.77118 5.033095-.325315 7.148561-.748886 5.492297-1.099798 10.97635-2.287117 16.488434-3.28288 6.605266-1.193099 16.673928-.969342 21.434964-6.129805-6.963066-2.205375-15.011895-2.074919-22.259386-1.577863-4.352947.298894-9.178287 1.856116-13.178381-.686135-5.953149-3.783239-9.910373-12.522173-13.552668-18.377854-8.980425-14.439388-17.441465-29.095929-26.041008-43.760726l-1.376261-2.335014-2.765943-4.665258c-1.380597-2.334387-2.750786-4.67476-4.079753-7.036188-1.02723-1.826391-2.549937-4.233231-1.078344-6.24705 1.545791-2.114476 4.91472-2.239146 7.956473-2.243117l.603351.000261c1.195428.001526 2.315572.002427 3.222811-.11692 12.27399-1.615019 24.718635-2.952611 37.098976-2.952611-.963749-3.352237-3.719791-7.141255-2.838484-10.73046 1.972017-8.030506 13.526287-10.543033 18.899867-4.780653 3.60767 3.868283 5.704174 9.192229 8.051303 13.859765 3.097352 6.162006 6.624228 12.118418 9.940876 18.16483 5.805578 10.585967 12.146205 20.881297 18.116667 31.375615.49237.865561.999687 1.726685 1.512269 2.587098l.771613 1.290552c2.577138 4.303168 5.164895 8.635123 6.553094 13.461506-20.735854-.9487-36.30176-25.018751-45.343193-41.283704-.721369 2.604176.450959 4.928448 1.388326 7.431066 1.948109 5.197619 4.276275 10.147535 7.20627 14.862134 4.184765 6.732546 8.982075 13.665732 15.313633 18.553722 11.236043 8.673707 26.05255 8.721596 39.572241 7.794364 8.669619-.595311 19.50252-4.542034 28.030338-1.864372 8.513803 2.673532 11.940924 12.063098 6.884745 19.276187-3.787393 5.403211-8.842747 7.443452-15.128962 8.257566 4.445282 9.53571 10.268996 18.385285 14.490036 28.072919 1.758491 4.035895 3.59118 10.22102 7.8048 12.350433 2.805507 1.416857 6.824562.09743 9.85761.034678-3.043765-8.053625-8.742992-14.887729-11.541904-23.118874 8.533589.390544 16.786875 4.843404 24.732651 7.685374 15.630376 5.590144 31.063836 11.701854 46.475333 17.86913l7.112077 2.848685c6.338978 2.538947 12.71588 5.052299 18.961699 7.812528 2.285297 1.009799 5.449427 3.370401 7.975455 1.917215 2.061054-1.186494 3.394144-4.015253 4.665403-5.931643 3.55573-5.361927 6.775921-10.928622 9.965609-16.513481 12.774414-22.36586 22.143967-46.872692 28.402976-71.833646 20.645168-82.323009 2.934117-173.156241-46.677107-241.922507-19.061454-26.420745-43.033164-49.262193-69.46165-68.1783861-66.13923-47.336721-152.911262-66.294198-232.486917-48.7172481zm135.205158 410.5292842c-17.532977 4.570931-35.601827 8.714164-53.58741 11.040088 2.365265 8.052799 8.145286 15.885969 12.376218 23.118874 1.635653 2.796558 3.3859 6.541816 6.618457 7.755557 3.651364 1.370619 8.063669-.853747 11.508927-1.975838-1.595256-4.364513-4.279573-8.292245-6.476657-12.385112-.905215-1.687677-2.305907-3.685809-1.559805-5.68972 1.410585-3.786541 7.266452-3.563609 10.509727-4.221671 8.54678-1.733916 17.004522-3.898008 25.557073-5.611281 3.150939-.631641 7.538512-2.342438 10.705115-1.285575 2.371037.791232 3.800147 2.744743 5.152304 4.781948l.606196.918752c.80912 1.222827 1.637246 2.41754 2.671212 3.351165 3.457625 3.121874 8.628398 3.60159 13.017619 4.453686-2.678546-6.027421-7.130424-11.301001-9.984571-17.339156-1.659561-3.511592-3.023155-8.677834-6.656381-10.707341-5.005064-2.795733-15.341663 2.461334-20.458024 3.795624zm-110.472507-40.151706c-.825246 10.467897-4.036369 18.984725-9.068639 28.072919 5.76683.729896 11.649079.989984 17.312856 2.39363 4.244947 1.051908 8.156828 3.058296 12.366325 4.211763-2.250671-6.157877-6.426367-11.651913-9.661398-17.339156-3.266358-5.740912-6.189758-12.717032-10.949144-17.339156z" fill="#fff" transform="translate(.9778)"/></svg>`

  // Dark version (dark fill) for light backgrounds like landing page
  files['public/tanstack-logo-dark.svg'] = `<svg height="660" viewBox="0 0 663 660" width="663" xmlns="http://www.w3.org/2000/svg"><path d="m305.114318.62443771c8.717817-1.14462121 17.926803-.36545135 26.712694-.36545135 32.548987 0 64.505987 5.05339923 95.64868 14.63098274 39.74418 12.2236582 76.762804 31.7666864 109.435876 57.477568 40.046637 31.5132839 73.228974 72.8472109 94.520714 119.2362609 39.836383 86.790386 39.544267 191.973146-1.268422 278.398081-26.388695 55.880442-68.724007 102.650458-119.964986 136.75724-41.808813 27.828603-90.706831 44.862601-140.45707 50.89341-63.325458 7.677926-131.784923-3.541603-188.712259-32.729444-106.868873-54.795293-179.52309291-165.076271-180.9604082-285.932068-.27660564-23.300971.08616998-46.74071 4.69884909-69.814998 7.51316071-37.57857 20.61272131-73.903917 40.28618971-106.877282 21.2814003-35.670293 48.7704861-67.1473767 81.6882804-92.5255597 38.602429-29.7610135 83.467691-51.1674988 130.978372-62.05777669 11.473831-2.62966514 22.9946-4.0869914 34.57273-5.4964306l3.658171-.44480576c3.050084-.37153079 6.104217-.74794222 9.162589-1.14972654zm-110.555861 549.44131429c-14.716752 1.577863-30.238964 4.25635-42.869928 12.522173 2.84343.683658 6.102369.004954 9.068638 0 7.124652-.011559 14.317732-.279903 21.434964.032202 17.817402.781913 36.381729 3.63214 53.58741 8.350042 22.029372 6.040631 41.432961 17.928687 62.656049 25.945156 22.389644 8.456554 44.67706 11.084675 68.427 11.084675 11.96813 0 23.845573-.035504 35.450133-3.302696-6.056202-3.225083-14.72582-2.619864-21.434964-3.963236-14.556814-2.915455-28.868774-6.474936-42.869928-11.470264-10.304996-3.676672-20.230803-8.214291-30.11097-12.848661l-6.348531-2.985046c-9.1705-4.309263-18.363277-8.560752-27.845391-12.142608-24.932161-9.418465-52.560181-14.071964-79.144482-11.221737zm22.259385-62.614168c-29.163917 0-58.660076 5.137344-84.915434 18.369597-6.361238 3.206092-12.407546 7.02566-18.137277 11.258891-1.746125 1.290529-4.841829 2.948483-5.487351 5.191839-.654591 2.275558 1.685942 4.182039 3.014086 5.637703 6.562396-3.497556 12.797498-7.199878 19.78612-9.855246 45.19892-17.169893 99.992458-13.570779 145.098218 2.172348 22.494346 7.851335 43.219483 19.592421 65.129314 28.800338 24.503461 10.297807 49.53043 16.975034 75.846795 20.399104 31.04195 4.037546 66.433549.7654 94.808495-13.242161 9.970556-4.921843 23.814245-12.422267 28.030337-23.320339-5.207047.454947-9.892236 2.685918-14.83959 4.224149-7.866632 2.445646-15.827248 4.51974-23.908229 6.138887-27.388113 5.486604-56.512458 6.619429-84.091013 1.639788-25.991939-4.693152-50.142596-14.119246-74.179513-24.03502l-3.068058-1.268177c-2.045137-.846788-4.089983-1.695816-6.135603-2.544467l-3.069142-1.272366c-12.279956-5.085721-24.606928-10.110797-37.210937-14.51024-24.485325-8.546552-50.726667-13.784628-76.671218-13.784628zm51.114145-447.9909432c-34.959602 7.7225298-66.276908 22.7605319-96.457338 41.7180089-17.521434 11.0054099-34.281927 22.2799893-49.465301 36.4444283-22.5792616 21.065423-39.8360564 46.668751-54.8866988 73.411509-15.507372 27.55357-25.4498976 59.665686-30.2554517 90.824149-4.7140432 30.568106-5.4906485 62.70747-.0906864 93.301172 6.7503648 38.248526 19.5989769 74.140579 39.8896436 107.337631 6.8187918-3.184625 11.659796-10.445603 17.3128555-15.336896 11.4149428-9.875888 23.3995608-19.029311 36.2745548-26.928535 4.765981-2.923712 9.662222-5.194315 14.83959-7.275014 1.953055-.785216 5.14604-1.502727 6.06527-3.647828 1.460876-3.406732-1.240754-9.335897-1.704904-12.865654-1.324845-10.095517-2.124534-20.362774-1.874735-30.549941.725492-29.668947 6.269727-59.751557 16.825623-87.521453 7.954845-20.924233 20.10682-39.922168 34.502872-56.971512 4.884699-5.785498 10.077731-11.170545 15.437296-16.512656 3.167428-3.157378 7.098271-5.858983 9.068639-9.908915-10.336599.006606-20.674847 2.987289-30.503603 6.013385-21.174447 6.519522-41.801477 16.19312-59.358362 29.841512-8.008432 6.226409-13.873368 14.387371-21.44733 20.939921-2.32322 2.010516-6.484901 4.704691-9.695199 3.187928-4.8500728-2.29042-4.1014979-11.835213-4.6571581-16.222019-2.1369011-16.873476 4.2548401-38.216325 12.3778671-52.843142 13.039878-23.479694 37.150915-43.528712 65.467327-42.82854 12.228647.302197 22.934587 4.551115 34.625711 7.324555-2.964621-4.211764-6.939158-7.28162-10.717482-10.733763-9.257431-8.459031-19.382979-16.184864-30.503603-22.028985-4.474136-2.350694-9.291232-3.77911-14.015169-5.506421-2.375159-.867783-5.36616-2.062533-6.259834-4.702213-1.654614-4.888817 7.148561-9.416813 10.381943-11.478522 12.499882-7.969406 27.826705-14.525258 42.869928-14.894334 23.509209-.577147 46.479246 12.467678 56.162903 34.665926 3.404469 7.803171 4.411273 16.054969 5.079109 24.382907l.121749 1.56229.174325 2.345587c.01913.260708.038244.521433.057403.782164l.11601 1.56437.120128 1.563971c7.38352-6.019164 12.576553-14.876995 19.78612-21.323859 16.861073-15.07846 39.936636-21.7722 61.831627-14.984333 19.786945 6.133107 36.984382 19.788105 47.105807 37.959541 2.648042 4.754231 10.035685 16.373942 4.698379 21.109183-4.177345 3.707277-9.475079.818243-13.880788-.719162-3.33605-1.16376-6.782939-1.90214-10.241828-2.585698l-1.887262-.369639c-.629089-.122886-1.257979-.246187-1.886079-.372129-11.980496-2.401886-25.91652-2.152533-37.923398-.041284-7.762754 1.364839-15.349083 4.127545-23.083807 5.271929v1.651348c21.149714.175043 41.608563 12.240618 52.043268 30.549941 4.323267 7.585468 6.482428 16.267431 8.138691 24.770223 2.047864 10.50918.608423 21.958802-2.263037 32.201289-.962925 3.433979-2.710699 9.255807-6.817143 10.046802-2.902789.558982-5.36781-2.330878-7.024898-4.279468-4.343878-5.10762-8.475879-9.96341-13.573278-14.374161-12.895604-11.157333-26.530715-21.449361-40.396663-31.373138-7.362086-5.269452-15.425755-12.12007-23.908229-15.340199 2.385052 5.745041 4.721463 11.086326 5.532694 17.339156 2.385876 18.392716-5.314223 35.704625-16.87179 49.540445-3.526876 4.222498-7.29943 8.475545-11.744712 11.755948-1.843407 1.360711-4.156734 3.137561-6.595373 2.752797-7.645687-1.207961-8.555849-12.73272-9.728176-18.637115-3.970415-19.998652-2.375984-39.861068 3.132802-59.448534-4.901187 2.485279-8.443727 7.923994-11.521293 12.385111-6.770975 9.816439-12.645804 20.199291-16.858599 31.375615-16.777806 44.519521-16.616219 96.664142 5.118834 139.523233 2.427098 4.786433 6.110614 4.144058 10.894733 4.144058.720854 0 1.44257-.004515 2.164851-.010924l2.168232-.022283c4.338648-.045438 8.686803-.064635 12.979772.508795 2.227588.297243 5.320818.032202 7.084256 1.673642 2.111344 1.966755.986008 5.338808.4996 7.758859-1.358647 6.765574-1.812904 12.914369-1.812904 19.816178 9.02412-1.398692 11.525415-15.866153 14.724172-23.118874 3.624982-8.216283 7.313444-16.440823 10.667192-24.770223 1.648843-4.093692 3.854171-8.671229 3.275427-13.210785-.649644-5.10184-4.335633-10.510831-6.904531-14.862134-4.86244-8.234447-10.389363-16.70834-13.969002-25.595896-2.861567-7.104926-.197036-15.983399 7.871579-18.521521 4.450228-1.400344 9.198073 1.345848 12.094266 4.562675 6.07269 6.74328 9.992815 16.777697 14.401823 24.692609l34.394873 61.925556c2.920926 5.243856 5.848447 10.481933 8.836976 15.687808 1.165732 2.031158 2.352075 5.167068 4.740424 6.0332 2.127008.77118 5.033095-.325315 7.148561-.748886 5.492297-1.099798 10.97635-2.287117 16.488434-3.28288 6.605266-1.193099 16.673928-.969342 21.434964-6.129805-6.963066-2.205375-15.011895-2.074919-22.259386-1.577863-4.352947.298894-9.178287 1.856116-13.178381-.686135-5.953149-3.783239-9.910373-12.522173-13.552668-18.377854-8.980425-14.439388-17.441465-29.095929-26.041008-43.760726l-1.376261-2.335014-2.765943-4.665258c-1.380597-2.334387-2.750786-4.67476-4.079753-7.036188-1.02723-1.826391-2.549937-4.233231-1.078344-6.24705 1.545791-2.114476 4.91472-2.239146 7.956473-2.243117l.603351.000261c1.195428.001526 2.315572.002427 3.222811-.11692 12.27399-1.615019 24.718635-2.952611 37.098976-2.952611-.963749-3.352237-3.719791-7.141255-2.838484-10.73046 1.972017-8.030506 13.526287-10.543033 18.899867-4.780653 3.60767 3.868283 5.704174 9.192229 8.051303 13.859765 3.097352 6.162006 6.624228 12.118418 9.940876 18.16483 5.805578 10.585967 12.146205 20.881297 18.116667 31.375615.49237.865561.999687 1.726685 1.512269 2.587098l.771613 1.290552c2.577138 4.303168 5.164895 8.635123 6.553094 13.461506-20.735854-.9487-36.30176-25.018751-45.343193-41.283704-.721369 2.604176.450959 4.928448 1.388326 7.431066 1.948109 5.197619 4.276275 10.147535 7.20627 14.862134 4.184765 6.732546 8.982075 13.665732 15.313633 18.553722 11.236043 8.673707 26.05255 8.721596 39.572241 7.794364 8.669619-.595311 19.50252-4.542034 28.030338-1.864372 8.513803 2.673532 11.940924 12.063098 6.884745 19.276187-3.787393 5.403211-8.842747 7.443452-15.128962 8.257566 4.445282 9.53571 10.268996 18.385285 14.490036 28.072919 1.758491 4.035895 3.59118 10.22102 7.8048 12.350433 2.805507 1.416857 6.824562.09743 9.85761.034678-3.043765-8.053625-8.742992-14.887729-11.541904-23.118874 8.533589.390544 16.786875 4.843404 24.732651 7.685374 15.630376 5.590144 31.063836 11.701854 46.475333 17.86913l7.112077 2.848685c6.338978 2.538947 12.71588 5.052299 18.961699 7.812528 2.285297 1.009799 5.449427 3.370401 7.975455 1.917215 2.061054-1.186494 3.394144-4.015253 4.665403-5.931643 3.55573-5.361927 6.775921-10.928622 9.965609-16.513481 12.774414-22.36586 22.143967-46.872692 28.402976-71.833646 20.645168-82.323009 2.934117-173.156241-46.677107-241.922507-19.061454-26.420745-43.033164-49.262193-69.46165-68.1783861-66.13923-47.336721-152.911262-66.294198-232.486917-48.7172481zm135.205158 410.5292842c-17.532977 4.570931-35.601827 8.714164-53.58741 11.040088 2.365265 8.052799 8.145286 15.885969 12.376218 23.118874 1.635653 2.796558 3.3859 6.541816 6.618457 7.755557 3.651364 1.370619 8.063669-.853747 11.508927-1.975838-1.595256-4.364513-4.279573-8.292245-6.476657-12.385112-.905215-1.687677-2.305907-3.685809-1.559805-5.68972 1.410585-3.786541 7.266452-3.563609 10.509727-4.221671 8.54678-1.733916 17.004522-3.898008 25.557073-5.611281 3.150939-.631641 7.538512-2.342438 10.705115-1.285575 2.371037.791232 3.800147 2.744743 5.152304 4.781948l.606196.918752c.80912 1.222827 1.637246 2.41754 2.671212 3.351165 3.457625 3.121874 8.628398 3.60159 13.017619 4.453686-2.678546-6.027421-7.130424-11.301001-9.984571-17.339156-1.659561-3.511592-3.023155-8.677834-6.656381-10.707341-5.005064-2.795733-15.341663 2.461334-20.458024 3.795624zm-110.472507-40.151706c-.825246 10.467897-4.036369 18.984725-9.068639 28.072919 5.76683.729896 11.649079.989984 17.312856 2.39363 4.244947 1.051908 8.156828 3.058296 12.366325 4.211763-2.250671-6.157877-6.426367-11.651913-9.661398-17.339156-3.266358-5.740912-6.189758-12.717032-10.949144-17.339156z" fill="#1f2937" transform="translate(.9778)"/></svg>`

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

  // .nvmrc - Node version (TanStack Start requires >=22.12.0)
  files['.nvmrc'] = '22.12.0'

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
