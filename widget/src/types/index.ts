export interface WidgetConfig {
  apiUrl: string;
  folderId: string;
  token: string;
  title?: string;
  placeholder?: string;
  primaryColor?: string;
  position?: "bottom-right" | "bottom-left";
  welcomeMessage?: string;
}

export interface Source {
  fileId: string;
  fileName: string;
  fileType: string;
  folderPath: string;
  preview: string;
  score: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}
