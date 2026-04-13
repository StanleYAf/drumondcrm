import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, {
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mb-6">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            {this.props.fallbackTitle || "Algo deu errado"}
          </h2>
          <p className="text-sm text-muted-foreground mb-2 max-w-sm leading-relaxed">
            Ocorreu um erro inesperado. Tente uma das opções abaixo para resolver.
          </p>
          {this.state.error && (
            <details className="mb-6 text-xs text-muted-foreground max-w-sm">
              <summary className="cursor-pointer hover:text-foreground transition-colors">
                Ver detalhes técnicos
              </summary>
              <pre className="mt-2 p-3 rounded-xl bg-muted text-left overflow-auto max-h-32 text-[11px] font-mono">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
            <button
              onClick={() => window.location.href = "/"}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium bg-muted text-foreground transition-all active:scale-95"
            >
              <Home className="h-4 w-4" />
              Início
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
