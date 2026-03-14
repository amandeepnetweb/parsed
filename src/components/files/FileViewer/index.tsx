"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const PDFViewer = dynamic(() => import("@/components/files/PDFViewer").then((m) => m.PDFViewer), { ssr: false });
const DocxViewer = dynamic(() => import("@/components/files/DocxViewer").then((m) => m.DocxViewer), { ssr: false });
const TxtViewer = dynamic(() => import("@/components/files/TxtViewer").then((m) => m.TxtViewer), { ssr: false });

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

export function FileViewer({ blobUrl, fileType }: Props) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (fileType === "md" || fileType === "web") {
      setLoading(true);
      fetch(blobUrl)
        .then((r) => r.text())
        .then((text) => setTextContent(text))
        .finally(() => setLoading(false));
    }
  }, [blobUrl, fileType]);

  if (fileType === "pdf") return <PDFViewer url={blobUrl} />;
  if (fileType === "docx") return <DocxViewer url={blobUrl} />;
  if (fileType === "txt") return <TxtViewer url={blobUrl} />;

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  if ((fileType === "md" || fileType === "web") && textContent) {
    return (
      <div className="h-full overflow-y-auto">
        <div
          className="prose prose-sm dark:prose-invert max-w-none px-8 py-5
          prose-p:my-1.5 prose-headings:mb-2 prose-headings:mt-5 prose-h1:mt-0
          prose-li:my-0.5 prose-ul:my-2 prose-ol:my-2 prose-hr:my-4
          prose-pre:!bg-gray-100 dark:prose-pre:!bg-gray-800 prose-pre:my-3
          prose-pre:!text-gray-800 dark:prose-pre:!text-gray-100
          prose-code:before:content-none prose-code:after:content-none"
        >
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

  return null;
}
