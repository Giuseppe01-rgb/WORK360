import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirmModal } from '../../context/ConfirmModalContext';
import { siteAPI, economiaAPI } from '../../utils/api';
import Layout from '../../components/Layout';
import { Plus, Minus, Clock, Trash2, Pencil, X, Loader2 } from 'lucide-react';

const EconomiaForm = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showSuccess, showError, showInfo } = useToast();
    const { showConfirm } = useConfirmModal();

    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingSites, setLoadingSites] = useState(true);
    const [loadingEconomie, setLoadingEconomie] = useState(true);
    const [myEconomie, setMyEconomie] = useState([]);
    const [editingEconomia, setEditingEconomia] = useState(null);
    const [formData, setFormData] = useState({
        site: '',
        hours: 1,
        description: ''
    });

    useEffect(() => {
        loadSites();
        loadMyEconomie();
    }, []);

    const loadSites = async () => {
        setLoadingSites(true);
        try {
            const res = await siteAPI.getAll();
            setSites(res.data);
            if (res.data.length > 0) {
                setFormData(prev => ({ ...prev, site: res.data[0].id }));
            }
        } catch (error) {
            console.error('Error loading sites:', error);
            showError('Errore nel caricamento dei cantieri');
        } finally {
            setLoadingSites(false);
        }
    };

    const loadMyEconomie = async () => {
        setLoadingEconomie(true);
        try {
            const res = await economiaAPI.getMyEconomie();
            setMyEconomie(res.data);
        } catch (error) {
            console.error('Error loading my economie:', error);
            showError('Errore nel caricamento delle economie');
        } finally {
            setLoadingEconomie(false);
        }
    };

    const handleIncrement = () => {
        setFormData(prev => ({
            ...prev,
            hours: Math.min(prev.hours + 0.5, 24)
        }));
    };

    const handleDecrement = () => {
        setFormData(prev => ({
            ...prev,
            hours: Math.max(prev.hours - 0.5, 0.5)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.site) {
            showError('Seleziona un cantiere');
            return;
        }
        if (formData.hours <= 0) {
            showError('Le ore devono essere maggiori di zero');
            return;
        }
        if (formData.description.trim().length < 10) {
            showError('La descrizione deve contenere almeno 10 caratteri');
            return;
        }

        setLoading(true);
        try {
            if (editingEconomia) {
                // Update existing
                await economiaAPI.update(editingEconomia.id, {
                    siteId: formData.site,
                    hours: formData.hours,
                    description: formData.description
                });
                showSuccess('✅ Economia aggiornata con successo!');
                setEditingEconomia(null);
            } else {
                // Create new
                await economiaAPI.create(formData);
                showSuccess('✅ Ore extra registrate con successo!');
            }

            // Reset form
            setFormData({
                site: sites.length > 0 ? sites[0].id : '',
                hours: 1,
                description: ''
            });

            // Reload list
            loadMyEconomie();
        } catch (error) {
            console.error('Error saving economia:', error);
            showError(error.response?.data?.message || 'Errore nel salvataggio delle ore extra');
        } finally {
            setLoading(false);
        }
    };

    const handleEditEconomia = (economia) => {
        setEditingEconomia(economia);
        setFormData({
            site: economia.siteId,
            hours: Number.parseFloat(economia.hours),
            description: economia.description
        });
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingEconomia(null);
        setFormData({
            site: sites.length > 0 ? sites[0].id : '',
            hours: 1,
            description: ''
        });
    };

    const handleDeleteEconomia = async (economia) => {
        const confirmed = await showConfirm({
            title: 'Elimina Economia',
            message: `Sei sicuro di voler eliminare questa economia di ${economia.hours} ore?`,
            confirmText: 'Elimina',
            variant: 'danger'
        });

        if (!confirmed) return;

        try {
            await economiaAPI.deleteMyEconomia(economia.id);
            showSuccess('✅ Economia eliminata con successo');
            loadMyEconomie();

            // If we were editing this one, cancel edit
            if (editingEconomia?.id === economia.id) {
                handleCancelEdit();
            }
        } catch (error) {
            console.error('Error deleting economia:', error);
            showError(error.response?.data?.message || 'Errore nell\'eliminazione');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (sites.length === 0 && !loadingSites) {
        return (
            <Layout title="Economie">
                <div className="max-w-2xl mx-auto p-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                        <p className="text-yellow-800">Nessun cantiere disponibile. Contatta il titolare per essere assegnato ad un cantiere.</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Economie - Ore Extra">
            <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
                {/* Form Card */}
                <div className="bg-white rounded-[2.5rem] shadow-lg border border-slate-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6">
                        <div className="flex items-center gap-3">
                            <Clock className="w-8 h-8" />
                            <div>
                                <h2 className="text-2xl font-bold">
                                    {editingEconomia ? 'Modifica Economia' : 'Ore Extra'}
                                </h2>
                                <p className="text-amber-50 text-sm">
                                    {editingEconomia ? 'Modifica le ore di economia' : 'Registra le ore di economia'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Editing Banner */}
                    {editingEconomia && (
                        <div className="bg-blue-50 border-b border-blue-200 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Pencil className="w-5 h-5 text-blue-600" />
                                <span className="text-blue-800 font-medium">
                                    Stai modificando un'economia esistente
                                </span>
                            </div>
                            <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1"
                            >
                                <X className="w-4 h-4" />
                                Annulla
                            </button>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Site Selection */}
                        <div>
                            <label htmlFor="site" className="block text-sm font-medium text-slate-700 mb-2">
                                Cantiere
                            </label>
                            <select
                                id="site"
                                value={formData.site}
                                onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                                required
                            >
                                {sites.map(site => (
                                    <option key={site.id} value={site.id}>
                                        {site.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Hours Selector */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">
                                Ore Extra
                            </label>
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    type="button"
                                    onClick={handleDecrement}
                                    aria-label="Diminuisci ore"
                                    className="w-12 h-12 bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={formData.hours <= 0.5}
                                >
                                    <Minus className="w-5 h-5" />
                                </button>

                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl px-8 py-4 min-w-[140px] text-center">
                                    <div className="text-4xl font-bold text-amber-600">
                                        {formData.hours.toFixed(1)}
                                    </div>
                                    <div className="text-sm text-amber-700 mt-1">
                                        {formData.hours === 1 ? 'ora' : 'ore'}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleIncrement}
                                    aria-label="Aumenta ore"
                                    className="w-12 h-12 bg-amber-500 text-white rounded-full hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={formData.hours >= 24}
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 text-center mt-2">
                                Incremento di 0.5 ore (min: 0.5, max: 24)
                            </p>
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
                                Descrizione
                                <span className="text-slate-500 font-normal text-xs ml-2">
                                    (minimo 10 caratteri)
                                </span>
                            </label>
                            <textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={6}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none transition-all"
                                placeholder="Descrivi cosa è stato fatto e perché... (es: Installazione impianto elettrico straordinario richiesto dal cliente)"
                                required
                                minLength={10}
                            />
                            <div className="flex justify-between mt-1">
                                <p className="text-xs text-slate-500">
                                    Spiega nel dettaglio le attività svolte
                                </p>
                                <p className={`text-xs ${formData.description.length >= 10 ? 'text-green-600' : 'text-slate-400'}`}>
                                    {formData.description.length}/10
                                </p>
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex gap-3">
                            {editingEconomia && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold text-lg hover:bg-slate-200 transition-all"
                                >
                                    Annulla
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={loading || formData.description.trim().length < 10}
                                className={`${editingEconomia ? 'flex-1' : 'w-full'} bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-xl font-semibold text-lg hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl`}
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Salvataggio...
                                    </div>
                                ) : editingEconomia ? (
                                    '✓ Salva Modifiche'
                                ) : (
                                    '✓ Aggiungi Ore'
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Economie List Card */}
                <div className="bg-white rounded-[2.5rem] shadow-lg border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Clock className="w-6 h-6 text-amber-500" />
                                Le Tue Economie
                            </h3>
                            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                {myEconomie.length} registrate
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            Ultime 30 giorni
                        </p>
                    </div>

                    <div className="p-6">
                        {loadingEconomie ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                            </div>
                        ) : myEconomie.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Clock className="w-8 h-8 text-slate-400" />
                                </div>
                                <p className="text-slate-500">Nessuna economia registrata</p>
                                <p className="text-sm text-slate-400 mt-1">
                                    Usa il form sopra per aggiungere le tue ore extra
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {myEconomie.map((economia) => (
                                    <div
                                        key={economia.id}
                                        className={`p-4 rounded-xl border transition-all ${editingEconomia?.id === economia.id
                                            ? 'bg-blue-50 border-blue-200'
                                            : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="bg-amber-100 text-amber-700 text-sm font-bold px-2 py-0.5 rounded">
                                                        {Number.parseFloat(economia.hours).toFixed(1)} ore
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {formatDate(economia.date)}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-slate-700 mb-1">
                                                    {economia.site?.name || 'Cantiere sconosciuto'}
                                                </p>
                                                <p className="text-sm text-slate-600 line-clamp-2">
                                                    {economia.description}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <button
                                                    onClick={() => handleEditEconomia(economia)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Modifica"
                                                    aria-label="Modifica economia"
                                                >
                                                    <Pencil className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteEconomia(economia)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Elimina"
                                                    aria-label="Elimina economia"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default EconomiaForm;
