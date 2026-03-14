import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/database";
import { folders } from "@/db/schema";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [folder] = await db
    .select({ widgetToken: folders.widgetToken })
    .from(folders)
    .where(and(eq(folders.id, id), eq(folders.userId, session.user.id)))
    .limit(1);

  if (!folder) return Response.json({ error: "Folder not found" }, { status: 404 });

  return Response.json({ token: folder.widgetToken ?? null });
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const token = crypto.randomUUID();

  const [updated] = await db
    .update(folders)
    .set({ widgetToken: token })
    .where(and(eq(folders.id, id), eq(folders.userId, session.user.id)))
    .returning();

  if (!updated) return Response.json({ error: "Folder not found" }, { status: 404 });

  return Response.json({ token: updated.widgetToken });
}
