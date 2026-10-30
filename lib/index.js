/**
 * dsh-owlrunkit — serve the OwlCoda RunKit skill to DeepSeek Harness sessions.
 *
 * The skill travels inside this package under `assets/`. Mounting the bundle
 * registers one Cordis skill provider on `ctx.skills`, so no file is copied
 * into a user or project skill root and the skill appears in the session
 * catalog as soon as the profile is composed.
 *
 * The provider reports the standard bundled rank (600). A project, custom, or
 * user skill with the same name therefore keeps precedence, which lets an
 * installer pin a different RunKit revision without fighting the package.
 *
 * @module dsh-owlrunkit
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Cordis plugin name; must match the bundle patch row. */
export const name = 'dsh-owlrunkit'

/** Service required by the bundled provider. */
export const inject = ['skills']

/** Provider name registered on `ctx.skills`. */
export const PROVIDER_NAME = 'dsh-owlrunkit'

/** Standard precedence rank for packaged skill providers and local bundled roots. */
export const BUNDLED_SKILL_RANK = 600

const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const ASSETS_DIR = join(PACKAGE_ROOT, 'assets')
const SKILL_PATH = join(ASSETS_DIR, 'SKILL.md')

/** Public skill-name grammar: lowercase kebab-case. */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Remove one layer of YAML quoting from a scalar.
 * @param {string} value - raw scalar text.
 * @returns {string} unquoted text.
 */
function unquote(value) {
  const text = value.trim()
  if (text.length >= 2 && text.startsWith("'") && text.endsWith("'")) {
    return text.slice(1, -1).replaceAll("''", "'")
  }
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    try {
      return JSON.parse(text)
    } catch {
      return text.slice(1, -1)
    }
  }
  return text
}

/**
 * Fold a YAML block scalar's lines.
 * @param {string[]} lines - dedented block lines.
 * @param {'literal' | 'folded'} kind - block scalar style.
 * @returns {string} the scalar value.
 */
function blockScalar(lines, kind) {
  if (kind === 'literal') return lines.join('\n').replace(/\n+$/u, '')
  const paragraphs = []
  let current = []
  for (const line of lines) {
    if (line.trim() === '') {
      if (current.length > 0) paragraphs.push(current.join(' '))
      current = []
      continue
    }
    current.push(line.trim())
  }
  if (current.length > 0) paragraphs.push(current.join(' '))
  return paragraphs.join('\n')
}

/**
 * Read the top-level scalar fields of a SKILL.md YAML frontmatter block.
 *
 * This is deliberately a small reader for the skill format rather than a
 * general YAML implementation: it understands single-line scalars, quoted
 * scalars, and `|`/`>` block scalars, and ignores nested maps. The two fields
 * the skill catalog needs are `name` and `description`; every other field is
 * carried by the skill body itself.
 *
 * @param {string} text - complete SKILL.md text.
 * @returns {Record<string, string>} top-level scalar fields.
 */
export function parseFrontmatter(text) {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  if (!source.startsWith('---\n') && !source.startsWith('---\r\n')) {
    throw new Error('missing YAML frontmatter')
  }
  const close = source.indexOf('\n---', 3)
  if (close === -1) throw new Error('unterminated YAML frontmatter')
  const block = source.slice(source.indexOf('\n') + 1, close)

  const attrs = {}
  let key = null
  let kind = null
  let buffer = []

  const flush = () => {
    if (key === null || kind === null) return
    const content = buffer.filter((line) => line.trim() !== '')
    const indent = content.length === 0
      ? 0
      : Math.min(...content.map((line) => /^\s*/u.exec(line)[0].length))
    attrs[key] = blockScalar(buffer.map((line) => line.slice(indent)), kind)
    key = null
    kind = null
    buffer = []
  }

  for (const line of block.split(/\r?\n/u)) {
    if (kind !== null) {
      if (line.trim() === '' || /^\s/u.test(line)) {
        buffer.push(line)
        continue
      }
      flush()
    }
    if (line.trim() === '' || /^\s/u.test(line)) continue
    const match = /^([A-Za-z0-9_.-]+):(?:\s+(.*))?$/u.exec(line)
    if (match === null) continue
    const [, field, raw = ''] = match
    const value = raw.trim()
    if (value === '|' || value === '|-' || value === '|+') {
      key = field
      kind = 'literal'
      buffer = []
      continue
    }
    if (value === '>' || value === '>-' || value === '>+') {
      key = field
      kind = 'folded'
      buffer = []
      continue
    }
    if (value === '') continue
    attrs[field] = unquote(value)
  }
  flush()
  return attrs
}

/**
 * Read and validate the packaged skill metadata.
 * @returns {{ name: string, description: string }} validated identity fields.
 */
function readSkillMeta() {
  const attrs = parseFrontmatter(readFileSync(SKILL_PATH, 'utf8'))
  if (typeof attrs.name !== 'string' || !SKILL_NAME.test(attrs.name)) {
    throw new Error(`dsh-owlrunkit: ${SKILL_PATH} has an invalid skill name`)
  }
  if (typeof attrs.description !== 'string' || attrs.description.trim() === '') {
    throw new Error(`dsh-owlrunkit: ${SKILL_PATH} has no skill description`)
  }
  return { name: attrs.name, description: attrs.description }
}

/**
 * Register the packaged skill provider.
 * @param {object} ctx - Cordis context carrying `skills`.
 */
export function apply(ctx) {
  const meta = readSkillMeta()
  const candidate = {
    name: meta.name,
    description: meta.description,
    invocation: { modelInvocable: true, userInvocable: true },
    provider: PROVIDER_NAME,
    source: 'bundled',
    resourceBase: { kind: 'directory', path: ASSETS_DIR },
    rank: BUNDLED_SKILL_RANK,
    path: SKILL_PATH,
    locator: SKILL_PATH,
  }
  const provider = {
    name: PROVIDER_NAME,
    list: () => Promise.resolve([candidate]),
    get: async () => ({
      ...candidate,
      content: readFileSync(SKILL_PATH, 'utf8'),
    }),
  }
  ctx.skills.registerProvider(() => provider)
}
