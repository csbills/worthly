This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Pluggy

The server-side Pluggy SDK is available through `src/lib/pluggy.ts`.

1. Copy `.env.example` to `.env.local`.
2. Fill in `PLUGGY_CLIENT_ID` and `PLUGGY_CLIENT_SECRET` with the credentials from your Pluggy application.
3. Use `getPluggyClient()` from Server Actions or other server-only code:

```ts
import { getPluggyClient } from "@/lib/pluggy";

const pluggy = getPluggyClient();
```

These credentials are sensitive and must never be exposed through client-side code or variables prefixed with `NEXT_PUBLIC_`.

### Meu Pluggy

This project uses the existing connections from Meu Pluggy. In the Pluggy Dashboard, enable the MeuPluggy connector for the application and use the Demo application to authorize each bank connected to your Meu Pluggy account. After authorization, copy the resulting `itemId` and add it at `/accounts`.

Each bank connection has its own `itemId`. The application stores these identifiers in SQLite and uses the server-side SDK to retrieve the associated accounts. Pluggy Connect is not needed for this flow.

### Ações, FIIs e ETFs manuais

Quando a Pluggy não retornar posições de renda variável, use o botão `Adicionar ação, FII ou ETF` em `/investments`. O catálogo de ativos é pré-configurado e cada ordem aceita compra ou venda, data, valor total, taxa e preço por unidade. A quantidade é calculada automaticamente e as ordens podem ser editadas depois.

As cotações e o histórico são consultados no Yahoo Finance por uma rota pública, sem token ou custo adicional. Se um ticker não estiver disponível nessa fonte, a posição continua carregando com o último preço salvo.

## Prisma

The project uses Prisma with a local SQLite database during development.

1. Add the `DATABASE_URL` from `.env.example` to your local environment.
2. Generate the Prisma Client with `npm run db:generate`.
3. Create and apply the initial migration with `npm run db:migrate -- --name init`.
4. Use `npm run db:studio` to inspect the local database.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
