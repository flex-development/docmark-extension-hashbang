/**
 * @file E2E Tests - api
 * @module docmark-extension-hashbang/tests/e2e/api
 */

import * as testSubject from '@flex-development/docmark-extension-hashbang'
import { describe, expect, it } from 'vitest'

describe('e2e:docmark-extension-hashbang', () => {
  it('should expose public api', () => {
    expect(Object.keys(testSubject)).toMatchSnapshot()
  })
})
