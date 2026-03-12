import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/database";
import { deleteFromBlob } from "@/lib/storage";
import { deleteChunksByIds } from "@/lib/pinecone";
import { files, folders, fileChunks } from "@/db/schema";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db
      .select({
        id: files.id,
        userId: files.userId,
        folderId: files.folderId,
        name: files.name,
        originalName: files.originalName,
        type: files.type,
        size: files.size,
        blobUrl: files.blobUrl,
        status: files.status,
        tags: files.tags,
        errorMessage: files.errorMessage,
        createdAt: files.createdAt,
        updatedAt: files.updatedAt,
        folderName: folders.name,
      })
      .from(files)
      .leftJoin(folders, eq(files.folderId, folders.id))
      .where(and(eq(files.id, id), eq(files.userId, session.user.id)))
      .limit(1);

    if (!rows.length) return Response.json({ error: "File not found" }, { status: 404 });

    return Response.json(rows[0]);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body: { folderId?: string | null } = await req.json();

    // Validate target folder belongs to user (if not null)
    if (body.folderId) {
      const folder = await db
        .select({ id: folders.id })
        .from(folders)
        .where(and(eq(folders.id, body.folderId), eq(folders.userId, session.user.id)))
        .limit(1);
      if (!folder.length) return Response.json({ error: "Folder not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(files)
      .set({ folderId: body.folderId ?? null, updatedAt: new Date() })
      .where(and(eq(files.id, id), eq(files.userId, session.user.id)))
      .returning();

    if (!updated) return Response.json({ error: "File not found" }, { status: 404 });

    return Response.json(updated);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await db
      .select({ id: files.id, blobUrl: files.blobUrl })
      .from(files)
      .where(and(eq(files.id, id), eq(files.userId, session.user.id)))
      .limit(1);

    if (!existing.length) return Response.json({ error: "File not found" }, { status: 404 });

    // Delete Pinecone vectors
    const chunks = await db
      .select({ pineconeId: fileChunks.pineconeId })
      .from(fileChunks)
      .where(eq(fileChunks.fileId, id));
    if (chunks.length > 0) {
      await deleteChunksByIds(
        session.user.id,
        chunks.map((c) => c.pineconeId),
      );
    }

    // Delete from Vercel Blob
    await deleteFromBlob(existing[0].blobUrl);

    // Delete from DB (cascade removes file_chunks)
    await db.delete(files).where(and(eq(files.id, id), eq(files.userId, session.user.id)));

    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
