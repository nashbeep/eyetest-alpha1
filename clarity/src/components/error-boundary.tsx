import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      "[ErrorBoundary]",
      error,
      info.componentStack
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            padding: "40px",
            textAlign: "center",
            fontFamily: "sans-serif",
          }}
        >
          <h2>Something went wrong.</h2>
          <p>An unexpected error occurred.</p>
          <button
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
