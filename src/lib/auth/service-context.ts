import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

import type { SessionUser } from "@/lib/auth/session";

/**
 * Chamadas autenticadas por outro meio que não o cookie (hoje, o token do
 * servidor MCP) rodam "como" o dono da instância. Só código do servidor que
 * já validou essa credencial pode abrir este contexto.
 */
const serviceUser = new AsyncLocalStorage<SessionUser>();

export function runAsServiceUser<T>(user: SessionUser, fn: () => Promise<T>) {
  return serviceUser.run(user, fn);
}

export function getServiceUser() {
  return serviceUser.getStore() ?? null;
}
