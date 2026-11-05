import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: Date;
}

export const ChatMessage = ({ message, isUser, timestamp }: ChatMessageProps) => {
  return (
    <div className={cn("flex w-full animate-fade-in gap-2", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] sm:max-w-[80%] rounded-lg px-3 sm:px-4 py-2 sm:py-3 shadow-sm transition-all duration-300 animate-scale-in",
          isUser
            ? "bg-chat-user text-chat-user-foreground ml-auto"
            : "bg-chat-bot text-chat-bot-foreground mr-auto"
        )}
      >
        {isUser ? (
          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
        ) : (
          <div className="text-xs sm:text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-2 last:mb-0 list-disc list-inside">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2 last:mb-0 list-decimal list-inside">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                pre: ({ children }) => <pre className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto mb-2">{children}</pre>,
                h1: ({ children }) => <h1 className="text-sm sm:text-base font-bold mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xs sm:text-sm font-bold mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xs sm:text-sm font-semibold mb-2">{children}</h3>,
              }}
            >
              {message}
            </ReactMarkdown>
          </div>
        )}
        {timestamp && (
          <p className="text-[10px] opacity-70 mt-1">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
};