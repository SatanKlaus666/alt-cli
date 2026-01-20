import { describe, expect, it } from 'vitest'
import { createPackageAdditions } from './shared.js'

describe('createPackageAdditions', () => {
  it('should return empty object when packages are identical', () => {
    const original = {
      dependencies: { react: '^18.0.0' },
      devDependencies: { typescript: '^5.0.0' },
    }
    const current = {
      dependencies: { react: '^18.0.0' },
      devDependencies: { typescript: '^5.0.0' },
    }
    expect(createPackageAdditions(original, current)).toEqual({})
  })

  it('should detect new dependencies', () => {
    const original = {
      dependencies: { react: '^18.0.0' },
    }
    const current = {
      dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
    }
    expect(createPackageAdditions(original, current)).toEqual({
      dependencies: { 'react-dom': '^18.0.0' },
    })
  })

  it('should detect updated dependency versions', () => {
    const original = {
      dependencies: { react: '^18.0.0' },
    }
    const current = {
      dependencies: { react: '^19.0.0' },
    }
    expect(createPackageAdditions(original, current)).toEqual({
      dependencies: { react: '^19.0.0' },
    })
  })

  it('should detect new devDependencies', () => {
    const original = {
      devDependencies: { typescript: '^5.0.0' },
    }
    const current = {
      devDependencies: { typescript: '^5.0.0', vitest: '^1.0.0' },
    }
    expect(createPackageAdditions(original, current)).toEqual({
      devDependencies: { vitest: '^1.0.0' },
    })
  })

  it('should detect new scripts', () => {
    const original = {
      scripts: { dev: 'vinxi dev' },
    }
    const current = {
      scripts: { dev: 'vinxi dev', test: 'vitest' },
    }
    expect(createPackageAdditions(original, current)).toEqual({
      scripts: { test: 'vitest' },
    })
  })

  it('should detect updated scripts', () => {
    const original = {
      scripts: { dev: 'vinxi dev' },
    }
    const current = {
      scripts: { dev: 'vite dev' },
    }
    expect(createPackageAdditions(original, current)).toEqual({
      scripts: { dev: 'vite dev' },
    })
  })

  it('should handle missing sections in original', () => {
    const original = {}
    const current = {
      dependencies: { react: '^18.0.0' },
      devDependencies: { typescript: '^5.0.0' },
      scripts: { dev: 'vite' },
    }
    expect(createPackageAdditions(original, current)).toEqual({
      dependencies: { react: '^18.0.0' },
      devDependencies: { typescript: '^5.0.0' },
      scripts: { dev: 'vite' },
    })
  })

  it('should handle missing sections in current', () => {
    const original = {
      dependencies: { react: '^18.0.0' },
    }
    const current = {}
    expect(createPackageAdditions(original, current)).toEqual({})
  })
})
