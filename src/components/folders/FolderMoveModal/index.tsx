"use client";

import { useState } from "react";
import { ChevronRight, FolderIcon, FolderOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { buildFolderTree, useFolders } from "@/hooks";
import type { FolderWithChildren } from "@/types";

interface FolderMoveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the selected folderId, or null to move to root */
  onSelect: (folderId: string | null) => void;
  /** Folder ID to exclude (e.g. the folder being moved, so it can't be moved into itself) */
  excludeId?: string;
  title?: string;
}

function FolderPickerNode({
  folder,
  excludeId,
  selectedId,
  onSelect,
}: {
  folder: FolderWithChildren;
  excludeId?: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isExcluded = folder.id === excludeId;
  const hasChildren = folder.children.filter((c) => c.id !== excludeId).length > 0;

  if (isExcluded) return null;

  return (
    <div>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
          selectedId === folder.id && "bg-accent font-medium"
        )}
        onClick={() => onSelect(folder.id)}
      >
        {hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="shrink-0 p-0.5"
          >
            <ChevronRight
              className={cn("size-3 transition-transform", expanded && "rotate-90")}
            />
          </span>
        ) : (
          <span className="size-4 shrink-0" />
        )}
        {selectedId === folder.id ? (
          <FolderOpenIcon className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{folder.name}</span>
      </button>

      {expanded && hasChildren && (
        <div className="ml-4 border-l pl-2">
          {folder.children.map((child) => (
            <FolderPickerNode
              key={child.id}
              folder={child}
              excludeId={excludeId}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderMoveModal({
  open,
  onOpenChange,
  onSelect,
  excludeId,
  title = "Move to folder",
}: FolderMoveModalProps) {
  const { data: flat = [] } = useFolders();
  const tree = buildFolderTree(flat);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleConfirm = () => {
    onSelect(selectedId);
    onOpenChange(false);
    setSelectedId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-72 pr-1">
          {/* Root option */}
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
              selectedId === null && "bg-accent font-medium"
            )}
            onClick={() => setSelectedId(null)}
          >
            <span className="size-4 shrink-0" />
            <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">Root (no folder)</span>
          </button>

          {tree.map((folder) => (
            <FolderPickerNode
              key={folder.id}
              folder={folder}
              excludeId={excludeId}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ))}

          {tree.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No folders yet.</p>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Move here</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
