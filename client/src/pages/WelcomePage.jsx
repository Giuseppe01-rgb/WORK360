import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, LogIn } from 'lucide-react';

export default function WelcomePage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4 font-sans">
            <div className="max-w-md w-full text-center flex flex-col items-center">

                {/* Title */}
                <h1 className="text-4xl font-black text-accent mb-8 tracking-tight">
                    Benvenuto in
                </h1>

                {/* Circular Logo */}
                <div className="mb-6 relative w-48 h-48 flex items-center justify-center">
                    {/* Outer Circle Ring (Simulated with border or SVG) */}
                    <div className="absolute inset-0 border-[12px] border-accent rounded-full border-t-transparent -rotate-45"></div>

                    {/* Inner Text */}
                    <div className="flex flex-col items-center justify-center leading-none z-10">
                        <span className="text-xs font-bold text-accent uppercase tracking-widest mb-1">WORK</span>
                        <span className="text-4xl font-black text-accent tracking-tighter">360</span>
                    </div>
                </div>

                {/* Subtitle */}
                <p className="text-text-light-blue text-lg font-medium mb-16">
                    Gestione intelligente dell'azienda
                </p>

                {/* Buttons */}
                <div className="w-full space-y-4 px-4">
                    <button
                        onClick={() => navigate('/onboarding')}
                        className="w-full py-4 bg-accent text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg text-base"
                    >
                        Registra la tua azienda
                    </button>

                    <button
                        onClick={() => navigate('/login')}
                        className="w-full py-4 bg-white text-accent font-bold rounded-xl hover:bg-slate-50 transition-all border-2 border-accent text-base"
                    >
                        Accedi
                    </button>
                </div>
            </div>
        </div>
    );
}
