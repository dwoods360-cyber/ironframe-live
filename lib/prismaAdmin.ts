import prisma from "@/lib/prisma";

// Epic 8 compatibility shim: admin client alias now maps to the primary Prisma client.
export const prismaAdmin = prisma;

