import { z } from 'zod'

// Package manager options
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'deno'

// Feature categories for UI grouping
export const CategorySchema = z.enum([
  'tanstack',
  'database',
  'orm',
  'auth',
  'deploy',
  'tooling',
  'monitoring',
  'api',
  'i18n',
  'cms',
  'other',
])
export type Category = z.infer<typeof CategorySchema>

// Integration types
export const IntegrationTypeSchema = z.enum([
  'integration',
  'example',
  'toolchain',
  'deployment',
])
export type IntegrationType = z.infer<typeof IntegrationTypeSchema>

// Integration phases
export const IntegrationPhaseSchema = z.enum(['setup', 'integration', 'example'])
export type IntegrationPhase = z.infer<typeof IntegrationPhaseSchema>

// Router modes
export const RouterModeSchema = z.enum(['file-router', 'code-router'])
export type RouterMode = z.infer<typeof RouterModeSchema>

// Option schemas
export const SelectOptionSchema = z.object({
  type: z.literal('select'),
  label: z.string(),
  description: z.string().optional(),
  default: z.string(),
  options: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
    }),
  ),
})

export const BooleanOptionSchema = z.object({
  type: z.literal('boolean'),
  label: z.string(),
  description: z.string().optional(),
  default: z.boolean(),
})

export const StringOptionSchema = z.object({
  type: z.literal('string'),
  label: z.string(),
  description: z.string().optional(),
  default: z.string(),
})

export const IntegrationOptionSchema = z.discriminatedUnion('type', [
  SelectOptionSchema,
  BooleanOptionSchema,
  StringOptionSchema,
])
export type IntegrationOption = z.infer<typeof IntegrationOptionSchema>

export const IntegrationOptionsSchema = z.record(z.string(), IntegrationOptionSchema)
export type IntegrationOptions = z.infer<typeof IntegrationOptionsSchema>

// Hook schemas (code injection points)
export const HookTypeSchema = z.enum([
  'header-user',
  'provider',
  'root-provider',
  'layout',
  'vite-plugin',
  'devtools',
  'entry-client',
])
export type HookType = z.infer<typeof HookTypeSchema>

export const HookSchema = z.object({
  type: HookTypeSchema.optional(),
  path: z.string().optional(),
  jsName: z.string().optional(),
  import: z.string().optional(),
  code: z.string().optional(),
})
export type Hook = z.infer<typeof HookSchema>

// Route schema
export interface Route {
  url?: string
  name?: string
  icon?: string
  path: string
  jsName: string
  children?: Array<Route>
}

export const RouteSchema: z.ZodType<Route> = z.object({
  url: z.string().optional(),
  name: z.string().optional(),
  icon: z.string().optional(),
  path: z.string(),
  jsName: z.string(),
  children: z.array(z.lazy(() => RouteSchema)).optional(),
})

// Environment variable schema
export const EnvVarSchema = z.object({
  name: z.string(),
  description: z.string(),
  required: z.boolean().optional(),
  example: z.string().optional(),
})
export type EnvVar = z.infer<typeof EnvVarSchema>

// Command schema
export const CommandSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
})
export type Command = z.infer<typeof CommandSchema>

// Integration info schema (what's in info.json)
export const IntegrationInfoSchema = z.object({
  // Identity
  id: z.string().optional(), // Auto-generated from directory name
  name: z.string(),
  description: z.string(),
  author: z.string().optional(),
  version: z.string().optional(),
  link: z.string().optional(),
  license: z.string().optional(),
  warning: z.string().optional(),

  // Classification
  type: IntegrationTypeSchema,
  phase: IntegrationPhaseSchema,
  category: CategorySchema.optional(),
  modes: z.array(RouterModeSchema),
  priority: z.number().optional(),
  default: z.boolean().optional(),

  // Tailwind dependencies
  // requiresTailwind: integration won't work without Tailwind (e.g., shadcn)
  // demoRequiresTailwind: demo uses Tailwind, but core integration doesn't
  requiresTailwind: z.boolean().optional(),
  demoRequiresTailwind: z.boolean().optional(),

  // Dependencies & conflicts
  dependsOn: z.array(z.string()).optional(),
  conflicts: z.array(z.string()).optional(),

  // Partner integration
  partnerId: z.string().optional(),

  // Configuration
  options: IntegrationOptionsSchema.optional(),

  // Hooks (code injection points)
  hooks: z.array(HookSchema).optional(),
  routes: z.array(RouteSchema).optional(),

  // Package additions
  packageAdditions: z
    .object({
      dependencies: z.record(z.string(), z.string()).optional(),
      devDependencies: z.record(z.string(), z.string()).optional(),
      scripts: z.record(z.string(), z.string()).optional(),
    })
    .optional(),

  // Shadcn components to install
  shadcnComponents: z.array(z.string()).optional(),

  // Gitignore patterns to add
  gitignorePatterns: z.array(z.string()).optional(),

  // Environment variables
  envVars: z.array(EnvVarSchema).optional(),

  // Commands to run
  command: CommandSchema.optional(),

  // Special steps
  integrationSpecialSteps: z.array(z.string()).optional(),
  createSpecialSteps: z.array(z.string()).optional(),
  postInitSpecialSteps: z.array(z.string()).optional(),

  // Visual assets
  smallLogo: z.string().optional(),
  logo: z.string().optional(),
  readme: z.string().optional(),
})
export type IntegrationInfo = z.infer<typeof IntegrationInfoSchema>

