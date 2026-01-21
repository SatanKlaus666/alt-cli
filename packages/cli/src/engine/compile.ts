import { getBaseFiles, getBaseFilesWithAttribution } from '../templates/base.js'
import { processTemplateFile } from './template.js'
import type {
  IntegrationCompiled,
  IntegrationPhase,
  AttributedCompileOutput,
  CompileOptions,
  CompileOutput,
  EnvVar,
  LineAttribution,
} from './types.js'

/**
 * Merge package contributions from integrations
 */
function mergePackages(
  target: CompileOutput['packages'],
  source: IntegrationCompiled['packageAdditions'],
): void {
  if (!source) return

  if (source.dependencies) {
    target.dependencies = { ...target.dependencies, ...source.dependencies }
  }
  if (source.devDependencies) {
    target.devDependencies = {
      ...target.devDependencies,
      ...source.devDependencies,
    }
  }
  if (source.scripts) {
    target.scripts = { ...target.scripts, ...source.scripts }
  }
}

/**
 * Track package attribution for package.json line coloring
 */
type PackageAttribution = Map<string, string> // package name -> integration id

function mergePackagesWithAttribution(
  target: CompileOutput['packages'],
  source: IntegrationCompiled['packageAdditions'],
  integrationId: string,
  attribution: {
    dependencies: PackageAttribution
    devDependencies: PackageAttribution
    scripts: PackageAttribution
  },
): void {
  if (!source) return

  if (source.dependencies) {
    for (const pkg of Object.keys(source.dependencies)) {
      attribution.dependencies.set(pkg, integrationId)
    }
    target.dependencies = { ...target.dependencies, ...source.dependencies }
  }
  if (source.devDependencies) {
    for (const pkg of Object.keys(source.devDependencies)) {
      attribution.devDependencies.set(pkg, integrationId)
    }
    target.devDependencies = {
      ...target.devDependencies,
      ...source.devDependencies,
    }
  }
  if (source.scripts) {
    for (const script of Object.keys(source.scripts)) {
      attribution.scripts.set(script, integrationId)
    }
    target.scripts = { ...target.scripts, ...source.scripts }
  }
}

/**
 * Process all files from an integration
 */
function processIntegrationFiles(
  integration: IntegrationCompiled,
  options: CompileOptions,
  files: Map<string, { content: string; integrationId: string }>,
  appendFiles: Map<string, Array<{ content: string; integrationId: string }>>,
): void {
  for (const [filePath, content] of Object.entries(integration.files)) {
    const processed = processTemplateFile(filePath, content, options)

    if (!processed) continue

    if (processed.append) {
      // Queue for appending
      if (!appendFiles.has(processed.path)) {
        appendFiles.set(processed.path, [])
      }
      appendFiles.get(processed.path)!.push({
        content: processed.content,
        integrationId: integration.id,
      })
    } else {
      // Overwrite (later integrations win)
      files.set(processed.path, {
        content: processed.content,
        integrationId: integration.id,
      })
    }
  }
}

/**
 * Build the package.json content
 */
function buildPackageJson(
  options: CompileOptions,
  packages: CompileOutput['packages'],
): string {
  // Header is shown when there are integrations and tailwind is enabled
  const hasHeader = options.chosenIntegrations.length > 0 && options.tailwind

  const pkg = {
    name: options.projectName,
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite dev --port 3000',
      build: 'vite build',
      start: 'node .output/server/index.mjs',
      ...packages.scripts,
    },
    dependencies: {
      '@tanstack/react-router': '^1.132.0',
      '@tanstack/react-router-devtools': '^1.132.0',
      '@tanstack/react-start': '^1.132.0',
      react: '^19.0.0',
      'react-dom': '^19.0.0',
      'vite-tsconfig-paths': '^5.1.4',
      ...(hasHeader ? { 'lucide-react': '^0.468.0' } : {}),
      ...packages.dependencies,
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.4.1',
      vite: '^7.0.0',
      ...(options.typescript
        ? {
            '@types/react': '^19.0.0',
            '@types/react-dom': '^19.0.0',
            typescript: '^5.7.0',
          }
        : {}),
      ...(options.tailwind
        ? {
            '@tailwindcss/vite': '^4.0.0',
            tailwindcss: '^4.0.0',
          }
        : {}),
      ...packages.devDependencies,
    },
  }

  return JSON.stringify(pkg, null, 2)
}

