"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FileText, FolderInput, Loader2, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteFile, useInvalidateFile, useMoveFile, useRetryFile } from "@/hooks";
import { FolderMoveModal } from "@/components/folders";
import { getPusherClient } from "@/lib/pusher-client";
import { cn } from "@/lib/utils";
import type { FileWithFolder } from "@/types";
import type { FileProgressData } from "@/inngest/process-file";

const TYPE_COLORS: Record<string, string> = {
  pdf: "text-red-500",
  docx: "text-blue-500",
  txt: "text-muted-foreground",
  md: "text-purple-500",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileCardProps {
  file: FileWithFolder;
}

export function FileCard({ file }: FileCardProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const remove = useDeleteFile();
  const retry = useRetryFile();
  const move = useMoveFile();
  const invalidate = useInvalidateFile();

  const isProcessing = file.status === "processing" || file.status === "uploading";
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);

  useEffect(() => {
    if (!isProcessing) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`file-${file.id}`);

    channel.bind("progress", (data: FileProgressData) => {
      if (data.message) setProgressMessage(data.message);
      if (typeof data.progress === "number") setProgressPercent(data.progress);
      if (data.done || data.error) {
        pusher.unsubscribe(`file-${file.id}`);
        invalidate(file.id);
      }
    });

    return () => {
      pusher.unsubscribe(`file-${file.id}`);
    };
  }, [file.id, isProcessing, invalidate]);

  const iconColor = TYPE_COLORS[file.type] ?? "text-muted-foreground";

  const handleMove = async (folderId: string | null) => {
    try {
      await move.mutateAsync({ id: file.id, folderId });
      toast.success(folderId ? "File moved" : "File moved to root");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move file");
    }
  };

  const handleRetry = async () => {
    try {
      await retry.mutateAsync(file.id);
      toast.success("Reprocessing started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to retry");
    }
  };

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(file.id);
      toast.success("File deleted");
      setDeleteOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete file");
    }
  };

  return (
    <>
      <div
        className="group relative flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
        onClick={() => file.status === "ready" && router.push(`/files/${file.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) =>
          e.key === "Enter" && file.status === "ready" && router.push(`/files/${file.id}`)
        }
      >
        <FileText className={cn("mt-0.5 size-8 shrink-0", iconColor)} />

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">{file.originalName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="uppercase">{file.type}</span>
            <span>{formatBytes(file.size)}</span>
            {file.folderName && <span className="truncate">{file.folderName}</span>}
          </div>

          {/* Status / progress indicator */}
          {file.status !== "ready" && (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                {file.status === "error" ? (
                  <AlertCircle className="size-3 shrink-0 text-destructive" />
                ) : (
                  <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "text-xs",
                    file.status === "error" ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {file.status === "error"
                    ? "Processing failed"
                    : progressMessage ?? (file.status === "uploading" ? "Uploading…" : "Processing…")}
                </span>
              </div>
              {isProcessing && progressPercent > 0 && (
                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {file.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {file.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
              <span className="sr-only">File actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setMoveOpen(true);
              }}
            >
              <FolderInput className="mr-2 size-4" />
              Move to folder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {file.status === "error" && (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRetry();
                  }}
                  disabled={retry.isPending}
                >
                  <RefreshCw className="mr-2 size-4" />
                  Retry processing
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <FolderMoveModal
        open={moveOpen}
        onOpenChange={setMoveOpen}
        onSelect={handleMove}
        title={`Move "${file.originalName}"`}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{file.originalName}&rdquo;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the file and all its data. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={remove.isPending}>
              {remove.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
