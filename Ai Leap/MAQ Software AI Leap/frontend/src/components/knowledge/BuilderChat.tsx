import React, { useState, useRef, useEffect } from "react";
import {
  Send, Compass, Bot, User, Loader2, RotateCcw,
} from "lucide-react";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  text: string;
}

interface BuilderChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onStartWizard: () => void;
  isLoading: boolean;
  hasOutputs: boolean;
  onReset: () => void;
}

const BuilderChat: React.FC<BuilderChatProps> = ({
  messages,
  onSendMessage,
  onStartWizard,
  isLoading,
  hasOutputs,
  onReset,
}) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Solution Builder</span>
        </div>
        {hasOutputs && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-3">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">
              How can I help you build your AI solution?
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[280px] mx-auto">
              Describe your business problem or use the guided wizard for a step-by-step approach.
            </p>
            <button
              onClick={onStartWizard}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
            >
              <Compass className="h-3.5 w-3.5" />
              Guided Wizard
            </button>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-white"
                  : "bg-muted/60 text-foreground border border-border/40"
              }`}
            >
              {msg.text.split("**").map((part, i) =>
                i % 2 === 1 ? (
                  <strong key={i}>{part}</strong>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </div>
            {msg.role === "user" && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted mt-0.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 mt-0.5">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="rounded-xl bg-muted/60 border border-border/40 px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border/50 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder="Describe your business problem..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/40 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        {!hasOutputs && messages.length > 0 && (
          <button
            onClick={onStartWizard}
            className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
          >
            <Compass className="h-3 w-3" />
            Or try the Guided Wizard
          </button>
        )}
      </div>
    </div>
  );
};

export default BuilderChat;
