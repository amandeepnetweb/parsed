import { useState, useCallback, useRef } from "react";
import { streamChat } from "@/lib/api";
import type { Message, WidgetConfig } from "@/types";

export function useChat(config: WidgetConfig) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const assistantIdRef = useRef<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (isStreaming || !text.trim()) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
      };
      const assistantId = crypto.randomUUID();
      assistantIdRef.current = assistantId;

      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      // Build history from messages before this exchange
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      await streamChat(config, text.trim(), history, {
        onChunk(chunk) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m,
            ),
          );
        },
        onSources(sources) {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, sources } : m)),
          );
        },
        onDone() {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, isStreaming: false } : m,
            ),
          );
          setIsStreaming(false);
        },
        onError(message) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: message, isStreaming: false } : m,
            ),
          );
          setIsStreaming(false);
        },
      });
    },
    [config, isStreaming, messages],
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, sendMessage, isStreaming, clearMessages };
}
