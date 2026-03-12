export interface Source {
  fileId: string;
  fileName: string;
  fileType: string;
  folderPath: string;
  size: number;
  preview: string;
  chunkIndex: number;
  score: number;
}

export interface ChatScope {
  fileIds?: string[];
  folderId?: string | null;
  tags?: string[];
}
