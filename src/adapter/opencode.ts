import type { Hooks, PluginInput } from "@opencode-ai/plugin"

import { createHooksRuntime } from "../core/runtime.js"

export async function createOpencodeHooksPlugin(input: PluginInput): Promise<Hooks> {
  return createHooksRuntime(input, { client: input.client })
}
