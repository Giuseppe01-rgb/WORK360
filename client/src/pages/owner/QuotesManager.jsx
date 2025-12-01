import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { quoteAPI, communicationAPI, salAPI, siteAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
    Plus, Trash2, Eye, Mail, FileText,
    Edit, Download, X, CheckCircle, AlertCircle, Search,
    Percent, Euro, Building2
} from 'lucide-react';
import React from 'react';

class DebugErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded z-50 relative">
                    <h3 className="font-bold">Crash Intercettato!</h3>
                    <p>{this.state.error.toString()}</p>
                    <pre className="text-xs mt-2 overflow-auto max-h-40 bg-white p-2 border">
                        {JSON.stringify(this.props.data, null, 2)}
                    </pre>
                    <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 bg-red-600 text-white rounded">Ricarica</button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function QuotesManager() {
    const { user } = useAuth();
    const { showSuccess, showError, showWarning, showInfo } = useToast();
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showSendModal, setShowSendModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, type: null });

    // Tab State
    const [activeTab, setActiveTab] = useState('quotes'); // 'quotes' or 'sals'

    // SAL State
    const [sals, setSals] = useState([]);
    const [sites, setSites] = useState([]);
    const [showSALModal, setShowSALModal] = useState(false);
    const [showSALSendModal, setShowSALSendModal] = useState(false);
    const [selectedSALId, setSelectedSALId] = useState(null);


    // Company data from user
    const companyData = {
        name: user?.company?.name || 'Nome Azienda',
        address: user?.company?.address?.street || 'Indirizzo',
        piva: user?.company?.piva || 'P.IVA'
    };

    const [formData, setFormData] = useState({
        company: {
            name: companyData.name,
            address: companyData.address,
            piva: companyData.piva
        },
        client: {
            name: '',
            address: '',
            email: '',
            phone: ''
        },
        number: '',
        date: new Date().toISOString().split('T')[0],
        items: [{ description: '', unit: '', quantity: 1, unitPrice: 0, total: 0 }],
        vatRate: 22,
        notes: '',
        // Contract Terms
        validityDays: 30,
        paymentTerms: '',
        safetyCosts: 0,
        workDuration: '',
        legalNotes: ''
    });

    // SAL Form Data - FLATTENED TO PREVENT CRASHES
    const [salFormData, setSalFormData] = useState({
        site: '',
        number: '',
        date: new Date().toISOString().split('T')[0],
        periodStart: new Date().toISOString().split('T')[0],
        periodEnd: new Date().toISOString().split('T')[0],
        // Client flattened
        clientName: '',
        clientFiscalCode: '',
        clientAddress: '',
        clientVatNumber: '',
        workDescription: '',
        contractValue: 0,
        previousAmount: 0,
        currentAmount: 0,
        completionPercentage: 0,
        penalties: 0,
        vatRate: 22,
        // Supervisor flattened
        supervisorName: '',
        supervisorQualification: '',
        cig: '',
        cup: '',
        notes: ''
    });

    useEffect(() => {
        loadQuotes();
        if (activeTab === 'sals') {
            loadSALData();
        }
    }, [activeTab]);

    // Force re-render when items change to update total display
    const [, forceUpdate] = useState({});
    useEffect(() => {
        forceUpdate({});
    }, [formData.items]);

    // Removed showNotification - using toast context instead

    const loadQuotes = async () => {
        try {
            const response = await quoteAPI.getAll();
            setQuotes(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error loading quotes:', error);
            showError('Errore nel caricamento dei preventivi');
        } finally {
            setLoading(false);
        }
    };

    const loadSALData = async () => {
        try {
            const [salsResp, sitesResp] = await Promise.all([
                salAPI.getAll(),
                siteAPI.getAll()
            ]);
            setSals(Array.isArray(salsResp.data) ? salsResp.data : []);
            setSites(Array.isArray(sitesResp.data) ? sitesResp.data : []);
        } catch (error) {
            console.error('Error loading SAL data:', error);
            showError('Errore nel caricamento dei SAL');
        } finally {
            setLoading(false);
        }
    };

    const handleSALSubmit = async (e) => {
        e.preventDefault();
        try {
            // Reconstruct nested object for API
            const apiData = {
                ...salFormData,
                client: {
                    name: salFormData.clientName,
                    fiscalCode: salFormData.clientFiscalCode,
                    address: salFormData.clientAddress,
                    vatNumber: salFormData.clientVatNumber
                },
                workSupervisor: {
                    name: salFormData.supervisorName,
                    qualification: salFormData.supervisorQualification
                }
            };

            await salAPI.create(apiData);
            setShowSALModal(false);
            setSalFormData({
                site: '',
                number: '',
                date: new Date().toISOString().split('T')[0],
                periodStart: new Date().toISOString().split('T')[0],
                periodEnd: new Date().toISOString().split('T')[0],
                clientName: '',
                clientFiscalCode: '',
                clientAddress: '',
                clientVatNumber: '',
                workDescription: '',
                contractValue: 0,
                previousAmount: 0,
                currentAmount: 0,
                completionPercentage: 0,
                penalties: 0,
                vatRate: 22,
                supervisorName: '',
                supervisorQualification: '',
                cig: '',
                cup: '',
                notes: ''
            });
            loadSALData(); // Reload list
            showSuccess('SAL creato con successo');
        } catch (error) {
            console.error('Error creating SAL:', error);
            showError('Errore nella creazione del SAL');
        }
    };

    const handleOpenSALSendModal = (salId) => {
        setSelectedSALId(salId);
        setShowSALSendModal(true);
    };

    const handleSendSALEmail = async () => {
        if (!selectedSALId) return;

        setSending(true);
        try {
            await communicationAPI.sendEmailSAL(selectedSALId);
            showSuccess('Email inviata con successo');
            setShowSALSendModal(false);
            setSelectedSALId(null);
        } catch (error) {
            console.error('Error sending SAL email:', error);
            showError('Errore nell\'invio dell\'email');
        } finally {
            setSending(false);
        }
    };


    const downloadSALPDF = async (salId) => {
        try {
            const response = await salAPI.downloadPDF(salId);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `sal-${salId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading SAL PDF:', error);
            showError('Errore nel download del PDF');
        }
    };

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { description: '', unit: '', quantity: 1, unitPrice: 0, total: 0 }]
        });
    };

    const handleRemoveItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];

        // Handle numeric fields specially to allow typing "0." or empty string
        if (field === 'quantity' || field === 'unitPrice') {
            newItems[index][field] = value; // Store raw value for input

            // Calculate total using parsed values
            const qty = parseFloat(field === 'quantity' ? value : newItems[index].quantity) || 0;
            const price = parseFloat(field === 'unitPrice' ? value : newItems[index].unitPrice) || 0;
            newItems[index].total = qty * price;
        } else {
            newItems[index][field] = value;
        }

        setFormData({ ...formData, items: newItems });
    };

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
    };

    const calculateTotalWithVAT = () => {
        const subtotal = calculateTotal();
        const vatAmount = subtotal * (formData.vatRate / 100);
        return {
            subtotal,
            vatAmount,
            total: subtotal + vatAmount
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        try {
            let id = editingId;

            // Auto-generate quote number if creating new quote
            const dataToSave = { ...formData };
            if (!id && (!formData.number || formData.number.trim() === '')) {
                const today = new Date();
                const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
                const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                dataToSave.number = `PREV-${dateStr}-${randomNum}`;
            }

            if (id) {
                await quoteAPI.update(id, dataToSave);
            } else {
                const res = await quoteAPI.create(dataToSave);
                id = res.data._id;
                setEditingId(id);
            }

            await loadQuotes();
            setShowModal(false);
            setShowSendModal(true);
            showSuccess('Preventivo salvato con successo!');
        } catch (error) {
            console.error('Error saving quote:', error);
            const errorMsg = error.response?.data?.message || 'Errore nel salvataggio del preventivo';
            showError(errorMsg);
        } finally {
            setSending(false);
        }
    };

    const handlePreviewPDF = async () => {
        if (!editingId) return;
        try {
            const response = await quoteAPI.downloadPDF(editingId);
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error previewing PDF:', error);
            showError('Errore nell\'anteprima del PDF');
        }
    };

    const handleSendViaEmail = async () => {
        if (!formData.client.email) {
            showError('Inserisci l\'email del cliente');
            return;
        }
        if (!editingId) return;

        setSending(true);
        try {
            // Call backend API to send email with PDF attachment
            const subject = `Preventivo N. ${formData.number} - ${user?.company?.name || 'WORK360'}`;
            const message = `Gentile ${formData.client.name},

In allegato trova il preventivo richiesto (N. ${formData.number}).

Dettagli preventivo:
• Data: ${new Date(formData.date).toLocaleDateString('it-IT')}
• Totale: €${calculateTotal().toFixed(2)}

Rimaniamo a disposizione per qualsiasi chiarimento o modifica.

Cordiali saluti,
${user?.company?.name || 'Il team WORK360'}`;

            await communicationAPI.sendEmailQuote(editingId, {
                email: formData.client.email,
                subject,
                message
            });

            showSuccess('✅ Email inviata con successo con PDF allegato!');
            setTimeout(() => {
                setShowSendModal(false);
                resetForm();
            }, 2000);
        } catch (error) {
            console.error('Email send error:', error);

            // Check if error is about email not configured
            if (error.response?.data?.action === 'configure_email') {
                showError(
                    <div>
                        {error.response.data.message}
                        <br />
                        <a href="/impostazioni-azienda" className="underline font-semibold">
                            Vai alle Impostazioni →
                        </a>
                    </div>
                );
            } else {
                showError(error.response?.data?.message || 'Errore nell\'invio dell\'email');
            }
        } finally {
            setSending(false);
        }
    };

    const resetForm = () => {
        setShowModal(false);
        setShowSendModal(false);
        setEditingId(null);
        setFormData({
            company: {
                name: companyData.name,
                address: companyData.address,
                piva: companyData.piva
            },
            client: { name: '', address: '', email: '', phone: '' },
            number: '',
            date: new Date().toISOString().split('T')[0],
            items: [{ description: '', unit: '', quantity: 1, unitPrice: 0, total: 0 }],
            vatRate: 22,
            notes: '',
            validityDays: 30,
            paymentTerms: '',
            safetyCosts: 0,
            workDuration: '',
            legalNotes: ''
        });
    };

    const handleEdit = (quote) => {
        // Preserve company data when editing
        setFormData({
            ...quote,
            company: {
                name: companyData.name,
                address: companyData.address,
                piva: companyData.piva
            }
        });
        setEditingId(quote._id);
        setShowModal(true);
    };

    const handleDelete = async (e, quoteId) => {
        e.preventDefault();
        e.stopPropagation();
        setDeleteConfirm({ isOpen: true, id: quoteId, type: 'quote' });
    };

    const handleDeleteSAL = async (e, salId) => {
        e.preventDefault();
        e.stopPropagation();
        setDeleteConfirm({ isOpen: true, id: salId, type: 'sal' });
    };

    const confirmDelete = async () => {
        try {
            if (deleteConfirm.type === 'quote') {
                await quoteAPI.delete(deleteConfirm.id);
                loadQuotes();
                showSuccess('Preventivo eliminato con successo');
            } else if (deleteConfirm.type === 'sal') {
                await salAPI.delete(deleteConfirm.id);
                loadSALData();
                showSuccess('SAL eliminato con successo');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            showError('Errore nell\'eliminazione');
        }
    };

    const downloadPDF = async (quoteId) => {
        try {
            const response = await quoteAPI.downloadPDF(quoteId);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `preventivo-${quoteId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading PDF:', error);
            showError('Errore nel download del PDF');
        }
    };

    const handleStatusChange = async (quoteId, newStatus) => {
        try {
            // We need to send only the status update, but the API expects a full object or handles partials?
            // Let's assume the update endpoint handles partial updates correctly as implemented in controller
            // Actually controller implementation: const { company: _, ...updateData } = req.body; Object.assign(quote, ...);
            // So we need to be careful not to overwrite items with empty array if we just send status.
            // But wait, the controller does: const { items, vatRate = 22 } = updateData;
            // And then maps items. If items is undefined, it might crash or clear items.
            // Let's check controller again.

            // Controller:
            // const { items, vatRate = 22 } = updateData;
            // const processedItems = items.map(...) -> This will crash if items is undefined!

            // I need to fetch the quote first or send the existing items?
            // Or better, I should fix the backend controller to handle partial updates properly without requiring items.
            // But for now, let's just find the quote in our local state and send it all back with new status.

            const quote = quotes.find(q => q._id === quoteId);
            if (!quote) return;

            const updateData = {
                ...quote,
                status: newStatus,
                company: undefined // Remove company object/id to avoid issues
            };

            await quoteAPI.update(quoteId, updateData);

            // Optimistic update
            setQuotes(quotes.map(q => q._id === quoteId ? { ...q, status: newStatus } : q));
            showSuccess('Stato aggiornato');
        } catch (error) {
            console.error('Error updating status:', error);
            showError('Errore aggiornamento stato');
            loadQuotes(); // Revert on error
        }
    };

    if (loading) {
        return (
            <Layout title="Preventivi & SAL">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Preventivi & SAL">

            {/* Tab Navigation */}
            <div className="mb-6">
                <div className="border-b border-slate-200">
                    <nav className="flex gap-8">
                        <button
                            onClick={() => setActiveTab('quotes')}
                            className={`pb-4 px-2 font-semibold transition-all ${activeTab === 'quotes'
                                ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 font-bold border-b-2 border-purple-600'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Preventivi
                        </button>
                        <button
                            onClick={() => setActiveTab('sals')}
                            className={`pb-4 px-2 font-semibold transition-all ${activeTab === 'sals'
                                ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 font-bold border-b-2 border-purple-600'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            SAL
                        </button>
                    </nav>
                </div>
            </div>

            {activeTab === 'quotes' ? (
                <>
                    <div className="mb-8 flex justify-between items-center">
                        <div className="relative max-w-md w-full hidden md:block">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Cerca preventivo..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Crea Preventivo
                        </button>
                    </div>
                </>) : (
                <>
                    {/* SAL VIEW */}
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
                            onClick={() => setShowSALModal(true)}
                            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Crea SAL
                        </button>
                    </div>
                </>)}

            {/* Quotes or SAL Grid */}
            {activeTab === 'quotes' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quotes.map(quote => (
                        <div key={quote._id} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                            <div className="mb-6">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{quote.client.name}</h3>
                                        <span className="text-xs font-mono text-slate-500">{quote.number}</span>
                                    </div>
                                    <select
                                        value={quote.status}
                                        onChange={(e) => handleStatusChange(quote._id, e.target.value)}
                                        className={`text-xs font-bold px-3 py-1 rounded-full border-none focus:ring-0 cursor-pointer appearance-none text-center min-w-[80px] ${quote.status === 'accepted' ? 'bg-green-100 text-green-700' :
                                            quote.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                quote.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-slate-100 text-slate-600'
                                            }`}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <option value="draft">Bozza</option>
                                        <option value="sent">Inviato</option>
                                        <option value="accepted">Accettato</option>
                                        <option value="rejected">Rifiutato</option>
                                    </select>
                                </div>
                                <p className="text-sm text-slate-500 mb-4">
                                    {new Date(quote.date).toLocaleDateString('it-IT')}
                                </p>
                                <p className="text-3xl font-bold text-slate-900">
                                    € {quote.total.toFixed(2)}
                                </p>
                            </div>
                            <div className="flex gap-2 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => downloadPDF(quote._id)}
                                    className="flex-1 py-2 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 font-medium text-sm flex items-center justify-center gap-1 transition-colors"
                                    title="Scarica PDF"
                                >
                                    <FileText className="w-4 h-4" /> PDF
                                </button>
                                <button
                                    onClick={() => handleEdit(quote)}
                                    className="flex-1 py-2 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 font-medium text-sm flex items-center justify-center gap-1 transition-colors"
                                    title="Modifica"
                                >
                                    <Edit className="w-4 h-4" /> Edit
                                </button>
                                <button
                                    onClick={(e) => handleDelete(e, quote._id)}
                                    className="py-2 px-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                    title="Elimina"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
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
                                            € {sal.totalAmount?.toFixed(2) || sal.amount?.toFixed(2) || '0.00'}
                                        </div>
                                    </div>
                                </div>

                                <p className="text-sm text-slate-500">
                                    {new Date(sal.date).toLocaleDateString('it-IT')}
                                </p>
                            </div>
                            <div className="flex gap-2 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => downloadSALPDF(sal._id)}
                                    className="flex-1 py-2 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 font-medium text-sm flex items-center justify-center gap-1 transition-colors"
                                    title="Scarica PDF"
                                >
                                    <FileText className="w-4 h-4" /> PDF
                                </button>
                                <button
                                    onClick={() => handleOpenSALSendModal(sal._id)}
                                    className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium text-sm flex items-center justify-center gap-1 transition-colors"
                                    title="Invia Email"
                                >
                                    <Mail className="w-4 h-4" /> Invia
                                </button>
                                <button
                                    onClick={(e) => handleDeleteSAL(e, sal._id)}
                                    className="py-2 px-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                    title="Elimina"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}


            {/* Create/Edit Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl relative">
                            <button
                                onClick={resetForm}
                                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-slate-500" />
                            </button>

                            <div className="p-6 md:p-8">
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                    {editingId ? 'Modifica Preventivo' : 'Crea Preventivo'}
                                </h2>
                                <p className="text-slate-500 mb-8">Compila i dati per generare il documento</p>

                                <form onSubmit={handleSubmit} className="space-y-8">
                                    {/* Company Data */}
                                    <section>
                                        <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">Dati Azienda</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Azienda</label>
                                                <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900" value={formData.company.name} onChange={(e) => setFormData({ ...formData, company: { ...formData.company, name: e.target.value } })} required />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Indirizzo</label>
                                                <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900" value={formData.company.address} onChange={(e) => setFormData({ ...formData, company: { ...formData.company, address: e.target.value } })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">P.IVA</label>
                                                <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900" value={formData.company.piva} onChange={(e) => setFormData({ ...formData, company: { ...formData.company, piva: e.target.value } })} />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Client Data */}
                                    <section>
                                        <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">Dati Cliente</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Cliente *</label>
                                                <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900" value={formData.client.name} onChange={(e) => setFormData({ ...formData, client: { ...formData.client, name: e.target.value } })} required />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Indirizzo</label>
                                                <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900" value={formData.client.address} onChange={(e) => setFormData({ ...formData, client: { ...formData.client, address: e.target.value } })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                                                <input type="email" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900" value={formData.client.email} onChange={(e) => setFormData({ ...formData, client: { ...formData.client, email: e.target.value } })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Telefono</label>
                                                <input type="tel" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900" value={formData.client.phone} onChange={(e) => setFormData({ ...formData, client: { ...formData.client, phone: e.target.value } })} />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Contract Terms */}
                                    <section>
                                        <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">Termini & Condizioni</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Validità Offerta (giorni)</label>
                                                <input type="number" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900" value={formData.validityDays} onChange={(e) => setFormData({ ...formData, validityDays: parseInt(e.target.value) || 0 })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Tempi di Esecuzione</label>
                                                <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900" placeholder="Es. 60 giorni lavorativi" value={formData.workDuration} onChange={(e) => setFormData({ ...formData, workDuration: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Pagamento</label>
                                                <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900" placeholder="Es. Bonifico 30gg d.f." value={formData.paymentTerms} onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Oneri Sicurezza (€)</label>
                                                <input type="number" step="0.01" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900" value={formData.safetyCosts} onChange={(e) => setFormData({ ...formData, safetyCosts: parseFloat(e.target.value) || 0 })} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Note Legali Aggiuntive</label>
                                                <textarea className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 h-20" placeholder="Eventuali clausole specifiche..." value={formData.legalNotes} onChange={(e) => setFormData({ ...formData, legalNotes: e.target.value })}></textarea>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Items */}
                                    <section>
                                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                                            <h3 className="text-lg font-semibold text-slate-900">Voci Preventivo</h3>
                                            <button type="button" onClick={handleAddItem} className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                                <Plus className="w-4 h-4" /> Aggiungi Voce
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="grid grid-cols-12 gap-2 md:gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                                                <div className="col-span-12 md:col-span-5 mb-1 md:mb-0">Descrizione</div>
                                                <div className="col-span-3 md:col-span-1 text-center">U.M.</div>
                                                <div className="col-span-3 md:col-span-2 text-center">Q.tà</div>
                                                <div className="col-span-3 md:col-span-2 text-center">Prezzo</div>
                                                <div className="col-span-2 md:col-span-2 text-right">Totale</div>
                                                <div className="col-span-1"></div>
                                            </div>

                                            {formData.items.map((item, index) => (
                                                <div key={index} className="grid grid-cols-12 gap-2 md:gap-4 items-start bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                    <div className="col-span-12 md:col-span-5">
                                                        <textarea
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-slate-900 focus:outline-none resize-y min-h-[60px]"
                                                            placeholder="Descrizione..."
                                                            value={item.description}
                                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="col-span-3 md:col-span-1">
                                                        <textarea
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-slate-900 focus:outline-none resize-y min-h-[60px] text-center"
                                                            placeholder="U.M."
                                                            value={item.unit || ''}
                                                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="col-span-3 md:col-span-2">
                                                        <input
                                                            type="number"
                                                            className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-center text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                                            value={item.quantity}
                                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="col-span-3 md:col-span-2">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-center text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                                            value={item.unitPrice}
                                                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="col-span-2 md:col-span-2 text-right font-bold text-slate-900 text-sm py-2">
                                                        €{item.total.toFixed(2)}
                                                    </div>
                                                    <div className="col-span-1 text-right py-2">
                                                        <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-400 hover:text-red-600 transition-colors">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex justify-end mt-6">
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 min-w-[300px]">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-600">Subtotale</span>
                                                        <span className="font-semibold text-slate-900">€{calculateTotalWithVAT().subtotal.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-600">IVA ({formData.vatRate}%)</span>
                                                        <span className="font-semibold text-slate-900">€{calculateTotalWithVAT().vatAmount.toFixed(2)}</span>
                                                    </div>
                                                    <div className="pt-2 border-t border-slate-200">
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-bold text-slate-900">Totale Documento</span>
                                                            <span className="text-2xl font-bold text-slate-900">€{calculateTotalWithVAT().total.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* VAT Rate Selection */}
                                    <section>
                                        <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">Aliquota IVA</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {[
                                                { value: 22, label: '22% - Ordinaria', desc: 'Nuove costruzioni' },
                                                { value: 10, label: '10% - Ridotta', desc: 'Manutenzione' },
                                                { value: 4, label: '4% - Super ridotta', desc: 'Prima casa' },
                                                { value: 0, label: 'Esente IVA', desc: 'Fuori campo IVA' }
                                            ].map((rate) => (
                                                <button
                                                    key={rate.value}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, vatRate: rate.value })}
                                                    className={`p-4 rounded-xl border-2 transition-all text-left ${formData.vatRate === rate.value
                                                        ? 'border-blue-600 bg-blue-50 shadow-sm'
                                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <div className={`font-bold text-sm mb-1 ${formData.vatRate === rate.value ? 'text-blue-700' : 'text-slate-900'
                                                        }`}>
                                                        {rate.label}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{rate.desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </section>

                                    {/* Total with VAT Breakdown */}
                                    <section>
                                        <div className="flex justify-end">
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 min-w-[350px]">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-600">Subtotale</span>
                                                        <span className="font-semibold text-slate-900">€{calculateTotalWithVAT().subtotal.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-600">IVA ({formData.vatRate}%)</span>
                                                        <span className="font-semibold text-slate-900">€{calculateTotalWithVAT().vatAmount.toFixed(2)}</span>
                                                    </div>
                                                    <div className="pt-3 border-t-2 border-slate-300">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-lg font-bold text-slate-900">Totale Documento</span>
                                                            <span className="text-3xl font-bold text-slate-900">€{calculateTotalWithVAT().total.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                        <button type="button" onClick={resetForm} className="notranslate px-6 py-3 bg-white border-2 border-slate-900 text-slate-900 font-semibold hover:bg-slate-50 rounded-lg transition-colors">
                                            <span>Chiudi</span>
                                        </button>
                                        <button type="submit" disabled={sending} className="notranslate px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2">
                                            {sending ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    <span>Salvataggio...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>Procedi all'invio</span>
                                                    <CheckCircle className="w-5 h-5" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Send Options Modal */}
            {
                showSendModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Preventivo Salvato!</h3>
                            <p className="text-slate-500 mb-8">Il documento è pronto. Come vuoi procedere?</p>

                            <div className="space-y-3">
                                <button
                                    onClick={handlePreviewPDF}
                                    className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Eye className="w-5 h-5" /> Anteprima PDF
                                </button>
                                <button
                                    onClick={handleSendViaEmail}
                                    disabled={sending}
                                    className="w-full py-3 bg-[#5D5FEF] text-white font-semibold rounded-xl hover:bg-[#4B4DDB] transition-colors flex items-center justify-center gap-2"
                                >
                                    <Mail className="w-5 h-5" /> Invia via Email
                                </button>
                                <button
                                    onClick={() => setShowSendModal(false)}
                                    className="w-full py-3 bg-white border-2 border-slate-900 text-slate-900 font-semibold hover:bg-slate-50 rounded-xl transition-colors mt-4"
                                >
                                    Chiudi
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


            {/* Create Modal */}
            {
                showSALModal && (
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

                                <DebugErrorBoundary data={salFormData}>
                                    <form onSubmit={handleSALSubmit} className="space-y-6">
                                        {/* Identification Section */}
                                        <section>
                                            <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">Dati Generali</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Cantiere *</label>
                                                    <select
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={salFormData.site}
                                                        onChange={(e) => setSalFormData(prev => ({ ...prev, site: e.target.value }))}
                                                        required
                                                    >
                                                        <option value="">Seleziona un cantiere...</option>
                                                        {Array.isArray(sites) && sites.filter(s => s).map(site => (
                                                            <option key={site._id} value={site._id}>{site?.name || 'Cantiere senza nome'}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Numero SAL *</label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={salFormData.number}
                                                        onChange={(e) => setSalFormData(prev => ({ ...prev, number: e.target.value }))}
                                                        placeholder="Es: SAL-001"
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Data Emissione *</label>
                                                    <input
                                                        type="date"
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={salFormData.date}
                                                        onChange={(e) => setSalFormData(prev => ({ ...prev, date: e.target.value }))}
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Periodo Inizio *</label>
                                                    <input
                                                        type="date"
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={salFormData.periodStart}
                                                        onChange={(e) => setSalFormData(prev => ({ ...prev, periodStart: e.target.value }))}
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Periodo Fine *</label>
                                                    <input
                                                        type="date"
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={salFormData.periodEnd}
                                                        onChange={(e) => setSalFormData(prev => ({ ...prev, periodEnd: e.target.value }))}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </section>

                                        {/* Client Section */}
                                        <section>
                                            <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">Committente</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome/Ragione Sociale *</label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={salFormData.clientName}
                                                        onChange={(e) => setSalFormData(prev => ({ ...prev, clientName: e.target.value }))}
                                                        placeholder="Nome committente"
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">P.IVA / Codice Fiscale</label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={salFormData.clientVatNumber}
                                                        onChange={(e) => setSalFormData(prev => ({ ...prev, clientVatNumber: e.target.value }))}
                                                        placeholder="12345678901"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Codice Fiscale (se diverso)</label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={salFormData.clientFiscalCode}
                                                        onChange={(e) => setSalFormData(prev => ({ ...prev, clientFiscalCode: e.target.value }))}
                                                        placeholder="RSSMRA80A01H501Z"
                                                    />
                                                </div>

                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Indirizzo</label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={salFormData.clientAddress}
                                                        onChange={(e) => setSalFormData(prev => ({ ...prev, clientAddress: e.target.value }))}
                                                        placeholder="Via Roma, 1 - 00100 Roma (RM)"
                                                    />
                                                </div>
                                            </div>
                                        </section>

                                        {/* Work Description */}
                                        <section>
                                            <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">Descrizione Lavori</h3>
                                            <textarea
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[120px]"
                                                value={salFormData.workDescription}
                                                onChange={(e) => setSalFormData(prev => ({ ...prev, workDescription: e.target.value }))}
                                                placeholder="Descrivi dettagliatamente i lavori eseguiti nel periodo indicato..."
                                                required
                                            />
                                        </section>

                                        {/* Financial Details */}
                                        <section>
                                            <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">Dettagli Economici</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Valore Contratto (€) *</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={salFormData.contractValue}
                                                        onChange={(e) => setSalFormData(prev => ({ ...prev, contractValue: parseFloat(e.target.value) || 0 }))}
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Importo SAL Precedenti (€)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={salFormData.previousAmount}
                                                        onChange={(e) => setSalFormData(prev => ({ ...prev, previousAmount: parseFloat(e.target.value) || 0 }))}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Importo Questo SAL (€) *</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={salFormData.currentAmount}
                                                        onChange={(e) => setSalFormData(prev => ({ ...prev, currentAmount: parseFloat(e.target.value) || 0 }))}
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Completamento (%) *</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 pr-10"
                                                            value={salFormData.completionPercentage}
                                                            onChange={(e) => setSalFormData(prev => ({ ...prev, completionPercentage: parseFloat(e.target.value) || 0 }))}
                                                            min="0"
                                                            max="100"
                                                            required
                                                        />
                                                        <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Penali (€)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={salFormData.penalties}
                                                        onChange={(e) => setSalFormData(prev => ({ ...prev, penalties: parseFloat(e.target.value) || 0 }))}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Aliquota IVA (%) *</label>
                                                    <select
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={salFormData.vatRate}
                                                        onChange={(e) => setSalFormData(prev => ({ ...prev, vatRate: parseFloat(e.target.value) }))}
                                                        required
                                                    >
                                                        <option value="22">22% - Ordinaria</option>
                                                        <option value="10">10% - Ridotta</option>
                                                        <option value="4">4% - Super ridotta</option>
                                                        <option value="0">0% - Esente</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Financial Preview */}
                                            {salFormData.currentAmount > 0 && (
                                                <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-600">Importo Lavori:</span>
                                                            <span className="font-semibold">€ {salFormData.currentAmount.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-600">Ritenuta Garanzia (10%):</span>
                                                            <span className="font-semibold text-red-600">- € {(salFormData.currentAmount * 0.10).toFixed(2)}</span>
                                                        </div>
                                                        {salFormData.penalties > 0 && (
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-600">Penali:</span>
                                                                <span className="font-semibold text-red-600">- € {salFormData.penalties.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                        <div className="pt-2 border-t border-slate-200">
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-600">Imponibile:</span>
                                                                <span className="font-semibold">€ {(salFormData.currentAmount - salFormData.currentAmount * 0.10 - salFormData.penalties).toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-600">IVA ({salFormData.vatRate}%):</span>
                                                                <span className="font-semibold">€ {((salFormData.currentAmount - salFormData.currentAmount * 0.10 - salFormData.penalties) * salFormData.vatRate / 100).toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                        <div className="pt-2 border-t-2 border-slate-300">
                                                            <div className="flex justify-between">
                                                                <span className="font-bold text-slate-900">TOTALE DOVUTO:</span>
                                                                <span className="text-lg font-bold text-slate-900">
                                                                    € {((salFormData.currentAmount - salFormData.currentAmount * 0.10 - salFormData.penalties) * (1 + salFormData.vatRate / 100)).toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </section>

                                        {/* Optional: Work Supervisor */}
                                        <section>
                                            <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">Direttore Lavori (Opzionale)</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome e Cognome</label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={salFormData.supervisorName}
                                                        onChange={(e) => setSalFormData(prev => ({ ...prev, supervisorName: e.target.value }))}
                                                        placeholder="Mario Rossi"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Qualifica</label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={salFormData.supervisorQualification}
                                                        onChange={(e) => setSalFormData(prev => ({ ...prev, supervisorQualification: e.target.value }))}
                                                        placeholder="Ingegnere, Architetto, Geometra..."
                                                    />
                                                </div>
                                            </div>
                                        </section>

                                        {/* Optional: Public Contract Codes */}
                                        <section>
                                            <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">Codici Appalto Pubblico (Opzionale)</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">CIG (Codice Identificativo Gara)</label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={salFormData.cig}
                                                        onChange={(e) => setSalFormData(prev => ({ ...prev, cig: e.target.value }))}
                                                        placeholder="1234567890"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">CUP (Codice Unico Progetto)</label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={salFormData.cup}
                                                        onChange={(e) => setSalFormData(prev => ({ ...prev, cup: e.target.value }))}
                                                        placeholder="A12B34C56D78E90F123"
                                                    />
                                                </div>
                                            </div>
                                        </section>

                                        {/* Notes */}
                                        <section>
                                            <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">Note Aggiuntive</h3>
                                            <textarea
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[80px]"
                                                value={salFormData.notes}
                                                onChange={(e) => setSalFormData(prev => ({ ...prev, notes: e.target.value }))}
                                                placeholder="Note aggiuntive (eventuali varianti, annotazioni tecniche, etc.)"
                                            />
                                        </section>

                                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => setShowModal(false)}
                                                className="px-6 py-3 bg-white border-2 border-slate-900 text-slate-900 font-semibold hover:bg-slate-50 rounded-lg transition-colors"
                                            >
                                                Annulla
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                                Crea SAL
                                            </button>
                                        </div>
                                    </form>
                                </DebugErrorBoundary>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* SAL Send Options Modal */}
            {
                showSALSendModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl text-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Invia SAL via Email</h3>
                            <p className="text-slate-500 mb-8">Vuoi inviare il SAL al cliente via email?</p>

                            <div className="space-y-3">
                                <button
                                    onClick={handleSendSALEmail}
                                    disabled={sending}
                                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                                >
                                    {sending ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Invio in corso...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="w-5 h-5" /> Invia via Email
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowSALSendModal(false);
                                        setSelectedSALId(null);
                                    }}
                                    className="w-full py-3 bg-white border-2 border-slate-900 text-slate-900 font-semibold hover:bg-slate-50 rounded-xl transition-colors mt-4"
                                >
                                    Annulla
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, quoteId: null })}
                onConfirm={confirmDelete}
                title="Elimina Preventivo"
                message="Sei sicuro di voler eliminare questo preventivo? Questa azione non può essere annullata."
                confirmText="Elimina"
                cancelText="Annulla"
                type="danger"
            />
        </Layout >
    );
}
