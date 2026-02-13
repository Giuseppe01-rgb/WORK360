import { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { useConfirmModal } from '../../context/ConfirmModalContext';
import { siteAPI, analyticsAPI, noteAPI, photoAPI, workActivityAPI, economiaAPI, materialUsageAPI, colouraMaterialAPI } from '../../utils/api';
import { Plus, Users, Clock, ArrowRight, X, ChevronRight, Package, MapPin, Calendar, Edit, Trash2, Eye, ArrowLeft, RefreshCw, Smartphone, Monitor, Search, Building2, CheckCircle, AlertCircle, FileText, Camera, Zap } from 'lucide-react';
import PortalModal from '../../components/PortalModal';
import SquircleCard from '../../components/SquircleCard';
import { getSiteColor } from '../../utils/siteColors';
import SiteDetails from '../../components/owner/SiteDetails';

export default function OwnerDashboard() {
    const { user } = useAuth();
    const { showConfirm } = useConfirmModal();
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSite, setEditingSite] = useState(null);
    const [selectedSite, setSelectedSite] = useState(null);
    const [notification, setNotification] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active'); // 'all', 'active', 'completed', 'planned', 'suspended'
    const [showScrollIndicator, setShowScrollIndicator] = useState(true);
    const filterTabsRef = useRef(null);

    // Handle scroll to show/hide arrow indicator
    const handleFilterScroll = (e) => {
        const el = e.target;
        const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 10;
        setShowScrollIndicator(!isAtEnd);
    };

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        description: '',
        startDate: '',
        endDate: '',
        status: 'planned',
        contractValue: ''
    });

    useEffect(() => {
        loadSites();
    }, []);

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const loadSites = async () => {
        try {
            const response = await siteAPI.getAll();
            setSites(response.data);
        } catch (error) {
            showNotification('error', 'Errore nel caricamento dei cantieri');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate contractValue if provided
        if (formData.contractValue) {
            const contractVal = Number.parseFloat(formData.contractValue);
            if (Number.isNaN(contractVal)) {
                showNotification('error', 'Prezzo pattuito non valido: inserisci un numero');
                return;
            }
            if (contractVal > 9999999999) {
                showNotification('error', 'Prezzo pattuito troppo alto: massimo 9.999.999.999€');
                return;
            }
            if (contractVal < 0) {
                showNotification('error', 'Prezzo pattuito non può essere negativo');
                return;
            }
        }

        try {
            if (editingSite) {
                await siteAPI.update(editingSite.id, formData);
                showNotification('success', 'Cantiere aggiornato con successo!');
            } else {
                await siteAPI.create(formData);
                showNotification('success', 'Cantiere creato con successo!');
            }
            resetForm();
            loadSites();
        } catch (error) {
            console.error('Site creation/update error:', error);
            // Get the most specific error message available
            const errorMsg = error.response?.data?.message
                || error.response?.data?.error
                || error.message
                || 'Errore sconosciuto';
            showNotification('error', `Errore nella ${editingSite ? 'modifica' : 'creazione'} del cantiere: ${errorMsg}`);
        }
    };

    const handleEdit = (e, site) => {
        e.stopPropagation();
        setEditingSite(site);
        setFormData({
            name: site.name,
            address: site.address || '',
            description: site.description || '',
            startDate: site.startDate ? new Date(site.startDate).toISOString().split('T')[0] : '',
            endDate: site.endDate ? new Date(site.endDate).toISOString().split('T')[0] : '',
            status: site.status,
            contractValue: site.contractValue || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        const confirmed = await showConfirm({
            title: 'Elimina cantiere',
            message: 'Sei sicuro di voler eliminare questo cantiere? Tutti i dati associati verranno eliminati.',
            confirmText: 'Elimina',
            variant: 'danger'
        });
        if (!confirmed) return;

        try {
            await siteAPI.delete(id);
            showNotification('success', 'Cantiere eliminato!');
            loadSites();
        } catch (error) {
            showNotification('error', 'Errore nell\'eliminazione');
        }
    };

    const resetForm = () => {
        setFormData({ name: '', address: '', description: '', startDate: '', endDate: '', status: 'planned', contractValue: '' });
        setEditingSite(null);
        setShowModal(false);
    };

    const filteredSites = sites.filter(site => {
        // Status filter
        const matchesStatus = statusFilter === 'all' || site.status === statusFilter;
        // Search filter
        const matchesSearch = site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            site.address.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    if (loading) {
        return (
            <Layout title="Cantieri" hideHeader={true}>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                </div>
            </Layout>
        );
    }

    if (selectedSite) {
        return (
            <Layout title="Dettagli Cantiere" hideHeader={true}>
                <SiteDetails site={selectedSite} onBack={() => setSelectedSite(null)} showConfirm={showConfirm} />
            </Layout>
        );
    }

    return (
        <Layout title={`Benvenuto, ${user?.firstName}`} hideHeader={true}>
            {notification && (
                <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 font-semibold flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {notification.message}
                </div>
            )}

            <div className="space-y-6 pb-20">

                {/* SEARCH - UPDATED */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        aria-label="Cerca cantiere"
                        type="text"
                        placeholder="Cerca cantiere..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white pl-12 pr-4 py-4 rounded-[2.5rem] border-none shadow-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                {/* STATUS FILTER TABS - Clean & Scrollable */}
                <div className="relative mb-6">
                    {/* Fade gradient to indicate scrollability */}
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-100 to-transparent pointer-events-none z-10 md:hidden"></div>

                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                        {[
                            { value: 'all', label: 'Tutti' },
                            { value: 'active', label: 'In corso' },
                            { value: 'completed', label: 'Completati' },
                            { value: 'planned', label: 'Pianificati' },
                            { value: 'suspended', label: 'Sospesi' }
                        ].map(tab => {
                            const count = tab.value === 'all'
                                ? sites.length
                                : sites.filter(s => s.status === tab.value).length;
                            const isActive = statusFilter === tab.value;
                            return (
                                <button
                                    key={tab.value}
                                    onClick={() => setStatusFilter(tab.value)}
                                    className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${isActive
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                        }`}
                                >
                                    {tab.label}
                                    <span className={`ml-1.5 ${isActive ? 'text-white/60' : 'text-slate-400'}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* NEW SITE BUTTON */}
                <button
                    onClick={() => setShowModal(true)}
                    className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/40 flex items-center justify-center gap-2 mb-8 transition-all active:scale-95 hover:shadow-2xl hover:shadow-blue-500/50"
                >
                    <Plus className="w-6 h-6" />
                    Nuovo Cantiere
                </button>

                {/* SITES LIST */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-900 text-lg">
                            {statusFilter === 'all' ? 'Tutti i cantieri' :
                                statusFilter === 'active' ? 'Cantieri attivi' :
                                    statusFilter === 'completed' ? 'Cantieri completati' :
                                        statusFilter === 'planned' ? 'Cantieri pianificati' : 'Cantieri sospesi'}
                        </h3>
                        <span className="text-slate-500 text-sm font-medium">{filteredSites.length} risultati</span>
                    </div>

                    {filteredSites.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                <Building2 className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Nessun cantiere trovato</h3>
                            <p className="text-slate-500 max-w-xs mx-auto">
                                Non ci sono cantieri che corrispondono ai filtri selezionati.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredSites.map((site) => {
                                // Status config
                                const statusConfig = {
                                    active: { label: 'In corso', bgClass: 'bg-green-100', textClass: 'text-green-700' },
                                    completed: { label: 'Completato', bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
                                    planned: { label: 'Pianificato', bgClass: 'bg-amber-100', textClass: 'text-amber-700' },
                                    suspended: { label: 'Sospeso', bgClass: 'bg-red-100', textClass: 'text-red-700' }
                                }[site.status] || { label: 'Sconosciuto', bgClass: 'bg-slate-100', textClass: 'text-slate-700' };

                                // Calculate days since start
                                const startDate = new Date(site.startDate);
                                const today = new Date();
                                const durationDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

                                // Has contract value
                                const hasContract = Number.parseFloat(site.contractValue) > 0;
                                const contractValue = Number.parseFloat(site.contractValue) || 0;

                                return (
                                    <SquircleCard key={site.id} onClick={() => setSelectedSite(site)}>
                                        <div className="p-5">
                                            <div className="flex justify-between items-start mb-5">
                                                <div className="flex gap-4">
                                                    {(() => {
                                                        const siteColor = getSiteColor(site.id);
                                                        return (
                                                            <div className={`flex-shrink-0 w-12 h-12 rounded-2xl ${siteColor.iconBg} flex items-center justify-center ${siteColor.text} group-hover:scale-105 transition-transform`}>
                                                                <Building2 className="w-6 h-6" />
                                                            </div>
                                                        );
                                                    })()}
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1 line-clamp-2 pr-2">
                                                            {site.name}
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                                                            <MapPin className="w-3.5 h-3.5" />
                                                            <span className="truncate max-w-[180px]">{site.address}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(e, site); }} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(e, site.id); }} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Metrics Row */}
                                            <div className="grid grid-cols-3 gap-3 mb-5">
                                                <div className="bg-slate-50/80 rounded-2xl p-3 text-center">
                                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Inizio</p>
                                                    <p className="text-slate-900 font-bold text-sm">
                                                        {new Date(site.startDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }).replace('.', '')}
                                                    </p>
                                                </div>

                                                <div className="bg-slate-50/80 rounded-2xl p-3 text-center">
                                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Durata</p>
                                                    <p className="text-slate-900 font-bold text-sm">
                                                        {durationDays > 0 ? `${durationDays} gg` : '-'}
                                                    </p>
                                                </div>

                                                <div className={`rounded-2xl p-3 text-center ${hasContract ? 'bg-indigo-50/50' : 'bg-slate-50/80'}`}>
                                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Valore</p>
                                                    {hasContract ? (
                                                        <p className="text-slate-900 font-bold text-sm whitespace-nowrap">
                                                            € {contractValue.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                        </p>
                                                    ) : (
                                                        <p className="text-slate-400 font-medium text-sm">—</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Footer - Status Badge + CTA */}
                                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${site.status === 'active'
                                                        ? 'bg-green-50 border-green-200 text-green-700'
                                                        : statusConfig.bgClass.replace('bg-', 'bg-opacity-10 bg-').replace('text-', 'border-').replace('text-amber-700', 'border-amber-200 text-amber-700').replace('text-blue-700', 'border-blue-200 text-blue-700').replace('text-red-700', 'border-red-200 text-red-700').replace('text-slate-700', 'border-slate-200 text-slate-600')
                                                        }`}>
                                                        {statusConfig.label}
                                                    </span>
                                                    {site.assignedWorkers?.length > 0 && (
                                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                                            <Users className="w-3.5 h-3.5" />
                                                            <span>{site.assignedWorkers.length}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 text-slate-400 group-hover:text-blue-600 transition-colors">
                                                    <span className="text-xs font-semibold">Dettagli</span>
                                                    <ChevronRight className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </SquircleCard>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Nuovo/Modifica Cantiere */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4" role="button" tabIndex={0} onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') resetForm(); }}>
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900">
                                {editingSite ? 'Modifica Cantiere' : 'Nuovo Cantiere'}
                            </h3>
                            <button onClick={resetForm} aria-label="Chiudi" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Nome Cantiere</label>
                                <input
                                    id="name"
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                                    placeholder="Es. Ristrutturazione Villa Rossi"
                                />
                            </div>

                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">Indirizzo</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                    <input
                                        id="address"
                                        type="text"
                                        required
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                                        placeholder="Via Roma 123, Milano"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 mb-1">Data Inizio</label>
                                    <input
                                        id="startDate"
                                        type="date"
                                        required
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full max-w-full block min-h-[50px] bg-white appearance-none px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-base"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 mb-1">Data Fine (prevista)</label>
                                    <input
                                        id="endDate"
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full max-w-full block min-h-[50px] bg-white appearance-none px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-base"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1">Stato</label>
                                <select
                                    id="status"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all appearance-none bg-white"
                                >
                                    <option value="planned">Pianificato</option>
                                    <option value="active">In Corso</option>
                                    <option value="completed">Completato</option>
                                    <option value="suspended">Sospeso</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="contractValue" className="block text-sm font-medium text-slate-700 mb-1">Prezzo pattuito (€ IVA esclusa)</label>
                                <input
                                    id="contractValue"
                                    type="text"
                                    inputMode="decimal"
                                    pattern="[0-9]*\.?[0-9]*"
                                    value={formData.contractValue}
                                    onChange={(e) => {
                                        // Allow only numbers and decimal point
                                        const val = e.target.value.replaceAll(/[^0-9.]/g, '');
                                        setFormData({ ...formData, contractValue: val });
                                    }}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                                    placeholder="0.00"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all transform active:scale-[0.98] mt-4 shadow-lg shadow-slate-900/20"
                            >
                                {editingSite ? 'Salva Modifiche' : 'Crea Cantiere'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
