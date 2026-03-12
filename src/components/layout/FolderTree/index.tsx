"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, FolderIcon, Plus } from "lucide-react";
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
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { buildFolderTree, useCreateFolder, useFolders } from "@/hooks";
import type { FolderWithChildren } from "@/types";

// ── Recursive tree node ───────────────────────────────────────────────────────

function FolderNode({ folder }: { folder: FolderWithChildren }) {
  const pathname = usePathname();
  const isActive = pathname === `/folders/${folder.id}`;
  const hasChildren = folder.children.length > 0;

  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive} tooltip={folder.name}>
          <Link href={`/folders/${folder.id}`}>
            <FolderIcon />
            <span>{folder.name}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive} tooltip={folder.name}>
          <Link href={`/folders/${folder.id}`}>
            <FolderIcon />
            <span>{folder.name}</span>
          </Link>
        </SidebarMenuButton>
        <CollapsibleTrigger asChild>
          <SidebarMenuAction className="transition-transform group-data-[state=open]/collapsible:rotate-90">
            <ChevronRight className="size-3" />
            <span className="sr-only">Toggle {folder.name}</span>
          </SidebarMenuAction>
        </CollapsibleTrigger>
      </SidebarMenuItem>
      <CollapsibleContent>
        <SidebarMenuSub>
          {folder.children.map((child) => (
            <SidebarMenuSubItem key={child.id}>
              <SidebarMenuSubButton asChild isActive={pathname === `/folders/${child.id}`}>
                <Link href={`/folders/${child.id}`}>
                  <span>{child.name}</span>
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── New Folder dialog ─────────────────────────────────────────────────────────

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
            <SidebarMenuButton onClick={() => setDialogOpen(true)} tooltip="New folder" className="cursor-pointer text-muted-foreground hover:text-foreground">
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
              <SidebarMenuButton onClick={() => setDialogOpen(true)} tooltip="New folder" className="cursor-pointer text-muted-foreground hover:text-foreground">
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
