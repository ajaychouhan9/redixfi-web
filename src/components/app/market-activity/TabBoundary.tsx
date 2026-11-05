"use client";

import { Component, type ReactNode } from "react";

/**
 * One Market Activity tab can never take down the whole page: a render failure inside the tab shows this line and a Reload button (which tries the tab
 * again), and the other tabs keep working. Keyed by the tab in the hub, so switching tabs starts clean.
 */
export class TabBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Market Activity tab failed to render:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="p-4 text-center" role="alert" data-testid="tab-failed">
        <p className="text-sm text-foreground-muted">This tab could not load. Other tabs still work.</p>
        <button type="button" onClick={() => this.setState({ hasError: false })} className="mt-2 min-h-11 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-hover">
          Reload
        </button>
      </div>
    );
  }
}
