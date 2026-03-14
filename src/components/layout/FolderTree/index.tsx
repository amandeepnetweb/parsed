"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, FolderIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { buildFolderTree, useCreateFolder, useDeleteFolder, useFolders } from "@/hooks";
import type { DeleteFolderStrategy, FolderWithChildren } from "@/types";

// ── New Folder dialog ─────────────────────────────────────────────────────────

function NewFolderDialog({
  open,
  onOpenChange,
  parentId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  parentId?: string;
}) {
  const [name, setName] = useState("");
  const create = useCreateFolder();

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await create.mutateAsync({ name: name.trim(), parentId });
      toast.success(parentId ? "Subfolder created" : "Folder created");
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
          <DialogTitle>{parentId ? "New subfolder" : "New folder"}</DialogTitle>
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

// ── Delete Folder dialog ───────────────────────────────────────────────────────

function DeleteFolderDialog({
  open,
  onOpenChange,
  folder,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  folder: FolderWithChildren;
}) {
  const router = useRouter();
  const [strategy, setStrategy] = useState<DeleteFolderStrategy>("move-to-root");
  const remove = useDeleteFolder();

  const handleDelete = async () => {
    try {
      await remove.mutateAsync({ id: folder.id, strategy });
      toast.success("Folder deleted");
      onOpenChange(false);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete folder");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                All files and subfolders will be permanently deleted.
              </p>
            </div>
          </Label>
        </RadioGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={remove.isPending}>
            {remove.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Recursive tree node ───────────────────────────────────────────────────────

function FolderNode({ folder, depth = 0 }: { folder: FolderWithChildren; depth?: number }) {
  const pathname = usePathname();
  const isActive = pathname === `/folders/${folder.id}`;
  const hasChildren = folder.children.length > 0;
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Indent sub-levels by shifting the link content left padding
  const linkStyle = depth > 0 ? { paddingLeft: `${depth * 12}px` } : undefined;

  return (
    <>
      {hasChildren ? (
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive} tooltip={folder.name}>
              <Link href={`/folders/${folder.id}`} style={linkStyle}>
                {depth === 0 && <FolderIcon />}
                <span>{folder.name}</span>
              </Link>
            </SidebarMenuButton>
            <SidebarMenuAction
              showOnHover
              className="right-12 cursor-pointer"
              onClick={() => setDeleteDialogOpen(true)}
              title="Delete folder"
            >
              <Trash2 className="size-3" />
              <span className="sr-only">Delete {folder.name}</span>
            </SidebarMenuAction>
            <SidebarMenuAction
              showOnHover
              className="right-6 cursor-pointer"
              onClick={() => setSubDialogOpen(true)}
              title="New subfolder"
            >
              <Plus className="size-3" />
              <span className="sr-only">New subfolder in {folder.name}</span>
            </SidebarMenuAction>
            <CollapsibleTrigger asChild>
              <SidebarMenuAction className="cursor-pointer transition-transform group-data-[state=open]/collapsible:rotate-90">
                <ChevronRight className="size-3" />
                <span className="sr-only">Toggle {folder.name}</span>
              </SidebarMenuAction>
            </CollapsibleTrigger>
          </SidebarMenuItem>
          <CollapsibleContent>
            {folder.children.map((child) => (
              <FolderNode key={child.id} folder={child} depth={depth + 1} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={isActive} tooltip={folder.name}>
            <Link href={`/folders/${folder.id}`} style={linkStyle}>
              {depth === 0 && <FolderIcon />}
              <span>{folder.name}</span>
            </Link>
          </SidebarMenuButton>
          <SidebarMenuAction
            showOnHover
            className="right-6 cursor-pointer"
            onClick={() => setDeleteDialogOpen(true)}
            title="Delete folder"
          >
            <Trash2 className="size-3" />
            <span className="sr-only">Delete {folder.name}</span>
          </SidebarMenuAction>
          <SidebarMenuAction
            showOnHover
            className="cursor-pointer"
            onClick={() => setSubDialogOpen(true)}
            title="New subfolder"
          >
            <Plus className="size-3" />
            <span className="sr-only">New subfolder in {folder.name}</span>
          </SidebarMenuAction>
        </SidebarMenuItem>
      )}
      <NewFolderDialog open={subDialogOpen} onOpenChange={setSubDialogOpen} parentId={folder.id} />
      <DeleteFolderDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} folder={folder} />
    </>
  );
}

// ── FolderTree (exported) ─────────────────────────────────────────────────────

export function FolderTree() {
  const { data: flat = [], isLoading } = useFolders();
  const [dialogOpen, setDialogOpen] = useState(false);
  const tree = buildFolderTree(flat);

  return (
    <>
      <SidebarMenu>
        {isLoading ? (
          <>
            <SidebarMenuItem>
              <Skeleton className="h-7 w-full rounded-md" />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Skeleton className="h-7 w-3/4 rounded-md" />
            </SidebarMenuItem>
          </>
        ) : tree.length === 0 ? (
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setDialogOpen(true)}
              tooltip="New folder"
              className="cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-3.5" />
              <span>New folder</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : (
          <>
            {tree.map((folder) => (
              <FolderNode key={folder.id} folder={folder} />
            ))}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setDialogOpen(true)}
                tooltip="New folder"
                className="cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-3.5" />
                <span>New folder</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </>
        )}
      </SidebarMenu>

      <NewFolderDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
