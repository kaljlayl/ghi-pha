import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-red-500 p-8 font-mono">
          <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
          <div className="bg-gray-900 p-4 rounded overflow-auto border border-red-900">
            <h2 className="text-lg font-semibold mb-2">Error:</h2>
            <pre className="whitespace-pre-wrap">{this.state.error?.toString()}</pre>
            <h2 className="text-lg font-semibold mt-4 mb-2">Component Stack:</h2>
            <pre className="whitespace-pre-wrap text-sm text-gray-400">
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>
          <button
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
