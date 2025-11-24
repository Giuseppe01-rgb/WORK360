import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, LogIn } from 'lucide-react';

export default function WelcomePage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full text-center">
                {/* Logo */}
                <div className="mb-8 flex justify-center">
                    <img
                        src="/assets/app-logo.png?v=3"
                        alt="WORK360 Logo"
                        className="w-32 h-32 object-contain"
                    />
                </div>

                {/* Welcome text */}
                <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">
                    Benvenuto in
                </h1>
                <div className="mb-3">
                    <span className="text-6xl font-black text-slate-900">
                        WORK360
                    </span>
                </div>
                <p className="text-slate-600 text-lg mb-12 font-medium">
                    Gestione intelligente dei cantieri
                </p>

                {/* Buttons */}
                <div className="space-y-4">
                    <button
                        onClick={() => navigate('/onboarding')}
                        className="w-full px-8 py-4 bg-[rgb(15,23,42)] text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-3 text-lg group"
                    >
                        <Building2 className="w-6 h-6" />
                        Registra la tua azienda
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button
                        onClick={() => navigate('/login')}
                        className="w-full px-8 py-4 bg-white text-[rgb(15,23,42)] font-bold rounded-xl hover:bg-slate-100 transition-all border-2 border-slate-200 flex items-center justify-center gap-3 text-lg shadow-sm"
                    >
                        <LogIn className="w-6 h-6" />
                        Accedi
                    </button>
                </div>

                {/* Footer */}
                <p className="mt-12 text-slate-500 text-sm">
                    Powered by <span className="font-bold text-slate-900">WORK360 Enterprise</span>
                </p>
            </div>
        </div>
    );
}
