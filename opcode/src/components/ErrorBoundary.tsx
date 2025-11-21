import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch and display React rendering errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to console
    console.error('Error caught by boundary:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      // Default error UI
      return (
        <div className="flex min-h-[200px] items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="text-destructive mt-0.5 h-8 w-8 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-semibold">Something went wrong</h3>
                  <p className="text-muted-foreground text-sm">
                    An error occurred while rendering this component.
                  </p>
                  {this.state.error.message && (
                    <details className="mt-2">
                      <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm">
                        Error details
                      </summary>
                      <pre className="bg-muted mt-2 overflow-auto rounded p-2 text-xs">
                        {this.state.error.message}
                      </pre>
                    </details>
                  )}
                  <Button onClick={this.reset} size="sm" className="mt-4">
                    Try again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
