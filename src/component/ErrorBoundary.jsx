import React from "react";

/**
 * Catches render-time errors so one bad API response can't white-screen the
 * whole app. Previously e.g. `media.vote_average.toFixed(1)` on a title with
 * no rating took the entire page down with no visible explanation.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled render error:", error, info);
  }

  handleReset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="text-h1 text-ink">Something went wrong</h1>
        <p className="mt-2 max-w-sm text-body text-muted">
          That page failed to load. This is usually a temporary problem with the
          movie database.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            onClick={this.handleReset}
            className="rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-ink-invert transition hover:bg-white"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-full border border-hairline px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-2"
          >
            Go home
          </a>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
