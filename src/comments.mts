/**
 * @file comments
 * @module docmark-extension-hashbang/comments
 */

import { codes } from '@flex-development/docmark-util-symbol'
import type { NormalizedExtension } from '@flex-development/docmark-util-types'
import comment from './comment.mts'

/**
 * The hashbang comment syntax extension.
 *
 * @see {@linkcode NormalizedExtension}
 *
 * @const {NormalizedExtension} comments
 */
const comments: NormalizedExtension = {
  source: { [codes.numberSign]: comment }
}

export default comments
