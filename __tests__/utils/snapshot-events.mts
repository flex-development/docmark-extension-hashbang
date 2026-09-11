/**
 * @file Test Utilities - snapshotEvents
 * @module tests/utils/snapshotEvents
 */

import { ev, tt } from '@flex-development/docmark-util-symbol'
import type {
  Event,
  EventType,
  Token
} from '@flex-development/docmark-util-types'

/**
 * Get a snapshot-compliant list of events.
 *
 * @this {void}
 *
 * @param {Event[]} events
 *  The list of events
 * @return {[EventType, Token][]}
 *  The list of event types and tokens
 */
function snapshotEvents(this: void, events: Event[]): [EventType, Token][] {
  return events.map(([event, token, self]) => {
    if (
      event === ev.enter &&
      token.type !== tt.blockQuotePrefix &&
      token.type !== tt.characterReference &&
      token.type !== tt.codeFenced &&
      token.type !== tt.codeFencedFence &&
      token.type !== tt.codeFencedFenceInfo &&
      token.type !== tt.codeIndented &&
      token.type !== tt.codeText &&
      token.type !== tt.comment &&
      token.type !== tt.commentLinePrefix &&
      token.type !== tt.content &&
      token.type !== tt.eoc &&
      token.type !== tt.emphasis &&
      token.type !== tt.emphasisText &&
      token.type !== tt.definition &&
      token.type !== tt.definitionDestination &&
      token.type !== tt.definitionDestinationRaw &&
      token.type !== tt.definitionDestinationString &&
      token.type !== tt.definitionLabel &&
      token.type !== tt.htmlFlow &&
      token.type !== tt.htmlText &&
      token.type !== tt.htmlTextData &&
      token.type !== tt.inlineTag &&
      token.type !== tt.inlineTagMarker &&
      token.type !== tt.inlineTagText &&
      token.type !== tt.label &&
      token.type !== tt.link &&
      token.type !== tt.listItemPrefix &&
      token.type !== tt.namepath &&
      token.type !== tt.paragraph &&
      token.type !== tt.reference &&
      token.type !== tt.referenceString &&
      token.type !== tt.strong &&
      token.type !== tt.strongText &&
      token.type !== tt.summaryMarker &&
      token.type !== tt.tagName &&
      token.type !== tt.tagNameMarker &&
      token.type !== tt.typeMetadata &&
      token.type !== tt.typeMetadataMarker &&
      !token._container &&
      !Object.prototype.hasOwnProperty.call(token, 'value')
    ) {
      token.value = self.sliceSerialize(token)
    }

    Object.defineProperties(token, {
      _tokenizer: { enumerable: false },
      next: { enumerable: false },
      previous: { enumerable: false }
    })

    return [event, token] as const
  })
}

export default snapshotEvents
