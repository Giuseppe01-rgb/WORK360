import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { siteAPI, analyticsAPI } from '../../utils/api';
import {
    Building2, MapPin, Calendar, Clock, Package, Users,
    Edit, Trash2, Plus, X, ArrowLeft, CheckCircle, AlertCircle, Search,
    FileText, Camera
} from 'lucide-react';

const SiteDetails = ({ site, onBack }) => {
    const [report, setReport] = useState(null);
    const [employeeHours, setEmployeeHours] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('data');

    const sections = [
        { id: 'data', label: 'Dati' },
        { id: 'reports', label: 'Rapporti giornalieri' },
        { id: 'notes', label: 'Note' },
        { id: 'photos', label: 'Foto' }
    ];

    useEffect(() => {
        const loadDetails = async () => {
            try {
                const [rep, hours] = await Promise.all([
                    analyticsAPI.getSiteReport(site._id),
                    analyticsAPI.getHoursPerEmployee({ siteId: site._id })
                ]);
                setReport(rep.data);
                setEmployeeHours(hours.data);
            } catch (err) {
                console.error("Error loading site details:", err);
            } finally {
                setLoading(false);
            }
        };
        loadDetails();
    }, [site]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">{site.name}</h2>
                    <div className="flex items-center gap-2 text-slate-500">
                        <MapPin className="w-4 h-4" />
                        <span>{site.address}</span>
                    </div>
                </div>
            </div>

            {/* Desktop Tabs */}
            <div className="hidden md:flex border-b border-slate-200 mb-6">
                {sections.map(section => (
                    <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`px-6 py-3 font-semibold transition-colors ${activeSection === section.id
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        {section.label}
                    </button>
                ))}
            </div>

            {/* Mobile Selector */}
            <div className="md:hidden mb-6">
                <select
                    value={activeSection}
                    onChange={(e) => setActiveSection(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                    {sections.map(section => (
                        <option key={section.id} value={section.id}>
                            {section.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Content - Dati Section */}
            {activeSection === 'data' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-50 p-6 rounded-2xl">
                            <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Ore Totali
                            </h3>
                            <p className="text-3xl font-bold text-slate-900">
                                {report?.totalHours?.toFixed(2) || '0.00'} <span className="text-lg font-normal text-slate-500">h</span>
                            </p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl">
                            <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                                <Package className="w-4 h-4" /> Materiali
                            </h3>
                            <p className="text-3xl font-bold text-slate-900">
                                {report?.materials?.length || 0} <span className="text-lg font-normal text-slate-500">tipi</span>
                            </p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl">
                            <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                                <Users className="w-4 h-4" /> Dipendenti
                            </h3>
                            <p className="text-3xl font-bold text-slate-900">
                                {employeeHours?.length || 0}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Users className="w-5 h-5 text-slate-400" />
                                Ore per Dipendente
                            </h3>
                            {employeeHours.length > 0 ? (
                                <div className="space-y-3">
                                    {employeeHours.map((emp) => (
                                        <div key={emp._id._id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                            <span className="font-medium text-slate-700">{emp._id.firstName} {emp._id.lastName}</span>
                                            <span className="font-bold text-slate-900">{emp.totalHours.toFixed(2)} h</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-400 italic">Nessuna ora registrata.</p>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Package className="w-5 h-5 text-slate-400" />
                                Materiali Utilizzati
                            </h3>
                            {report?.materials?.length > 0 ? (
                                <div className="space-y-3">
                                    {report.materials.map((mat) => (
                                        <div key={mat._id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                            <span className="font-medium text-slate-700">{mat._id}</span>
                                            <span className="font-bold text-slate-900">{mat.totalQuantity} {mat.unit}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-400 italic">Nessun materiale registrato.</p>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Content - Rapporti giornalieri */}
            {activeSection === 'reports' && (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm animate-in fade-in duration-200">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Rapporti Giornalieri</h3>
                    <p className="text-slate-500">Nessun rapporto giornaliero registrato per questo cantiere.</p>
                </div>
            )}

            {/* Content - Note */}
            {activeSection === 'notes' && (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm animate-in fade-in duration-200">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Note</h3>
                    <p className="text-slate-500">Nessuna nota disponibile per questo cantiere.</p>
                </div>
            )}

            {/* Content - Foto */}
            {activeSection === 'photos' && (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm animate-in fade-in duration-200">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Camera className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Foto</h3>
                    <p className="text-slate-500">Nessuna foto caricata per questo cantiere.</p>
                </div>
            )}
        </div>
    );
};

export default function SiteManagement() {
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
        status: 'planned'
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
                await siteAPI.update(editingSite._id, formData);
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
            status: site.status
        });
        setShowModal(true);
    };

    const handleDelete = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm('Sei sicuro di voler eliminare questo cantiere?')) return;

        try {
            await siteAPI.delete(id);
            showNotification('success', 'Cantiere eliminato!');
            loadSites();
        } catch (error) {
            showNotification('error', 'Errore nell\'eliminazione');
        }
    };

    const resetForm = () => {
        setFormData({ name: '', address: '', description: '', startDate: '', endDate: '', status: 'planned' });
        setEditingSite(null);
        setShowModal(false);
    };

    // Calculate stats
    const totalSites = sites.length;
    const activeSites = sites.filter(s => s.status === 'active' || s.status === 'planned').length;
    const archivedSites = sites.filter(s => s.status === 'completed' || s.status === 'suspended').length;

    if (selectedSite) {
        return (
            <Layout title="Dettagli Cantiere">
                <SiteDetails site={selectedSite} onBack={() => setSelectedSite(null)} />
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
        <Layout title="Gestione Cantieri">
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
                        placeholder="Cerca cantiere..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    Nuovo Cantiere
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 mb-1">Tutti i Cantieri</p>
                        <p className="text-3xl font-bold text-slate-900">{totalSites}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <Building2 className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 mb-1">In Corso</p>
                        <p className="text-3xl font-bold text-orange-600">{activeSites}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 mb-1">Archiviati</p>
                        <p className="text-3xl font-bold text-green-600">{archivedSites}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Sites List */}
            <div className="grid gap-4">
                {sites.map(site => (
                    <div
                        key={site._id}
                        onClick={() => setSelectedSite(site)}
                        className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    >
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                                    {site.name}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        {site.address}
                                    </div>
                                    {site.startDate && (
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(site.startDate).toLocaleDateString('it-IT')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${site.status === 'active' ? 'bg-green-100 text-green-700' :
                                    site.status === 'planned' ? 'bg-blue-100 text-blue-700' :
                                        'bg-slate-100 text-slate-700'
                                    }`}>
                                    {site.status === 'active' ? 'In Corso' : site.status === 'planned' ? 'Pianificato' : 'Archiviato'}
                                </span>

                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => handleEdit(e, site)}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                                        title="Modifica"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(e, site._id)}
                                        className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                                        title="Elimina"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl relative">
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome Cantiere *</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Indirizzo *</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Data Inizio *</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Stato</label>
                                        <select
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrizione</label>
                                        <textarea
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[100px]"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-6 py-3 text-slate-600 font-semibold hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-8 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-all shadow-md flex items-center gap-2"
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
