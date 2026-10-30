/**
 * Provider tests for dsh-owlrunkit.
 *
 * The bundle has one observable contract: mounting it registers a skill
 * provider whose candidate and loaded body describe the packaged SKILL.md.
 * These tests exercise the frontmatter reader and that contract against the
 * real packaged assets, so a broken skill edit fails here instead of shrinking
 * the catalog silently.
 *
 * Run: node --test test/provider.test.mjs
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import {
  apply,
  BUNDLED_SKILL_RANK,
  inject,
  name,
  parseFrontmatter,
  PROVIDER_NAME,
} from '../lib/index.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = join(HERE, '..')
const SKILL_PATH = join(PACKAGE_ROOT, 'assets', 'SKILL.md')

test('plugin identity matches the bundle row', () => {
  assert.equal(name, 'dsh-owlrunkit')
  assert.equal(PROVIDER_NAME, 'dsh-owlrunkit')
  assert.deepEqual(inject, ['skills'])
  assert.equal(BUNDLED_SKILL_RANK, 600)
})

test('frontmatter reader handles the packaged skill', () => {
  const attrs = parseFrontmatter(readFileSync(SKILL_PATH, 'utf8'))
  assert.equal(attrs.name, 'owlcoda-runkit')
  assert.match(attrs.description, /Run receipt-backed, project-owned work/u)
  assert.equal(attrs.version, '0.24.1')
})

test('frontmatter reader handles quoted and block scalars', () => {
  const literal = parseFrontmatter([
    '---',
    "name: 'skilled-name'",
    'description: |',
    '  first line',
    '  second line',
    '---',
    'body',
  ].join('\n'))
  assert.equal(literal.name, 'skilled-name')
  assert.equal(literal.description, 'first line\nsecond line')

  const folded = parseFrontmatter([
    '---',
    'name: folded-name',
    'description: >',
    '  one',
    '  two',
    '---',
    '',
  ].join('\n'))
  assert.equal(folded.description, 'one two')
})

test('frontmatter reader rejects a missing block', () => {
  assert.throws(() => parseFrontmatter('# no frontmatter\n'), /frontmatter/u)
  assert.throws(() => parseFrontmatter('---\nname: x\n'), /frontmatter/u)
})

test('apply registers one provider with the packaged skill', async () => {
  const providers = []
  const ctx = {
    skills: {
      registerProvider(create) {
        providers.push(create({ signal: new AbortController().signal, invalidate() {} }))
      },
    },
  }
  apply(ctx)
  assert.equal(providers.length, 1)
  const provider = providers[0]
  assert.equal(provider.name, PROVIDER_NAME)

  const candidates = await provider.list()
  assert.equal(candidates.length, 1)
  const candidate = candidates[0]
  assert.equal(candidate.name, 'owlcoda-runkit')
  assert.equal(candidate.rank, BUNDLED_SKILL_RANK)
  assert.deepEqual(candidate.invocation, { modelInvocable: true, userInvocable: true })
  assert.equal(candidate.provider, PROVIDER_NAME)
  assert.equal(candidate.source, 'bundled')
  assert.equal(candidate.resourceBase.kind, 'directory')
  assert.equal(candidate.resourceBase.path, join(PACKAGE_ROOT, 'assets'))
  assert.equal(candidate.path, SKILL_PATH)

  const definition = await provider.get(candidate)
  assert.equal(definition.name, candidate.name)
  assert.equal(definition.description, candidate.description)
  assert.equal(definition.content, readFileSync(SKILL_PATH, 'utf8'))
  assert.match(definition.content, /OwlCoda RunKit/u)
})
