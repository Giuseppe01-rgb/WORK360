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

    const getDuration = (start, end) => {
        if (!start) return '-';
        const s = new Date(start);
        const e = end ? new Date(end) : new Date();
        const diffTime = Math.abs(e - s);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return `${diffDays} giorni`;
    };

    const getFormattedStartDate = (dateString) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
    };

    const getSiteColorPalette = (index) => {
        const colors = [
            { pastello: '#C8DCF5', pieno: '#70A6E7' }, // Ciano
            { pastello: '#C8F5CF', pieno: '#71E685' }, // Verde
            { pastello: '#C9C8F5', pieno: '#6765E3' }, // Viola
        ];
        return colors[index % colors.length];
    };

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return (
                    <div style={{ paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2, background: '#CEFDDA', borderRadius: 32, justifyContent: 'flex-start', alignItems: 'center', gap: 10, display: 'flex' }}>
                        <div style={{ color: '#138624', fontSize: 9, fontFamily: 'TASA Orbiter', fontWeight: 600, lineHeight: '16px', wordWrap: 'break-word', textTransform: 'uppercase' }}>IN CORSO</div>
                    </div>
                );
            case 'planned':
                return (
                    <div style={{ paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2, background: '#E5E7FF', borderRadius: 32, justifyContent: 'flex-start', alignItems: 'center', gap: 10, display: 'flex' }}>
                        <div style={{ color: '#5762FF', fontSize: 9, fontFamily: 'TASA Orbiter', fontWeight: 600, lineHeight: '16px', wordWrap: 'break-word', textTransform: 'uppercase' }}>PIANIFICATO</div>
                    </div>
                );
            case 'completed':
                return (
                    <div style={{ paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2, background: '#F0F0F4', borderRadius: 32, justifyContent: 'flex-start', alignItems: 'center', gap: 10, display: 'flex' }}>
                        <div style={{ color: '#888AAA', fontSize: 9, fontFamily: 'TASA Orbiter', fontWeight: 600, lineHeight: '16px', wordWrap: 'break-word', textTransform: 'uppercase' }}>COMPLETATO</div>
                    </div>
                );
            case 'suspended':
                return (
                    <div style={{ paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2, background: '#FDCECE', borderRadius: 32, justifyContent: 'flex-start', alignItems: 'center', gap: 10, display: 'flex' }}>
                        <div style={{ color: '#861313', fontSize: 9, fontFamily: 'TASA Orbiter', fontWeight: 600, lineHeight: '16px', wordWrap: 'break-word', textTransform: 'uppercase' }}>SOSPESO</div>
                    </div>
                );
            default:
                return (
                    <div style={{ paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2, background: '#F0F0F4', borderRadius: 32, justifyContent: 'flex-start', alignItems: 'center', gap: 10, display: 'flex' }}>
                        <div style={{ color: '#888AAA', fontSize: 9, fontFamily: 'TASA Orbiter', fontWeight: 600, lineHeight: '16px', wordWrap: 'break-word', textTransform: 'uppercase' }}>SCONOSCIUTO</div>
                    </div>
                );
        }
    };

    const filters = [
        { label: 'TUTTI', id: 'all', count: sites.length },
        { label: 'IN CORSO', id: 'active', count: sites.filter(s => s.status === 'active').length },
        { label: 'COMPLETATI', id: 'completed', count: sites.filter(s => s.status === 'completed').length },
        { label: 'PIANIFICATI', id: 'planned', count: sites.filter(s => s.status === 'planned').length },
        { label: 'SOSPESI', id: 'suspended', count: sites.filter(s => s.status === 'suspended').length },
    ];

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

                {/* Search, Filters, Nuovo Cantiere Container */}
                <div style={{ background: '#F0F0F4', overflow: 'hidden', flexDirection: 'column', justifyContent: 'flex-start', gap: 24, display: 'flex', marginBottom: 24, padding: '0 16px', paddingTop: 16 }}>

                    {/* Nuovo Cantiere Button */}
                    <div onClick={() => setShowModal(true)} style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 12, paddingBottom: 12, background: '#5762FF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 12, display: 'flex', cursor: 'pointer' }}>
                        <Plus className="w-6 h-6 text-[#F0F0F4]" />
                        <div style={{ color: '#F0F0F4', fontSize: 18, fontFamily: 'TASA Orbiter', fontWeight: 800, lineHeight: '24px', wordWrap: 'break-word' }}>Nuovo Cantiere</div>
                    </div>

                    {/* Filters Scrollable */}
                    <div className="flex w-full overflow-x-auto no-scrollbar items-center gap-3 snap-x pb-2">
                        {filters.map(filter => {
                            const isActive = statusFilter === filter.id;
                            return (
                                <div
                                    key={filter.id}
                                    onClick={() => setStatusFilter(filter.id)}
                                    className="snap-start shrink-0 cursor-pointer"
                                    style={{ padding: 10, background: isActive ? '#5762FF' : 'white', borderRadius: 24, outline: '1px #C2C6FF solid', outlineOffset: -1, flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 10, display: 'flex' }}
                                >
                                    <div style={{ alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center', gap: 10, display: 'flex' }}>
                                        <div style={{ color: isActive ? '#F0F0F4' : '#15161E', fontSize: 14, fontFamily: 'TASA Orbiter', fontWeight: 700, lineHeight: '16px', wordWrap: 'break-word' }}>{filter.label}</div>
                                        <div style={{ color: isActive ? '#D2D3DF' : '#6A6D95', fontSize: 14, fontFamily: 'TASA Orbiter', fontWeight: 700, lineHeight: '16px', wordWrap: 'break-word' }}>{filter.count}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Search Input */}
                    <div style={{ alignSelf: 'stretch', overflow: 'hidden', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 8, display: 'flex' }}>
                        <div style={{ alignSelf: 'stretch', height: 48, paddingLeft: 16, paddingRight: 16, paddingTop: 12, paddingBottom: 12, background: 'white', overflow: 'hidden', borderRadius: 32, outline: '2px #D2D3DF solid', outlineOffset: -2, justifyContent: 'flex-start', alignItems: 'center', gap: 12, display: 'flex' }}>
                            <Search className="w-6 h-6 text-[#D2D3DF]" />
                            <input
                                type="text"
                                placeholder="Cerca cantieri..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#15161E', fontSize: 16, fontFamily: 'TASA Orbiter', fontWeight: 500, lineHeight: '20px', wordWrap: 'break-word' }}
                                className="placeholder:text-[#D2D3DF]"
                            />
                        </div>
                    </div>
                </div>

                {/* SITES LIST */}
                <div style={{ flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 24, display: 'flex', width: '100%', padding: '0 16px' }}>
                    {filteredSites.map((site, index) => {
                        const colorInfo = getSiteColorPalette(index);
                        return (
                            <div key={site.id} style={{ alignSelf: 'stretch', padding: 16, background: 'white', overflow: 'hidden', borderRadius: 32, outline: '2px #E5E7FF solid', outlineOffset: -2, flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', gap: 16, display: 'flex' }}>
                                <div style={{ alignSelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', display: 'flex' }}>
                                    <div style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center', gap: 12, display: 'flex', minWidth: 0 }}>
                                        <div style={{ justifyContent: 'flex-start', alignItems: 'center', gap: 10, display: 'flex' }}>
                                            <div style={{ width: 32, height: 32, background: colorInfo.pastello, overflow: 'hidden', borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 10, display: 'flex' }}>
                                                <div style={{ width: 24, height: 24, position: 'relative', overflow: 'hidden' }}>
                                                    <div style={{ width: 5, height: 10, left: 2.67, top: 10.91, position: 'absolute', outline: `2px ${colorInfo.pieno} solid`, outlineOffset: -1 }}></div>
                                                    <div style={{ width: 5, height: 14, left: 20.67, top: 20.91, position: 'absolute', transform: 'rotate(180deg)', transformOrigin: 'top left', outline: `2px ${colorInfo.pieno} solid`, outlineOffset: -1 }}></div>
                                                    <div style={{ width: 8, height: 19, left: 7.67, top: 1.91, position: 'absolute', outline: `2px ${colorInfo.pieno} solid`, outlineOffset: -1 }}></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ flex: 1, flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', display: 'flex', minWidth: 0, overflow: 'hidden' }}>
                                            <div style={{ alignSelf: 'stretch', color: 'black', fontSize: 24, fontFamily: 'TASA Orbiter', fontWeight: 800, lineHeight: '32px', wordWrap: 'break-word', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{site.name}</div>
                                            <div style={{ alignSelf: 'stretch', color: '#888AAA', fontSize: 14, fontFamily: 'TASA Orbiter', fontWeight: 500, lineHeight: '16px', wordWrap: 'break-word', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{site.address || 'Nessun indirizzo'}</div>
                                        </div>
                                    </div>
                                    <div style={{ height: 48, justifyContent: 'flex-end', alignItems: 'center', gap: 10, display: 'flex', paddingLeft: 8 }}>
                                        <div style={{ justifyContent: 'flex-end', alignItems: 'center', gap: 12, display: 'flex' }}>
                                            <button onClick={(e) => handleEdit(e, site)} className="hover:opacity-75 transition-opacity" title="Modifica">
                                                <Edit className="w-5 h-5 text-[#888AAA]" />
                                            </button>
                                            <button onClick={(e) => handleDelete(e, site.id)} className="hover:opacity-75 transition-opacity" title="Elimina">
                                                <Trash2 className="w-5 h-5 text-[#888AAA]" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ alignSelf: 'stretch', justifyContent: 'space-between', alignItems: 'flex-start', display: 'flex', gap: 8 }}>
                                    <div style={{ flex: 1, height: 44, paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4, background: '#F0F0F4', overflow: 'hidden', borderRadius: 12, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
                                        <div style={{ color: '#888AAA', fontSize: 9, fontFamily: 'TASA Orbiter', fontWeight: 600, lineHeight: '16px', wordWrap: 'break-word', whiteSpace: 'nowrap' }}>INIZIO</div>
                                        <div style={{ color: '#15161E', fontSize: 9, fontFamily: 'TASA Orbiter', fontWeight: 600, lineHeight: '16px', wordWrap: 'break-word', whiteSpace: 'nowrap' }}>{getFormattedStartDate(site.startDate)}</div>
                                    </div>
                                    <div style={{ flex: 1, height: 44, paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4, background: '#F0F0F4', overflow: 'hidden', borderRadius: 12, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
                                        <div style={{ color: '#888AAA', fontSize: 9, fontFamily: 'TASA Orbiter', fontWeight: 600, lineHeight: '16px', wordWrap: 'break-word', whiteSpace: 'nowrap' }}>DURATA</div>
                                        <div style={{ color: '#15161E', fontSize: 9, fontFamily: 'TASA Orbiter', fontWeight: 600, lineHeight: '16px', wordWrap: 'break-word', whiteSpace: 'nowrap' }}>{getDuration(site.startDate, site.endDate)}</div>
                                    </div>
                                    <div style={{ flex: 1, height: 44, paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4, background: '#F0F0F4', overflow: 'hidden', borderRadius: 12, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
                                        <div style={{ color: '#888AAA', fontSize: 9, fontFamily: 'TASA Orbiter', fontWeight: 600, lineHeight: '16px', wordWrap: 'break-word', whiteSpace: 'nowrap' }}>PATTUITO</div>
                                        <div style={{ color: '#15161E', fontSize: 9, fontFamily: 'TASA Orbiter', fontWeight: 600, lineHeight: '16px', wordWrap: 'break-word', whiteSpace: 'nowrap' }}>€ {Number(site.contractValue || 0).toLocaleString('it-IT', { minimumFractionDigits: 1 })}</div>
                                    </div>
                                </div>
                                <div style={{ alignSelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', display: 'flex' }}>
                                    {renderStatusBadge(site.status)}
                                    <div onClick={() => setSelectedSite(site)} className="cursor-pointer hover:bg-[#E5E7FF] transition-colors" style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 4, display: 'flex' }}>
                                        <div style={{ color: '#5762FF', fontSize: 14, fontFamily: 'TASA Orbiter', fontWeight: 700, lineHeight: '16px', wordWrap: 'break-word' }}>Dettagli</div>
                                        <ArrowRight className="w-5 h-5 text-[#5762FF]" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal Nuovo/Modifica Cantiere */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4" role="button" tabIndex={0} onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }} onKeyDown={(e) => { if (e.key === 'Escape') resetForm(); }}>
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
