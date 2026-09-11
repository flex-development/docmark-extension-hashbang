/**
 * @file E2E Tests - comments
 * @module docmark-extension-hashbang/tests/e2e/comments
 */

import snapshot from '#tests/utils/snapshot-events'
import { parse, postprocess, preprocess } from '@flex-development/docmark'
import testSubject from '@flex-development/docmark-extension-hashbang'
import { lang, tt } from '@flex-development/docmark-util-symbol'
import type {
  Chunk,
  FileLike,
  ParseOptions,
  TokenizeContext
} from '@flex-development/docmark-util-types'
import pathe from '@flex-development/pathe'
import { readSync as read } from 'to-vfile'
import { beforeAll, describe, expect, it } from 'vitest'

describe('e2e:comments', () => {
  let directory: string
  let options: ParseOptions

  beforeAll(() => {
    directory = '__fixtures__'

    options = {
      extensions: [testSubject],

      /**
       * @this {void}
       *
       * @param {TokenizeContext} context
       *  The tokenization context
       * @return {undefined}
       */
      finalizeContext(this: void, context: TokenizeContext): undefined {
        context.parser.lang = lang.shell
        return void context
      }
    }
  })

  it.each<[path: string]>([
    ['empty/01.txt'],
    ['empty/02.txt']
  ])('should handle no comments (%j)', path => {
    // Arrange
    const file: FileLike = read(pathe.join(directory, path))
    const slice: Chunk[] = preprocess()(file, undefined, true)

    // Act
    const result = postprocess(parse(options).source().write(slice))

    // Expect
    expect(result).to.have.property('length', 2)
    expect(result).to.each.have.nested.property('1.type', tt.eoc)
    expect(result).to.each.have.nested.property('1.start')
    expect(result).to.each.have.nested.property('1.end')
  })

  it.each<[path: string]>([
    ['opener-only/01.txt'],
    ['opener-only/02.txt'],
    ['opener-only/03.txt'],
    ['opener-only/04.txt'],
    ['path-only/01.txt'],
    ['path-only/02.txt'],
    ['path-only/03.txt'],
    ['path-only/04.txt'],
    ['with-arguments/01.txt'],
    ['with-arguments/02.txt'],
    ['with-arguments/03.txt'],
    ['with-arguments/04.txt']
  ])('should parse hashbang comments (%j,%j)', path => {
    // Arrange
    const file: FileLike = read(pathe.join(directory, path))
    const slice: Chunk[] = preprocess()(file, undefined, true)

    // Act
    const result = postprocess(parse(options).source().write(slice))

    // Expect
    expect(result).to.have.property('length').be.at.least(2)
    expect(result).to.each.have.nested.property('1.start')
    expect(result).to.each.have.nested.property('1.end')
    expect(snapshot(result)).toMatchSnapshot()
  })
})
