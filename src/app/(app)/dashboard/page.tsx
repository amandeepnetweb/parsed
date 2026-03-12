"use client";

import { useState } from "react";
import { FolderPlus, Upload } from "lucide-react";
import { FolderCard } from "@/components/folders";
import { FileList, FileUploader } from "@/components/files";
import { useFolders, useFiles, buildFolderTree, useCreateFolder } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function NewFolderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [name, setName] = useState("");
  const create = useCreateFolder();

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await create.mutateAsync({ name: name.trim() });
      toast.success("Folder created");
      setName("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create folder");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="folder-name">Name</Label>
          <Input
            id="folder-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="e.g. Research Papers"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={create.isPending || !name.trim()}>
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DashboardPage() {
  const { data: flatFolders = [], isLoading: foldersLoading } = useFolders();
  const { data: allFiles = [], isLoading: filesLoading } = useFiles();
  const rootFolders = buildFolderTree(flatFolders).filter((f) => !f.parentId);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);

  const isLoading = foldersLoading || filesLoading;
  const isNewUser = !isLoading && allFiles.length === 0 && flatFolders.length === 0;

  if (isNewUser) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="rounded-full bg-muted p-5">
          <Upload className="size-10 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Upload your first file</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Then ask it anything. Parsed will extract, index, and make it ready to chat with.
          </p>
        </div>
        <div className="w-full max-w-lg">
          <FileUploader />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      {/* Folders */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Folders
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setFolderDialogOpen(true)}
          >
            <FolderPlus className="size-3.5" />
            New folder
          </Button>
        </div>
        {foldersLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : rootFolders.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No folders yet.{" "}
            <button
              onClick={() => setFolderDialogOpen(true)}
              className="cursor-pointer underline underline-offset-2 hover:text-foreground"
            >
              Create one
            </button>{" "}
            to organise your files.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rootFolders.map((folder) => (
              <FolderCard key={folder.id} folder={folder} />
            ))}
          </div>
        )}
      </section>

      {/* Upload */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Upload
        </h2>
        <FileUploader />
      </section>

      {/* All files */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          All Files
        </h2>
        <FileList />
      </section>

      <NewFolderDialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen} />
    </div>
  );
}
