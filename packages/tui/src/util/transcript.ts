import type { AssistantMessage, Message, Part, Provider, UserMessage } from "@opencode-ai/sdk/v2"
import { Locale } from "./locale"
import * as Model from "./model"
import { aggregateTokens, formatTokenStats, turnAssistants } from "./message-tokens"

export type TranscriptOptions = {
  thinking: boolean
  toolDetails: boolean
  assistantMetadata: boolean
  providers?: Provider[]
}

export type SessionInfo = {
  id: string
  title: string
  time: {
    created: number
    updated: number
  }
}

export type MessageWithParts = {
  info: UserMessage | AssistantMessage
  parts: Part[]
}

export function formatTranscript(
  session: SessionInfo,
  messages: MessageWithParts[],
  options: TranscriptOptions,
): string {
  const providers = Model.index(options.providers)
  let transcript = `# ${session.title}\n\n`
  transcript += `**Session ID:** ${session.id}\n`
  transcript += `**Created:** ${new Date(session.time.created).toLocaleString()}\n`
  transcript += `**Updated:** ${new Date(session.time.updated).toLocaleString()}\n\n`
  transcript += `---\n\n`

  for (const msg of messages) {
    transcript += formatMessage(msg.info, msg.parts, options, providers, messages.map((item) => item.info))
    transcript += `---\n\n`
  }

  return transcript
}

export function formatMessage(
  msg: UserMessage | AssistantMessage,
  parts: Part[],
  options: TranscriptOptions,
  providers?: Provider[] | ReadonlyMap<string, Provider>,
  messages?: Message[],
): string {
  let result = ""

  if (msg.role === "user") {
    result += `## User\n\n`
  } else {
    result += formatAssistantHeader(msg, options.assistantMetadata, providers ?? options.providers, messages)
  }

  for (const part of parts) {
    result += formatPart(part, options)
  }

  return result
}

export function formatAssistantHeader(
  msg: AssistantMessage,
  includeMetadata: boolean,
  providers?: Provider[] | ReadonlyMap<string, Provider>,
  messages?: Message[],
): string {
  if (!includeMetadata) {
    return `## Assistant\n\n`
  }

  const user = messages?.find((item) => item.role === "user" && item.id === msg.parentID)
  const durationMs =
    user?.time && msg.time.completed ? msg.time.completed - user.time.created : msg.time.completed
      ? msg.time.completed - msg.time.created
      : 0

  const modelName = Model.name(providers, msg.providerID, msg.modelID)
  const parts = [`${Locale.titlecase(msg.agent)} · ${modelName}`]
  if (durationMs > 0) parts.push(Locale.duration(durationMs))

  const showTokenStats =
    msg.time.completed &&
    ((msg.finish && !["tool-calls", "unknown"].includes(msg.finish)) || msg.error?.name === "MessageAbortedError")
  if (showTokenStats && durationMs > 0) {
    const assistants = messages ? turnAssistants(messages, msg.parentID) : [msg]
    const stats = formatTokenStats(aggregateTokens(assistants), durationMs)
    if (stats) parts.push(stats)
  }

  return `## Assistant (${parts.join(" · ")})\n\n`
}

export function formatPart(part: Part, options: TranscriptOptions): string {
  if (part.type === "text" && !part.synthetic) {
    return `${part.text}\n\n`
  }

  if (part.type === "reasoning") {
    if (options.thinking) {
      return `_Thinking:_\n\n${part.text}\n\n`
    }
    return ""
  }

  if (part.type === "tool") {
    let result = `**Tool: ${part.tool}**\n`
    if (options.toolDetails && part.state.input) {
      result += `\n**Input:**\n\`\`\`json\n${JSON.stringify(part.state.input, null, 2)}\n\`\`\`\n`
    }
    if (options.toolDetails && part.state.status === "completed" && part.state.output) {
      result += `\n**Output:**\n\`\`\`\n${part.state.output}\n\`\`\`\n`
    }
    if (options.toolDetails && part.state.status === "error" && part.state.error) {
      result += `\n**Error:**\n\`\`\`\n${part.state.error}\n\`\`\`\n`
    }
    result += `\n`
    return result
  }

  return ""
}
