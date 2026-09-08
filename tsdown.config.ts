/**
 * Self-contained tsdown build for the dsh-open-in-dsh bundle (no monorepo
 * dependency). Emits:
 *
 *  - `lib/index.js`  — the node half (ESM). Runtime deps (`@deepseek-ai/
 *    schemastery`) and the Cordis peer stay external; node builtins stay
 *    external; everything else inlines.
 *  - `lib/client.js` — the browser half in the dsh web module-table format:
 *    the bundle calls `window.__ModuleLoader__.load({ id, factory })` and
 *    resolves platform externals through the injected require. `*.module.css`
 *    imports are compiled by lightningcss and injected as style tags, with the
 *    hashed class map exported (tsdown's own CSS pipeline is bypassed through
 *    virtual ids).
 */
import { readFile } from 'node:fs/promises'
import { isBuiltin } from 'node:module'
import { dirname, resolve } from 'node:path'
import type { UserConfig } from 'tsdown'
import { transform } from 'lightningcss'

const PACKAGE_NAME = 'dsh-open-in-dsh'

/** Node-half imports resolved from a real install (dependencies + peers). */
const HOST_EXTERNALS = new Set(['@deepseek-ai/schemastery', '@deepseek-ai/cordis'])

/** Browser specifiers the dsh shell shares into the frozen module table. */
const CLIENT_EXTERNALS = new Set([
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
])

const CSS_VIRTUAL_PREFIX = '\0dsh-css:'
const CSS_VIRTUAL_SUFFIX = '.mjs'

/** Emit a plugin-owned style injector plus the hashed class-map export. */
function styleInjectionModule(fileId: string, css: string, classMap: Record<string, string>): string {
  const tagId = `${PACKAGE_NAME}/${fileId.split(/[\\/]/u).pop()}`
  const lines = [
    `const css = ${JSON.stringify(css)};`,
    `const tagId = ${JSON.stringify(tagId)};`,
    `if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') === null) {`,
    '  const tag = document.createElement(\'style\');',
    `  tag.dataset.plugin = ${JSON.stringify(PACKAGE_NAME)};`,
    '  tag.dataset.pluginCss = tagId;',
    '  tag.textContent = css;',
    '  document.head.appendChild(tag);',
    '}',
  ]
  lines.push(`export default ${JSON.stringify(classMap)};`)
  return lines.join('\n')
}

/** Compile `*.module.css` imports to an injected style plus a class map. */
function cssModulesPlugin(): UserConfig['plugins'] extends readonly (infer P)[] ? P : never {
  return {
    name: 'dsh-css-modules-inline',
    resolveId(source: string, importer: string | undefined) {
      if (!source.endsWith('.module.css')) return null
      const abs = importer === undefined ? source : resolve(dirname(importer), source)
      return CSS_VIRTUAL_PREFIX + abs + CSS_VIRTUAL_SUFFIX
    },
    async load(virtualId: string) {
      if (!virtualId.startsWith(CSS_VIRTUAL_PREFIX)) return null
      const fileId = virtualId.slice(CSS_VIRTUAL_PREFIX.length, -CSS_VIRTUAL_SUFFIX.length)
      // The virtual id otherwise hides the physical stylesheet from the watch graph.
      this.addWatchFile(fileId)
      const source = await readFile(fileId)
      const { code, exports: cssExports } = transform({
        filename: fileId,
        code: source,
        cssModules: { pattern: '[hash]_[local]' },
        minify: true,
      })
      const classMap: Record<string, string> = {}
      for (const [local, exp] of Object.entries(cssExports ?? {})) classMap[local] = exp.name
      return styleInjectionModule(fileId, code.toString(), classMap)
    },
  }
}

const hostConfig: UserConfig = {
  name: PACKAGE_NAME,
  entry: { index: 'src/index.ts' },
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  deps: {
    neverBundle: (specifier: string): boolean =>
      isBuiltin(specifier) || HOST_EXTERNALS.has(specifier),
    alwaysBundle: (specifier: string): boolean => !(isBuiltin(specifier) || HOST_EXTERNALS.has(specifier)),
  },
}

const clientConfig: UserConfig = {
  name: `${PACKAGE_NAME}/client`,
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: ['cjs'],
  platform: 'browser',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  sourcemap: true,
  clean: false,
  deps: {
    neverBundle: (specifier: string): boolean => CLIENT_EXTERNALS.has(specifier),
    alwaysBundle: (specifier: string): boolean => !CLIENT_EXTERNALS.has(specifier),
  },
  plugins: [cssModulesPlugin()],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_NAME)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default [hostConfig, clientConfig]
