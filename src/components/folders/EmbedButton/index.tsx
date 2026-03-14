"use client";

import { useState } from "react";
import { Code2, Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  folderId: string;
  folderName: string;
}

export function EmbedButton({ folderId, folderName }: Props) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch(`/api/folders/${folderId}/widget-token`);
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateToken = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/folders/${folderId}/widget-token`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
      } else {
        toast.error("Failed to generate token");
      }
    } finally {
      setGenerating(false);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const embedScript = token
    ? `<script>
  (function() {
    window.ParsedWidgetConfig = {
      apiUrl: "${origin}",
      folderId: "${folderId}",
      token: "${token}",
      title: "Ask about ${folderName.replace(/"/g, '\\"')}"
    };
    var s = document.createElement('script');
    s.src = "${origin}/widget.js";
    s.async = true;
    document.head.appendChild(s);
  })();
</script>`
    : "";

  const copy = async () => {
    await navigator.clipboard.writeText(embedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <Code2 className="mr-2 size-4" />
        Embed widget
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Embed chat widget</DialogTitle>
            <DialogDescription>
              Add a chat widget to any website so visitors can ask questions about &ldquo;{folderName}&rdquo;.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : !token ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate an embed token to get your widget script. You can regenerate it at any time, which will invalidate the old script.
              </p>
              <Button onClick={generateToken} disabled={generating}>
                {generating ? "Generating…" : "Generate embed script"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Paste this into the{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">&lt;head&gt;</code>
                {" "}or{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">&lt;body&gt;</code>
                {" "}of your website.
              </p>
              <div className="relative">
                <pre className="overflow-x-auto rounded-lg border bg-muted p-4 pr-10 text-xs leading-relaxed">
                  <code>{embedScript}</code>
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-2 size-7"
                  onClick={copy}
                >
                  {copied ? (
                    <Check className="size-3.5 text-green-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={generateToken}
                  disabled={generating}
                >
                  <RefreshCw className="mr-2 size-3.5" />
                  {generating ? "Regenerating…" : "Regenerate token"}
                </Button>
                <span className="text-xs text-muted-foreground">Breaks existing embeds.</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
