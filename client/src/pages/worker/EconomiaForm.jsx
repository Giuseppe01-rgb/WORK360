import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { siteAPI, economiaAPI } from '../../utils/api';
import Layout from '../../components/Layout';
import { Plus, Minus, Clock } from 'lucide-react';

const EconomiaForm = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();

    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        site: '',
        hours: 1,
        description: ''
    });

    useEffect(() => {
        loadSites();
    }, []);

    const loadSites = async () => {
        try {
            const res = await siteAPI.getAll();
            setSites(res.data);
            if (res.data.length > 0) {
                setFormData(prev => ({ ...prev, site: res.data[0].id }));
            }
        } catch (error) {
            console.error('Error loading sites:', error);
            showError('Errore nel caricamento dei cantieri');
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
            await economiaAPI.create(formData);
            showSuccess('✅ Ore extra registrate con successo!');
            setFormData({
                site: sites.length > 0 ? sites[0].id : '',
                hours: 1,
                description: ''
            });
        } catch (error) {
            console.error('Error creating economia:', error);
            showError(error.response?.data?.message || 'Errore nel salvataggio delle ore extra');
        } finally {
            setLoading(false);
        }
    };

    if (sites.length === 0) {
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
            <div className="max-w-2xl mx-auto p-4 md:p-6">
                <div className="bg-white rounded-[2.5rem] shadow-lg border border-slate-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6">
                        <div className="flex items-center gap-3">
                            <Clock className="w-8 h-8" />
                            <div>
                                <h2 className="text-2xl font-bold">Ore Extra</h2>
                                <p className="text-amber-50 text-sm">Registra le ore di economia</p>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Site Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Cantiere
                            </label>
                            <select
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
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Descrizione
                                <span className="text-slate-500 font-normal text-xs ml-2">
                                    (minimo 10 caratteri)
                                </span>
                            </label>
                            <textarea
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

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || formData.description.trim().length < 10}
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-xl font-semibold text-lg hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Salvataggio...
                                </div>
                            ) : (
                                '✓ Aggiungi Ore'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

export default EconomiaForm;
