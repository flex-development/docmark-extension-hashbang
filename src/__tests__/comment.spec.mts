/**
 * @file Unit Tests - comment
 * @module docmark-extension-hashbang/tests/unit/comment
 */

import { describe, expect, it } from 'vitest'
import testSubject from '../comment.mts'

describe('unit:comment', () => {
  it('should be named comment construct', () => {
    expect(testSubject).to.have.property('continuation')
    expect(testSubject).to.have.property('name').be.a('string')
    expect(testSubject).toMatchSnapshot()
  })
})
