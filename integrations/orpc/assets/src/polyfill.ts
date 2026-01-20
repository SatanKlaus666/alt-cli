import { File } from 'node:buffer'

/**
 * This file aims to polyfill missing APIs in Node.js 18 that oRPC depends on.
 *
 * Since Stackblitz runs on Node.js 18, these polyfills ensure oRPC works in that environment.
 * If you're running oRPC locally, please use Node.js 20 or later for full compatibility.
 */

/**
 * The `oz.file()` schema depends on the `File` API.
 * If you're not using `oz.file()`, you can safely remove this polyfill.
 */
if (typeof globalThis.File === 'undefined') {
  globalThis.File = File as unknown as typeof globalThis.File
}
