"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

export function useStartImport() {
  return useMutation({
    mutationFn: async ({ url, maxPages }: { url: string; maxPages: number }): Promise<{ jobId: string }> => {
      const res = await fetch("/api/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, maxPages }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to start import");
      }
      return res.json();
    },
  });
}

export interface ImportJob {
  id: string;
  rootUrl: string;
  status: string;
  totalPages: number;
  processedPages: number;
  fileId: string | null;
  folderId: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export function useImportJobs() {
  return useQuery<ImportJob[]>({
    queryKey: ["import-jobs"],
    queryFn: async () => {
      const res = await fetch("/api/import-url");
      if (!res.ok) throw new Error("Failed to fetch imports");
      return res.json();
    },
  });
}
