import type { Source, WidgetConfig } from "@/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface StreamCallbacks {
  onChunk: (text: string) => void;
  onSources: (sources: Source[]) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

export async function streamChat(
  config: WidgetConfig,
  query: string,
  history: ChatMessage[],
  callbacks: StreamCallbacks,
): Promise<void> {
  const { onChunk, onSources, onDone, onError } = callbacks;

  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}/api/widget/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: config.token, query, messages: history }),
    });
  } catch {
    onError("Failed to connect. Please check your connection and try again.");
    return;
  }

  if (res.status === 429) {
    onError("Too many requests. Please wait a moment and try again.");
    return;
  }
  if (res.status === 401) {
    onError("This widget is not configured correctly. Invalid token.");
    return;
  }
  if (!res.ok || !res.body) {
    onError("Something went wrong. Please try again.");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // Keep the last partial line in the buffer
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const payload = JSON.parse(line.slice(6));
        if (payload.type === "text") onChunk(payload.content);
        else if (payload.type === "sources") onSources(payload.data);
        else if (payload.type === "done") onDone();
        else if (payload.type === "error") onError(payload.message ?? "Stream error");
      } catch {
        // ignore malformed lines
      }
    }
  }

  // Flush remaining buffer
  if (buffer.startsWith("data: ")) {
    try {
      const payload = JSON.parse(buffer.slice(6));
      if (payload.type === "done") onDone();
    } catch {
      // ignore
    }
  }
}
