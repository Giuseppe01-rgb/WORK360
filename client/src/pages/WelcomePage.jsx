import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, LogIn } from 'lucide-react';

export default function WelcomePage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-md w-full text-center animate-in fade-in zoom-in duration-700">
                {/* Logo */}
                <div className="mb-8 flex justify-center">
                    <div className="relative">
                        <img
                            src="/assets/app-logo.png?v=2"
                            alt="WORK360 Logo"
                            className="w-32 h-32 object-contain drop-shadow-2xl"
                        />
                        <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse"></div>
                    </div>
                </div>

                {/* Welcome text */}
                <h1 className="text-5xl font-black text-white mb-4 tracking-tight">
                    Benvenuto in
                </h1>
                <div className="mb-3">
                    <span className="text-6xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        WORK360
                    </span>
                </div>
                <p className="text-slate-300 text-lg mb-12 font-medium">
                    Gestione intelligente dei cantieri
                </p>

                {/* Buttons */}
                <div className="space-y-4">
                    <button
                        onClick={() => navigate('/onboarding')}
                        className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-2xl shadow-blue-500/50 flex items-center justify-center gap-3 text-lg group transform hover:scale-105"
                    >
                        <Building2 className="w-6 h-6" />
                        Registra la tua azienda
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button
                        onClick={() => navigate('/login')}
                        className="w-full px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-bold rounded-xl hover:bg-white/20 transition-all border border-white/20 flex items-center justify-center gap-3 text-lg"
                    >
                        <LogIn className="w-6 h-6" />
                        Accedi
                    </button>
                </div>

                {/* Footer */}
                <p className="mt-12 text-slate-400 text-sm">
                    Powered by <span className="font-bold text-white">WORK360 Enterprise</span>
                </p>
            </div>
        </div>
    );
}
