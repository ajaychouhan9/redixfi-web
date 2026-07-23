"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

// Isolates a rendering failure to the panel it wraps instead of unmounting
// the whole page — a class component because React only supports catching
// render errors via getDerivedStateFromError/componentDidCatch.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Panel failed to render:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <p className="text-sm text-foreground-muted">This section isn&apos;t available right now.</p>;
    }
    return this.props.children;
  }
}
