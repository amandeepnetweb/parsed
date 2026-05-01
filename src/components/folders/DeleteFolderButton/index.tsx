"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, FolderInput } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useDeleteFolder } from "@/hooks";
import type { DeleteFolderStrategy } from "@/types";

interface Props {
  folderId: string;
  folderName: string;
}

export function DeleteFolderButton({ folderId, folderName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [strategy, setStrategy] = useState<DeleteFolderStrategy | null>(null);
  const remove = useDeleteFolder();

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) setStrategy(null);
  };

  const handleDelete = async () => {
    if (!strategy) return;
    try {
      await remove.mutateAsync({ id: folderId, strategy });
      toast.success("Folder deleted");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete folder");
    }
  };

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="mr-2 size-4" />
        Delete folder
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{folderName}&rdquo;?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            What should happen to the files inside this folder?
          </p>
          <RadioGroup
            value={strategy ?? ""}
            onValueChange={(v) => setStrategy(v as DeleteFolderStrategy)}
            className="grid gap-2"
          >
            <Label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors",
                strategy === "delete-all"
                  ? "border-destructive bg-destructive/5"
                  : "hover:bg-muted/50",
              )}
            >
              <RadioGroupItem value="delete-all" className="mt-0.5 border-destructive text-destructive" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-destructive shrink-0" />
                  <p className="font-medium text-destructive text-sm">Delete folder and all files</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All files and subfolders will be permanently deleted. This cannot be undone.
                </p>
              </div>
            </Label>

            <Label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors",
                strategy === "move-to-root"
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50",
              )}
            >
              <RadioGroupItem value="move-to-root" className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <FolderInput className="size-3.5 text-muted-foreground shrink-0" />
                  <p className="font-medium text-sm">Move files to root</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Files will be kept and moved to your root library.
                </p>
              </div>
            </Label>
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!strategy || remove.isPending}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
