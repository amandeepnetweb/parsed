export interface Source {
  fileId: string;
  fileName: string;
  fileType: string;
  folderPath: string;
  size: number;
  preview: string;
  chunkIndex: number;
  score: number;
  pageUrl?: string; // set for web-crawl chunks — points to the specific page
}

export interface ChatScope {
  fileIds?: string[];
  folderId?: string | null;
  tags?: string[];
}