// Compiled integration (info + files)
export const IntegrationCompiledSchema = IntegrationInfoSchema.extend({
  id: z.string(), // Required after compilation
  files: z.record(z.string(), z.string()),
  deletedFiles: z.array(z.string()).optional(),
})
export type IntegrationCompiled = z.infer<typeof IntegrationCompiledSchema>

// Custom template schema - a curated collection of integrations with preset options
// Custom templates are just integration presets, nothing more
export const CustomTemplateInfoSchema = z.object({
  // Identity
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),

  // Project defaults
  framework: z.string(),
  mode: RouterModeSchema,
  typescript: z.boolean(),
  tailwind: z.boolean(),

  // Core: which integrations to include (integration IDs or custom integration URLs)
  integrations: z.array(z.string()),

  // Preset integration options
  integrationOptions: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),

  // Display
  banner: z.string().optional(),
})
export type CustomTemplateInfo = z.infer<typeof CustomTemplateInfoSchema>

export const CustomTemplateCompiledSchema = CustomTemplateInfoSchema.extend({
  id: z.string(),
})
export type CustomTemplateCompiled = z.infer<typeof CustomTemplateCompiledSchema>

// Manifest schema (lightweight index of integrations)
export const ManifestIntegrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: IntegrationTypeSchema,
  category: CategorySchema.optional(),
  modes: z.array(RouterModeSchema),
  dependsOn: z.array(z.string()).optional(),
  conflicts: z.array(z.string()).optional(),
  partnerId: z.string().optional(),
  hasOptions: z.boolean().optional(),
  link: z.string().optional(),
  color: z.string().optional(),
  // Tailwind dependencies
  requiresTailwind: z.boolean().optional(),
  demoRequiresTailwind: z.boolean().optional(),
})
export type ManifestIntegration = z.infer<typeof ManifestIntegrationSchema>

export const ManifestCustomTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  banner: z.string().optional(),
  icon: z.string().optional(),
  features: z.array(z.string()).optional(),
})
export type ManifestCustomTemplate = z.infer<typeof ManifestCustomTemplateSchema>

export const ManifestSchema = z.object({
  version: z.string(),
  generated: z.string(),
  integrations: z.array(ManifestIntegrationSchema),
  customTemplates: z.array(ManifestCustomTemplateSchema).optional(),
})
export type Manifest = z.infer<typeof ManifestSchema>

// Project definition (what the user configures)
export interface ProjectDefinition {
  name: string
  framework: string
  mode: RouterMode
  typescript: boolean
  tailwind: boolean
  integrations: Array<string>
  integrationOptions: Record<string, Record<string, unknown>>
  customTemplate?: string
}

// Compile options
export interface CompileOptions {
  projectName: string
  framework: string
  mode: RouterMode
  typescript: boolean
  tailwind: boolean
  packageManager: PackageManager
  chosenIntegrations: Array<IntegrationCompiled>
  integrationOptions: Record<string, Record<string, unknown>>
  customTemplate?: CustomTemplateCompiled
}

// Compile output
export interface CompileOutput {
  files: Record<string, string>
  packages: {
    dependencies: Record<string, string>
    devDependencies: Record<string, string>
    scripts: Record<string, string>
  }
  envVars: Array<EnvVar>
  warnings: Array<string>
}

// Line attribution for showing which integration contributed each line
export interface LineAttribution {
  lineNumber: number
  featureId: string | 'base'
  featureName: string
}

export interface AttributedFile {
  path: string
  content: string
  attributions: Array<LineAttribution>
}

export interface AttributedCompileOutput extends CompileOutput {
  attributedFiles: Record<string, AttributedFile>
}
