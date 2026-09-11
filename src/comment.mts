/**
 * @file comment
 * @module docmark-extension-hashbang/comment
 */

import {
  factoryMarkers,
  type Sequence
} from '@flex-development/docmark-factory-markers'
import { factorySpace } from '@flex-development/docmark-factory-space'
import { trailingWhitespace } from '@flex-development/docmark-grammar'
import {
  codes,
  constants,
  kind,
  tt
} from '@flex-development/docmark-util-symbol'
import type {
  Code,
  ContinuableConstruct,
  Effects,
  NamedConstruct,
  State,
  TokenizeContext
} from '@flex-development/docmark-util-types'
import {
  bos,
  eol,
  eos,
  whitespace
} from '@flex-development/mark-util-character'
import { ok as assert } from 'devlop'

/**
 * The hashbang comment construct.
 *
 * This construct is expected to run at the `source` content level.
 *
 * @const {ContinuableConstruct & NamedConstruct} comment
 */
const comment: ContinuableConstruct & NamedConstruct = {
  continuation: { tokenize: tokenizeHashbangContinuation },
  exit: exitHashbang,
  name: `${tt.comment}:${kind.hashbang}`,
  previous: previousHashbang,
  tokenize: tokenizeHashbang
}

export default comment

/**
 * Exit the comment container.
 *
 * @this {TokenizeContext}
 *
 * @param {Effects} effects
 *  The context object used to transition the state machine
 * @return {undefined}
 */
function exitHashbang(this: TokenizeContext, effects: Effects): undefined {
  assert(this.parser.constructs.disable.null, 'expected `disable.null`')
  this.parser.constructs.disable.null.push(comment.name)
  return void effects.exit(tt.comment)
}

/**
 * Check if `code` can precede a hashbang comment.
 *
 * @this {TokenizeContext}
 *
 * @param {Code} code
 *  The previous character code
 * @return {boolean}
 *  Whether `code` can precede a hashbang comment
 */
function previousHashbang(this: TokenizeContext, code: Code): boolean {
  return bos(code)
}

/**
 * Tokenize a hashbang comment.
 *
 * @this {TokenizeContext}
 *
 * @param {Effects} effects
 *  The context object used to transition the state machine
 * @param {State} ok
 *  The successful tokenization state
 * @param {State} nok
 *  The failed tokenization state
 * @return {State}
 *  The initial state
 */
