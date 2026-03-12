"use client";

import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Source } from "@/types/chat.types";

const TYPE_COLORS: Record<string, string> = {
  pdf: "bg-red-100 text-red-500",
  docx: "bg-blue-100 text-blue-500",
  md: "bg-purple-100 text-purple-500",
  txt: "bg-gray-100 text-gray-500",
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
    <div className="flex w-fit items-center gap-2.5 rounded-lg border bg-card px-3 py-2">
      <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", colorClass)}>
        <FileText className="size-3.5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium leading-tight">{source.fileName}</p>
        <p className="text-[11px] text-muted-foreground">
          {source.fileType.toUpperCase()}
          {sizeLabel && <span className="ml-1.5">{sizeLabel}</span>}
        </p>
      </div>
    </div>
  );
}
