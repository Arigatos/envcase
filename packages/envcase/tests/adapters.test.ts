import { describe, it, expect, vi, afterEach } from 'vitest'
import { z } from 'zod'
import { defineEnv } from '../src/index.js'
import { nodeAdapter } from '../src/adapters/index.js'

describe('adapters', () => {
  describe('nodeAdapter', () => {
    it('reads from process.env', () => {
      process.env.TEST_NODE_ADAPTER = 'hello'
      const result = nodeAdapter()
      expect(result.TEST_NODE_ADAPTER).toBe('hello')
      delete process.env.TEST_NODE_ADAPTER
    })

    it('returns undefined for missing keys', () => {
      const result = nodeAdapter()
      expect(result['__DEFINITELY_NOT_SET__']).toBeUndefined()
    })
  })

  describe('custom source', () => {
    it('validates against a plain object source', () => {
      const env = defineEnv(
        { API_KEY: z.string().min(1) },
        { source: { API_KEY: 'secret123' } }
      )
      expect(env.API_KEY).toBe('secret123')
    })

    it('custom source overrides process.env', () => {
      process.env.API_KEY = 'from-process-env'
      const env = defineEnv(
        { API_KEY: z.string() },
        { source: { API_KEY: 'from-custom' } }
      )
      expect(env.API_KEY).toBe('from-custom')
      delete process.env.API_KEY
    })
  })

  describe('auto-detect', () => {
    it('selects nodeAdapter when no source is provided (reads process.env)', () => {
      process.env.ENVCASE_AUTO = '42'
      const env = defineEnv({ ENVCASE_AUTO: z.coerce.number() })
      expect(env.ENVCASE_AUTO).toBe(42)
      delete process.env.ENVCASE_AUTO
    })
  })
})
