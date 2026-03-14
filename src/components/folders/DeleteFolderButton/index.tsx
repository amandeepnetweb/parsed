"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
import { useDeleteFolder } from "@/hooks";
import type { DeleteFolderStrategy } from "@/types";

interface Props {
  folderId: string;
  folderName: string;
}

export function DeleteFolderButton({ folderId, folderName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [strategy, setStrategy] = useState<DeleteFolderStrategy>("move-to-root");
  const remove = useDeleteFolder();

  const handleDelete = async () => {
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{folderName}&rdquo;?</DialogTitle>
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
                  All files and subfolders will be permanently deleted.
                </p>
              </div>
            </Label>
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
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
