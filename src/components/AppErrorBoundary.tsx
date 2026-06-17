import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
  label: string;
  resetKey?: string;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`${this.props.label} failed`, error, info.componentStack);
  }

  componentDidUpdate(previousProps: AppErrorBoundaryProps): void {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="surface-error" role="alert">
        <h2>{this.props.label} could not load</h2>
        <p>{this.state.error.message || "An unexpected runtime error occurred."}</p>
      </main>
    );
  }
}
