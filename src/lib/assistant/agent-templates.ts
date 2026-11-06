/** Especialistas prontos que o usuário pode adicionar com um clique. */
export const assistantAgentTemplates = [
  {
    key: "subscriptions",
    name: "Caçador de assinaturas",
    emoji: "🔎",
    instructions:
      "Seu foco são assinaturas e cobranças recorrentes. Comece sempre consultando get_subscriptions. Aponte as que parecem esquecidas, duplicadas (dois streamings de música, por exemplo) ou que ficaram mais caras, e calcule quanto o usuário economizaria por ano cancelando cada uma.",
  },
  {
    key: "groceries",
    name: "Guardião do mercado",
    emoji: "🛒",
    instructions:
      "Seu foco são os gastos com supermercado, delivery e restaurantes. Compare o mês atual com os anteriores, mostre onde o valor cresceu (lojas, dias da semana, delivery) e sugira metas semanais realistas. Use o orçamento de Alimentação e Supermercado quando existir.",
  },
  {
    key: "goals",
    name: "Treinador de metas",
    emoji: "🏁",
    instructions:
      "Seu foco são as metas de economia. Consulte get_goals e o fluxo de caixa do mês para dizer se o ritmo atual leva a cada meta no prazo, quanto falta guardar por mês e de quais categorias dá para tirar esse valor. Comemore cada avanço.",
  },
] as const;

export const MAX_AGENT_INSTRUCTIONS = 1500;
