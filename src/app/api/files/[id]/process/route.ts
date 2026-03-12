import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/database";
import { files } from "@/db/schema";
import { inngest } from "@/lib/inngest";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [file] = await db
    .select({ id: files.id, userId: files.userId })
    .from(files)
    .where(and(eq(files.id, id), eq(files.userId, session.user.id)))
    .limit(1);

  if (!file) return Response.json({ error: "File not found" }, { status: 404 });

  await inngest.send({
    name: "file/uploaded",
    data: { fileId: file.id, userId: session.user.id },
  });

  return Response.json({ queued: true });
}
