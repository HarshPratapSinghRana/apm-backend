interface TypingIndicatorProps {
  isVisible: boolean;
}

export const TypingIndicator = ({ isVisible }: TypingIndicatorProps) => {
  if (!isVisible) return null;

  return (
    <div className="flex items-start space-x-2 sm:space-x-3 mb-4">
      <div className="w-6 sm:w-8 h-6 sm:h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
        <div className="w-3 sm:w-4 h-3 sm:h-4 bg-primary-foreground rounded-full"></div>
      </div>
      <div className="bg-muted p-2 sm:p-3 rounded-lg max-w-[75%] sm:max-w-[80%] shadow-sm">
        <div className="flex items-center justify-center">
          <div className="flex space-x-1.5">
            <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-primary rounded-full animate-bounce"></div>
            <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};