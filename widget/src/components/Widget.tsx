import { useChat } from "@/hooks/useChat";
import { useWidget } from "@/hooks/useWidget";
import { WidgetPanel } from "./WidgetPanel";
import { cn } from "@/lib/utils";
import type { WidgetConfig } from "@/types";
import { MessageSquare, X } from "lucide-react";

interface Props {
  config: WidgetConfig;
}

export function Widget({ config }: Props) {
  const { isOpen, open, close } = useWidget();
  const { messages, sendMessage, isStreaming } = useChat(config);

  const primaryColor = config.primaryColor ?? "#18181b";
  const isBottomLeft = config.position === "bottom-left";

  return (
    <div
      className={cn(
        "fixed bottom-5 z-[9999] flex flex-col items-end gap-3",
        isBottomLeft ? "left-5 items-start" : "right-5 items-end",
      )}
    >
      {/* Panel */}
      {isOpen && (
        <WidgetPanel
          config={config}
          messages={messages}
          isStreaming={isStreaming}
          onSend={sendMessage}
          onClose={close}
        />
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={isOpen ? close : open}
        className={cn(
          "flex h-13 w-13 items-center justify-center rounded-full shadow-lg shadow-black/20 transition-transform hover:scale-105 active:scale-95",
        )}
        style={{ backgroundColor: primaryColor }}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <X className="h-5 w-5 text-white" />
        ) : (
          <MessageSquare className="h-5 w-5 text-white" />
        )}
      </button>
    </div>
  );
}
