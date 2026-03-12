import { asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/database";
import { folders } from "@/db/schema";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const result = await db
      .select()
      .from(folders)
      .where(eq(folders.userId, session.user.id))
      .orderBy(asc(folders.name));

    return Response.json(result);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const parentId: string | undefined = body.parentId ?? undefined;

    if (!name || name.length > 255) {
      return Response.json({ error: "Name is required and must be under 255 characters" }, { status: 400 });
    }

    // If parentId provided, verify it belongs to this user
    if (parentId) {
      const parent = await db
        .select({ id: folders.id })
        .from(folders)
        .where(eq(folders.id, parentId))
        .limit(1);

      if (!parent.length || parent[0].id !== parentId) {
        return Response.json({ error: "Parent folder not found" }, { status: 404 });
      }
    }

    const [newFolder] = await db
      .insert(folders)
      .values({ name, parentId: parentId ?? null, userId: session.user.id })
      .returning();

    return Response.json(newFolder, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
