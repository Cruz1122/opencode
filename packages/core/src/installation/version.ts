import pkg from "../../package.json" with { type: "json" }

declare global {
  const OPENCODE_VERSION: string
  const OPENCODE_CHANNEL: string
}

const compiled = typeof OPENCODE_VERSION === "string" ? OPENCODE_VERSION : undefined
const base =
  compiled && !compiled.startsWith("0.0.0-") && compiled !== "local" ? compiled : (pkg.version as string)

export const InstallationVersion = `${base} Cruz1122-mod`
export const InstallationChannel = typeof OPENCODE_CHANNEL === "string" ? OPENCODE_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
