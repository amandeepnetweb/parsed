"use client";

import { useState, useRef } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagInput({ tags, onChange, placeholder = "Add tag…", className }: TagInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setValue("");
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(value);
    } else if (e.key === "Backspace" && !value && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border px-3 py-1.5 focus-within:ring-1 focus-within:ring-ring",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag);
            }}
            className="rounded-full hover:bg-muted"
            aria-label={`Remove ${tag}`}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => value && addTag(value)}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="h-auto min-w-24 flex-1 border-0 p-0 text-sm shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