/**
 * Compile a project from options
 */
export function compile(options: CompileOptions): CompileOutput {
  const files = new Map<string, { content: string; integrationId: string }>()
  const appendFiles = new Map<
    string,
    Array<{ content: string; integrationId: string }>
  >()
  const packages: CompileOutput['packages'] = {
    dependencies: {},
    devDependencies: {},
    scripts: {},
  }
  const envVars: Array<EnvVar> = []
  const warnings: Array<string> = []

  // Add base template files first
  const baseFiles = getBaseFiles(options)
  for (const [path, content] of Object.entries(baseFiles)) {
    files.set(path, { content, integrationId: 'base' })
  }

  // Sort integrations by phase and priority
  const sortedIntegrations = [...options.chosenIntegrations].sort((a, b) => {
    const phaseOrder: Record<IntegrationPhase, number> = { setup: 0, integration: 1, example: 2 }
    const phaseA = phaseOrder[a.phase]
    const phaseB = phaseOrder[b.phase]

    if (phaseA !== phaseB) return phaseA - phaseB
    return (a.priority ?? 100) - (b.priority ?? 100)
  })

  // Process each integration
  for (const integration of sortedIntegrations) {
    // Process files
    processIntegrationFiles(integration, options, files, appendFiles)

    // Merge packages
    mergePackages(packages, integration.packageAdditions)

    // Collect env vars
    if (integration.envVars) {
      envVars.push(...integration.envVars)
    }

    // Collect warnings
    if (integration.warning) {
      warnings.push(`${integration.name}: ${integration.warning}`)
    }
  }

  // Apply appended content
  for (const [path, appends] of appendFiles) {
    const existing = files.get(path)
    if (existing) {
      const appendContent = appends.map((a) => a.content).join('\n')
      existing.content = existing.content + '\n' + appendContent
    } else {
      // File doesn't exist yet, create it from appends
      files.set(path, {
        content: appends.map((a) => a.content).join('\n'),
        integrationId: appends[0]?.integrationId ?? 'base',
      })
    }
  }

  // Note: Custom templates don't add files directly - they just specify which integrations to use
  // The template's integration list should already be resolved into chosenIntegrations by the caller

  // Build final files map
  const outputFiles: Record<string, string> = {}
  for (const [path, { content }] of files) {
    outputFiles[path] = content
  }

  // Add package.json
  outputFiles['package.json'] = buildPackageJson(options, packages)

  // Deduplicate env vars
  const seenEnvVars = new Set<string>()
  const uniqueEnvVars = envVars.filter((v) => {
    if (seenEnvVars.has(v.name)) return false
    seenEnvVars.add(v.name)
    return true
  })

  return {
    files: outputFiles,
    packages,
    envVars: uniqueEnvVars,
    warnings,
  }
}

/**
 * Compile with line-by-line attribution tracking
 */
