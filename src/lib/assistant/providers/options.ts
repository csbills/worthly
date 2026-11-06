/**
 * Os providers que o Tito sabe usar. Módulo sem dependências de servidor,
 * para a tela de configuração listar as opções.
 */
export const assistantProviderOptions = [
  {
    id: "anthropic",
    label: "Claude (Anthropic)",
    defaultModel: "claude-opus-5-5",
    defaultBaseUrl: null,
    keyPlaceholder: "sk-ant-…",
    keysUrl: "https://platform.claude.com/settings/keys",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    defaultModel: "deepseek-flash",
    defaultBaseUrl: "https://api.deepseek.com",
    keyPlaceholder: "sk-…",
    keysUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "openai-compatible",
    label: "Outro compatível com OpenAI",
    defaultModel: null,
    defaultBaseUrl: null,
    keyPlaceholder: "Chave da API",
    keysUrl: null,
  },
] as const;

export type AssistantProviderId =
  (typeof assistantProviderOptions)[number]["id"];

export function isAssistantProviderId(
  value: unknown,
): value is AssistantProviderId {
  return assistantProviderOptions.some((option) => option.id === value);
}

export function getAssistantProviderOption(id: AssistantProviderId) {
  return (
    assistantProviderOptions.find((option) => option.id === id) ??
    assistantProviderOptions[0]
  );
}

export type AssistantProviderSettings = {
  provider: AssistantProviderId;
  apiKey: string | null;
  baseUrl: string | null;
  model: string | null;
};
