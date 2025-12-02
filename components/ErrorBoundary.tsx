import React, { Component, ErrorInfo, ReactNode } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
        // Optionally reload the page
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 z-[9999]">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8 border border-gray-200 dark:border-gray-700">
                        {/* Icon */}
                        <div className="flex items-center justify-center mb-6">
                            <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full">
                                <AlertTriangle size={48} className="text-red-600 dark:text-red-400" />
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-3">
                            Oops! Something went wrong
                        </h1>

                        {/* Description */}
                        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                            The application encountered an unexpected error. Don't worry, your data is safe.
                        </p>

                        {/* Error Details (Collapsible) */}
                        {this.state.error && (
                            <details className="mb-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Technical Details
                                </summary>
                                <div className="mt-2 text-sm">
                                    <div className="font-mono text-red-600 dark:text-red-400 mb-2">
                                        {this.state.error.toString()}
                                    </div>
                                    {this.state.errorInfo && (
                                        <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-48 bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    )}
                                </div>
                            </details>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                            >
                                <X size={20} />
                                Reload Application
                            </button>
                        </div>

                        {/* Help Text */}
                        <p className="text-center text-sm text-gray-500 dark:text-gray-500 mt-6">
                            If this problem persists, try clearing your browser cache or contact support.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
