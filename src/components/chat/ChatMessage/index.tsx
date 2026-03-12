"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface Props {
  role: "user" | "assistant";
  content: string;
}

// Remark doesn't recognize indented ``` fences (common inside list items from AI output).
// Strip leading whitespace from fence markers so they're always document-level.
// Also close any unclosed fence (happens mid-stream).
function fixMarkdown(content: string): string {
  let fixed = content.replace(/^[ \t]+(```)/gm, "$1");
  const fences = fixed.match(/^```/gm) ?? [];
  if (fences.length % 2 !== 0) fixed += "\n```";
  return fixed;
}

export function ChatMessage({ role, content }: Props) {
  if (role === "assistant" && !content) return null;
  return (
    <div className={cn("flex w-full", role === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          role === "user"
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm",
        )}
      >
        {role === "user" ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            children={fixMarkdown(content)}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 list-disc pl-4 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="mb-2 list-decimal pl-4 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              pre: ({ children }) => (
                <pre className="rounded-md bg-background/60 px-3 py-2 font-mono text-xs my-2 overflow-x-auto whitespace-pre">
                  {children}
                </pre>
              ),
              code: ({ children, className }) => (
                <code className={cn("font-mono text-xs", !className && "rounded bg-background/60 px-1 py-0.5")}>
                  {children}
                </code>
              ),
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              del: ({ children }) => <del className="line-through opacity-70">{children}</del>,
              h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5 mt-3 first:mt-0">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
              h4: ({ children }) => <h4 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h4>,
              h5: ({ children }) => <h5 className="text-xs font-semibold mb-1 mt-2 first:mt-0">{children}</h5>,
              h6: ({ children }) => <h6 className="text-xs font-medium mb-1 mt-2 first:mt-0">{children}</h6>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80">
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-muted-foreground/40 pl-3 my-2 text-muted-foreground italic">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-3 border-muted-foreground/20" />,
              table: ({ children }) => (
                <div className="my-2 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead>{children}</thead>,
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => <tr className="border-b border-muted-foreground/20">{children}</tr>,
              th: ({ children }) => <th className="px-3 py-1.5 text-left font-semibold bg-background/40">{children}</th>,
              td: ({ children }) => <td className="px-3 py-1.5">{children}</td>,
            }}
          />
        )}
      </div>
    </div>
  );
}
