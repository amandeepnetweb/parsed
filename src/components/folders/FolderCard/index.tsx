"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderIcon, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDeleteFolder, useRenameFolder } from "@/hooks";
import type { DeleteFolderStrategy, Folder } from "@/types";

interface FolderCardProps {
  folder: Folder;
}

export function FolderCard({ folder }: FolderCardProps) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const [strategy, setStrategy] = useState<DeleteFolderStrategy>("move-to-root");

  const rename = useRenameFolder();
  const remove = useDeleteFolder();

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === folder.name) {
      setRenameOpen(false);
      return;
    }
    try {
      await rename.mutateAsync({ id: folder.id, name: newName.trim() });
      toast.success("Folder renamed");
      setRenameOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename folder");
    }
  };

  const handleDelete = async () => {
    try {
      await remove.mutateAsync({ id: folder.id, strategy });
      toast.success("Folder deleted");
      setDeleteOpen(false);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete folder");
    }
  };

  return (
    <>
      <div
        className="group relative flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
        onClick={() => router.push(`/folders/${folder.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && router.push(`/folders/${folder.id}`)}
      >
        <FolderIcon className="size-8 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{folder.name}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(folder.createdAt).toLocaleDateString()}
          </p>
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
              <span className="sr-only">Folder actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setNewName(folder.name);
                setRenameOpen(true);
              }}
            >
              <Pencil className="mr-2 size-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="rename-input">Name</Label>
            <Input
              id="rename-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={rename.isPending}>
              {rename.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{folder.name}&rdquo;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            What should happen to files inside this folder?
          </p>
          <RadioGroup
            value={strategy}
            onValueChange={(v) => setStrategy(v as DeleteFolderStrategy)}
            className="grid gap-3"
          >
            <Label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-primary">
              <RadioGroupItem value="move-to-root" className="mt-0.5" />
              <div>
                <p className="font-medium">Move files to root</p>
                <p className="text-xs text-muted-foreground">
                  Files will be kept and moved to your root library.
                </p>
              </div>
            </Label>
            <Label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-destructive">
              <RadioGroupItem value="delete-all" className="mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Delete folder and all files</p>
                <p className="text-xs text-muted-foreground">
                  All files inside will be permanently deleted.
                </p>
              </div>
            </Label>
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
