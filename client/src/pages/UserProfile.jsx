import { useState } from 'react';
import Layout from '../components/Layout';
import { userAPI } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { Lock, Eye, EyeOff, User, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function UserProfile() {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
            showError('Tutti i campi sono obbligatori');
            return;
        }

        if (formData.newPassword.length < 6) {
            showError('La nuova password deve essere lunga almeno 6 caratteri');
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            showError('Le password non corrispondono');
            return;
        }

        setLoading(true);
        try {
            await userAPI.changePassword({
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });

            showSuccess('Password aggiornata con successo!');

            // Reset form
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            showError(error.response?.data?.message || 'Errore durante il cambio password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout title="Profilo Utente">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* User Info Card */}
                <div className="bg-white rounded-[2.5rem] shadow-sm p-6 border border-slate-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-700 rounded-full flex items-center justify-center text-white">
                            <User className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">
                                {user?.firstName || user?.username}
                            </h2>
                            <div className="flex items-center gap-2 text-slate-600">
                                <Shield className="w-4 h-4" />
                                <span className="text-sm font-semibold uppercase">
                                    {user?.role === 'owner' ? 'Proprietario' : 'Operaio'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                        <div>
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                Username
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="font-semibold text-slate-900 flex-1">{user?.username}</div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(user?.username);
                                        showSuccess('Username copiato!');
                                    }}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                                >
                                    Copia
                                </button>
                            </div>
                        </div>
                        {user?.email && (
                            <div>
                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                    Email
                                </div>
                                <div className="font-semibold text-slate-900">{user.email}</div>
                            </div>
                        )}
                        {user?.phone && (
                            <div>
                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                    Telefono
                                </div>
                                <div className="font-semibold text-slate-900">{user.phone}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Password Info Alert */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Informazioni Password
                    </h4>
                    <p className="text-sm text-amber-800">
                        Per motivi di sicurezza, la password attuale non può essere visualizzata.
                        Se non ricordi la tua password, usa il modulo qui sotto per cambiarla con una nuova password facile da ricordare.
                    </p>
                </div>

                {/* Password Change Card */}
                <div className="bg-white rounded-[2.5rem] shadow-sm p-6 border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Lock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Cambia Password</h3>
                            <p className="text-sm text-slate-500">Imposta una password facile da ricordare</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Current Password */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Password Attuale *
                            </label>
                            <div className="relative">
                                <input
                                    type={showPasswords.current ? 'text' : 'password'}
                                    name="currentPassword"
                                    value={formData.currentPassword}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    placeholder="Inserisci la password attuale"
                                />
                                <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility('current')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Nuova Password *
                            </label>
                            <div className="relative">
                                <input
                                    type={showPasswords.new ? 'text' : 'password'}
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    placeholder="Minimo 6 caratteri"
                                />
                                <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility('new')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {formData.newPassword && (
                                <div className="mt-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-1 flex-1 rounded-full ${formData.newPassword.length < 6 ? 'bg-red-200' :
                                            formData.newPassword.length < 8 ? 'bg-yellow-200' :
                                                'bg-green-200'
                                            }`}></div>
                                    </div>
                                    <p className={`text-xs mt-1 ${formData.newPassword.length < 6 ? 'text-red-600' :
                                        formData.newPassword.length < 8 ? 'text-yellow-600' :
                                            'text-green-600'
                                        }`}>
                                        {formData.newPassword.length < 6 ? 'Troppo debole (min 6 caratteri)' :
                                            formData.newPassword.length < 8 ? 'Media' :
                                                'Forte'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Conferma Nuova Password *
                            </label>
                            <div className="relative">
                                <input
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    placeholder="Ripeti la nuova password"
                                />
                                <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility('confirm')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {formData.confirmPassword && (
                                <p className={`text-xs mt-1 ${formData.newPassword === formData.confirmPassword ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {formData.newPassword === formData.confirmPassword ? '✓ Le password corrispondono' : '✗ Le password non corrispondono'}
                                </p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-6 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Aggiornamento...
                                </>
                            ) : (
                                <>
                                    <Lock className="w-5 h-5" />
                                    Cambia Password
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Security Tips */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">💡 Suggerimenti per la sicurezza</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Usa almeno 6 caratteri (meglio se 8 o più)</li>
                        <li>• Combina lettere maiuscole e minuscole</li>
                        <li>• Aggiungi numeri per renderla più sicura</li>
                        <li>• Non usare password facili come "123456" o "password"</li>
                    </ul>
                </div>
            </div>
        </Layout>
    );
}
