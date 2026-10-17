import "server-only";

import { prisma } from "@/lib/prisma";

/** Until the owner creates the first account, the instance is open for signup. */
export async function isFirstAccess() {
  return (await prisma.user.count()) === 0;
}
