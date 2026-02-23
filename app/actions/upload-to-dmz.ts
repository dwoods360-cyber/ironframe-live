"use server";

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service Role bypasses RLS for Agent 12 quarantine drop
);

export async function uploadToQuarantine(formData: FormData, tenantId: string) {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  // 1. Generate a unique storage path
  const fileExtension = file.name.split(".").pop();
  const storagePath = `${tenantId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

  // 2. Push physical file to the Supabase DMZ Bucket
  const { data: storageData, error: storageError } = await supabase.storage
    .from("ironframe-quarantine")
    .upload(storagePath, file);

  if (storageError) throw new Error(`Storage Error: ${storageError.message}`);

  // 3. Create the Prisma Ledger Entry for Agent 5 to find
  const record = await prisma.quarantineRecord.create({
    data: {
      tenantId: tenantId,
      fileName: file.name,
      fileSize: file.size,
      storagePath: storageData.path,
      status: "PENDING",
      uploadedBy: "J. DOE (CISO)", // We'll make this dynamic later
    },
  });

  revalidatePath(`/${tenantId}/vendors`);
  return { success: true, recordId: record.id };
}