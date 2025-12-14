import { useState, useEffect } from 'react';
import { CheckCircle, X, Link as LinkIcon, XCircle, Image, Package, AlertCircle, Loader2 } from 'lucide-react';
import Layout from '../../components/Layout';
import { reportedMaterialAPI, colouraMaterialAPI } from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const MaterialApproval = () => {
    const { showSuccess, showError } = useToast();
    const [reportedMaterials, setReportedMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [catalogMaterials, setCatalogMaterials] = useState([]);
    const [filter, setFilter] = useState('da_approvare'); // da_approvare, approvato, rifiutato

    useEffect(() => {
        loadReportedMaterials();
        loadCatalogMaterials();
    }, [filter]);

    const loadReportedMaterials = async () => {
        setLoading(true);
        try {
            const response = await reportedMaterialAPI.getAll({ stato: filter });
            setReportedMaterials(response.data);
        } catch (error) {
            console.error('Error loading reported materials:', error);
            showError('Errore nel caricamento delle segnalazioni');
        } finally {
            setLoading(false);
        }
    };

    const loadCatalogMaterials = async () => {
        try {
            const response = await colouraMaterialAPI.getAll();
            setCatalogMaterials(response.data);
        } catch (error) {
            console.error('Error loading catalog:', error);
        }
    };

    const handleApprove = (report) => {
        setSelectedReport(report);
        setShowApproveModal(true);
    };

    const handleLinkToExisting = (report) => {
        setSelectedReport(report);
        setShowLinkModal(true);
    };

    const handleReject = async (report) => {
        const note = prompt('Motivo del rifiuto (opzionale):');
        if (note === null) return; // User cancelled

        try {
            await reportedMaterialAPI.reject(report.id, {
                noteApprovazione: note || 'Segnalazione non valida'
            });
            showSuccess('Segnalazione rifiutata');
            loadReportedMaterials();
        } catch (error) {
            console.error('Error rejecting:', error);
            showError('Errore nel rifiuto');
        }
    };

    const pendingCount = reportedMaterials.filter(r => r.stato === 'da_approvare').length;

    return (
        <Layout title="Materiali da Approvare">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Materiali Segnalati</h2>
                    <p className="text-slate-600">Rivedi e approva i nuovi materiali segnalati dagli operai</p>
                </div>

                {/* Stats + Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-amber-600 font-medium">Da approvare</p>
                                <p className="text-3xl font-bold text-amber-900">{pendingCount}</p>
                            </div>
                            <AlertCircle className="w-12 h-12 text-amber-400" />
                        </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 font-medium">Catalogo tot.</p>
                                <p className="text-3xl font-bold text-blue-900">{catalogMaterials.length}</p>
                            </div>
                            <Package className="w-12 h-12 text-blue-400" />
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="md:col-span-2 flex gap-2">
                        <button
                            onClick={() => setFilter('da_approvare')}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${filter === 'da_approvare'
                                ? 'bg-amber-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            In Attesa
                        </button>
                        <button
                            onClick={() => setFilter('approvato')}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${filter === 'approvato'
                                ? 'bg-green-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            Approvati
                        </button>
                        <button
                            onClick={() => setFilter('rifiutato')}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${filter === 'rifiutato'
                                ? 'bg-red-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            Rifiutati
                        </button>
                    </div>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    </div>
                ) : reportedMaterials.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                            {filter === 'da_approvare' ? 'Tutto approvato!' : 'Nessun risultato'}
                        </h3>
                        <p className="text-slate-600">
                            {filter === 'da_approvare'
                                ? 'Non ci sono segnalazioni in attesa'
                                : `Nessun materiale ${filter}`}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {reportedMaterials.map(report => (
                            <div key={report.id} className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                {/* Mobile: Stack vertically, Desktop: Side by side */}
                                <div className="flex flex-col md:flex-row">
                                    {/* Photo Section */}
                                    <div
                                        className="relative md:w-48 h-48 md:h-auto flex-shrink-0 cursor-pointer group"
                                        onClick={() => window.open(report.fotoUrl, '_blank')}
                                    >
                                        <img
                                            src={report.fotoUrl}
                                            alt="Foto etichetta"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <Image className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="flex-1 p-5">
                                        {/* Header: Name + Status */}
                                        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-bold text-slate-900 truncate">
                                                    {report.nomeDigitato || 'Nome non specificato'}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    {getStatusBadge(report.stato)}
                                                    {report.categoriaDigitata && (
                                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                                                            {report.categoriaDigitata}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Info Grid */}
                                        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                                            <div className="bg-slate-50 rounded-lg p-3">
                                                <p className="text-slate-500 text-xs uppercase tracking-wide">Quantità</p>
                                                <p className="font-bold text-slate-900 text-lg">{report.numeroConfezioni} <span className="text-sm font-normal text-slate-500">pz</span></p>
                                            </div>
                                            <div className="bg-slate-50 rounded-lg p-3">
                                                <p className="text-slate-500 text-xs uppercase tracking-wide">Cantiere</p>
                                                <p className="font-semibold text-slate-900 truncate">{report.site?.name || 'N/D'}</p>
                                            </div>
                                        </div>

                                        {/* Meta info */}
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                                            <span className="inline-flex items-center gap-1">
                                                👤 {report.user?.firstName} {report.user?.lastName}
                                            </span>
                                            <span>•</span>
                                            <span>
                                                📅 {new Date(report.dataOra).toLocaleDateString('it-IT')}
                                            </span>
                                        </div>

                                        {/* Notes if any */}
                                        {report.noteApprovazione && (
                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
                                                <strong>Note:</strong> {report.noteApprovazione}
                                            </div>
                                        )}

                                        {/* Linked indicator */}
                                        {report.materialeIdDefinitivo && (
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700 flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4" />
                                                Collegato al catalogo
                                            </div>
                                        )}

                                        {/* Action Buttons - only for pending */}
                                        {report.stato === 'da_approvare' && (
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <button
                                                    onClick={() => handleApprove(report)}
                                                    className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                    <span>Crea Nuovo</span>
                                                </button>
                                                <button
                                                    onClick={() => handleLinkToExisting(report)}
                                                    className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                                                >
                                                    <LinkIcon className="w-5 h-5" />
                                                    <span>Collega</span>
                                                </button>
                                                <button
                                                    onClick={() => handleReject(report)}
                                                    className="py-3 px-4 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-all flex items-center justify-center gap-2 border border-red-200"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                    <span className="sm:hidden">Rifiuta</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Approve Modal (Create New Material) */}
                {showApproveModal && selectedReport && (
                    <ApproveModal
                        report={selectedReport}
                        onClose={() => {
                            setShowApproveModal(false);
                            setSelectedReport(null);
                        }}
                        onSuccess={() => {
                            setShowApproveModal(false);
                            setSelectedReport(null);
                            loadReportedMaterials();
                            loadCatalogMaterials();
                        }}
                    />
                )}

                {/* Link Modal */}
                {showLinkModal && selectedReport && (
                    <LinkModal
                        report={selectedReport}
                        catalogMaterials={catalogMaterials}
                        onClose={() => {
                            setShowLinkModal(false);
                            setSelectedReport(null);
                        }}
                        onSuccess={() => {
                            setShowLinkModal(false);
                            setSelectedReport(null);
                            loadReportedMaterials();
                        }}
                    />
                )}
            </div>
        </Layout>
    );
};

// Helper function for status badges
const getStatusBadge = (stato) => {
    switch (stato) {
        case 'da_approvare':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                    ⏳ In attesa
                </span>
            );
        case 'approvato':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                    ✓ Approvato
                </span>
            );
        case 'rifiutato':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                    ✗ Rifiutato
                </span>
            );
        default:
            return null;
    }
};

