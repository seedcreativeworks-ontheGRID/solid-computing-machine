import { readFileSync } from "node:fs";
import path from "node:path";

import { prisma } from "@/lib/prisma";

const STATIC = process.env.STATIC_EXPORT === "1";

/**
 * Mock auth boundary. There is exactly one organization and one signed-in
 * user in this MVP. Swapping in real auth means replacing the body of
 * these two functions — every call site already treats them as async.
 *
 * In a static-export build there is no database to query, so these read
 * from the frozen lib/static-data.json snapshot instead (see lib/repo.ts).
 */
export async function getCurrentOrganization() {
  if (STATIC) {
    const filePath = path.join(process.cwd(), "lib", "static-data.json");
    const snapshot = JSON.parse(readFileSync(filePath, "utf-8"));
    return snapshot.organization as { id: string; name: string; slug: string; createdAt: string };
  }
  return prisma.organization.findFirstOrThrow();
}

export async function getCurrentUser() {
  if (STATIC) {
    const filePath = path.join(process.cwd(), "lib", "static-data.json");
    const snapshot = JSON.parse(readFileSync(filePath, "utf-8"));
    return snapshot.currentUser;
  }
  const org = await getCurrentOrganization();
  const user = await prisma.user.findFirstOrThrow({
    where: { organizationId: org.id, email: "sarah.nguyen@kestrelimport.com" },
  });
  return user;
}
