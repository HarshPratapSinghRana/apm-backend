import React, { Suspense, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface DynamicComponentErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

class DynamicComponentErrorBoundary extends React.Component<
  DynamicComponentErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: DynamicComponentErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Dynamic component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-card rounded-xl border border-destructive/20">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-card-foreground mb-2">
            Component Loading Error
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            {this.props.componentName 
              ? `Failed to load component: ${this.props.componentName}`
              : 'The interactive component could not be loaded.'
            }
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading component for Suspense fallback
export const ComponentLoadingFallback = ({ componentName }: { componentName?: string }) => (
  <div className="flex flex-col items-center justify-center p-8 bg-card rounded-xl border border-card-border">
    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
      <div className="w-8 h-8 bg-primary/20 rounded-lg animate-spin"></div>
    </div>
    <h3 className="text-lg font-semibold text-card-foreground mb-2">
      Loading Component
    </h3>
    <p className="text-sm text-muted-foreground text-center">
      {componentName 
        ? `Loading ${componentName}...`
        : 'Preparing interactive experience...'
      }
    </p>
  </div>
);

// Main wrapper component for dynamic components
export const DynamicComponentWrapper = ({ 
  children, 
  componentName 
}: { 
  children: ReactNode; 
  componentName?: string; 
}) => (
  <DynamicComponentErrorBoundary componentName={componentName}>
    <Suspense fallback={<ComponentLoadingFallback componentName={componentName} />}>
      {children}
    </Suspense>
  </DynamicComponentErrorBoundary>
);

export default DynamicComponentErrorBoundary;