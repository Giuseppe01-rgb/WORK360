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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 w-full max-w-2xl animate-in fade-in zoom-in duration-500">
                {/* Header */}
                <div className="text-center mb-8">
                    <img
                        src="/assets/app-logo.png?v=2"
                        alt="WORK360"
                        className="w-20 h-20 mx-auto mb-4 object-contain"
                    />
                    <h1 className="text-3xl font-black text-slate-900 mb-2">
                        Registra la tua azienda
                    </h1>
                    <p className="text-slate-500">
                        {step === 1 ? 'Informazioni azienda' : 'Crea il tuo account amministratore'}
                    </p>
                </div>

                {/* Progress indicator */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        1
                    </div>
                    <div className={`h-1 w-16 ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
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
                            <label className="block text-sm font-bold text-slate-900 mb-2">
                                <Building2 className="w-4 h-4 inline mr-2" />
                                Nome Azienda *
                            </label>
                            <input
                                type="text"
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="Es. Colora SRL"
                                required
                            />

                            <button
                                type="button"
                                onClick={handleNext}
                                className="w-full mt-8 px-6 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                Continua
                                <ArrowRight className="w-5 h-5" />
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="w-full mt-3 px-6 py-3 text-slate-600 font-semibold hover:bg-slate-50 rounded-xl transition-all"
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
                                    <label className="block text-sm font-bold text-slate-900 mb-2">
                                        Nome *
                                    </label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Mario"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-2">
                                        Cognome *
                                    </label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Rossi"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-2">
                                    <Mail className="w-4 h-4 inline mr-2" />
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="mario.rossi@azienda.it"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-2">
                                    Telefono
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="+39 123 456 7890"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-2">
                                    <Lock className="w-4 h-4 inline mr-2" />
                                    Password *
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-2">
                                    Conferma Password *
                                </label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="px-6 py-4 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all flex items-center gap-2"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                    Indietro
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-6 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