export function compileWithAttribution(
  options: CompileOptions,
): AttributedCompileOutput {
  const files = new Map<string, { content: string; integrationId: string }>()
  const appendFiles = new Map<
    string,
    Array<{ content: string; integrationId: string }>
  >()
  const packages: CompileOutput['packages'] = {
    dependencies: {},
    devDependencies: {},
    scripts: {},
  }
  const packageAttribution = {
    dependencies: new Map<string, string>(),
    devDependencies: new Map<string, string>(),
    scripts: new Map<string, string>(),
  }
  const envVars: Array<EnvVar & { integrationId: string }> = []
  const warnings: Array<string> = []

  // Track which integration contributed each file
  const fileOwnership = new Map<string, string>()

  // Add base template files first (with hook attribution)
  const { files: baseFiles, attributions: baseAttributions } =
    getBaseFilesWithAttribution(options)
  for (const [path, content] of Object.entries(baseFiles)) {
    files.set(path, { content, integrationId: 'base' })
    fileOwnership.set(path, 'base')
  }

  // Store base file attributions for later
  const hookAttributions = new Map<
    string,
    Array<{ line: number; integrationId: string }>
  >()
  for (const [path, attrs] of Object.entries(baseAttributions)) {
    hookAttributions.set(path, attrs)
  }

  // Sort integrations by phase and priority
  const sortedIntegrations = [...options.chosenIntegrations].sort((a, b) => {
    const phaseOrder: Record<IntegrationPhase, number> = { setup: 0, integration: 1, example: 2 }
    const phaseA = phaseOrder[a.phase]
    const phaseB = phaseOrder[b.phase]

    if (phaseA !== phaseB) return phaseA - phaseB
    return (a.priority ?? 100) - (b.priority ?? 100)
  })

  // Create integration name lookup
  const integrationNames = new Map<string, string>()
  integrationNames.set('base', 'Base Template')
  if (options.customTemplate) {
    integrationNames.set(options.customTemplate.id, options.customTemplate.name)
  }
  for (const integration of sortedIntegrations) {
    integrationNames.set(integration.id, integration.name)
  }

  // Process each integration
  for (const integration of sortedIntegrations) {
    for (const [filePath, content] of Object.entries(integration.files)) {
      const processed = processTemplateFile(filePath, content, options)

      if (!processed) continue

      if (processed.append) {
        if (!appendFiles.has(processed.path)) {
          appendFiles.set(processed.path, [])
        }
        appendFiles.get(processed.path)!.push({
          content: processed.content,
          integrationId: integration.id,
        })
      } else {
        files.set(processed.path, {
          content: processed.content,
          integrationId: integration.id,
        })
        fileOwnership.set(processed.path, integration.id)
      }
    }

    mergePackagesWithAttribution(
      packages,
      integration.packageAdditions,
      integration.id,
      packageAttribution,
    )

    if (integration.envVars) {
      for (const envVar of integration.envVars) {
        envVars.push({ ...envVar, integrationId: integration.id })
      }
    }

    if (integration.warning) {
      warnings.push(`${integration.name}: ${integration.warning}`)
    }
  }

  // Apply appended content with tracking
  const appendOwnership = new Map<string, Map<number, string>>()

  for (const [path, appends] of appendFiles) {
    const existing = files.get(path)
    if (existing) {
      const existingLines = existing.content.split('\n').length
      const lineMap = new Map<number, string>()

      let currentLine = existingLines + 1
      for (const append of appends) {
        const appendLines = append.content.split('\n').length
        for (let i = 0; i < appendLines; i++) {
          lineMap.set(currentLine + i, append.integrationId)
        }
        currentLine += appendLines + 1 // +1 for the joining newline
      }

      appendOwnership.set(path, lineMap)

      const appendContent = appends.map((a) => a.content).join('\n')
      existing.content = existing.content + '\n' + appendContent
    } else {
      files.set(path, {
        content: appends.map((a) => a.content).join('\n'),
        integrationId: appends[0]?.integrationId ?? 'base',
      })
      fileOwnership.set(path, appends[0]?.integrationId ?? 'base')
    }
  }

  // Note: Custom templates don't add files directly - they just specify which integrations to use
  // The template's integration list should already be resolved into chosenIntegrations by the caller

  // Build output with attributions
  const outputFiles: Record<string, string> = {}
  const attributedFiles: AttributedCompileOutput['attributedFiles'] = {}

  for (const [path, { content, integrationId }] of files) {
    outputFiles[path] = content

    const lines = content.split('\n')
    const attributions: Array<LineAttribution> = []
    const appendLineMap = appendOwnership.get(path)
    const hookAttrMap = hookAttributions.get(path)

    for (let i = 0; i < lines.length; i++) {
      const lineNumber = i + 1

      // Priority: append > hook > file owner
      let owningIntegrationId = integrationId
      const appendIntegrationId = appendLineMap?.get(lineNumber)
      const hookAttr = hookAttrMap?.find(
        (a) => a.line === lineNumber,
      )

      if (appendIntegrationId) {
        owningIntegrationId = appendIntegrationId
      } else if (hookAttr) {
        owningIntegrationId = hookAttr.integrationId
      }

      attributions.push({
        lineNumber,
        featureId: owningIntegrationId,
        featureName: integrationNames.get(owningIntegrationId) || owningIntegrationId,
      })
    }

    attributedFiles[path] = {
      path,
      content,
      attributions,
    }
  }

  // Add package.json with line-by-line attribution
  outputFiles['package.json'] = buildPackageJson(options, packages)
  const pkgJsonLines = outputFiles['package.json'].split('\n')
  const pkgJsonAttributions: Array<LineAttribution> = []

  for (let i = 0; i < pkgJsonLines.length; i++) {
    const line = pkgJsonLines[i]!
    const lineNumber = i + 1
    let integrationId = 'base'

    // Check if this line contains a package name we're tracking
    // JSON format: "package-name": "version"
    const match = line.match(/^\s*"([^"]+)":\s*"[^"]+"/)
    if (match) {
      const pkgName = match[1]
      // Check in order: dependencies, devDependencies, scripts
      const depIntegration = packageAttribution.dependencies.get(pkgName!)
      const devDepIntegration = packageAttribution.devDependencies.get(pkgName!)
      const scriptIntegration = packageAttribution.scripts.get(pkgName!)
      if (depIntegration) {
        integrationId = depIntegration
      } else if (devDepIntegration) {
        integrationId = devDepIntegration
      } else if (scriptIntegration) {
        integrationId = scriptIntegration
      }
    }

    pkgJsonAttributions.push({
      lineNumber,
      featureId: integrationId,
      featureName: integrationNames.get(integrationId) || integrationId,
    })
  }

  attributedFiles['package.json'] = {
    path: 'package.json',
    content: outputFiles['package.json'],
    attributions: pkgJsonAttributions,
  }

  // Deduplicate env vars (keep integration attribution)
  const seenEnvVars = new Set<string>()
  const uniqueEnvVars = envVars.filter((v) => {
    if (seenEnvVars.has(v.name)) return false
    seenEnvVars.add(v.name)
    return true
  })

  // Generate .env.example with attribution
  if (uniqueEnvVars.length > 0) {
    const envLines: Array<{ text: string; integrationId: string }> = []
    envLines.push({
      text: '# Environment Variables',
      integrationId: 'base',
    })
    envLines.push({
      text: '# Copy this file to .env.local and fill in your values',
      integrationId: 'base',
    })
    envLines.push({ text: '', integrationId: 'base' })

    // Group by integration
    const envByIntegration = new Map<string, Array<(typeof uniqueEnvVars)[0]>>()
    for (const envVar of uniqueEnvVars) {
      const id = envVar.integrationId
      if (!envByIntegration.has(id)) {
        envByIntegration.set(id, [])
      }
      envByIntegration.get(id)!.push(envVar)
    }

    for (const [integrationId, vars] of envByIntegration) {
      const integrationName = integrationNames.get(integrationId) || integrationId
      envLines.push({ text: `# ${integrationName}`, integrationId })
      for (const v of vars) {
        envLines.push({
          text: `# ${v.description}${v.required ? ' (required)' : ''}`,
          integrationId,
        })
        envLines.push({
          text: `${v.name}=${v.example || ''}`,
          integrationId,
        })
      }
      envLines.push({ text: '', integrationId: 'base' })
    }

    const envContent = envLines.map((l) => l.text).join('\n')
    outputFiles['.env.example'] = envContent

    attributedFiles['.env.example'] = {
      path: '.env.example',
      content: envContent,
      attributions: envLines.map((l, i) => ({
        lineNumber: i + 1,
        featureId: l.integrationId,
        featureName: integrationNames.get(l.integrationId) || l.integrationId,
      })),
    }
  }

  // Strip integrationId from envVars for output
  const outputEnvVars = uniqueEnvVars.map(({ integrationId, ...rest }) => rest)

  return {
    files: outputFiles,
    packages,
    envVars: outputEnvVars,
    warnings,
    attributedFiles,
  }
}
