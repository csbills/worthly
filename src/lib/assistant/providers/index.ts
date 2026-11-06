import "server-only";

import { createAnthropicProvider } from "@/lib/assistant/providers/anthropic";
import type { AssistantProvider } from "@/lib/assistant/providers/contract";
import { createOpenAICompatibleProvider } from "@/lib/assistant/providers/openai-compatible";
import {
  type AssistantProviderSettings,
  getAssistantProviderOption,
} from "@/lib/assistant/providers/options";

/**
 * Monta o provider a partir das configurações. Devolve null quando falta
 * algo essencial (chave, endereço ou modelo) — o Tito fica desligado.
 */
export function createAssistantProvider(
  settings: AssistantProviderSettings,
): AssistantProvider | null {
  const option = getAssistantProviderOption(settings.provider);
  const apiKey = settings.apiKey?.trim();
  if (!apiKey) return null;

  const model = settings.model?.trim() || option.defaultModel;

  if (option.id === "anthropic") {
    return createAnthropicProvider({ apiKey, model: model ?? undefined });
  }

  const baseUrl = settings.baseUrl?.trim() || option.defaultBaseUrl;
  if (!baseUrl || !model) return null;

  return createOpenAICompatibleProvider({
    id: option.id,
    label: option.id === "deepseek" ? "DeepSeek" : model,
    baseUrl,
    apiKey,
    model,
  });
}
