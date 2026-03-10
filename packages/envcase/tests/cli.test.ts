import { describe, it } from 'vitest'

describe('CLI', () => {
  describe('envcase generate', () => {
    it.todo('generates a .env.example from a schema file')
    it.todo('includes default values in the output')
    it.todo('marks optional fields clearly')
  })

  describe('envcase check', () => {
    it.todo('exits 0 when all vars are valid')
    it.todo('exits 1 and prints errors when vars are invalid')
  })

  describe('envcase diff', () => {
    it.todo('reports vars present in .env.example but missing from .env')
    it.todo('exits 0 when .env is a superset of .env.example')
  })
})
