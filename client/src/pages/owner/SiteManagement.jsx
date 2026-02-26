import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Layout from '../../components/Layout';
import { useConfirmModal } from '../../context/ConfirmModalContext';
import { useData } from '../../context/DataContext';
import { siteAPI, analyticsAPI, workActivityAPI, noteAPI, economiaAPI, materialUsageAPI } from '../../utils/api';
import {
    Building2, MapPin, Calendar, Clock, Package, Users,
    Edit, Trash2, Plus, X, ArrowLeft, CheckCircle, AlertCircle, Search,
    FileText, Camera, Zap, Download, ArrowRight
} from 'lucide-react';
import { exportSiteReport } from '../../utils/excelExport';
import SiteDetails from '../../components/owner/SiteDetails';

export default function SiteManagement() {
    const { showConfirm } = useConfirmModal();
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSite, setEditingSite] = useState(null);
    const [selectedSite, setSelectedSite] = useState(null);
    const [notification, setNotification] = useState(null);

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
            showNotification('error', error.message || 'Errore nell\'operazione');
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

    const handleDeleteReport = async (e, reportId) => {
        e.stopPropagation();
        const confirmed = await showConfirm({
            title: 'Elimina rapporto',
            message: 'Sei sicuro di voler eliminare questo rapporto?',
            confirmText: 'Elimina',
            variant: 'danger'
        });
        if (!confirmed) return;

        try {
            await workActivityAPI.delete(reportId);
            const [rep] = await Promise.all([
                analyticsAPI.getSiteReport(selectedSite.id)
            ]);
            setReport(rep.data);
            showNotification('success', 'Rapporto eliminato');
        } catch (error) {
            console.error('Error deleting report:', error);
            showNotification('error', 'Errore nell\'eliminazione');
        }
    };



    const [activeFilter, setActiveFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

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

    const getSiteColor = (index) => {
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
        if (activeFilter !== 'all' && site.status !== activeFilter) return false;
        if (searchTerm && !site.name.toLowerCase().includes(searchTerm.toLowerCase()) && !(site.address || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    if (selectedSite) {
        return (
            <Layout title="Dettagli Cantiere">
                <SiteDetails
                    site={selectedSite}
                    onBack={() => setSelectedSite(null)}
                    onDelete={(e) => {
                        handleDelete(e, selectedSite.id);
                        setSelectedSite(null);
                    }}
                    showConfirm={showConfirm}
                />
            </Layout>
        );
    }

    if (loading) {
        return (
            <Layout title="Gestione Cantieri">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Gestione Cantieri" hideHeader>
            {notification && (
                <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 font-semibold flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {notification.message}
                </div>
            )}

            <div className="max-w-md mx-auto w-full font-['TASA_Orbiter',sans-serif] pb-24">

                {/* Search, Filters, Nuovo Cantiere */}
                <div style={{ background: '#F0F0F4', overflow: 'hidden', flexDirection: 'column', justifyContent: 'flex-start', gap: 24, display: 'flex', marginBottom: 24, padding: '0 16px', paddingTop: 16 }}>

                    {/* Nuovo Cantiere Button */}
                    <div onClick={() => setShowModal(true)} style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 12, paddingBottom: 12, background: '#5762FF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 12, display: 'flex', cursor: 'pointer' }}>
                        <Plus className="w-6 h-6 text-[#F0F0F4]" />
                        <div style={{ color: '#F0F0F4', fontSize: 18, fontFamily: 'TASA Orbiter', fontWeight: 800, lineHeight: '24px', wordWrap: 'break-word' }}>Nuovo Cantiere</div>
                    </div>

                    {/* Filters Scrollable */}
                    <div className="flex w-full overflow-x-auto no-scrollbar items-center gap-3 snap-x pb-2">
                        {filters.map(filter => {
                            const isActive = activeFilter === filter.id;
                            return (
                                <div
                                    key={filter.id}
                                    onClick={() => setActiveFilter(filter.id)}
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

                {/* Sites List */}
                <div style={{ flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 24, display: 'flex', width: '100%', padding: '0 16px' }}>
                    {filteredSites.map((site, index) => {
                        const colorInfo = getSiteColor(index);
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

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl relative">
                        <button
                            onClick={resetForm}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-slate-500" />
                        </button>

                        <div className="p-6 md:p-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                {editingSite ? 'Modifica Cantiere' : 'Nuovo Cantiere'}
                            </h2>
                            <p className="text-slate-500 mb-8">Inserisci i dettagli del cantiere</p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label htmlFor="site_name" className="block text-sm font-medium text-slate-700 mb-1">Nome Cantiere *</label>
                                        <input
                                            id="site_name"
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label htmlFor="site_address" className="block text-sm font-medium text-slate-700 mb-1">Indirizzo *</label>
                                        <input
                                            id="site_address"
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label htmlFor="site_startDate" className="block text-sm font-medium text-slate-700 mb-1">Data Inizio *</label>
                                        <input
                                            id="site_startDate"
                                            type="date"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label htmlFor="site_endDate" className="block text-sm font-medium text-slate-700 mb-1">Data Fine (prevista)</label>
                                        <input
                                            id="site_endDate"
                                            type="date"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="site_status" className="block text-sm font-medium text-slate-700 mb-1">Stato</label>
                                        <select
                                            id="site_status"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="planned">Pianificato</option>
                                            <option value="active">Attivo</option>
                                            <option value="completed">Completato</option>
                                            <option value="suspended">Sospeso</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label htmlFor="site_description" className="block text-sm font-medium text-slate-700 mb-1">Descrizione</label>
                                        <textarea
                                            id="site_description"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[100px]"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label htmlFor="site_contractValue" className="block text-sm font-medium text-slate-700 mb-1">Prezzo pattuito (€ IVA esclusa)</label>
                                        <input
                                            id="site_contractValue"
                                            type="text"
                                            inputMode="decimal"
                                            pattern="[0-9]*\.?[0-9]*"
                                            placeholder="0.00"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={formData.contractValue}
                                            onChange={(e) => {
                                                // Allow only numbers and decimal point
                                                const val = e.target.value.replaceAll(/[^0-9.]/g, '');
                                                setFormData({ ...formData, contractValue: val });
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-6 py-3 bg-white border-2 border-slate-900 text-slate-900 font-semibold hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        Annulla
                                    </button>
                                    {editingSite && (
                                        <button
                                            type="button"
                                            onClick={async (e) => {
                                                const confirmed = await showConfirm({
                                                    title: 'Elimina cantiere',
                                                    message: 'Eliminare questo cantiere?',
                                                    confirmText: 'Elimina',
                                                    variant: 'danger'
                                                });
                                                if (confirmed) {
                                                    handleDelete(e, editingSite.id);
                                                    resetForm();
                                                }
                                            }}
                                            className="px-6 py-3 bg-red-50 text-red-600 font-semibold hover:bg-red-100 rounded-lg transition-colors mr-auto"
                                        >
                                            Elimina
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        {editingSite ? 'Salva Modifiche' : 'Crea Cantiere'}
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