function tokenizeHashbang(
  this: TokenizeContext,
  effects: Effects,
  ok: State,
  nok: State
): State {
  /**
   * The tokenization context.
   *
   * @const {TokenizeContext} self
   */
  const self: TokenizeContext = this

  return startComment

  /**
   * At the beginning of a hashbang comment.
   *
   * > 👉 **Note**: `␊` represents a line ending.
   *
   * @example
   *  ```markdown
   *  > |#!/usr/bin/env node␊
   *     ^
   *  ```
   *
   * @this {void}
   *
   * @param {Code} code
   *  The current character code
   * @return {State | undefined}
   *  The next state
   */
  function startComment(this: void, code: Code): State | undefined {
    assert(code === codes.numberSign, 'expected `codes.numberSign`')

    effects.enter(tt.comment, { kind: kind.hashbang, lang: self.parser.lang })
    effects.enter(tt.commentLinePrefix)

    /**
     * The comment marker sequence.
     *
     * @const {Sequence} markers
     */
    const markers: Sequence = [codes.numberSign, codes.exclamationMark]

    return factoryMarkers(effects, checkBlankLine, nok, markers)(code)
  }

  /**
   * Check for a blank line.
   *
   * @this {void}
   *
   * @param {Code} code
   *  The current character code
   * @return {State | undefined}
   *  The next state
   */
  function checkBlankLine(this: void, code: Code): State | undefined {
    // delegate to `source` initializer.
    if (eol(code) || eos(code)) return beforeBlankLine(code)

    // definite non-empty line.
    if (!whitespace(code)) return endPrefix(code)

    // check for prefixed blank line.
    // if found, delegate to `source` initializer.
    // otherwise capture optional comment padding.
    // note: the `trailingWhitespace` construct is used because the
    // `blankLine` construct expects the previous code to be the beginning of
    // stream code or a line ending.
    return effects.check(
      trailingWhitespace,
      beforeBlankLine,
      factorySpace(
        effects,
        endPrefix,
        tt.commentPadding,
        constants.commentPaddingSizeMin
      )
    )(code)
  }

  /**
   * Before a blank logical line.
   *
   * The comment line prefix ends immediately before the line ending
   * or end of stream.
   *
   * > 👉 **Note**: `␊` represents a line ending and `␠` represents a space.
   *
   * @example
   *  ```markdown
   *  > |#!␊
   *       ^
   *  ```
   *
   * @example
   *  ```markdown
   *  > |#!␠␠␠␊
   *       ^
   *  ```
   *
   * @this {void}
   *
   * @param {Code} code
   *  The current character code
   * @return {State | undefined}
   *  The next state
   */
  function beforeBlankLine(this: void, code: Code): State | undefined {
    effects.exit(tt.commentLinePrefix)
    return ok(code)
  }

  /**
   * After comment markers and optional padding.
   *
   * The comment line prefix ends immediately before the interpreter path
   * and any arbitrary whitespace.
   *
   * > 👉 **Note**: `␊` represents a line ending and `␠` represents a space.
   *
   * @example
   *  ```markdown
   *  > |#!/usr/bin/env node␊
   *       ^
   *  ```
   *
   * @example
   *  ```markdown
   *  > |#!␠␠/usr/bin/env tsx-node␊
   *        ^
   *  ```
   *
   * @this {void}
   *
   * @param {Code} code
   *  The current character code
   * @return {State | undefined}
   *  The next state
   */
  function endPrefix(this: void, code: Code): State | undefined {
    assert(!eol(code), 'did not expect line ending')
    assert(!eos(code), 'did not expect end of stream')

    // finish comment line prefix.
    effects.exit(tt.commentLinePrefix)

    // capture arbitrary whitespace then start interpreter path.
    return factorySpace(effects, startPath, tt.whitespace)(code)
  }

  /**
   * At the beginning of the interpreter path.
   *
   * > 👉 **Note**: `␊` represents a line ending.
   *
   * @example
   *  ```markdown
   *  > |#!/usr/bin/env node␊
   *       ^
   *  ```
   *
   * @example
   *  ```markdown
   *  > |#! /usr/bin/env tsx-node␊
   *        ^
   *  ```
   *
   * @this {void}
   *
   * @param {Code} code
   *  The current character code
   * @return {State | undefined}
   *  The next state
   */
  function startPath(this: void, code: Code): State | undefined {
    effects.enter(tt.interpreterPath)
    return insidePath(code)
  }

  /**
   * Inside the interpreter path.
   *
   * > 👉 **Note**: `␊` represents a line ending.
   *
   * @example
   *  ```markdown
   *  > |#!/usr/bin/bash
   *       ^^^^^^^^^^^^^
   *  ```
   *
   * @example
   *  ```markdown
   *  > |#!/usr/bin/env␊
   *       ^^^^^^^^^^^^
   *  ```
   *
   * @example
   *  ```markdown
   *  > |#!/usr/bin/env node --experimental-strip-types␊
   *       ^^^^^^^^^^^^
   *  ```
   *
   * @this {void}
   *
   * @param {Code} code
   *  The current character code
   * @return {State | undefined}
   *  The next state
   */
  function insidePath(this: void, code: Code): State | undefined {
    // interpreter path and comment terminated by end of stream.
    // the `source` initializer will handle closing the comment.
    if (eos(code)) {
      effects.exit(tt.interpreterPath)
      return ok(code)
    }

    // finish interpreter path before line ending,
    // then capture line ending so it's not considered a blank line.
    if (eol(code)) {
      effects.exit(tt.interpreterPath)

      effects.enter(tt.lineEnding)
      effects.consume(code)
      effects.exit(tt.lineEnding)

      return ok
    }

    // try capturing trailing whitespace.
    // no need to worry about blank lines; they've already been accounted for.
    if (whitespace(code)) {
      effects.exit(tt.interpreterPath)

      // try capturing trailing whitespace.
      // if successful, let `source` initializer take over.
      // otherwise, capture whitespace and start interpreter argument.
      return effects.attempt(
        trailingWhitespace,
        ok,
        factorySpace(effects, startArgument, tt.whitespace)
      )(code)
    }

    // add code to interpreter path.
    effects.consume(code)
    return insidePath
  }

  /**
   * At the beginning of an interpreter argument.
   *
   * > 👉 **Note**: `␊` represents a line ending.
   *
   * @example
   *  ```markdown
   *  > |#!/usr/bin/env node --conditions=docmark␊
   *                    ^
   *  ```
   *
   * @this {void}
   *
   * @param {Code} code
   *  The current character code
   * @return {State | undefined}
   *  The next state
   */
  function startArgument(this: void, code: Code): State | undefined {
    assert(!eol(code), 'did not expect line ending')
    assert(!eos(code), 'did not expect end of stream')

    effects.enter(tt.interpreterArgument)
    return insideArgument(code)
  }

  /**
   * Inside an interpreter argument.
   *
   * > 👉 **Note**: `␊` represents a line ending.
   *
   * @example
   *  ```markdown
   *  > |#!/usr/bin/env node --conditions=docmark␊
   *                    ^^^^
   *  ```
   *
   * @example
   *  ```markdown
   *  > |#!/usr/bin/env node --experimental-strip-types
   *                    ^^^^
   *  ```
   *
   * @this {void}
   *
   * @param {Code} code
   *  The current character code
   * @return {State | undefined}
   *  The next state
   */
  function insideArgument(this: void, code: Code): State | undefined {
    // interpreter argument and comment terminated by end of stream.
    // the `source` initializer will handle closing the comment.
    if (eos(code)) {
      effects.exit(tt.interpreterArgument)
      return ok(code)
    }

    // finish interpreter argument before line ending,
    // then capture line ending so it's not considered a blank line.
    if (eol(code)) {
      effects.exit(tt.interpreterArgument)

      effects.enter(tt.lineEnding)
      effects.consume(code)
      effects.exit(tt.lineEnding)

      return ok
    }

    // try capturing trailing whitespace.
    // no need to worry about blank lines; they've already been accounted for.
    if (whitespace(code)) {
      effects.exit(tt.interpreterArgument)

      // try capturing trailing whitespace.
      // if found, let `source` initializer take over.
      // otherwise, capture whitespace and start another interpreter argument.
      return effects.attempt(
        trailingWhitespace,
        ok,
        factorySpace(effects, startArgument, tt.whitespace)
      )(code)
    }

    // add code to interpreter argument.
    effects.consume(code)
    return insideArgument
  }
}

/**
 * Continue tokenizing a hashbang comment.
 *
 * @this {TokenizeContext}
 *
 * @param {Effects} effects
 *  The context object used to transition the state machine
 * @param {State} ok
 *  The successful tokenization state
 * @param {State} nok
 *  The failed tokenization state
 * @return {State}
 *  The initial state
 */
function tokenizeHashbangContinuation(
  this: TokenizeContext,
  effects: Effects,
  ok: State,
  nok: State
): State {
  return nok
}
