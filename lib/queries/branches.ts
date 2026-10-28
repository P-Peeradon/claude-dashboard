import "server-only";
import { prisma } from "@/lib/prisma";

export async function getBranches() {
  return prisma.branch.findMany({ select: { id: true, code: true }, orderBy: { code: "asc" } });
}
