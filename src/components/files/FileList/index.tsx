"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { FileCard } from "@/components/files/FileCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFiles } from "@/hooks";

interface FileListProps {
  folderId?: string;
}

export function FileList({ folderId }: FileListProps) {
  const { data: files = [], isLoading } = useFiles(folderId);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No files yet. Upload your first document to get started.
      </div>
    );
  }

  // Collect all unique tags across all files
  const allTags = Array.from(new Set(files.flatMap((f) => f.tags))).sort();

  const displayed = selectedTag
    ? files.filter((f) => f.tags.includes(selectedTag))
    : files;

  return (
    <div className="space-y-3">
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {allTags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTag === tag ? "default" : "secondary"}
              className="cursor-pointer select-none"
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            >
              {tag}
              {selectedTag === tag && <X className="ml-1 size-3" />}
            </Badge>
          ))}
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No files tagged &ldquo;{selectedTag}&rdquo;.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((file) => (
            <FileCard key={file.id} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}
