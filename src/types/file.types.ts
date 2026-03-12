import type { File as DBFile } from "@/db/schema";

export type { File as DBFile } from "@/db/schema";

export type FileStatus = "uploading" | "processing" | "ready" | "error";

export type FileType = "pdf" | "docx" | "txt" | "md";

export type FileWithFolder = DBFile & {
  folderName: string | null;
};
