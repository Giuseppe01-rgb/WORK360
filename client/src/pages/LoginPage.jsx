import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, Building2, ArrowRight, User, Mail, Lock, HardHat, Briefcase, HelpCircle } from 'lucide-react';

export default function LoginPage() {
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'worker'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegister) {
                // Use username directly from input (admin.nome.azienda or nome.azienda)
                const username = formData.email;
                const parts = username.split('.');
                let payload = {
                    username,
                    password: formData.password,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                };
                if (username.startsWith('admin')) {
                    // Owner registration expects companyName and ownerName
                    payload = {
                        ...payload,
                        companyName: parts[2] || '',
                        ownerName: parts[1] || '',
                    };
                } else {
                    // Worker registration expects companyName only
                    payload = {
                        ...payload,
                        companyName: parts[1] || '',
                    };
                }
                console.log('Registration payload:', payload);
                await register(payload);
                setIsRegister(false);
                setError('Registrazione completata! Ora puoi accedere.');
            } else {
                // Use username directly from input
                const username = formData.email;
                await login({ username, password: formData.password });
                if (username.startsWith('admin')) {
                    navigate('/owner');
                } else {
                    navigate('/worker');
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Si è verificato un errore');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 relative font-sans">
            <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 p-10 w-full max-w-[480px] flex flex-col items-center relative z-10">

                {/* Logo Section */}
                <div className="mb-8 flex flex-col items-center">
                    <img
                        src="/logo.png"
                        alt="WORK360 Logo"
                        className="w-32 h-32 mb-4 object-contain"
                    />
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">WORK360</h1>
                    <p className="text-slate-500 text-sm font-medium">Gestione intelligente dei cantieri</p>
                </div>

                {/* Toggle */}
                <div className="flex w-full bg-slate-50 p-1.5 rounded-2xl mb-8">
                    <button
                        onClick={() => setIsRegister(false)}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${!isRegister
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setIsRegister(true)}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${isRegister
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        Registrati
                    </button>
                </div>

                {error && (
                    <div className={`w-full mb-6 p-4 rounded-2xl flex items-start gap-3 text-sm font-medium ${error.includes('completata')
                        ? 'bg-green-50 text-green-700 border border-green-100'
                        : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p>{error}</p>
                    </div>
                )}

                <form className="w-full space-y-5" onSubmit={handleSubmit}>
                    {isRegister && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-900 mb-1.5">Nome</label>
                                <input
                                    name="firstName"
                                    type="text"
                                    required
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="Mario"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-900 mb-1.5">Cognome</label>
                                <input
                                    name="lastName"
                                    type="text"
                                    required
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="Rossi"
                                />
                            </div>
                        </div>
                    )}

                    <div className="animate-in fade-in slide-in-from-bottom-4 delay-75">
                        <label className="block text-xs font-bold text-slate-900 mb-1.5">
                            Username
                        </label>
                        {isRegister && (
                            <p className="text-xs text-slate-500 mb-2">
                                {formData.role === 'owner' ?
                                    'Formato: admin.nome.nomeazienda (es: admin.mario.rossi)' :
                                    'Formato: nome.nomeazienda (es: mario.rossi)'}
                            </p>
                        )}
                        <input
                            name="email"
                            type="text"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            placeholder={isRegister ? (formData.role === 'owner' ? 'admin.mario.rossi' : 'mario.rossi') : 'admin.mario.rossi o mario.rossi'}
                        />
                    </div>

                    <div className="animate-in fade-in slide-in-from-bottom-4 delay-100">
                        <label className="block text-xs font-bold text-slate-900 mb-1.5">Password</label>
                        <div className="relative">
                            <input
                                name="password"
                                type={showPassword ? "text" : "password"}
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    {isRegister && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 delay-150">
                            <label className="block text-xs font-bold text-slate-900 mb-3">Seleziona Ruolo</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: 'worker' })}
                                    className={`relative flex items-center justify-center gap-2 p-4 border-2 rounded-xl transition-all duration-200 ${formData.role === 'worker'
                                        ? 'border-slate-900 bg-slate-50'
                                        : 'border-slate-100 hover:border-slate-200'
                                        }`}
                                >
                                    <HardHat className={`h-5 w-5 ${formData.role === 'worker' ? 'text-slate-900' : 'text-slate-400'}`} />
                                    <span className={`text-sm font-bold ${formData.role === 'worker' ? 'text-slate-900' : 'text-slate-500'}`}>Operaio</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: 'owner' })}
                                    className={`relative flex items-center justify-center gap-2 p-4 border-2 rounded-xl transition-all duration-200 ${formData.role === 'owner'
                                        ? 'border-slate-900 bg-slate-50'
                                        : 'border-slate-100 hover:border-slate-200'
                                        }`}
                                >
                                    <Briefcase className={`h-5 w-5 ${formData.role === 'owner' ? 'text-slate-900' : 'text-slate-400'}`} />
                                    <span className={`text-sm font-bold ${formData.role === 'owner' ? 'text-slate-900' : 'text-slate-500'}`}>Titolare</span>
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-600/20 text-sm font-bold text-white bg-[#5D5FEF] hover:bg-[#4B4DDB] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5D5FEF] transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-8"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <span className="text-base">{isRegister ? 'Registrati' : 'Accedi'}</span>
                        )}
                    </button>
                </form>
            </div>

            {/* Help Button */}
            <button className="fixed bottom-6 right-6 w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform text-white">
                <HelpCircle className="w-6 h-6" />
            </button>
        </div>
    );
}
