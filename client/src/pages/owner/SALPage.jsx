import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { salAPI, siteAPI } from '../../utils/api';
import { Plus, FileText, Download, Percent, Euro, X, CheckCircle, AlertCircle, Search, Building2 } from 'lucide-react';

export default function SALPage() {
    const [sals, setSals] = useState([]);
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [notification, setNotification] = useState(null);
    const [formData, setFormData] = useState({
        site: '',
        number: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        completionPercentage: 0,
        amount: 0,
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const loadData = async () => {
        try {
            const [salsResp, sitesResp] = await Promise.all([
                salAPI.getAll(),
                siteAPI.getAll()
            ]);
            setSals(salsResp.data);
            setSites(sitesResp.data);
        } catch (error) {
            console.error('Error loading data:', error);
            showNotification('error', 'Errore nel caricamento dei dati');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await salAPI.create(formData);
            setShowModal(false);
            setFormData({
                site: '',
                number: '',
                date: new Date().toISOString().split('T')[0],
                description: '',
                completionPercentage: 0,
                amount: 0,
                notes: ''
            });
            loadData();
            showNotification('success', 'SAL creato con successo!');
        } catch (error) {
            console.error('Error creating SAL:', error);
            showNotification('error', 'Errore nella creazione del SAL');
        }
    };

    const downloadPDF = async (salId) => {
        try {
            // Using the API utility if available, or direct link as fallback
            // Assuming salAPI has a downloadPDF method or we construct the URL
            // Based on previous code, it was a direct window.open
            const token = localStorage.getItem('token');
            const url = `http://localhost:5001/api/sals/${salId}/pdf?token=${token}`;
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            showNotification('error', 'Errore nel download del PDF');
        }
    };

    if (loading) {
        return (
            <Layout title="Stati Avanzamento Lavori">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Stati Avanzamento Lavori">
            {notification && (
                <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 font-semibold flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {notification.message}
                </div>
            )}

            <div className="mb-8 flex justify-between items-center">
                <div className="relative max-w-md w-full hidden md:block">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Cerca SAL..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    Nuovo SAL
                </button>
            </div>

            {/* SALs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sals.map(sal => (
                    <div key={sal._id} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                        <div className="mb-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                                    <Building2 className="w-5 h-5 text-slate-400" />
                                    <span className="line-clamp-1">{sal.site?.name || 'Cantiere sconosciuto'}</span>
                                </div>
                                <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                    {sal.number}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                        <Percent className="w-3 h-3" /> Completamento
                                    </div>
                                    <div className="text-lg font-bold text-slate-900">
                                        {sal.completionPercentage}%
                                    </div>
                                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2">
                                        <div
                                            className="bg-green-500 h-1.5 rounded-full"
                                            style={{ width: `${sal.completionPercentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                        <Euro className="w-3 h-3" /> Importo
                                    </div>
                                    <div className="text-lg font-bold text-slate-900">
                                        €{sal.amount.toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-slate-500 line-clamp-2">
                                {sal.description}
                            </p>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <button
                                onClick={() => downloadPDF(sal._id)}
                                className="w-full py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <Download className="w-4 h-4" /> Scarica PDF
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl relative">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-slate-500" />
                        </button>

                        <div className="p-6 md:p-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Nuovo SAL</h2>
                            <p className="text-slate-500 mb-8">Compila i dati per generare lo Stato Avanzamento Lavori</p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Cantiere</label>
                                        <select
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={formData.site}
                                            onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                                            required
                                        >
                                            <option value="">Seleziona un cantiere...</option>
                                            {sites.map(site => (
                                                <option key={site._id} value={site._id}>{site.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Numero SAL</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={formData.number}
                                            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                                            placeholder="Es: SAL-001"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrizione Lavori</label>
                                    <textarea
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[100px]"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Descrivi i lavori eseguiti..."
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Percentuale Completamento (%)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 pr-10"
                                                value={formData.completionPercentage}
                                                onChange={(e) => setFormData({ ...formData, completionPercentage: parseFloat(e.target.value) })}
                                                min="0"
                                                max="100"
                                                required
                                            />
                                            <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Importo Maturato (€)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 pr-10"
                                                value={formData.amount}
                                                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                                                required
                                            />
                                            <Euro className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-6 py-3 text-slate-600 font-semibold hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-8 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-all shadow-md flex items-center gap-2"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        Crea SAL
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
