import { Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  onClearChat?: () => void;
}

export const ChatHeader = ({ onClearChat }: ChatHeaderProps) => {
  return (
    <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b bg-gradient-to-r from-primary to-primary-glow text-primary-foreground rounded-t-lg gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center justify-center w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-white/20 flex-shrink-0">
          <Scale className="h-4 sm:h-5 w-4 sm:w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-semibold truncate">Legal Case Intake</h1>
          <p className="text-xs sm:text-sm opacity-90 truncate">Tell us about your legal situation</p>
        </div>
      </div>
      {onClearChat && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearChat}
          className="text-white/80 hover:text-white hover:bg-white/10 flex-shrink-0 px-2 sm:px-3"
        >
          <Trash2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Clear Chat</span>
        </Button>
      )}
    </div>
  );
};