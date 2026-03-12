"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Folder } from "@/db/schema";
import type { DeleteFolderStrategy, FolderWithChildren } from "@/types";

const QUERY_KEY = ["folders"] as const;

// ── Tree builder ─────────────────────────────────────────────────────────────

export function buildFolderTree(flat: Folder[]): FolderWithChildren[] {
  const map = new Map<string, FolderWithChildren>();
  const roots: FolderWithChildren[] = [];

  for (const f of flat) {
    map.set(f.id, { ...f, children: [] });
  }

  for (const f of flat) {
    const node = map.get(f.id)!;
    if (f.parentId && map.has(f.parentId)) {
      map.get(f.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useFolders() {
  return useQuery<Folder[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/folders");
      if (!res.ok) throw new Error("Failed to fetch folders");
      return res.json();
    },
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; parentId?: string }) => {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create folder");
      }
      return res.json() as Promise<Folder>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useRenameFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/folders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to rename folder");
      }
      return res.json() as Promise<Folder>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, strategy }: { id: string; strategy: DeleteFolderStrategy }) => {
      const res = await fetch(`/api/folders/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to delete folder");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
