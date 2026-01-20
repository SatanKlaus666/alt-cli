import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { CustomTemplateCompiledSchema } from '../types.js'
import { readCurrentProjectOptions } from './shared.js'

import type { PersistedOptions } from '../config-file.js'
import type { CustomTemplateCompiled, CustomTemplateInfo } from '../types.js'

const INFO_FILE = 'template-info.json'
const COMPILED_FILE = 'template.json'

/**
 * Generate default template info from project options
 * Custom templates are just integration presets - they capture which integrations are selected
 */
async function readOrGenerateTemplateInfo(
  options: PersistedOptions,
  targetDir: string,
): Promise<CustomTemplateInfo> {
  const infoPath = resolve(targetDir, INFO_FILE)

  if (existsSync(infoPath)) {
    const content = await readFile(infoPath, 'utf-8')
    return JSON.parse(content)
  }

  return {
    id: `${options.projectName}-template`,
    name: `${options.projectName} Template`,
    description: 'A curated project template',

    framework: options.framework,
    mode: options.mode,
    typescript: options.typescript,
    tailwind: options.tailwind,

    integrations: options.chosenIntegrations,
  }
}

/**
 * Compile a custom template from the current project
 * Custom templates are just integration presets - they specify project defaults and which integrations to include
 */
export async function compileTemplate(
  targetDir: string,
): Promise<void> {
  const persistedOptions = await readCurrentProjectOptions(targetDir)
  const info = await readOrGenerateTemplateInfo(persistedOptions, targetDir)

  const compiledInfo: CustomTemplateCompiled = {
    ...info,
    id: info.id || `${persistedOptions.projectName}-template`,
  }

  await writeFile(
    resolve(targetDir, COMPILED_FILE),
    JSON.stringify(compiledInfo, null, 2),
  )

  console.log(`Compiled template written to ${COMPILED_FILE}`)
  console.log(`\nIncluded integrations: ${compiledInfo.integrations.length > 0 ? compiledInfo.integrations.join(', ') : '(none)'}`)
}

export async function initTemplate(
  targetDir: string,
): Promise<void> {
  const persistedOptions = await readCurrentProjectOptions(targetDir)
  const info = await readOrGenerateTemplateInfo(persistedOptions, targetDir)

  // Write the info file for editing
  await writeFile(
    resolve(targetDir, INFO_FILE),
    JSON.stringify(info, null, 2),
  )

  // Compile the template
  await compileTemplate(targetDir)

  console.log(`
Custom template initialized successfully!

Files created:
  ${INFO_FILE} - Template metadata (edit this to customize)
  ${COMPILED_FILE} - Compiled template (distribute this)

Custom templates are integration presets. They capture:
  - Project defaults (framework, mode, typescript, tailwind)
  - Which integrations to include
  - Preset integration options (if any)

Next steps:
  1. Edit ${INFO_FILE} to customize name, description, and integrations
  2. Run 'tanstack template compile' to rebuild after changes
  3. Share ${COMPILED_FILE} or host it publicly
  4. Users can use: tanstack create --template <url-to-template.json>
`)
}

/**
 * Load a remote custom template from a URL
 */
export async function loadTemplate(url: string): Promise<CustomTemplateCompiled> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch template from ${url}: ${response.statusText}`)
  }

  const jsonContent = await response.json()

  const result = CustomTemplateCompiledSchema.safeParse(jsonContent)
  if (!result.success) {
    throw new Error(`Invalid template at ${url}: ${result.error.message}`)
  }

  const template = result.data
  if (!template.id) {
    template.id = url
  }

  return template
}
