import type {} from '@flex-development/docmark-util-types'

declare module '@flex-development/docmark-util-types' {
  interface Token {
    /**
     * The value of the token.
     *
     * @internal
     */
    value?: string | null | undefined
  }
}
