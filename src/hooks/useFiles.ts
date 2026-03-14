"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FileWithFolder } from "@/types";

export function useFiles(folderId?: string | "root") {
  const params = folderId ? `?folderId=${folderId}` : "";
  return useQuery<FileWithFolder[]>({
    queryKey: ["files", folderId ?? "all"],
    queryFn: async () => {
      const res = await fetch(`/api/files${params}`);
      if (!res.ok) throw new Error("Failed to fetch files");
      return res.json();
    },
  });
}

export function useInvalidateFile() {
  const qc = useQueryClient();
  return (fileId?: string) => {
    qc.invalidateQueries({ queryKey: ["files"] });
    if (fileId) qc.invalidateQueries({ queryKey: ["file", fileId] });
  };
}

export function useDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to delete file");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });
}

export function useMoveFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, folderId }: { id: string; folderId: string | null }) => {
      const res = await fetch(`/api/files/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to move file");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });
}

export function useRetryFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/files/${id}/process`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to retry processing");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });
}
