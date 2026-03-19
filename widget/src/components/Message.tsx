import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TypingIndicator } from "./TypingIndicator";
import { cn } from "@/lib/utils";
import type { Message as MessageType } from "@/types";

interface Props {
  message: MessageType;
  primaryColor: string;
}

function fixMarkdown(content: string): string {
  let fixed = content.replace(/^[ \t]+(```)/gm, "$1");
  const fences = fixed.match(/^```/gm) ?? [];
  if (fences.length % 2 !== 0) fixed += "\n```";
  return fixed;
}

export function Message({ message, primaryColor }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-br-sm text-white"
            : "rounded-bl-sm bg-zinc-100 text-zinc-800",
        )}
        style={isUser ? { backgroundColor: primaryColor } : undefined}
      >
        {message.isStreaming && !message.content ? (
          <TypingIndicator />
        ) : isUser ? (
          <span className="whitespace-pre-wrap break-words">{message.content}</span>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            children={fixMarkdown(message.content)}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 list-disc pl-4 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="mb-2 list-decimal pl-4 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              pre: ({ children }) => (
                <pre className="rounded-md bg-white/60 px-3 py-2 font-mono text-xs my-2 overflow-x-auto whitespace-pre">
                  {children}
                </pre>
              ),
              code: ({ children, className }) => (
                <code className={cn("font-mono text-xs", !className && "rounded bg-white/60 px-1 py-0.5")}>
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
                <blockquote className="border-l-2 border-zinc-400/40 pl-3 my-2 text-zinc-500 italic">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-3 border-zinc-400/20" />,
              table: ({ children }) => (
                <div className="my-2 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead>{children}</thead>,
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => <tr className="border-b border-zinc-400/20">{children}</tr>,
              th: ({ children }) => <th className="px-3 py-1.5 text-left font-semibold bg-white/40">{children}</th>,
              td: ({ children }) => <td className="px-3 py-1.5">{children}</td>,
            }}
          />
        )}
      </div>
    </div>
  );
}
