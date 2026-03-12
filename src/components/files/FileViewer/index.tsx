"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PDFViewer } from "@/components/files/PDFViewer";

interface Props {
  blobUrl: string;
  fileType: string;
  fileName: string;
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute right-2 top-2 cursor-pointer rounded p-1 text-gray-400 opacity-0 transition-opacity hover:text-gray-700 group-hover:opacity-100"
      aria-label="Copy code"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

export function FileViewer({ blobUrl, fileType, fileName }: Props) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (fileType === "txt" || fileType === "md") {
      setLoading(true);
      fetch(blobUrl)
        .then((r) => r.text())
        .then((text) => setTextContent(text))
        .finally(() => setLoading(false));
    }
  }, [blobUrl, fileType]);

  if (fileType === "pdf") {
    return <PDFViewer url={blobUrl} />;
  }

  if (fileType === "docx") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Word documents cannot be previewed directly.
        </p>
        <Button asChild variant="outline">
          <a href={blobUrl} download={fileName}>
            <Download className="mr-2 size-4" />
            Download {fileName}
          </a>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  if (fileType === "md" && textContent) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="prose prose-sm dark:prose-invert max-w-none px-8 py-5
          prose-p:my-1.5 prose-headings:mb-2 prose-headings:mt-5 prose-h1:mt-0
          prose-li:my-0.5 prose-ul:my-2 prose-ol:my-2 prose-hr:my-4
          prose-pre:!bg-gray-100 dark:prose-pre:!bg-gray-800 prose-pre:my-3
          prose-pre:!text-gray-800 dark:prose-pre:!text-gray-100
          prose-code:before:content-none prose-code:after:content-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              pre: ({ children }) => (
                <pre className="group relative">{children}</pre>
              ),
              code: ({ children, className }) => {
                const isBlock = !!className;
                const raw = String(children).replace(/\n$/, "");
                if (isBlock) {
                  return (
                    <>
                      <CopyButton code={raw} />
                      <code className={className}>{children}</code>
                    </>
                  );
                }
                return <code>{children}</code>;
              },
            }}
          >
            {textContent}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <pre className="whitespace-pre-wrap break-words font-mono text-sm">
        {textContent ?? ""}
      </pre>
    </div>
  );
}
