// Engine exports
export { compile, compileWithAttribution } from './engine/compile.js'
export { processTemplateFile, relativePath } from './engine/template.js'

// Config file exports
export {
  CONFIG_FILE,
  writeConfigFile,
  readConfigFile,
} from './engine/config-file.js'
export type { PersistedOptions } from './engine/config-file.js'

// Custom integration/template exports
export { initIntegration, compileIntegration, loadRemoteIntegration } from './engine/custom-addons/integration.js'
export { initTemplate, compileTemplate, loadTemplate } from './engine/custom-addons/template.js'

// API exports
export {
  fetchManifest,
  fetchIntegration,
  fetchIntegrations,
  fetchIntegrationInfo,
  fetchIntegrationFiles,
} from './api/fetch.js'

// Type exports
export type {
  // Core types
  PackageManager,
  Category,
  IntegrationType,
  IntegrationPhase,
  RouterMode,

  // Option types
  IntegrationOption,
  IntegrationOptions,

  // Hook types (code injection points)
  HookType,
  Hook,
  Route,
  EnvVar,
  Command,

  // Integration types
  IntegrationInfo,
  IntegrationCompiled,
  CustomTemplateInfo,
  CustomTemplateCompiled,

  // Manifest types
  ManifestIntegration,
  Manifest,

  // Project types
  ProjectDefinition,
  CompileOptions,
  CompileOutput,

  // Attribution types
  LineAttribution,
  AttributedFile,
  AttributedCompileOutput,
} from './engine/types.js'

// Schema exports (for validation)
export {
  CategorySchema,
  IntegrationTypeSchema,
  IntegrationPhaseSchema,
  RouterModeSchema,
  IntegrationOptionSchema,
  IntegrationOptionsSchema,
  HookSchema,
  RouteSchema,
  EnvVarSchema,
  CommandSchema,
  IntegrationInfoSchema,
  IntegrationCompiledSchema,
  CustomTemplateInfoSchema,
  CustomTemplateCompiledSchema,
  ManifestIntegrationSchema,
  ManifestSchema,
} from './engine/types.js'
