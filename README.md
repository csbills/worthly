# Bytewave

**Seu organizador de finanças, open source e no seu próprio servidor.**

Bytewave lê contas, cartões e investimentos dos seus bancos via Open Finance, usando o [Meu Pluggy](https://meu.pluggy.ai), e transforma tudo em um painel limpo: patrimônio líquido, fluxo de caixa, ritmo de gastos, faturas, parcelamentos, categorias e carteira de investimentos.

[![Deploy on Hangar](https://tryhangar.io/deploy-on-hangar.svg)](https://tryhangar.io/deploy?repo=https://github.com/csbills/bytewave-finance)

- **Somente leitura** — o app consulta saldos e lançamentos; nada é movimentado.
- **Seus dados, sua instância** — credenciais e banco de dados ficam no servidor que você controla.
- **Configuração guiada** — um onboarding passo a passo cria a conta no Meu Pluggy, valida as chaves da Pluggy e importa os dados.

## Comece em um clique

1. Clique em **Deploy on Hangar** acima. A Hangar clona este repositório, faz o build e publica com HTTPS.
2. Adicione um **volume persistente** ao serviço (por exemplo montado em `/data`) e defina a variável:

   ```bash
   DATABASE_URL="file:/data/bytewave.db"
   ```

   Sem o volume, o SQLite é recriado a cada deploy e você perde as conexões salvas.
3. Abra a URL publicada, crie sua conta e siga o onboarding em `/onboarding`.

O `npm start` já roda `prisma migrate deploy` antes de subir o Next.js, então o banco é criado e atualizado sozinho.

### Conta e acesso

No primeiro acesso, a instância pede **nome, sobrenome, e-mail e senha** para criar a conta da pessoa dona. Depois disso o cadastro é fechado e só existe login.

- Senhas guardadas com scrypt (sal aleatório); nunca em texto puro.
- Sessões no banco, com cookie `httpOnly` e `SameSite=Lax`, válidas por 30 dias e renovadas com o uso.
- Toda página e toda Server Action verificam a sessão no servidor; o Proxy só faz a checagem rápida do cookie.
- Bloqueio de 15 minutos após 5 tentativas de login erradas.

### Instale como app

O Bytewave é um PWA: no Android/Chrome use **Instalar app** no menu do avatar; no iPhone, **Compartilhar → Adicionar à Tela de Início**. Os dados financeiros nunca ficam em cache no aparelho — offline, o app mostra apenas um aviso.

## O onboarding

O fluxo em `/onboarding` guia cada etapa e valida o que você cola:

| Etapa | O que você faz | O que o Bytewave faz |
| --- | --- | --- |
| 1. Meu Pluggy | Cria a conta grátis em [meu.pluggy.ai](https://meu.pluggy.ai) e conecta seus bancos pelo Open Finance. | — |
| 2. Credenciais | Cria uma conta em [dashboard.pluggy.ai](https://dashboard.pluggy.ai) (teste de 15 dias), adiciona o conector **MeuPluggy**, cria uma aplicação *Development* e cola o **Client ID** e o **Client Secret**. | Valida o par com a API da Pluggy antes de salvar no servidor. |
| 3. Item ID | Na aplicação, clica em **Ir para Demo**, conecta o MeuPluggy, escolhe o banco e usa **⋯ → Copiar Item ID**. Repete para cada banco. | Confere o item na Pluggy e identifica o banco. |
| 4. Pronto | Abre o painel. | Lê contas, faturas, transações e investimentos. |

Mais detalhes no guia oficial: [pluggyai/meu-pluggy](https://github.com/pluggyai/meu-pluggy).

## Rodando localmente

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000), crie sua conta e siga o onboarding.

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Não | Caminho do SQLite. Padrão: `file:./prisma/dev.db`. Em produção, aponte para um volume persistente. |
| `PLUGGY_CLIENT_ID` / `PLUGGY_CLIENT_SECRET` | Não | Alternativa ao onboarding. Credenciais salvas pelo onboarding têm prioridade. |
| `COINGECKO_API_KEY` | Não | Chave Demo da CoinGecko para cotações de cripto. Sem ela, usa a API pública. |

As credenciais da Pluggy ficam só no servidor (banco local ou variáveis de ambiente) e nunca são enviadas ao navegador. Não use o prefixo `NEXT_PUBLIC_` para elas.

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Gera o Prisma Client e faz o build de produção |
| `npm start` | Aplica migrations pendentes e sobe o servidor |
| `npm test` | Testes (Vitest) |
| `npm run lint` | Biome |
| `npm run db:migrate` | Cria/aplica migrations em desenvolvimento |
| `npm run db:studio` | Abre o Prisma Studio |

## Ativos fora da Pluggy

Quando a Pluggy não retorna posições de renda variável ou cripto, use **Adicionar ação, FII ou ETF** e **Adicionar criptoativo** em `/investments`. Cada ordem aceita compra ou venda, data, valor total, taxa e preço por unidade; a quantidade é calculada automaticamente. Cotações vêm do Yahoo Finance (ações, FIIs, ETFs) e da CoinGecko (cripto).

## Stack

Next.js 16 (App Router, Server Components e Server Actions) · React 19 · Tailwind CSS 4 · Base UI · Prisma 7 + SQLite · Recharts · Pluggy SDK.

## Contribuindo

Issues e pull requests são bem-vindos. Antes de abrir um PR, rode `npm test`, `npm run lint` e `npm run build`.
