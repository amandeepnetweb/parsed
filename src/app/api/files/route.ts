import path from "path";
import { and, desc, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/database";
import { uploadToBlob } from "@/lib/storage";
import { files, folders } from "@/db/schema";
import { inngest } from "@/lib/inngest";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const MIME_TO_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
  "text/markdown": "md",
};

const EXT_TO_TYPE: Record<string, string> = {
  ".pdf": "pdf",
  ".docx": "docx",
  ".txt": "txt",
  ".md": "md",
};

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");

    const conditions =
      folderId === "root"
        ? and(eq(files.userId, session.user.id), isNull(files.folderId))
        : folderId
          ? and(eq(files.userId, session.user.id), eq(files.folderId, folderId))
          : eq(files.userId, session.user.id);

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
      .where(conditions)
      .orderBy(desc(files.createdAt));

    return Response.json(rows);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const fileBlob = formData.get("file") as globalThis.File | null;
    const folderId = (formData.get("folderId") as string | null) || null;
    const tagsRaw = formData.get("tags") as string | null;

    if (!fileBlob) return Response.json({ error: "No file provided" }, { status: 400 });
    if (fileBlob.size > MAX_FILE_SIZE) {
      return Response.json({ error: "File exceeds 50 MB limit" }, { status: 400 });
    }

    // Detect file type
    const ext = path.extname(fileBlob.name).toLowerCase();
    const fileType = MIME_TO_TYPE[fileBlob.type] ?? EXT_TO_TYPE[ext];
    if (!fileType) {
      return Response.json(
        { error: "Unsupported file type. Allowed: PDF, DOCX, TXT, MD" },
        { status: 400 },
      );
    }

    // Validate folderId ownership
    if (folderId) {
      const folder = await db
        .select({ id: folders.id })
        .from(folders)
        .where(and(eq(folders.id, folderId), eq(folders.userId, session.user.id)))
        .limit(1);
      if (!folder.length) {
        return Response.json({ error: "Folder not found" }, { status: 404 });
      }
    }

    // Parse tags
    let tags: string[] = [];
    if (tagsRaw) {
      try {
        tags = JSON.parse(tagsRaw);
        if (!Array.isArray(tags)) tags = [];
      } catch {
        tags = [];
      }
    }

    // Upload to Vercel Blob
    const buffer = await fileBlob.arrayBuffer();
    const blobUrl = await uploadToBlob(
      `files/${session.user.id}/${fileBlob.name}`,
      buffer,
      fileBlob.type || "application/octet-stream",
    );

    // Insert into DB
    const [newFile] = await db
      .insert(files)
      .values({
        userId: session.user.id,
        folderId,
        name: fileBlob.name,
        originalName: fileBlob.name,
        type: fileType,
        size: fileBlob.size,
        blobUrl,
        status: "uploading",
        tags,
      })
      .returning();

    // Send event to Inngest — processing runs as a background job
    await inngest.send({
      name: "file/uploaded",
      data: { fileId: newFile.id, userId: session.user.id },
    });

    return Response.json(newFile, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
