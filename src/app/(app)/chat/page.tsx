"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { ChatPanel } from "@/components/chat";
import { ChatScopeBar } from "@/components/chat";
import { useFiles, useFolders } from "@/hooks";
import type { UIMessage } from "ai";
import type { Source } from "@/types/chat.types";
import type { Folder } from "@/db/schema";
import type { FileWithFolder } from "@/types/file.types";
import { generateId } from "@/lib/utils";

const LOADING_PHRASES = [
  "Loading your conversation...",
  "Fetching message history...",
  "Almost ready...",
  "Just a moment...",
  "Hang tight...",
];

function TypewriterLoader() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const phrase = LOADING_PHRASES[phraseIndex];
    if (typing) {
      if (displayed.length < phrase.length) {
        timeoutRef.current = setTimeout(() => setDisplayed(phrase.slice(0, displayed.length + 1)), 40);
      } else {
        timeoutRef.current = setTimeout(() => setTyping(false), 1200);
      }
    } else {
      if (displayed.length > 0) {
        timeoutRef.current = setTimeout(() => setDisplayed((p) => p.slice(0, -1)), 20);
      } else {
        setPhraseIndex((i) => (i + 1) % LOADING_PHRASES.length);
        setTyping(true);
      }
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [displayed, typing, phraseIndex]);

  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-muted-foreground min-w-[1ch]">
        {displayed}
        <span className="ml-0.5 inline-block w-px h-3.5 bg-muted-foreground/60 animate-pulse align-middle" />
      </p>
    </div>
  );
}

function getDescendantIds(folderId: string, allFolders: Folder[]): string[] {
  const ids: string[] = [folderId];
  const children = allFolders.filter((f) => f.parentId === folderId);
  for (const child of children) {
    ids.push(...getDescendantIds(child.id, allFolders));
  }
  return ids;
}

function toUIMessages(rows: { id: string; role: string; content: string; sources: string | null }[]): UIMessage[] {
  return rows.map((row) => {
    const parts: UIMessage["parts"] = [];
    if (row.role === "assistant" && row.sources) {
      try {
        const sources = JSON.parse(row.sources) as Source[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parts.push({ type: "data-sources", data: sources } as any);
      } catch {}
    }
    parts.push({ type: "text", text: row.content });
    return { id: row.id, role: row.role as "user" | "assistant", parts };
  });
}

function ChatPageContent() {
  const { data: allFiles = [], isLoading: filesLoading } = useFiles();
  const { data: allFolders = [] } = useFolders();
  const [selectedFiles, setSelectedFiles] = useState<FileWithFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const searchParams = useSearchParams();

  const [chatId] = useState(() => {
    const folderId = searchParams.get("folderId");
    if (folderId) return folderId;
    const stored = localStorage.getItem("all-files-chat-id");
    if (stored) return stored;
    const newId = generateId();
    localStorage.setItem("all-files-chat-id", newId);
    return newId;
  });

  useEffect(() => {
    const folderId = searchParams.get("folderId");
    if (!folderId || allFolders.length === 0) return;
    const folder = allFolders.find((f) => f.id === folderId);
    if (folder) setSelectedFolder(folder);
  }, [searchParams, allFolders]);

  const { data: chatHistory } = useQuery({
    queryKey: ["chat-messages", chatId],
    queryFn: async () => {
      const res = await fetch(`/api/chats/${chatId}/messages`);
      if (!res.ok) return { messages: [] as UIMessage[], hasMore: false, cursor: null };
      const { messages: rows, hasMore } = await res.json() as {
        messages: { id: string; role: string; content: string; sources: string | null; createdAt: string }[];
        hasMore: boolean;
      };
      return {
        messages: toUIMessages(rows),
        hasMore,
        cursor: rows[0]?.createdAt ?? null,
      };
    },
    staleTime: Infinity,
  });

  const readyFiles = allFiles.filter((f) => f.status === "ready");

  const scopeFiles =
    selectedFiles.length > 0
      ? selectedFiles
      : selectedFolder
        ? (() => {
            const descendantIds = getDescendantIds(selectedFolder.id, allFolders);
            return readyFiles.filter((f) => f.folderId && descendantIds.includes(f.folderId));
          })()
        : readyFiles;

  const tagFilteredFiles =
    selectedTags.length > 0
      ? scopeFiles.filter((f) => selectedTags.every((t) => f.tags.includes(t)))
      : scopeFiles;

  const scopedFileIds =
    selectedFiles.length > 0 || selectedFolder || selectedTags.length > 0
      ? tagFilteredFiles.map((f) => f.id)
      : undefined;

  const availableTags = Array.from(new Set(scopeFiles.flatMap((f) => f.tags))).sort();

  function removeFile(fileId: string) {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }

  function clearScope() {
    setSelectedFiles([]);
    setSelectedFolder(null);
    setSelectedTags([]);
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      <ChatScopeBar
        selectedFiles={selectedFiles}
        selectedFolder={selectedFolder}
        selectedTags={selectedTags}
        availableTags={availableTags}
        onRemoveFile={removeFile}
        onClearScope={clearScope}
        onToggleTag={toggleTag}
      />

      {!filesLoading && readyFiles.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <MessageSquare className="size-10 text-muted-foreground/40" />
          <div>
            <p className="font-medium">No documents ready</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload and process a document before starting a chat.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          {chatHistory === undefined ? (
            <TypewriterLoader />
          ) : (
            <ChatPanel
              chatId={chatId}
              fileIds={scopedFileIds}
              initialMessages={chatHistory.messages}
              initialHasMore={chatHistory.hasMore}
              initialCursor={chatHistory.cursor}
              placeholder="Ask anything about your documents…"
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageContent />
    </Suspense>
  );
}
