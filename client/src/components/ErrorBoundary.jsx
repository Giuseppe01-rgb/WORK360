import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 bg-red-50 min-h-screen flex flex-col items-center justify-center text-center">
                    <h1 className="text-2xl font-bold text-red-800 mb-4">Qualcosa è andato storto.</h1>
                    <p className="text-red-600 mb-4">Si è verificato un errore imprevisto.</p>
                    <div className="bg-white p-4 rounded-lg shadow-lg text-left overflow-auto max-w-2xl w-full">
                        <p className="font-mono text-sm text-red-500 font-bold">{this.state.error && this.state.error.toString()}</p>
                        <pre className="font-mono text-xs text-slate-500 mt-2 whitespace-pre-wrap">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                    >
                        Ricarica Pagina
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
