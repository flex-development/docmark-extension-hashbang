/**
 * @file comment
 * @module docmark-extension-hashbang/comment
 */

import { factoryMarkers } from '@flex-development/docmark-factory-markers'
import { factorySpace } from '@flex-development/docmark-factory-space'
import { trailingWhitespace } from '@flex-development/docmark-grammar'
import { codes, kind, tt } from '@flex-development/docmark-util-symbol'
import type {
  Code,
  ContinuableConstruct,
  Effects,
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
 * @see {@linkcode ContinuableConstruct}
 *
 * @const {ContinuableConstruct} comment
 */
const comment: ContinuableConstruct = {
  continuation: { tokenize: tokenizeHashbangContinuation },
  exit: exitHashbang,
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

    effects.enter(tt.comment, { kind: kind.hashbang })
    effects.enter(tt.commentOpener)

    return factoryMarkers(effects, endOpener, nok, [
      code,
      codes.exclamationMark
    ])(code)
  }

  /**
   * After the comment opener.
   *
   * Any optional padding is captured **outside** the opener.\
   * A blank line ends the comment before any padding is captured, however.\
   *
   * The interpreter path begins at the first non-whitespace code after
   * the last comment marker.
   *
   * > 👉 **Note**: `␊` represents a line ending, `␠` represents a space,
   * > and `ᴺᵁᴸ` represents end-of-stream.
   *
   * @example
   *  ```markdown
   *  > |#!␊
   *       ^
   *  ```
   *
   * @example
   *  ```markdown
   *  > |#!ᴺᵁᴸ
   *       ^
   *  ```
   *
   * @example
   *  ```markdown
   *  > |#!␠␠␊
   *       ^
   *  ```
   *
   * @example
   *  ```markdown
   *  > |#!␠␠ᴺᵁᴸ
   *       ^
   *  ```
   *
   * @example
   *  ```markdown
   *  > |#!␠␠/usr/bin/env tsx-node␊
   *       ^
   *  ```
   *
   * @example
   *  ```markdown
   *  > |#!/usr/bin/env node␊
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
  function endOpener(this: void, code: Code): State | undefined {
    // finish the comment opener.
    effects.exit(tt.commentOpener)

    // comment terminated by end-of-stream.
    // delegate to the `source` initializer.
    if (eos(code)) return ok(code)

    // mark the comment for closure.
    // blank lines are not hashbang content, so no need to capture line ending.
    // the `source` initializer will consume it as `opaque` content.
    if (eol(code)) return closeComment(code)

    // check for a prefixed blank line.
    // if found, mark the comment for closure.
    // otherwise capture optional comment padding and start interpreter path.
    // note: the `trailingWhitespace` construct is used because the `blankLine`
    // construct expects a previous comment line prefix `exit` event, or
    // `self.previous` to be the beginning of stream code or a line ending.
    return effects.check(
      trailingWhitespace,
      closeComment,
      factorySpace(effects, startPath, tt.commentPadding)
    )(code)
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
    assert(!eol(code), 'did not expect line ending')
    assert(!eos(code), 'did not expect end of stream')
    assert(!whitespace(code), 'did not expect whitespace')

    effects.enter(tt.interpreterPath)
    return insidePath(code)
  }

  /**
   * Inside the interpreter path.
   *
   * > 👉 **Note**: `␊` represents a line ending
   * > and `ᴺᵁᴸ` represents end-of-stream.
   *
   * @example
   *  ```markdown
   *  > |#!/usr/bin/bashᴺᵁᴸ
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

    // finish interpreter path before whitespace.
    if (whitespace(code)) {
      effects.exit(tt.interpreterPath)

      // try ending comment before trailing whitespace.
      // no need to worry about blank lines; they've already been accounted for.
      // if successful, mark the comment for closure.
      // otherwise, capture whitespace and start first interpreter argument.
      return effects.check(
        trailingWhitespace,
        closeComment,
        factorySpace(effects, startArgument, tt.whitespace)
      )(code)
    }

    // add to interpreter path.
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
   * > 👉 **Note**: `␊` represents a line ending
   * > and `ᴺᵁᴸ` represents end-of-stream.
   *
   * @example
   *  ```markdown
   *  > |#!/usr/bin/env node --conditions=docmark␊
   *                    ^^^^
   *  ```
   *
   * @example
   *  ```markdown
   *  > |#!/usr/bin/env node --experimental-strip-typesᴺᵁᴸ
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

    // finish interpreter argument before whitespace.
    if (whitespace(code)) {
      effects.exit(tt.interpreterArgument)

      // try ending comment before trailing whitespace.
      // no need to worry about blank lines; they've already been accounted for.
      // if successful, mark the comment for closure.
      // otherwise, capture whitespace and start another interpreter argument.
      return effects.check(
        trailingWhitespace,
        closeComment,
        factorySpace(effects, startArgument, tt.whitespace)
      )(code)
    }

    // add to interpreter argument.
    effects.consume(code)
    return insideArgument
  }

  /**
   * Mark the comment for closure.
   *
   * Container finalization is deferred to the `source` initializer.
   *
   * > 👉 **Note**: `␊` represents a line ending, `␠` represents a space,
   * > and `ᴺᵁᴸ` represents end-of-stream.
   *
   * @example
   *  ```markdown
   *  > |#!␠␠ᴺᵁᴸ
   *       ^
   *  ```
   *
   * @example
   *  ```markdown
   *  > |#!␠␠␊
   *       ^
   *  ```
   *
   * @example
   *  ```markdown
   *  > |#!/bin/zsh␠␠␠ᴺᵁᴸ
   *               ^
   *  ```
   *
   * @example
   *  ```markdown
   *  > |#!/bin/bash␠␠␠␊
   *                ^
   *  ```
   *
   * @example
   *  ```markdown
   *  > |#!/usr/bin/env node --conditions=docmark␠␠␠ᴺᵁᴸ
   *                                             ^
   *  ```
   *
   * @example
   *  ```markdown
   *  > |#!/usr/bin/env node --experimental-transform-types␠␠␠␊
   *                                                       ^
   *  ```
   *
   * @this {void}
   *
   * @param {Code} code
   *  The current character code
   * @return {State | undefined}
   *  The next state
   */
  function closeComment(this: void, code: Code): State | undefined {
    assert(self.containerState, 'expected `containerState` inside comment')
    self.containerState._closeFlow = true
    return ok(code)
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
