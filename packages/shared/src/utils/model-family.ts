/**
 * GPT-6 / GPT-6.1 / GPT-6.2 model-family recognition shared by channel, runtime, and UI code.
 *
 * Astra can carry hyphenated SKU suffixes returned by Codex. Sol, Luna, and Terra
 * are exact IDs so nearby names are never routed as an official model by mistake.
 */

const GPT_6_ASTRA_FAMILY_PATTERN = /^gpt-6(?:\.1|\.2)?-astra(?:-[a-z0-9]+(?:-[a-z0-9]+)*)?$/
const GPT_6_SOL_MODEL_IDS = new Set(['gpt-6-sol', 'gpt-6.1-sol', 'gpt-6.2-sol'])
const GPT_6_LUNA_MODEL_IDS = new Set(['gpt-6-luna', 'gpt-6.1-luna'])
const GPT_6_TERRA_MODEL_IDS = new Set(['gpt-6.1-terra'])

function normalizeModelId(modelId: string | undefined): string | undefined {
  return modelId?.trim().toLowerCase().replace(/\[1m\]$/i, '')
}

export function isGpt6AstraFamily(modelId: string | undefined): boolean {
  const normalized = normalizeModelId(modelId)
  return normalized !== undefined && GPT_6_ASTRA_FAMILY_PATTERN.test(normalized)
}

export function isGpt6SolFamily(modelId: string | undefined): boolean {
  const normalized = normalizeModelId(modelId)
  return normalized !== undefined && GPT_6_SOL_MODEL_IDS.has(normalized)
}

export function isGpt6LunaFamily(modelId: string | undefined): boolean {
  const normalized = normalizeModelId(modelId)
  return normalized !== undefined && GPT_6_LUNA_MODEL_IDS.has(normalized)
}

export function isGpt6TerraFamily(modelId: string | undefined): boolean {
  const normalized = normalizeModelId(modelId)
  return normalized !== undefined && GPT_6_TERRA_MODEL_IDS.has(normalized)
}

/** GPT-6.1 系列（Sol / Terra / Astra / Luna），用于上下文窗口等代际能力判定。 */
export function isGpt61Model(modelId: string | undefined): boolean {
  const normalized = normalizeModelId(modelId)
  return normalized !== undefined && /^gpt-6\.1(?:-|$)/.test(normalized)
}

/** GPT-6.2 系列（Astra / Sol），窗口按型号区分，不能按代际统一。 */
export function isGpt62Model(modelId: string | undefined): boolean {
  const normalized = normalizeModelId(modelId)
  return normalized !== undefined && /^gpt-6\.2(?:-|$)/.test(normalized)
}
