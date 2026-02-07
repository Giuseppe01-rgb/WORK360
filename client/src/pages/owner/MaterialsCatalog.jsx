import { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/Layout';
import { colouraMaterialAPI, materialMasterAPI } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import ExcelImportModal from '../../components/owner/ExcelImportModal';
import {
    Package, Plus, Edit, Edit2, Trash2, X, CheckCircle, AlertCircle, Search,
    FileText, Upload, Info
} from 'lucide-react';

export default function MaterialsCatalog() {
    const { showSuccess, showError } = useToast();
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false); // Single modal for upload workflow
    const [invoiceModalStep, setInvoiceModalStep] = useState('upload'); // 'upload' or 'review'
    const [showExcelImportModal, setShowExcelImportModal] = useState(false);
    const [excelPreviewData, setExcelPreviewData] = useState(null);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

    // Invoice processing state
    const [isProcessing, setIsProcessing] = useState(false);
    const [parsedMaterials, setParsedMaterials] = useState([]);

    // Form state
    const [formData, setFormData] = useState({
        nome_prodotto: '',
        marca: '',
        fornitore: '',
        quantityValue: '',
        unit: 'pz',
        prezzo: ''
    });

    useEffect(() => {
        loadMaterials();
    }, []);

    const loadMaterials = async () => {
        try {
            const response = await colouraMaterialAPI.getAll();
            setMaterials(response.data);
        } catch (error) {
            showError('Errore nel caricamento del catalogo');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const [sortOrder, setSortOrder] = useState('default'); // 'default', 'price-asc', 'price-desc'

    // Computed: Filtered materials
    const filteredMaterials = useMemo(() => {
        let filtered = materials;

        // Filter logic
        if (activeFilter === 'missing-price') {
            filtered = filtered.filter(m => !m.prezzo || m.prezzo === 0);
        } else if (activeFilter === 'active') {
            filtered = filtered.filter(m => m.attivo === true);
        }
        // 'all' does no filtering

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(m =>
                (m.nome_prodotto && m.nome_prodotto.toLowerCase().includes(term)) ||
                (m.marca && m.marca.toLowerCase().includes(term)) ||
                (m.codice_prodotto && m.codice_prodotto.toLowerCase().includes(term)) ||
                (m.fornitore && m.fornitore.toLowerCase().includes(term)) ||
                (m.categoria && m.categoria.toLowerCase().includes(term))
            );
        }

        // Sorting logic
        if (sortOrder === 'price-asc') {
            filtered = [...filtered].sort((a, b) => (a.prezzo || 0) - (b.prezzo || 0));
        } else if (sortOrder === 'price-desc') {
            filtered = [...filtered].sort((a, b) => (b.prezzo || 0) - (a.prezzo || 0));
        }

        return filtered;
    }, [materials, activeFilter, searchTerm, sortOrder]);

    const resetForm = () => {
        setFormData({
            nome_prodotto: '',
            marca: '',
            fornitore: '',
            quantityValue: '',
            unit: 'pz',
            prezzo: ''
        });
        setShowAddModal(false);
        setShowEditModal(false);
        setSelectedMaterial(null);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const data = {
                nome_prodotto: formData.nome_prodotto,
                marca: formData.marca,
                fornitore: formData.fornitore,
                quantita: formData.quantityValue ? `${formData.quantityValue} ${formData.unit}` : '',
                prezzo: formData.prezzo ? Number.parseFloat(formData.prezzo) : null,
                categoria: 'Altro'
            };
            await colouraMaterialAPI.create(data);
            resetForm();
            await loadMaterials();
            showSuccess('Materiale aggiunto con successo');
        } catch (error) {
            showError(error.response?.data?.message || 'Errore nell\'aggiunta del materiale');
        }
    };

    const handleEdit = (material) => {
        setSelectedMaterial(material);

        // Try to parse quantity and unit
        let qty = '';
        let unit = 'pz'; // Default

        if (material.quantita) {
            // Regex to match number (integer or decimal) and unit, allowing optional space
            // Matches: "10 kg", "10kg", "10.5 l", "10,5l"
            const match = material.quantita.toString().match(/^([\d.,]+)\s*([a-zA-Z]+.*)?$/);

            if (match) {
                qty = match[1];
                const rawUnit = match[2] ? match[2].toLowerCase().trim() : '';

                // Map common variations to select values
                const unitMap = {
                    'lt': 'l',
                    'litri': 'l',
                    'l': 'l',
                    'kg': 'kg',
                    'kilo': 'kg',
                    'm': 'm',
                    'mt': 'm',
                    'metri': 'm',
                    'mq': 'mq',
                    'mc': 'mc',
                    'pz': 'pz',
                    'pezzi': 'pz',
                    'sacchi': 'sacchi',
                    'sacco': 'sacchi',
                    'rotoli': 'rotoli',
                    'rotolo': 'rotoli',
                    'conf': 'conf',
                    'confezione': 'conf'
                };

                unit = unitMap[rawUnit] || 'pz'; // Default to pz if unit not recognized
            } else {
                // Fallback if regex doesn't match (e.g. just a number)
                qty = material.quantita;
            }
        }

        setFormData({
            nome_prodotto: material.nome_prodotto,
            marca: material.marca || '',
            fornitore: material.fornitore || '',
            quantityValue: qty,
            unit: unit,
            prezzo: material.prezzo || ''
        });
        setShowEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const data = {
                nome_prodotto: formData.nome_prodotto,
                marca: formData.marca,
                fornitore: formData.fornitore,
                quantita: formData.quantityValue ? `${formData.quantityValue} ${formData.unit}` : '',
                prezzo: formData.prezzo ? Number.parseFloat(formData.prezzo) : null
            };
            await colouraMaterialAPI.update(selectedMaterial.id, data);
            resetForm();
            await loadMaterials();
            showSuccess('Materiale aggiornato con successo');
        } catch (error) {
            showError(error.response?.data?.message || 'Errore nell\'aggiornamento del materiale');
        }
    };

    const handleDeleteClick = (material) => {
        setSelectedMaterial(material);
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            await colouraMaterialAPI.delete(selectedMaterial.id);
            setShowDeleteConfirm(false);
            setSelectedMaterial(null);
            await loadMaterials();
            showSuccess('Materiale eliminato con successo');
        } catch (error) {
            showError('Errore nell\'eliminazione del materiale');
        }
    };

    const handleDeleteAll = async () => {
        try {
            await colouraMaterialAPI.deleteAll();
            setShowDeleteAllConfirm(false);
            await loadMaterials();
            showSuccess('Tutti i materiali sono stati eliminati');
        } catch (error) {
            showError('Errore nell\'eliminazione dei materiali');
            console.error(error);
        }
    };

    // Invoice upload handlers
    const handleUploadInvoice = async () => {
        if (!uploadedFile) {
            showError('Seleziona un file prima di continuare');
            return;
        }

        setIsProcessing(true);
        try {
            const response = await materialMasterAPI.uploadInvoice(uploadedFile);

            if (response.data.success && response.data.materials.length > 0) {
                setParsedMaterials(response.data.materials.map((m, idx) => ({ ...m, id: `temp-${idx}` })));
                // Do NOT clear uploadedFile here to avoid DOM conflict during unmount
                // It will be cleared when the modal is closed or reset

                // Switch to review step in the same modal
                setInvoiceModalStep('review');
            } else {
                showError(response.data.message || 'Nessun materiale trovato. Prova con un\'immagine più chiara');
                setUploadedFile(null);
            }
        } catch (error) {
            showError(error.response?.data?.message || 'Errore nel parsing della fattura');
            console.error('Upload error:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditParsedMaterial = (id, field, value) => {
        setParsedMaterials(prev => prev.map(m =>
            m.id === id ? { ...m, [field]: value } : m
        ));
    };

    const handleRemoveParsedMaterial = (id) => {
        setParsedMaterials(prev => prev.filter(m => m.id !== id));
    };

    const handleSaveParsedMaterials = async () => {
        if (parsedMaterials.length === 0) {
            showError('Nessun materiale da salvare');
            return;
        }

        setIsProcessing(true);
        try {
            let savedCount = 0;
            let errorCount = 0;

            for (const material of parsedMaterials) {
                try {
                    await colouraMaterialAPI.create({
                        displayName: material.displayName,
                        supplier: material.supplier,
                        unit: material.unit,
                        price: material.price || null
                    });
                    savedCount++;
                } catch (error) {
                    console.error('Error saving material:', material.displayName, error);
                    errorCount++;
                }
            }

            // 1. Update main list while modal is still open (background update)
            await loadMaterials();

            // 2. Show success message
            if (errorCount === 0) {
                showSuccess(`${savedCount} materiali salvati nel catalogo!`);
            } else {
                showSuccess(`${savedCount} materiali salvati, ${errorCount} errori`);
            }

            // 3. Close modal and reset state after a short delay to allow UI to settle
            // IMPORTANT: We do NOT set isProcessing(false) here. We want the button to stay in "Saving..." state
            // until the modal unmounts to avoid the "removeChild" error caused by switching button content right before unmount.
            setTimeout(() => {
                setShowInvoiceModal(false);
                // Reset internal state after modal is closed
                setTimeout(() => {
                    setIsProcessing(false); // Reset processing state only after modal is gone
                    setInvoiceModalStep('upload');
                    setParsedMaterials([]);
                }, 300);
            }, 100);

        } catch (error) {
            showError('Errore nel salvataggio dei materiali');
            setIsProcessing(false);
        }
    };

    const formatPrice = (price) => {
        if (!price && price !== 0) return '-';
        return `€ ${price.toFixed(2)}`;
    };

    if (loading) {
        return (
            <Layout title="Catalogo Materiali">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Catalogo Materiali">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <p className="text-slate-500">Gestisci il catalogo materiali della tua azienda</p>
                        <p className="text-sm text-slate-400 mt-1">
                            {materials.length} materiali totali
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3 w-full md:w-auto">
                        <button
                            onClick={() => setShowExcelImportModal(true)}
                            className="px-4 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                        >
                            <FileText className="w-5 h-5" />
                            Importa Excel
                        </button>
                        {materials.length > 0 && (
                            <button
                                onClick={() => setShowDeleteAllConfirm(true)}
                                className="px-4 py-2.5 bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200 transition-all flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                            >
                                <Trash2 className="w-5 h-5" />
                                Elimina Tutto
                            </button>
                        )}
                        <button
                            onClick={() => setShowInvoiceModal(true)}
                            className="px-4 py-2.5 bg-white border-2 border-slate-900 text-slate-900 font-semibold rounded-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                        >
                            <Upload className="w-5 h-5" />
                            Carica Fattura
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 text-sm whitespace-nowrap"
                        >
                            <Plus className="w-5 h-5" />
                            Nuovo Materiale
                        </button>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Filter Tabs */}
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveFilter('all')}
                            className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${activeFilter === 'all'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            Tutti
                        </button>
                        <button
                            onClick={() => setActiveFilter('missing-price')}
                            className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${activeFilter === 'missing-price'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            Prezzo Mancante
                        </button>
                    </div>

                    {/* Sort Buttons */}
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setSortOrder(prev => prev === 'price-asc' ? 'default' : 'price-asc')}
                            className={`px-3 py-2 rounded-md font-medium text-sm transition-all flex items-center gap-1 ${sortOrder === 'price-asc'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                            title="Prezzo Crescente"
                        >
                            <span className="text-xs">€</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up"><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>
                        </button>
                        <button
                            onClick={() => setSortOrder(prev => prev === 'price-desc' ? 'default' : 'price-desc')}
                            className={`px-3 py-2 rounded-md font-medium text-sm transition-all flex items-center gap-1 ${sortOrder === 'price-desc'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                            title="Prezzo Decrescente"
                        >
                            <span className="text-xs">€</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-down"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            aria-label="Cerca materiale"
                            type="text"
                            placeholder="Cerca materiale o fornitore..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Materials List - Desktop Table */}
            <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-6 py-4 text-sm font-bold text-slate-900">Codice</th>
                            <th className="text-left px-6 py-4 text-sm font-bold text-slate-900">Prodotto</th>
                            <th className="text-left px-6 py-4 text-sm font-bold text-slate-900">Marca</th>
                            <th className="text-left px-6 py-4 text-sm font-bold text-slate-900">Quantità</th>
                            <th className="text-left px-6 py-4 text-sm font-bold text-slate-900">Prezzo</th>
                            <th className="text-left px-6 py-4 text-sm font-bold text-slate-900">Fornitore</th>
                            <th className="text-left px-6 py-4 text-sm font-bold text-slate-900">Categoria</th>
                            <th className="text-right px-6 py-4 text-sm font-bold text-slate-900">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMaterials.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-16 text-center">
                                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500">
                                        {searchTerm || activeFilter !== 'all'
                                            ? 'Nessun materiale trovato'
                                            : 'Nessun materiale nel catalogo'}
                                    </p>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Aggiungi il tuo primo materiale per iniziare
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            filteredMaterials.map((material) => (
                                <tr key={material.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                            {material.codice_prodotto || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-900">{material.nome_prodotto}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {material.marca}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {material.quantita || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {!material.prezzo ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 text-sm font-medium rounded-md">
                                                <AlertCircle className="w-4 h-4" />
                                                Mancante
                                            </span>
                                        ) : (
                                            <span className="font-semibold text-slate-900">
                                                {formatPrice(material.prezzo)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {material.fornitore || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                                            {material.categoria}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(material)}
                                                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(material)}
                                                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Materials List - Mobile Cards */}
            <div className="md:hidden space-y-4">
                {filteredMaterials.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-12 text-center">
                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">
                            {searchTerm || activeFilter !== 'all'
                                ? 'Nessun materiale trovato'
                                : 'Nessun materiale nel catalogo'}
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                            Aggiungi il tuo primo materiale per iniziare
                        </p>
                    </div>
                ) : (
                    filteredMaterials.map((material) => (
                        <div key={material.id} className="bg-white rounded-[2.5rem] p-6 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                            {material.codiceProdotto || '-'}
                                        </span>
                                        <span className="text-xs text-slate-400">{material.categoria}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">{material.nome_prodotto}</h3>
                                    <p className="text-sm text-slate-600">
                                        {material.marca} {material.fornitore && <span className="text-slate-400">• {material.fornitore}</span>}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(material)}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(material)}
                                        className="p-2 hover:bg-red-50 rounded-lg text-red-400"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                <span className="text-sm text-slate-500">
                                    Quantità: <span className="font-semibold text-slate-900">{material.quantita || '-'}</span>
                                </span>
                                {!material.prezzo ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 text-sm font-medium rounded-md">
                                        <AlertCircle className="w-4 h-4" />
                                        Prezzo Mancante
                                    </span>
                                ) : (
                                    <span className="text-lg font-bold text-slate-900">
                                        {formatPrice(material.prezzo)}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Material Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-4 md:p-4 overflow-y-auto" onClick={() => setShowAddModal(false)}>
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-900">Aggiungi Materiale</h2>
                                <button
                                    onClick={resetForm}
                                    aria-label="Chiudi"
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleAdd} className="p-6 space-y-4">
                            <div>
                                <label htmlFor="add_nome_prodotto" className="block text-sm font-bold text-slate-900 mb-1.5">Nome Materiale *</label>
                                <input
                                    id="add_nome_prodotto"
                                    type="text"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    value={formData.nome_prodotto}
                                    onChange={(e) => setFormData({ ...formData, nome_prodotto: e.target.value })}
                                    required
                                    placeholder="es. Nastro adesivo 48mm"
                                />
                            </div>
                            <div>
                                <label htmlFor="add_marca" className="block text-sm font-bold text-slate-900 mb-1.5">Marca *</label>
                                <input
                                    id="add_marca"
                                    type="text"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    value={formData.marca}
                                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                                    required
                                    placeholder="es. 3M"
                                />
                            </div>
                            <div>
                                <label htmlFor="add_fornitore" className="block text-sm font-bold text-slate-900 mb-1.5">Fornitore</label>
                                <input
                                    id="add_fornitore"
                                    type="text"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    value={formData.fornitore}
                                    onChange={(e) => setFormData({ ...formData, fornitore: e.target.value })}
                                    placeholder="es. Ferramenta Rossi"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="add_quantityValue" className="block text-sm font-bold text-slate-900 mb-1.5">Quantità</label>
                                    <input
                                        id="add_quantityValue"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                        value={formData.quantityValue}
                                        onChange={(e) => setFormData({ ...formData, quantityValue: e.target.value })}
                                        placeholder="es. 10"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="add_unit" className="block text-sm font-bold text-slate-900 mb-1.5">Unità</label>
                                    <select
                                        id="add_unit"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    >
                                        <option value="pz">Pezzi (pz)</option>
                                        <option value="kg">Kg</option>
                                        <option value="l">Litri (l)</option>
                                        <option value="m">Metri (m)</option>
                                        <option value="mq">Mq</option>
                                        <option value="mc">Mc</option>
                                        <option value="sacchi">Sacchi</option>
                                        <option value="rotoli">Rotoli</option>
                                        <option value="conf">Conf.</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="add_prezzo" className="block text-sm font-bold text-slate-900 mb-1.5">Prezzo Unitario (€)</label>
                                <input
                                    id="add_prezzo"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    value={formData.prezzo}
                                    onChange={(e) => setFormData({ ...formData, prezzo: e.target.value })}
                                    placeholder="es. 2.50"
                                />
                            </div>
                            <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex-1 px-6 py-3 bg-white border-2 border-slate-900 text-slate-900 font-semibold hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    Aggiungi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Material Modal */}
            {showEditModal && selectedMaterial && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-4 md:p-4 overflow-y-auto" onClick={() => setShowEditModal(false)}>
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-900">Modifica Materiale</h2>
                                <button
                                    onClick={resetForm}
                                    aria-label="Chiudi"
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleUpdate} className="p-6 space-y-4">
                            <div>
                                <label htmlFor="edit_nome_prodotto" className="block text-sm font-bold text-slate-900 mb-1.5">Nome Materiale *</label>
                                <input
                                    id="edit_nome_prodotto"
                                    type="text"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    value={formData.nome_prodotto}
                                    onChange={(e) => setFormData({ ...formData, nome_prodotto: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="edit_marca" className="block text-sm font-bold text-slate-900 mb-1.5">Marca *</label>
                                <input
                                    id="edit_marca"
                                    type="text"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    value={formData.marca}
                                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="edit_fornitore" className="block text-sm font-bold text-slate-900 mb-1.5">Fornitore</label>
                                <input
                                    id="edit_fornitore"
                                    type="text"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    value={formData.fornitore}
                                    onChange={(e) => setFormData({ ...formData, fornitore: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="edit_quantityValue" className="block text-sm font-bold text-slate-900 mb-1.5">Quantità</label>
                                    <input
                                        id="edit_quantityValue"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                        value={formData.quantityValue}
                                        onChange={(e) => setFormData({ ...formData, quantityValue: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="edit_unit" className="block text-sm font-bold text-slate-900 mb-1.5">Unità</label>
                                    <select
                                        id="edit_unit"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    >
                                        <option value="pz">Pezzi (pz)</option>
                                        <option value="kg">Kg</option>
                                        <option value="l">Litri (l)</option>
                                        <option value="m">Metri (m)</option>
                                        <option value="mq">Mq</option>
                                        <option value="mc">Mc</option>
                                        <option value="sacchi">Sacchi</option>
                                        <option value="rotoli">Rotoli</option>
                                        <option value="conf">Conf.</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="edit_prezzo" className="block text-sm font-bold text-slate-900 mb-1.5">Prezzo Unitario (€)</label>
                                <input
                                    id="edit_prezzo"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    value={formData.prezzo}
                                    onChange={(e) => setFormData({ ...formData, prezzo: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex-1 px-6 py-3 bg-white border-2 border-slate-900 text-slate-900 font-semibold hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    Salva
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete All Confirmation Modal */}
            {showDeleteAllConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Eliminare tutto il catalogo?</h2>
                            <p className="text-slate-600 mb-6">
                                Stai per eliminare <strong>{materials.length} materiali</strong>.
                                Questa azione non può essere annullata. Sei sicuro di voler procedere?
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setShowDeleteAllConfirm(false)}
                                    className="flex-1 px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleDeleteAll}
                                    className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
                                >
                                    Elimina Tutto
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Unified Invoice Modal - Upload and Review in one modal */}
            {showInvoiceModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={`bg-white rounded-[2.5rem] shadow-2xl ${invoiceModalStep === 'review' ? 'w-full max-w-6xl max-h-[90vh] flex flex-col' : 'w-full max-w-2xl'}`}>
                        {/* STEP 1: Upload */}
                        {invoiceModalStep === 'upload' && (
                            <div key="upload-step" className="h-full flex flex-col">
                                <div className="p-6 border-b border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-xl font-bold text-slate-900">Carica Fattura</h2>
                                        <button
                                            onClick={() => {
                                                setShowInvoiceModal(false);
                                                setUploadedFile(null);
                                                setInvoiceModalStep('upload');
                                            }}
                                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                        >
                                            <X className="w-5 h-5 text-slate-500" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4 md:p-6 overflow-y-auto flex-1">
                                    {/* File Upload Area */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-bold text-slate-900 mb-3">Seleziona file fattura *</label>
                                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-slate-400 transition-colors">
                                            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                                            <p className="text-slate-600 font-medium mb-2">Trascina il file qui o clicca per selezionare</p>
                                            <p className="text-sm text-slate-400 mb-4">Formati supportati: PDF, PNG, JPG (max 10MB)</p>
                                            <input
                                                type="file"
                                                accept=".pdf,.png,.jpg,.jpeg"
                                                onChange={(e) => setUploadedFile(e.target.files[0])}
                                                className="hidden"
                                                id="invoice-upload"
                                            />
                                            <label
                                                htmlFor="invoice-upload"
                                                className="inline-block px-6 py-3 bg-slate-100 text-slate-900 font-semibold rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                                            >
                                                Seleziona File
                                            </label>
                                        </div>
                                        {uploadedFile && (
                                            <div className="mt-4 p-4 bg-slate-50 rounded-lg flex items-center gap-3">
                                                <FileText className="w-5 h-5 text-slate-600" />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-slate-900">{uploadedFile.name}</p>
                                                    <p className="text-sm text-slate-500">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                                <button
                                                    onClick={() => setUploadedFile(null)}
                                                    className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info Alert */}
                                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm text-blue-800">
                                            <p className="font-semibold mb-1">OCR con Tesseract.js</p>
                                            <p>I materiali vengono estratti automaticamente dalla fattura. Potrai rivederli e modificarli prima di salvarli nel catalogo.</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                setShowInvoiceModal(false);
                                                setUploadedFile(null);
                                                setInvoiceModalStep('upload');
                                            }}
                                            disabled={isProcessing}
                                            className="flex-1 px-6 py-3 bg-white border-2 border-slate-900 text-slate-900 font-semibold hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Annulla
                                        </button>
                                        <button
                                            onClick={handleUploadInvoice}
                                            disabled={!uploadedFile || isProcessing}
                                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {isProcessing ? (
                                                <span key="processing" className="flex items-center gap-2">
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Analisi in corso...
                                                </span>
                                            ) : (
                                                <span key="idle" className="flex items-center gap-2">
                                                    <Upload className="w-5 h-5" />
                                                    Carica e Analizza
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Review */}
                        {invoiceModalStep === 'review' && parsedMaterials.length > 0 && (
                            <div key="review-step" className="h-full flex flex-col">
                                <div className="p-6 border-b border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900">Rivedi Materiali Estratti</h2>
                                            <p className="text-sm text-slate-500 mt-1">{parsedMaterials.length} materiali trovati - modifica e conferma</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setShowInvoiceModal(false);
                                                setInvoiceModalStep('upload');
                                                setParsedMaterials([]);
                                            }}
                                            disabled={isProcessing}
                                            className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
                                        >
                                            <X className="w-5 h-5 text-slate-500" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 overflow-auto flex-1">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-900">Materiale</th>
                                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-900">Fornitore</th>
                                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-900 w-24">Quantità</th>
                                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-900 w-32">Unità</th>
                                                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-900 w-32">Prezzo (€)</th>
                                                    <th className="text-center px-4 py-3 text-sm font-bold text-slate-900 w-20">Azioni</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {parsedMaterials.map((material) => (
                                                    <tr key={material.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="text"
                                                                value={material.displayName}
                                                                onChange={(e) => handleEditParsedMaterial(material.id, 'displayName', e.target.value)}
                                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="text"
                                                                value={material.supplier || ''}
                                                                onChange={(e) => handleEditParsedMaterial(material.id, 'supplier', e.target.value)}
                                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={material.quantity || ''}
                                                                onChange={(e) => handleEditParsedMaterial(material.id, 'quantity', parseFloat(e.target.value))}
                                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <select
                                                                value={material.unit}
                                                                onChange={(e) => handleEditParsedMaterial(material.id, 'unit', e.target.value)}
                                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                            >
                                                                <option value="pz">pz</option>
                                                                <option value="kg">kg</option>
                                                                <option value="l">l</option>
                                                                <option value="m">m</option>
                                                                <option value="mq">mq</option>
                                                                <option value="mc">mc</option>
                                                                <option value="sacchi">sacchi</option>
                                                                <option value="rotoli">rotoli</option>
                                                                <option value="taniche">taniche</option>
                                                                <option value="cartucce">cartucce</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={material.price || ''}
                                                                onChange={(e) => handleEditParsedMaterial(material.id, 'price', e.target.value ? parseFloat(e.target.value) : null)}
                                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                                placeholder="Opzionale"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                onClick={() => handleRemoveParsedMaterial(material.id)}
                                                                className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                                                                title="Rimuovi"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="p-6 border-t border-slate-100">
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                setShowInvoiceModal(false);
                                                setInvoiceModalStep('upload');
                                                setParsedMaterials([]);
                                            }}
                                            disabled={isProcessing}
                                            className="flex-1 px-6 py-3 bg-white border-2 border-slate-900 text-slate-900 font-semibold hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-50"
                                        >
                                            Annulla
                                        </button>
                                        <button
                                            onClick={handleSaveParsedMaterials}
                                            disabled={isProcessing || parsedMaterials.length === 0}
                                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isProcessing ? (
                                                <span key="saving" className="flex items-center gap-2">
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Salvataggio...
                                                </span>
                                            ) : (
                                                <span key="save" className="flex items-center gap-2">
                                                    <CheckCircle className="w-5 h-5" />
                                                    Salva {parsedMaterials.length} Materiali
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && selectedMaterial && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-6 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Elimina Materiale</h2>
                        <p className="text-slate-500 mb-6">
                            Sei sicuro di voler eliminare <strong>{selectedMaterial.displayName}</strong>?<br />
                            Questa azione non può essere annullata.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setSelectedMaterial(null);
                                }}
                                className="flex-1 px-6 py-3 bg-white border-2 border-slate-900 text-slate-900 font-semibold hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
                            >
                                Elimina
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Excel Import Modal */}
            {showExcelImportModal && (
                <ExcelImportModal
                    onClose={() => setShowExcelImportModal(false)}
                    onImport={() => {
                        loadMaterials();
                        setShowExcelImportModal(false);
                    }}
                />
            )}
        </Layout>
    );
}
