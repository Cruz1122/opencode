export * as ProviderUsageEvent from "./provider-usage-event"

import { Schema } from "effect"
import { optional } from "./schema"
import { Event } from "./event"
import { Provider } from "./provider"

export const Window = Schema.Struct({
  usedPercent: Schema.Number,
  windowMinutes: optional(Schema.Number),
  resetsAt: optional(Schema.Number),
}).annotate({ identifier: "ProviderUsageWindow" })
export type Window = Schema.Schema.Type<typeof Window>

export const Credits = Schema.Struct({
  hasCredits: Schema.Boolean,
  unlimited: Schema.Boolean,
  balance: optional(Schema.String),
}).annotate({ identifier: "ProviderUsageCredits" })
export type Credits = Schema.Schema.Type<typeof Credits>

export const Snapshot = Schema.Struct({
  providerID: Provider.ID,
  primary: optional(Window),
  secondary: optional(Window),
  tertiary: optional(Window),
  credits: optional(Credits),
  capturedAt: Schema.Number,
}).annotate({ identifier: "ProviderUsageSnapshot" })
export type Snapshot = Schema.Schema.Type<typeof Snapshot>

export const Updated = Event.define({
  type: "provider.usage",
  schema: {
    providerID: Provider.ID,
    usage: Snapshot,
  },
})

export const Definitions = Event.inventory(Updated)
