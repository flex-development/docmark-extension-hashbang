/**
 * @file rollup
 * @module config/rollup
 */

import { codecovRollupPlugin as codecov } from '@codecov/rollup-plugin'
import { EXPORT_AGGREGATE_REGEX } from '@flex-development/export-regex'
import { STATIC_IMPORT_REGEX } from '@flex-development/import-regex'
import resolve from '@rollup/plugin-node-resolve'
import { ok } from 'devlop'
import ci from 'is-ci'
import type {
  InputOption,
  NormalizedOutputOptions,
  OutputBundle,
  Plugin,
  PluginContext,
  RollupOptions
} from 'rollup'
import cleanup from 'rollup-plugin-cleanup'
import { dts as dtsBundle } from 'rollup-plugin-dts'
import pkg from './package.json' with { type: 'json' }

/**
 * The list of target files.
 *
 * @const {ReadonlyArray<InputOption>} files
 */
const files: readonly InputOption[] = [
  { index: 'dist/index.mjs' },
  'dist/index.d.mts'
]

/**
 * The rollup configuration.
 *
 * @see {@linkcode RollupOptions}
 *
 * @type {RollupOptions[]}
 */
export default files.map((input: InputOption): RollupOptions => {
  /**
   * The list of external dependencies.
   *
   * @const {string[]} external
   */
  const external: string[] = Object.keys(pkg.dependencies)

  /**
   * The list of plugins.
   *
   * @const {(Plugin | Plugin[])[]} plugins
   */
  const plugins: (Plugin | Plugin[])[] = []

  // bundling typescript declarations.
  if (typeof input === 'string') {
    // locate modules using the node resolution algorithm.
    plugins.push(resolve({ extensions: ['.d.mts', '.mts'] }))

    // bundle declaration files and fix `type` modifiers.
    plugins.push(dts())

    return { external, input, output: { file: input, format: 'esm' }, plugins }
  }

  // bundling runtime code.

  // locate modules using the node resolution algorithm.
  plugins.push(resolve())

  // remove extraneous comments.
  plugins.push(cleanup({ comments: 'none' }))

  // support codecov bundle analysis.
  plugins.push(codecov({
    bundleName: pkg.name,
    debug: true,
    enableBundleAnalysis: ci,
    uploadToken: process.env['CODECOV_TOKEN']!
  }))

  return {
    external,
    input,
    output: {
      chunkFileNames: 'shared/[name].mjs',
      dir: 'dist',
      entryFileNames: '[name].mjs',
      format: 'esm'
    },
    plugins
  }
})

/**
 * Create a plugin pack to bundle declaration files and fix `type` modifiers.
 *
 * @this {void}
 *
 * @return {Plugin[]}
 *  The plugin pack
 */
function dts(this: void): Plugin[] {
  return [
    dtsBundle(),
    {
      /**
       * Re-add lost `type` modifiers.
       *
       * @see https://github.com/Swatinem/rollup-plugin-dts/issues/354
       *
       * @this {PluginContext}
       *
       * @param {NormalizedOutputOptions} options
       *  The normalized output options
       * @param {OutputBundle} bundle
       *  The output bundle object
       * @return {undefined}
       */
      generateBundle(
        this: PluginContext,
        options: NormalizedOutputOptions,
        bundle: OutputBundle
      ): undefined {
        for (const output of Object.values(bundle)) {
          if (output.type === 'chunk') {
            output.code = output.code.replace(EXPORT_AGGREGATE_REGEX, (
              match: string,
              type: string | undefined,
              exports: string,
              specifier: string | undefined
            ) => {
              ok(specifier, 'expected `specifier`')
              return type ? match : match.replace('export {', 'export type {')
            })

            output.code = output.code.replace(STATIC_IMPORT_REGEX, (
              match: string,
              type: string | undefined
            ) => {
              return type ? match : match.replace('import', 'import type')
            })
          }
        }

        return void this
      },

      /**
       * The plugin name.
       */
      name: 'dts:fix-type-modifiers'
    }
  ]
}
