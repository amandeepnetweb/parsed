"use client";

import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  disabled,
  placeholder = "Ask anything about this document…",
}: Props) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && !disabled && value.trim()) onSubmit();
    }
  }

  return (
    <div className="border-t bg-background py-3">
      <div className="flex items-end gap-2 max-w-4xl mx-auto w-full px-4">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading || disabled}
        rows={4}
        className="max-h-40 resize-none overflow-y-auto"
      />
      <Button
        size="icon"
        onClick={onSubmit}
        disabled={isLoading || disabled || !value.trim()}
        className="shrink-0"
      >
        <Send className="size-4" />
      </Button>
      </div>
    </div>
  );
}
