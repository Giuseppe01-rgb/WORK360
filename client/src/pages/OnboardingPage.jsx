import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, User, Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';

export default function OnboardingPage() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        // Company info
        companyName: '',
        // Admin info
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleNext = () => {
        if (step === 1) {
            if (!formData.companyName.trim()) {
                setError('Inserisci il nome dell\'azienda');
                return;
            }
            setStep(2);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
            setError('Compila tutti i campi obbligatori');
            return;
        }

        if (formData.password.length < 6) {
            setError('La password deve essere di almeno 6 caratteri');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Le password non coincidono');
            return;
        }

        setLoading(true);

        try {
            // Create admin username in format: admin.firstname.companyname
            const username = `admin.${formData.firstName.toLowerCase()}.${formData.companyName.toLowerCase().replace(/\s+/g, '')}`;

            await register({
                username,
                password: formData.password,
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                companyName: formData.companyName,
                ownerName: formData.firstName
            });

            // Navigate to owner dashboard
            navigate('/owner');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Errore durante la registrazione');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-accent p-4 font-sans">
            <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 w-full max-w-md animate-in fade-in zoom-in duration-500">

                {/* Circular Logo */}
                <div className="mb-6 relative w-20 h-20 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 border-[5px] border-accent rounded-full border-t-transparent -rotate-45"></div>
                    <div className="flex flex-col items-center justify-center leading-none z-10">
                        <span className="text-[8px] font-bold text-accent uppercase tracking-widest mb-0.5">WORK</span>
                        <span className="text-xl font-black text-accent tracking-tighter">360</span>
                    </div>
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-accent mb-2">
                        Registra la tua azienda
                    </h1>
                    <p className="text-text-light-blue font-medium">
                        {step === 1 ? 'Informazioni azienda' : 'Crea il tuo account amministratore'}
                    </p>
                </div>

                {/* Progress indicator */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= 1 ? 'bg-progress-blue text-white' : 'bg-input-bg text-slate-400'}`}>
                        1
                    </div>
                    <div className={`h-1 w-12 rounded-full transition-colors ${step >= 2 ? 'bg-progress-blue' : 'bg-input-bg'}`}></div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= 2 ? 'bg-progress-blue text-white' : 'bg-input-bg text-slate-400'}`}>
                        2
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Step 1: Company Info */}
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-right duration-300">
                            <label className="block text-sm font-bold text-accent mb-2">
                                Nome Azienda *
                            </label>
                            <input
                                type="text"
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleChange}
                                className="w-full px-4 py-3.5 bg-input-bg border-transparent rounded-xl text-accent font-medium placeholder-input-placeholder focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                                placeholder="Es. Nome SRL"
                                required
                            />

                            <button
                                type="button"
                                onClick={handleNext}
                                className="w-full mt-8 px-6 py-4 bg-accent text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                Continua
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="w-full mt-3 px-6 py-4 bg-white text-accent font-bold rounded-xl hover:bg-slate-50 transition-all border-2 border-accent"
                            >
                                Annulla
                            </button>
                        </div>
                    )}

                    {/* Step 2: Admin Info */}
                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right duration-300 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-accent mb-2">
                                        Nome *
                                    </label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3.5 bg-input-bg border-transparent rounded-xl text-accent font-medium placeholder-input-placeholder focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                                        placeholder="Mario"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-accent mb-2">
                                        Cognome *
                                    </label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3.5 bg-input-bg border-transparent rounded-xl text-accent font-medium placeholder-input-placeholder focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                                        placeholder="Rossi"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-accent mb-2">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3.5 bg-input-bg border-transparent rounded-xl text-accent font-medium placeholder-input-placeholder focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                                    placeholder="nome.cognome@nomeazienda.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-accent mb-2">
                                    Telefono *
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3.5 bg-input-bg border-transparent rounded-xl text-accent font-medium placeholder-input-placeholder focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                                    placeholder="+39 333 1234567"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-accent mb-2">
                                    Password *
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3.5 bg-input-bg border-transparent rounded-xl text-accent font-medium placeholder-input-placeholder focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                                    placeholder="Password"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-accent mb-2">
                                    Conferma password *
                                </label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3.5 bg-input-bg border-transparent rounded-xl text-accent font-medium placeholder-input-placeholder focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                                    placeholder="Password"
                                    required
                                />
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="px-6 py-4 text-accent font-bold hover:bg-slate-50 rounded-xl transition-all flex items-center gap-2 border-2 border-transparent hover:border-slate-200"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-6 py-4 bg-accent text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Registrazione...' : 'Completa Registrazione'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
