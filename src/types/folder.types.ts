import type { Folder } from "@/db/schema";

export type { Folder } from "@/db/schema";

export type FolderWithChildren = Folder & {
  children: FolderWithChildren[];
};

export type DeleteFolderStrategy = "move-to-root" | "delete-all";
