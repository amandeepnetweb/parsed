import { and, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/database";
import { files, folders, fileChunks } from "@/db/schema";
import { deleteFromBlob } from "@/lib/storage";
import { deleteChunksByIds } from "@/lib/pinecone";
import type { Folder } from "@/db/schema";

function getDescendantIds(allFolders: Folder[], rootId: string): string[] {
  const ids: string[] = [rootId];
  const children = allFolders.filter((f) => f.parentId === rootId);
  for (const child of children) {
    ids.push(...getDescendantIds(allFolders, child.id));
  }
  return ids;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name || name.length > 255) {
      return Response.json({ error: "Name is required and must be under 255 characters" }, { status: 400 });
    }

    const [updated] = await db
      .update(folders)
      .set({ name })
      .where(and(eq(folders.id, id), eq(folders.userId, session.user.id)))
      .returning();

    if (!updated) return Response.json({ error: "Folder not found" }, { status: 404 });

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

    const userId = session.user.id;

    const body = await req.json();
    const strategy: string = body.strategy ?? "move-to-root";

    if (strategy !== "move-to-root" && strategy !== "delete-all") {
      return Response.json({ error: "Invalid strategy" }, { status: 400 });
    }

    // Verify ownership
    const existing = await db
      .select({ id: folders.id })
      .from(folders)
      .where(and(eq(folders.id, id), eq(folders.userId, userId)))
      .limit(1);

    if (!existing.length) return Response.json({ error: "Folder not found" }, { status: 404 });

    if (strategy === "delete-all") {
      const allUserFolders = await db.select().from(folders).where(eq(folders.userId, userId));
      const folderIds = getDescendantIds(allUserFolders, id);

      if (folderIds.length > 0) {
        // Fetch all files in the folder tree
        const folderFiles = await db
          .select({ id: files.id, blobUrl: files.blobUrl })
          .from(files)
          .where(and(inArray(files.folderId, folderIds), eq(files.userId, userId)));

        if (folderFiles.length > 0) {
          const fileIds = folderFiles.map((f) => f.id);

          // Clean up Pinecone vectors — non-fatal
          try {
            const chunks = await db
              .select({ pineconeId: fileChunks.pineconeId })
              .from(fileChunks)
              .where(inArray(fileChunks.fileId, fileIds));
            if (chunks.length > 0) {
              await deleteChunksByIds(userId, chunks.map((c) => c.pineconeId));
            }
          } catch (err) {
            console.error("[delete-folder] Pinecone cleanup failed (continuing):", err);
          }

          // Clean up Vercel Blob — non-fatal
          await Promise.allSettled(folderFiles.map((f) => deleteFromBlob(f.blobUrl)));

          // Delete files from DB
          await db
            .delete(files)
            .where(and(inArray(files.folderId, folderIds), eq(files.userId, userId)));
        }
      }
    }

    // Delete the folder — DB cascade handles child folders;
    // files with folderId FK have onDelete: "set null" so they become root files
    // (only applies to move-to-root; for delete-all we deleted them above)
    await db
      .delete(folders)
      .where(and(eq(folders.id, id), eq(folders.userId, userId)));

    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
