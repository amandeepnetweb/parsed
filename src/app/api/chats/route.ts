import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/database";
import { chats } from "@/db/schema";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(chats)
    .where(eq(chats.userId, session.user.id))
    .orderBy(desc(chats.updatedAt));

  return Response.json(rows);
}
