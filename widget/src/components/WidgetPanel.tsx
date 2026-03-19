import { useEffect, useRef } from "react";
import { X, Bot } from "lucide-react";
import { ChatInput } from "./ChatInput";
import { Message } from "./Message";
import { cn } from "@/lib/utils";
import type { Message as MessageType, WidgetConfig } from "@/types";

interface Props {
  config: WidgetConfig;
  messages: MessageType[];
  isStreaming: boolean;
  onSend: (text: string) => void;
  onClose: () => void;
}

const WELCOME_ID = "__welcome__";

export function WidgetPanel({ config, messages, isStreaming, onSend, onClose }: Props) {
  const primaryColor = config.primaryColor ?? "#18181b";
  const title = config.title ?? "Ask a question";
  const placeholder = config.placeholder ?? "Type your question…";
  const welcomeText = config.welcomeMessage ?? "Hi! Ask me anything about our documents.";

  const welcomeMsg: MessageType = {
    id: WELCOME_ID,
    role: "assistant",
    content: welcomeText,
  };

  const allMessages = messages.length === 0 ? [welcomeMsg] : messages;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isStreaming]);

  return (
    <div
      className={cn(
        "pw-panel-enter flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-black/10",
      )}
      style={{ width: "380px", height: "560px" }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between px-4 py-3"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="pw-scroll flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        {allMessages.map((msg) => (
          <Message key={msg.id} message={msg} primaryColor={primaryColor} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={onSend}
        disabled={isStreaming}
        placeholder={placeholder}
        primaryColor={primaryColor}
      />
    </div>
  );
}
