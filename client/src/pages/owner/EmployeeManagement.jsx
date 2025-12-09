import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { useConfirmModal } from '../../context/ConfirmModalContext';
import { userAPI } from '../../utils/api';
import {
    Users, Plus, Edit, Trash2, X, CheckCircle, AlertCircle,
    Mail, Phone, Calendar, User, Building2, Copy, Check, ChevronRight, Key
} from 'lucide-react';

export default function EmployeeManagement() {
    const { user } = useAuth();
    const { showConfirm } = useConfirmModal();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [notification, setNotification] = useState(null);
    const [generatedCredentials, setGeneratedCredentials] = useState(null);
    const [copiedField, setCopiedField] = useState(null);

    const [formData, setFormData] = useState({
        role: 'worker',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        birthDate: '',
        hourlyCost: ''
    });

    useEffect(() => {
        loadEmployees();
    }, []);

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const loadEmployees = async () => {
        try {
            const response = await userAPI.getAll();
            setEmployees(response.data);
        } catch (error) {
            showNotification('error', 'Errore nel caricamento degli utenti');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingEmployee) {
                await userAPI.update(editingEmployee.id, formData);
                showNotification('success', 'Utente aggiornato con successo!');
                setGeneratedCredentials(null);
            } else {
                const response = await userAPI.create(formData);
                showNotification('success', 'Utente creato con successo!');
                // Show generated credentials
                setGeneratedCredentials({
                    username: response.data.username,
                    password: response.data.generatedPassword
                });
            }
            resetForm();
            loadEmployees();
        } catch (error) {
            showNotification('error', error.response?.data?.message || 'Errore nell\'operazione');
        }
    };

    const handleEdit = (employee) => {
        setEditingEmployee(employee);
        setFormData({
            role: employee.role,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email || '',
            phone: employee.phone || '',
            birthDate: employee.birthDate ? new Date(employee.birthDate).toISOString().split('T')[0] : '',
            hourlyCost: employee.hourlyCost || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        const confirmed = await showConfirm({
            title: 'Elimina utente',
            message: 'Sei sicuro di voler eliminare questo utente? Questa azione non può essere annullata.',
            confirmText: 'Elimina',
            variant: 'danger'
        });
        if (!confirmed) return;

        try {
            await userAPI.delete(id);
            showNotification('success', 'Utente eliminato!');
            loadEmployees();
        } catch (error) {
            showNotification('error', 'Errore nell\'eliminazione');
        }
    };

    const handleResetPassword = async (employee, event) => {
        event.stopPropagation();
        const confirmed = await showConfirm({
            title: 'Reset password',
            message: `Resettare la password di ${employee.firstName} ${employee.lastName}? Verrà generata una nuova password.`,
            confirmText: 'Reset Password',
            variant: 'warning'
        });
        if (!confirmed) return;

        try {
            const response = await userAPI.resetPassword(employee.id);
            showNotification('success', 'Password resettata!');
            // Show new credentials
            setGeneratedCredentials({
                username: response.data.username,
                password: response.data.password
            });
        } catch (error) {
            showNotification('error', error.response?.data?.message || 'Errore nel reset della password');
        }
    };

    const resetForm = () => {
        setFormData({ role: 'worker', firstName: '', lastName: '', email: '', phone: '', birthDate: '', hourlyCost: '' });
        setEditingEmployee(null);
        setShowModal(false);
    };

    const copyToClipboard = async (text, field) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            showNotification('error', 'Impossibile copiare');
        }
    };

    if (loading) {
        return (
            <Layout title="Lista Operai">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Lista Operai">
            {notification && (
                <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 font-semibold flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {notification.message}
                </div>
            )}

            {employees.length === 0 ? (
                // Empty State
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <Users className="w-12 h-12 text-slate-400" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-3">Nessun operaio registrato</h2>
                    <p className="text-slate-500 mb-8 max-w-md text-lg">
                        Inizia creando la tua lista di operai e collaboratori.
                    </p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-3 text-lg"
                    >
                        <Plus className="w-6 h-6" />
                        Crea Lista Operai
                    </button>
                </div>
            ) : (
                // Employee List
                <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                            {employees.length} {employees.length === 1 ? 'Collaboratore' : 'Collaboratori'}
                        </h2>
                        <p className="text-slate-500">Gestisci il tuo team</p>
                    </div>

                    <div className="grid gap-4">
                        {employees.map(employee => (
                            <div
                                key={employee.id}
                                onClick={(e) => { e.stopPropagation(); handleEdit(employee); }}
                                className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
                            >
                                <ChevronRight className="absolute top-6 right-6 w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pr-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center">
                                            <User className="w-7 h-7 text-slate-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">
                                                {employee.firstName} {employee.lastName}
                                            </h3>
                                            <div className="flex flex-wrap gap-3 mt-1 text-sm text-slate-500">
                                                {employee.email && (
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="w-4 h-4" />
                                                        {employee.email}
                                                    </span>
                                                )}
                                                {employee.phone && (
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="w-4 h-4" />
                                                        {employee.phone}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${employee.role === 'owner'
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {employee.role === 'owner' ? 'Titolare' : 'Operaio'}
                                        </span>

                                        {employee.id !== user.id && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleResetPassword(employee, e); }}
                                                    className="p-2 hover:bg-blue-50 rounded-lg text-blue-500 hover:text-blue-700 transition-colors"
                                                    title="Reset Password"
                                                >
                                                    <Key className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(employee); }}
                                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                                                    title="Modifica"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(employee.id); }}
                                                    className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                                                    title="Elimina"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-4 md:p-4 overflow-y-auto" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={resetForm}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-slate-500" />
                        </button>

                        <div className="p-4 md:p-6 lg:p-8 overflow-y-auto flex-1">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                {editingEmployee ? 'Modifica Utente' : 'Nuovo Utente'}
                            </h2>
                            <p className="text-slate-500 mb-8">
                                {editingEmployee ? 'Aggiorna le informazioni' : 'Inserisci i dati del nuovo collaboratore'}
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-2">Ruolo *</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: 'worker' })}
                                            className={`p-4 rounded-xl border-2 font-bold transition-all ${formData.role === 'worker'
                                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            Operaio
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: 'owner' })}
                                            className={`p-4 rounded-xl border-2 font-bold transition-all ${formData.role === 'owner'
                                                ? 'border-purple-600 bg-purple-50 text-purple-700'
                                                : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            Titolare
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-900 mb-2">Nome *</label>
                                        <input
                                            type="text"
                                            value={formData.firstName}
                                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            required
                                            placeholder="Mario"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-900 mb-2">Cognome *</label>
                                        <input
                                            type="text"
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            required
                                            placeholder="Rossi"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                                        placeholder="mario.rossi@email.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-2">Telefono</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                                        placeholder="+39 123 456 7890"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-2">Costo Orario (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.hourlyCost}
                                        onChange={(e) => setFormData({ ...formData, hourlyCost: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-2">Data di Nascita</label>
                                    <input
                                        type="date"
                                        value={formData.birthDate}
                                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                                        className="w-full max-w-full min-w-0 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 appearance-none"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-6 py-3 bg-white border-2 border-slate-900 text-slate-900 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        {editingEmployee ? 'Salva Modifiche' : 'Crea Utente'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Credentials Modal */}
            {generatedCredentials && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative animate-in zoom-in duration-200">
                        <div className="p-6 md:p-8">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                    {editingEmployee ? 'Password Resettata!' : 'Utente Creato!'}
                                </h2>
                                <p className="text-slate-500">
                                    {editingEmployee ? 'Nuove credenziali generate' : 'Condividi queste credenziali con il nuovo utente'}
                                </p>
                            </div>

                            <div className="space-y-4 bg-slate-50 p-4 rounded-xl">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">USERNAME</label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 bg-white rounded-lg text-sm font-mono font-bold text-slate-900 border border-slate-200">
                                            {generatedCredentials.username}
                                        </code>
                                        <button
                                            onClick={() => copyToClipboard(generatedCredentials.username, 'username')}
                                            className="p-2 hover:bg-white rounded-lg transition-colors"
                                            title="Copia"
                                        >
                                            {copiedField === 'username' ?
                                                <Check className="w-5 h-5 text-green-600" /> :
                                                <Copy className="w-5 h-5 text-slate-500" />
                                            }
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">PASSWORD</label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 bg-white rounded-lg text-sm font-mono font-bold text-slate-900 border border-slate-200">
                                            {generatedCredentials.password}
                                        </code>
                                        <button
                                            onClick={() => copyToClipboard(generatedCredentials.password, 'password')}
                                            className="p-2 hover:bg-white rounded-lg transition-colors"
                                            title="Copia"
                                        >
                                            {copiedField === 'password' ?
                                                <Check className="w-5 h-5 text-green-600" /> :
                                                <Copy className="w-5 h-5 text-slate-500" />
                                            }
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-xs text-amber-800 font-medium">
                                    ⚠️ Salva queste credenziali! Non sarà possibile recuperare la password generata.
                                </p>
                            </div>

                            <button
                                onClick={() => setGeneratedCredentials(null)}
                                className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20"
                            >
                                Ho salvato le credenziali
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FAB - Always visible */}
            <button
                onClick={() => setShowModal(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-40"
            >
                <Plus className="w-7 h-7" />
            </button>
        </Layout>
    );
}
