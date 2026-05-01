"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Globe, Loader2, CheckCircle2, XCircle, ArrowLeft, MessageSquare } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStartImport, useImportJobs } from "@/hooks";
import type { ImportJob } from "@/hooks";
import { getPusherClient } from "@/lib/pusher-client";

type ViewState = "home" | "crawling" | "done" | "error";

interface CrawlProgress {
  step: string;
  message: string;
  processedPages?: number;
  totalPages?: number;
  fileId?: string;
  folderId?: string;
  done?: boolean;
  error?: string;
}

// ── Home ───────────────────────────────────────────────────────────────────────

const MAX_PAGES_OPTIONS = [10, 25, 50] as const;
type MaxPages = typeof MAX_PAGES_OPTIONS[number];

function HomeView({ onStarted }: { onStarted: (jobId: string, rootUrl: string) => void }) {
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState<MaxPages>(25);
  const startImport = useStartImport();
  const { data: jobs, isLoading: jobsLoading } = useImportJobs();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    try {
      const { jobId } = await startImport.mutateAsync({ url: url.trim(), maxPages });
      onStarted(jobId, url.trim());
    } catch {
      // error shown inline via startImport.error
    }
  };

  const doneJobs = jobs?.filter((j) => j.status === "done" && j.fileId) ?? [];

  return (
    <div className="flex h-full flex-col items-center justify-start pt-16 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* URL input */}
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <Globe className="size-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">Import a website</h1>
          <p className="text-sm text-muted-foreground">
            Paste any URL — we&apos;ll crawl the site, extract all useful information, compile it
            into a single document, and let you chat with it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            autoFocus
            disabled={startImport.isPending}
          />
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Max pages to crawl</p>
            <div className="flex gap-2">
              {MAX_PAGES_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMaxPages(n)}
                  disabled={startImport.isPending}
                  className={`flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    maxPages === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          {startImport.error && (
            <p className="text-sm text-destructive">{startImport.error.message}</p>
          )}
          <Button type="submit" className="w-full" disabled={!url.trim() || startImport.isPending}>
            {startImport.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Starting…
              </>
            ) : (
              "Import website"
            )}
          </Button>
        </form>

        {/* Past imports */}
        {!jobsLoading && doneJobs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Previous imports
            </p>
            <div className="space-y-1">
              {doneJobs.map((job) => (
                <PastImportRow key={job.id} job={job} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PastImportRow({ job }: { job: ImportJob }) {
  let domain = job.rootUrl;
  try {
    domain = new URL(job.rootUrl).hostname;
  } catch {}

  const date = new Date(job.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
      <CheckCircle2 className="size-4 shrink-0 text-green-500" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{domain}</p>
        <p className="text-xs text-muted-foreground">
          {job.processedPages} page{job.processedPages === 1 ? "" : "s"} · {date}
        </p>
      </div>
      <Button asChild variant="ghost" size="sm" className="shrink-0">
        <Link href={`/files/${job.fileId}`}>
          <MessageSquare className="size-3.5" />
          Chat
        </Link>
      </Button>
    </div>
  );
}

const STEPS = [
  { key: "discover",   label: "Discovering pages" },
  { key: "extracting", label: "Extracting content" },
  { key: "compile",    label: "Compiling document" },
  { key: "embed",      label: "Embedding for chat" },
];

function stepIndex(step: string): number {
  if (step === "discovered" || step === "update-total") return 0;
  if (step === "extracting") return 1;
  if (step === "compile" || step === "store") return 2;
  if (step === "embed" || step === "done") return 3;
  return 0;
}

// ── Crawling ───────────────────────────────────────────────────────────────────

function CrawlingView({
  jobId,
  rootUrl,
  onDone,
  onError,
  onBack,
}: {
  jobId: string;
  rootUrl: string;
  onDone: (fileId: string, folderId: string, pagesCount: number) => void;
  onError: (msg: string) => void;
  onBack: () => void;
}) {
  const [progress, setProgress] = useState<CrawlProgress>({
    step: "discover",
    message: "Discovering pages…",
  });

  useEffect(() => {
    const client = getPusherClient();
    const channel = client.subscribe(`crawl-${jobId}`);

    channel.bind("progress", (data: CrawlProgress) => {
      setProgress(data);
      if (data.done && data.fileId && data.folderId) {
        onDone(data.fileId, data.folderId, data.processedPages ?? 0);
      } else if (data.step === "error") {
        onError(data.error ?? "Crawl failed");
      }
    });

    return () => {
      channel.unbind_all();
      client.unsubscribe(`crawl-${jobId}`);
    };
  }, [jobId, onDone, onError]);

  const pct =
    progress.totalPages && progress.processedPages !== undefined
      ? Math.round((progress.processedPages / progress.totalPages) * 100)
      : null;

  const currentStep = stepIndex(progress.step);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">

        {/* URL + status */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin text-primary shrink-0" />
            <p className="text-sm font-medium truncate">{new URL(rootUrl).hostname}</p>
          </div>
          <p className="pl-6 text-xs text-muted-foreground">{progress.message}</p>
        </div>

        {/* Step indicators */}
        <div className="space-y-2">
          {STEPS.map((s, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                    done
                      ? "bg-primary text-primary-foreground"
                      : active
                        ? "border-2 border-primary text-primary"
                        : "border border-muted-foreground/30 text-muted-foreground/40"
                  }`}
                >
                  {done ? <CheckCircle2 className="size-3" /> : i + 1}
                </div>
                <span
                  className={`text-sm transition-colors ${
                    done || active ? "text-foreground" : "text-muted-foreground/50"
                  }`}
                >
                  {s.label}
                </span>
                {active && progress.step === "extracting" && pct !== null && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {progress.processedPages}/{progress.totalPages}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar — only during extraction */}
        {pct !== null && progress.step === "extracting" && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        <Button variant="secondary" size="sm" onClick={onBack} className="w-full">
          <ArrowLeft className="mr-2 size-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Done ───────────────────────────────────────────────────────────────────────

function DoneView({
  rootUrl,
  fileId,
  pagesCount,
  onImportAnother,
}: {
  rootUrl: string;
  fileId: string;
  pagesCount: number;
  onImportAnother: () => void;
}) {
  const domain = (() => {
    try {
      return new URL(rootUrl).hostname;
    } catch {
      return rootUrl;
    }
  })();

  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4 text-center">
        <div className="space-y-2">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-green-500/10">
            <CheckCircle2 className="size-6 text-green-500" />
          </div>
          <h2 className="text-lg font-semibold">Import complete</h2>
          <p className="text-sm text-muted-foreground">
            Crawled {pagesCount} page{pagesCount === 1 ? "" : "s"} from{" "}
            <span className="font-medium text-foreground">{domain}</span> and compiled them into a
            single searchable document.
          </p>
        </div>

        <div className="space-y-2">
          <Button asChild className="w-full">
            <Link href={`/files/${fileId}`}>
              <MessageSquare className="mr-2 size-4" />
              Chat with {domain}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={onImportAnother} className="w-full">
            Import another website
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Error ──────────────────────────────────────────────────────────────────────

function ErrorView({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-sm space-y-4 px-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-destructive/10">
          <XCircle className="size-6 text-destructive" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Import failed</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 size-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}

// ── Root page ──────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const [view, setView] = useState<ViewState>("home");
  const [jobId, setJobId] = useState<string | null>(null);
  const [rootUrl, setRootUrl] = useState("");
  const [fileId, setFileId] = useState<string | null>(null);
  const [pagesCount, setPagesCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const qc = useQueryClient();

  const handleStarted = useCallback((jId: string, url: string) => {
    setJobId(jId);
    setRootUrl(url);
    setView("crawling");
  }, []);

  const handleDone = useCallback((fId: string, _folderId: string, pages: number) => {
    setFileId(fId);
    setPagesCount(pages);
    setView("done");
    qc.invalidateQueries({ queryKey: ["folders"] });
  }, [qc]);

  const handleError = useCallback((msg: string) => {
    setErrorMsg(msg);
    setView("error");
  }, []);

  const handleBack = useCallback(() => {
    setView("home");
    setJobId(null);
    setRootUrl("");
    setFileId(null);
    setErrorMsg("");
  }, []);

  return (
    <div className="h-[calc(100vh-3.5rem)]">
      {view === "home" && <HomeView onStarted={handleStarted} />}

      {view === "crawling" && jobId && (
        <CrawlingView
          jobId={jobId}
          rootUrl={rootUrl}
          onDone={handleDone}
          onError={handleError}
          onBack={handleBack}
        />
      )}

      {view === "done" && fileId && (
        <DoneView
          rootUrl={rootUrl}
          fileId={fileId}
          pagesCount={pagesCount}
          onImportAnother={handleBack}
        />
      )}

      {view === "error" && <ErrorView message={errorMsg} onBack={handleBack} />}
    </div>
  );
}
