"use client";

import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Source } from "@/types/chat.types";

const TYPE_COLORS: Record<string, string> = {
  pdf: "bg-red-100 text-red-500",
  docx: "bg-blue-100 text-blue-500",
  md: "bg-purple-100 text-purple-500",
  txt: "bg-gray-100 text-gray-500",
  web: "bg-green-100 text-green-500",
};

function formatSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  source: Source;
}

export function SourceCard({ source }: Props) {
  const colorClass = TYPE_COLORS[source.fileType] ?? "bg-muted text-muted-foreground";
  const sizeLabel = formatSize(source.size);

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border bg-card px-3 py-2.5 w-56 shrink-0">
      <div className="flex items-center gap-2">
        <div className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", colorClass)}>
          <FileText className="size-3" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium leading-tight">{source.fileName}</p>
          <p className="text-[11px] text-muted-foreground">
            {source.fileType.toUpperCase()}
            {sizeLabel && <span className="ml-1.5">{sizeLabel}</span>}
          </p>
        </div>
      </div>

      {source.pageUrl && (() => {
        try {
          return (
            <p className="truncate text-[11px] text-muted-foreground/70">
              {new URL(source.pageUrl).pathname || "/"}
            </p>
          );
        } catch {
          return null;
        }
      })()}

      {source.preview && (
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {source.preview}
        </p>
      )}
    </div>
  );
}
