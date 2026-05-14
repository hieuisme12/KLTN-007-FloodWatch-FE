import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { SectionCard } from './SectionCard';
import { Button } from './Button';
import { getSafeUserFacingError } from '@/utils/safeErrorMessage';

export interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, message: getSafeUserFacingError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.warn('[ErrorBoundary]', error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-lg p-6">
          <SectionCard title="Đã xảy ra lỗi hiển thị">
            <p className="text-sm text-slate-600">{this.state.message}</p>
            <Button className="mt-4" variant="secondary" onClick={() => this.setState({ hasError: false, message: '' })}>
              Thử lại
            </Button>
          </SectionCard>
        </div>
      );
    }
    return this.props.children;
  }
}
