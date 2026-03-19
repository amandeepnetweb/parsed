import { and, eq, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { MoveLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/database";
import { files, chats, chatMessages } from "@/db/schema";
import { FileViewer } from "@/components/files";
import { ChatPanel } from "@/components/chat";
import type { UIMessage } from "ai";
import type { Source } from "@/types/chat.types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FilePage({ params }: Props) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/auth/sign-in");

  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, id), eq(files.userId, session.user.id)))
    .limit(1);

  if (!file) notFound();

  // Load saved chat history for this file (file ID is the chat ID)
  const rows = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      sources: chatMessages.sources,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .innerJoin(chats, eq(chatMessages.chatId, chats.id))
    .where(and(eq(chats.id, id), eq(chats.userId, session.user.id)))
    .orderBy(desc(chatMessages.createdAt))
    .limit(21);

  const hasMore = rows.length > 20;
  const savedMessages = rows.slice(0, 20).reverse();
  const initialCursor = savedMessages[0]?.createdAt?.toISOString() ?? null;

  const initialMessages: UIMessage[] = savedMessages.map((msg) => {
    const parts: UIMessage["parts"] = [];
    if (msg.role === "assistant" && msg.sources) {
      try {
        const sources = JSON.parse(msg.sources) as Source[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parts.push({ type: "data-sources", data: sources } as any);
      } catch {}
    }
    parts.push({ type: "text", text: msg.content });
    return { id: msg.id, role: msg.role as "user" | "assistant", parts };
  });

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden md:flex-row">
      {/* File viewer */}
      <div className="flex min-h-0 flex-[3] flex-col overflow-hidden border-b md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <Link
            href={file.folderId ? `/folders/${file.folderId}` : "/"}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <MoveLeft className="size-4 mr-2" />
          </Link>
          <h1 className="truncate text-sm font-medium">{file.name}</h1>
          {file.status !== "ready" && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
              {file.status}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <FileViewer
            blobUrl={file.blobUrl}
            fileType={file.type}
            fileName={file.name}
          />
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex min-h-0 flex-[2] flex-col overflow-hidden md:w-[380px] md:flex-none">
        <div className="border-b px-4 py-2">
          <p className="text-sm font-medium">Chat</p>
        </div>
        {file.status === "ready" ? (
          <ChatPanel
            chatId={id}
            fileIds={[id]}
            initialMessages={initialMessages}
            initialHasMore={hasMore}
            initialCursor={initialCursor}
            placeholder={`Ask anything about ${file.name}…`}
            hideSources
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {file.status === "error"
                ? "This file failed to process and cannot be chatted with."
                : "This file is still being processed. Check back in a moment."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
