import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { ChatHeader } from "./ChatHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {BASE_URL} from "../../api/api"
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Add initial greeting message with delay
  useEffect(() => {
    const timer = setTimeout(() => {
      const welcomeMessage: Message = {
        id: "welcome",
        text: "Hello! I'm here to help you with your legal case intake. Please describe your situation and I'll gather the necessary information to connect you with the right legal team.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (userMessage: string) => {
    setIsLoading(true);
    setError(null);

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      text: userMessage,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch(`https://maq-ai-agents-backend-bccxewbag4cwdaa3.eastus-01.azurewebsites.net/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_input: userMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Check if response is empty
      if (!data.response || data.response.trim() === "") {
        throw new Error("Received empty response from server");
      }

      // Add bot response
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send message";
      setError(errorMessage);
      setLastFailedMessage(userMessage);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Unable to connect to the legal intake system. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const retryLastMessage = () => {
    if (lastFailedMessage) {
      setLastFailedMessage(null);
      sendMessage(lastFailedMessage);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    setLastFailedMessage(null);
    setIsLoading(true);
    
    // Add welcome message with delay
    const timer = setTimeout(() => {
      const welcomeMessage: Message = {
        id: "welcome",
        text: "Hello! I'm here to help you with your legal case intake. Please describe your situation and I'll gather the necessary information to connect you with the right legal team.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-lg">
      <ChatHeader onClearChat={clearChat} />
      
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-2 sm:py-4 space-y-2 sm:space-y-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message.text}
            isUser={message.isUser}
            timestamp={message.timestamp}
          />
        ))}
        
        <TypingIndicator isVisible={isLoading} />
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <span className="text-xs sm:text-sm">{error}</span>
              {lastFailedMessage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retryLastMessage}
                  className="ml-0 sm:ml-4 h-8 text-xs whitespace-nowrap"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
    </div>
  );
};