import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Simulate API call
        setTimeout(() => {
            setMessage({
                type: 'success',
                text: 'Se l\'username esiste, riceverai istruzioni via email. Per ora, contatta l\'amministratore.'
            });
            setLoading(false);
        }, 1500);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-full mb-4">
                            <Building2 className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            Recupera Password
                        </h1>
                        <p className="text-slate-600 text-sm">
                            Inserisci il tuo username per recuperare l'accesso
                        </p>
                    </div>

                    {message.text && (
                        <div className={`p-4 rounded-lg mb-6 flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                            }`}>
                            {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                            <p className="text-sm font-medium">{message.text}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Username
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="admin.mario.work360"
                                    className="w-full px-4 py-2.5 pl-10 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                    required
                                />
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Invio in corso...
                                </>
                            ) : (
                                'Invia Richiesta'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Torna al Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
