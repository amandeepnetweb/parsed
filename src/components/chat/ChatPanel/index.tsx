"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Virtuoso } from "react-virtuoso";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart, isDataUIPart } from "ai";
import type { UIMessage } from "ai";
import { generateId } from "@/lib/utils";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { SourceCard } from "@/components/chat/SourceCard";
import type { Source } from "@/types/chat.types";

const THINKING_PHRASES = [
  "Reading your documents...",
  "Searching for context...",
  "Thinking it through...",
  "Pulling the relevant bits...",
  "Almost got it...",
];

function ThinkingTypewriter() {
  const [displayed, setDisplayed] = useState("");
  const phraseIndexRef = useRef(0);
  const typingRef = useRef(true);
  const displayedRef = useRef("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tick = () => {
      const phrase = THINKING_PHRASES[phraseIndexRef.current];
      if (typingRef.current) {
        if (displayedRef.current.length < phrase.length) {
          const next = phrase.slice(0, displayedRef.current.length + 1);
          displayedRef.current = next;
          setDisplayed(next);
          timeoutRef.current = setTimeout(tick, 38);
        } else {
          typingRef.current = false;
          timeoutRef.current = setTimeout(tick, 1000);
        }
      } else {
        if (displayedRef.current.length > 0) {
          const next = displayedRef.current.slice(0, -1);
          displayedRef.current = next;
          setDisplayed(next);
          timeoutRef.current = setTimeout(tick, 18);
        } else {
          phraseIndexRef.current = (phraseIndexRef.current + 1) % THINKING_PHRASES.length;
          typingRef.current = true;
          timeoutRef.current = setTimeout(tick, 38);
        }
      }
    };

    timeoutRef.current = setTimeout(tick, 38);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  return (
    <div className="flex justify-start px-1 py-1">
      <span className="text-sm text-muted-foreground">{displayed}</span>
      <span className="ml-0.5 inline-block w-px h-[1em] bg-muted-foreground/60 animate-pulse align-text-bottom" />
    </div>
  );
}

type DBRow = { id: string; role: string; content: string; sources: string | null; createdAt: string };

function rowsToUIMessages(rows: DBRow[]): UIMessage[] {
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

const START_INDEX = 100000;
const PAGE_SIZE = 20;

interface Props {
  fileIds?: string[];
  placeholder?: string;
  chatId?: string;
  initialMessages?: UIMessage[];
  hideSources?: boolean;
  initialHasMore?: boolean;
  initialCursor?: string | null;
}

export function ChatPanel({ fileIds, placeholder, chatId: chatIdProp, initialMessages, hideSources, initialHasMore, initialCursor }: Props) {
  const [input, setInput] = useState("");
  const [chatId] = useState(() => chatIdProp ?? generateId());

  const fileIdsRef = useRef(fileIds);
  fileIdsRef.current = fileIds;

  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          chatId: chatIdRef.current,
          ...(fileIdsRef.current ? { fileIds: fileIdsRef.current } : {}),
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
    messages: initialMessages ?? [],
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Pagination
  const [olderMessages, setOlderMessages] = useState<UIMessage[]>([]);
  const [hasMore, setHasMore] = useState(initialHasMore ?? false);
  const [cursor, setCursor] = useState<string | null>(initialCursor ?? null);
  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const allMessages = [...olderMessages, ...messages];

  const loadOlderMessages = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current || !cursor) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/chats/${chatId}/messages?before=${encodeURIComponent(cursor)}&limit=${PAGE_SIZE}`,
      );
      if (!res.ok) return;
      const { messages: rows, hasMore: more } = await res.json() as { messages: DBRow[]; hasMore: boolean };
      if (rows.length > 0) {
        setOlderMessages((prev) => [...rowsToUIMessages(rows), ...prev]);
        setFirstItemIndex((prev) => prev - rows.length);
        setCursor(rows[0].createdAt);
      }
      setHasMore(more);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, cursor, chatId]);

  function handleSubmit() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  }

  function getMessageText(parts: UIMessage["parts"]): string {
    return parts.filter(isTextUIPart).map((p) => p.text).join("");
  }

  function getMessageSources(parts: UIMessage["parts"]): Source[] {
    return parts
      .filter(isDataUIPart)
      .filter((p) => p.type === "data-sources")
      .flatMap((p) => p.data as Source[]);
  }

  const showPlaceholder = allMessages.length === 0 && status !== "submitted";
  const showThinking =
    status === "submitted" ||
    (status === "streaming" &&
      messages.length > 0 &&
      !getMessageText(messages[messages.length - 1].parts));

  const THINKING_ID = "__thinking__";
  const listItems = showThinking
    ? [...allMessages, { id: THINKING_ID, role: "thinking" as const, parts: [] } as unknown as UIMessage]
    : allMessages;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0 overflow-hidden">
        {showPlaceholder ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-muted-foreground">
              {placeholder ?? "Ask anything about your document"}
            </p>
          </div>
        ) : (
          <Virtuoso
            style={{ height: "100%" }}
            firstItemIndex={firstItemIndex}
            initialTopMostItemIndex={listItems.length - 1}
            data={listItems}
            startReached={loadOlderMessages}
            followOutput="smooth"
            components={{
              Header: () =>
                loadingMore ? (
                  <div className="flex justify-center py-3">
                    <span className="text-xs text-muted-foreground">Loading older messages…</span>
                  </div>
                ) : null,
            }}
            itemContent={(_, message) => {
              if (message.id === THINKING_ID) {
                return (
                  <div className="px-4 py-2 max-w-4xl mx-auto w-full">
                    <ThinkingTypewriter />
                  </div>
                );
              }
              const text = getMessageText(message.parts);
              const sources = message.role === "assistant" ? getMessageSources(message.parts) : [];
              return (
                <div className="space-y-1 px-4 py-2 max-w-4xl mx-auto w-full min-w-0 overflow-hidden">
                  <ChatMessage role={message.role as "user" | "assistant"} content={text} />
                  {!hideSources && sources.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
                      {sources.map((source) => (
                        <Link
                          key={source.fileId}
                          href={source.pageUrl ?? `/files/${source.fileId}`}
                          target={source.pageUrl ? "_blank" : undefined}
                          rel={source.pageUrl ? "noopener noreferrer" : undefined}
                        >
                          <SourceCard source={source} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }}
          />
        )}
      </div>

      {status === "error" && error && (
        <div className="max-w-4xl mx-auto w-full px-4 mb-2">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error.message || "Something went wrong. Please try again."}
          </div>
        </div>
      )}

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        placeholder={placeholder}
      />
    </div>
  );
}
