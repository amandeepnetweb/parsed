"use client";

import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export function PDFViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [containerWidth, setContainerWidth] = useState<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-center gap-2 border-b px-4 py-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber((p) => p - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {pageNumber} of {numPages || "—"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={pageNumber >= numPages}
          onClick={() => setPageNumber((p) => p + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto">
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          }
        >
          {containerWidth && (
            <Page
              pageNumber={pageNumber}
              width={containerWidth}
              renderTextLayer
              renderAnnotationLayer
            />
          )}
        </Document>
      </div>
    </div>
  );
}
