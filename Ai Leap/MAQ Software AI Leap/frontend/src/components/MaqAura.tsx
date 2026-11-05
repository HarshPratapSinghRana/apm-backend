import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { BASE_URL } from "../api/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi there! I'm **MAQ Software Aura**, your AI assistant.\n\nI can help you **search and explore** all the AI agent use-cases on this platform — just ask me about a domain like Retail, Finance, Legal, or describe a problem you're trying to solve!",
  timestamp: new Date(),
};

const MaqAura: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingDismissed, setGreetingDismissed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Show greeting popup on first visit
  useEffect(() => {
    const timer = setTimeout(() => setShowGreeting(true), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showGreeting && !greetingDismissed) {
      const dismissTimer = setTimeout(() => {
        setShowGreeting(false);
        setGreetingDismissed(true);
      }, 5000);
      return () => clearTimeout(dismissTimer);
    }
  }, [showGreeting, greetingDismissed]);

  useEffect(() => {
    if (isOpen) {
      setShowGreeting(false);
      setGreetingDismissed(true);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Build history from existing messages (exclude the welcome msg for brevity)
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${BASE_URL}/aura-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const detail = body?.detail || `Server error: ${res.status}`;
        throw new Error(detail);
      }

      const data = await res.json();
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorText =
        err instanceof Error ? err.message : "Unknown error";
      const isRateLimit = errorText.toLowerCase().includes("429") || errorText.toLowerCase().includes("too many");
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: isRateLimit
          ? "I'm getting a lot of requests right now. Please wait a moment and try again."
          : `Sorry, something went wrong: ${errorText}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div ref={chatRef} className="fixed bottom-2 right-2 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div
          className="mb-4 w-[calc(100vw-1rem)] sm:w-[400px] rounded-xl bg-card shadow-2xl border border-border overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300 flex flex-col"
          style={{ maxHeight: "calc(100vh - 8rem)", minHeight: "300px" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 text-primary-foreground flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #BA141A, #D32F3A)",
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative">
                <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#BA141A] rounded-full" />
              </div>
              <div>
                <h3 className="font-semibold text-sm sm:text-base leading-tight">MAQ Software Aura</h3>
                <span className="text-[10px] sm:text-[11px] text-white/70 font-medium">AI Assistant</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-white/15 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 sm:py-4 space-y-2 sm:space-y-4 bg-gradient-to-b from-secondary to-card min-h-0">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg bg-[#BA141A] flex-shrink-0 flex items-center justify-center mr-1 sm:mr-2 mt-0.5">
                    <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] sm:max-w-[80%] rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-[#BA141A] text-white rounded-br-md"
                      : "bg-card border border-border rounded-tl-md"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none dark:prose-invert [&>*:last-child]:mb-0">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="mb-2 last:mb-0 list-disc list-inside">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-2 last:mb-0 list-decimal list-inside">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          code: ({ children }) => (
                            <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                  <p className="text-[10px] opacity-50 mt-1.5">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="w-6 sm:w-7 h-6 sm:h-7 rounded-lg bg-[#BA141A] flex-shrink-0 flex items-center justify-center mr-1 sm:mr-2 mt-0.5">
                  <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-white" />
                </div>
                <div className="bg-card border border-border rounded-xl rounded-tl-md px-3 sm:px-4 py-2 sm:py-3 shadow-sm">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-[#BA141A]/60 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-[#BA141A]/60 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                    <div className="w-2 h-2 bg-[#BA141A]/60 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-2 sm:px-4 py-2 sm:py-3 border-t border-border bg-card flex-shrink-0">
            <div className="flex items-center gap-1 sm:gap-2 bg-muted rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about any AI use-case..."
                disabled={isLoading}
                className="flex-1 bg-transparent text-xs sm:text-sm text-foreground placeholder-muted-foreground outline-none disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="p-1 sm:p-1.5 rounded-lg bg-[#BA141A] text-white disabled:opacity-40 hover:bg-[#BA141A]/90 transition-colors"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 animate-spin" />
                ) : (
                  <Send className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Greeting Popup Bubble */}
      {showGreeting && !isOpen && (
        <div className="mb-2 sm:mb-3 relative animate-in slide-in-from-bottom-2 fade-in duration-300">
          <div className="bg-card rounded-xl shadow-xl border border-border px-3 sm:px-5 py-3 sm:py-4 max-w-[200px] sm:max-w-[260px] relative">
            <button
              onClick={() => {
                setShowGreeting(false);
                setGreetingDismissed(true);
              }}
              className="absolute top-1 right-1 sm:top-2 sm:right-2 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            </button>
            <p className="text-xs sm:text-sm font-semibold text-foreground mb-1">MAQ Software Aura</p>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pr-4">
              Have an AI challenge in mind?<br />
              Ask me about our AI agent solutions! 😊
            </p>
          </div>
          <div className="flex justify-end mr-4 sm:mr-6">
            <div className="w-2 sm:w-3 h-2 sm:h-3 bg-card border-b border-r border-border rotate-45 -mt-1.5" />
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 bg-[#BA141A] shadow-[0_6px_18px_rgba(0,0,0,0.3)] ${
          isOpen
            ? ""
            : "hover:opacity-90 hover:scale-105"
        }`}
        aria-label="Open MAQ Software Aura chat"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <>
            <Sparkles className="w-6 h-6 text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-[#F1C40F] rounded-full border-2 border-white text-[10px] font-bold text-[#5E4A00] flex items-center justify-center">
              1
            </span>
          </>
        )}
      </button>
    </div>
  );
};

export default MaqAura;
