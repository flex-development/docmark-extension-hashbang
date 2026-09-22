/**
 * @file comments
 * @module docmark-extension-hashbang/comments
 */

import { codes, constants } from '@flex-development/docmark-util-symbol'
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
  [constants.contentTypeSource]: { [codes.numberSign]: comment }
}

export default comments
