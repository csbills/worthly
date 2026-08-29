# Instruções de desenvolvimento

## Arquitetura

- Prefira Server Components e use o mínimo possível de Client Components.
- As páginas devem buscar os dados de que precisam por meio de Server Actions.
- Passe os dados obtidos no servidor como props para os Client Components que realmente precisarem deles.
- Mantenha credenciais, Prisma Client e chamadas a serviços externos exclusivamente no servidor.
- Não use variáveis com prefixo `NEXT_PUBLIC_` para dados sensíveis.

## Banco de dados

- Use o Prisma Client por meio de `src/lib/prisma.ts`.
- Evolua o schema em `prisma/schema.prisma` e gere uma migration para cada mudança persistente.
- Não versionar o banco SQLite local nem o cliente Prisma gerado.

## Qualidade

- Escreva testes para novos comportamentos antes da implementação sempre que possível.
- Antes de considerar uma alteração pronta, execute `npm test`, `npm run lint` e `npm run build`.
- Preserve alterações existentes que não façam parte da tarefa atual.
