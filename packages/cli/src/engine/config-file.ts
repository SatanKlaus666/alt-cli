import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import type { CompileOptions, PackageManager, RouterMode } from './types.js'

export const CONFIG_FILE = '.tanstack.json'

export interface PersistedOptions {
  version: number
  projectName: string
  framework: string
  mode: RouterMode
  typescript: boolean
  tailwind: boolean
  packageManager: PackageManager
  chosenIntegrations: Array<string>
  customTemplate?: string
}

function createPersistedOptions(options: CompileOptions): PersistedOptions {
  return {
    version: 1,
    projectName: options.projectName,
    framework: options.framework,
    mode: options.mode,
    typescript: options.typescript,
    tailwind: options.tailwind,
    packageManager: options.packageManager,
    chosenIntegrations: options.chosenIntegrations.map((integration) => integration.id),
    customTemplate: options.customTemplate?.id,
  }
}

export async function writeConfigFile(
  targetDir: string,
  options: CompileOptions,
): Promise<void> {
  const configPath = resolve(targetDir, CONFIG_FILE)
  await writeFile(
    configPath,
    JSON.stringify(createPersistedOptions(options), null, 2),
  )
}

export async function readConfigFile(
  targetDir: string,
): Promise<PersistedOptions | null> {
  const configPath = resolve(targetDir, CONFIG_FILE)

  if (!existsSync(configPath)) {
    return null
  }

  try {
    const content = await readFile(configPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}
