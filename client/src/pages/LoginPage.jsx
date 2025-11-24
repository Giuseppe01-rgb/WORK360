import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, Lock, User as UserIcon } from 'lucide-react';

export default function LoginPage() {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { username, password } = formData;
            await login({ username, password });

            // Redirect based on role
            if (username.startsWith('admin')) {
                navigate('/owner');
            } else {
                navigate('/worker');
            }
        } catch (err) {
            console.error('Login error:', err);
            const msg = err.response?.data?.message || err.message || 'Credenziali non valide';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-accent p-4 font-sans">
            <div className="bg-white rounded-3xl p-8 md:p-12 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-300">

                {/* Circular Logo */}
                <div className="mb-8 relative w-24 h-24 mx-auto flex items-center justify-center">
                    <img
                        src="/assets/logo-new.png"
                        alt="WORK360"
                        className="w-full h-full object-contain rounded-full"
                    />
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-accent mb-2">Accedi</h1>
                    <p className="text-text-light-blue font-medium">
                        Accedi con le credenziali fornite dal tuo datore
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800 font-medium">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Username */}
                    <div>
                        <label className="block text-sm font-bold text-accent mb-2">
                            Username
                        </label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full px-4 py-3.5 bg-input-bg border-transparent rounded-xl text-accent font-medium placeholder-input-placeholder focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                            placeholder="nome.nomeazienda"
                            required
                            autoComplete="username"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-bold text-accent mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full px-4 py-3.5 bg-input-bg border-transparent rounded-xl text-accent font-medium placeholder-input-placeholder focus:outline-none focus:ring-2 focus:ring-accent transition-all pr-12"
                                placeholder="Password"
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-input-placeholder hover:text-accent transition-colors"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                        <div className="mt-2 text-left">
                            <button type="button" className="text-xs font-bold text-progress-blue hover:underline">
                                Hai dimenticato la password? Clicca qui per recuperarla
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3 pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-6 py-4 bg-accent text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Accesso in corso...' : 'Accedi'}
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="w-full px-6 py-4 bg-white text-accent font-bold rounded-xl hover:bg-slate-50 transition-all border-2 border-accent"
                        >
                            Annulla
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
