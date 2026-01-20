#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliBin = resolve(__dirname, '../cli/dist/bin.mjs')

spawn('node', [cliBin, 'create', ...process.argv.slice(2)], {
  stdio: 'inherit',
}).on('exit', (code) => process.exit(code ?? 0))
