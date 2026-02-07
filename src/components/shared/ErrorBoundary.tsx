'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card p-8 text-center max-w-md mx-auto my-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 mx-auto mb-4">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-[#94A3B8] mb-6">
            {this.props.fallbackMessage ||
              this.state.error?.message ||
              'An unexpected error occurred. Please try again.'}
          </p>
          <Button
            onClick={this.handleRetry}
            className="bg-gold-gradient text-[#0F1B2D] hover:opacity-90 font-semibold"
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