// Approve Modal Component (Create New Material)
const ApproveModal = ({ report, onClose, onSuccess }) => {
    const { showSuccess, showError } = useToast();
    const [formData, setFormData] = useState({
        codice_prodotto: report.codiceLetto || '',
        nome_prodotto: report.nomeDigitato || '',
        marca: '',
        quantita: '',  // es. "14 lt"
        prezzo: '',
        fornitore: '',
        categoria: report.categoriaDigitata || 'Altro'
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await reportedMaterialAPI.approveAndCreateNew(report.id, {
                materialeData: formData
            });
            showSuccess('Materiale approvato e aggiunto al catalogo!');
            onSuccess();
        } catch (error) {
            console.error('Approve error:', error);
            showError(error.response?.data?.message || 'Errore nell\'approvazione');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold">Crea Nuovo Materiale</h3>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Codice Prodotto</label>
                            <input
                                type="text"
                                value={formData.codice_prodotto}
                                onChange={(e) => setFormData({ ...formData, codice_prodotto: e.target.value.toUpperCase() })}
                                className="w-full px-4 py-2 border rounded-lg uppercase"
                                placeholder="ARV225A"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Nome Prodotto *</label>
                            <input
                                type="text"
                                value={formData.nome_prodotto}
                                onChange={(e) => setFormData({ ...formData, nome_prodotto: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Marca *</label>
                            <input
                                type="text"
                                value={formData.marca}
                                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Categoria *</label>
                            <select
                                value={formData.categoria}
                                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                            >
                                <option>Pittura interna</option>
                                <option>Pittura esterna</option>
                                <option>Stucco</option>
                                <option>Primer</option>
                                <option>Rasante</option>
                                <option>Altro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Quantità (es. "14 lt", "375 ml")</label>
                            <input
                                type="text"
                                value={formData.quantita}
                                onChange={(e) => setFormData({ ...formData, quantita: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="14 lt"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Prezzo (€)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.prezzo}
                                onChange={(e) => setFormData({ ...formData, prezzo: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="Opzionale"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold mb-2">Fornitore</label>
                            <input
                                type="text"
                                value={formData.fornitore}
                                onChange={(e) => setFormData({ ...formData, fornitore: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="Nome fornitore"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 py-3 bg-slate-100 font-bold rounded-xl hover:bg-slate-200 disabled:opacity-50"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50"
                        >
                            {loading ? 'Salvataggio...' : 'Approva e Crea'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Link Modal Component
const LinkModal = ({ report, catalogMaterials, onClose, onSuccess }) => {
    const { showSuccess, showError } = useToast();
    const [selectedMaterialId, setSelectedMaterialId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const filteredMaterials = catalogMaterials.filter(m =>
        (m.nome_prodotto?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (m.marca?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (m.codice_prodotto?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
    );

    const handleLink = async () => {
        if (!selectedMaterialId) return;

        setLoading(true);
        try {
            await reportedMaterialAPI.approveAndAssociate(report.id, {
                materialId: selectedMaterialId
            });
            showSuccess('Segnalazione collegata al materiale esistente!');
            onSuccess();
        } catch (error) {
            console.error('Link error:', error);
            showError('Errore nel collegamento');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold">Collega a Materiale Esistente</h3>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    <input
                        type="text"
                        placeholder="Cerca nel catalogo..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full mt-4 px-4 py-2 border rounded-lg"
                        autoFocus
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-2">
                        {filteredMaterials.map(material => (
                            <button
                                key={material.id}
                                onClick={() => setSelectedMaterialId(material.id)}
                                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${selectedMaterialId === material.id
                                    ? 'border-blue-600 bg-blue-50'
                                    : 'border-slate-200 hover:border-blue-300'
                                    }`}
                            >
                                <p className="font-bold text-lg">{material.nome_prodotto}</p>
                                <div className="flex gap-2 mt-1 text-sm text-slate-600">
                                    <span>{material.marca}</span>
                                    {material.categoria && (
                                        <>
                                            <span>•</span>
                                            <span>{material.categoria}</span>
                                        </>
                                    )}
                                    {material.quantita && (
                                        <>
                                            <span>•</span>
                                            <span className="font-medium">{material.quantita}</span>
                                        </>
                                    )}
                                    {material.codice_prodotto && (
                                        <>
                                            <span>•</span>
                                            <span className="font-mono">{material.codice_prodotto}</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        ))}
                        {filteredMaterials.length === 0 && (
                            <div className="text-center py-12 text-slate-500">
                                Nessun materiale trovato
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-200">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 py-3 bg-slate-100 font-bold rounded-xl hover:bg-slate-200 disabled:opacity-50"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleLink}
                            disabled={!selectedMaterialId || loading}
                            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Collegamento...' : 'Collega Materiale'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaterialApproval;
