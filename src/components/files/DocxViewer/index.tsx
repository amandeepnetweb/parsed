"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function DocxViewer({ url }: { url: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
        Failed to load document preview.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute inset-0 z-10 space-y-3 bg-background p-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      )}
      <iframe
        src={viewerUrl}
        className="h-full w-full border-0 outline-none"
        style={{ outline: "none" }}
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
        title="Document preview"
      />
    </div>
  );
}
