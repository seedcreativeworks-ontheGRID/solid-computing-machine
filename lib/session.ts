import { prisma } from "@/lib/prisma";

/**
 * Mock auth boundary. There is exactly one organization and one signed-in
 * user in this MVP. Swapping in real auth means replacing the body of
 * these two functions — every call site already treats them as async.
 */
export async function getCurrentOrganization() {
  const org = await prisma.organization.findFirstOrThrow();
  return org;
}

export async function getCurrentUser() {
  const org = await getCurrentOrganization();
  const user = await prisma.user.findFirstOrThrow({
    where: { organizationId: org.id, email: "sarah.nguyen@kestrelimport.com" },
  });
  return user;
}
