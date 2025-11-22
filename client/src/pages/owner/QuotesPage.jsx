import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { quoteAPI, communicationAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
    Plus, Trash2, Eye, Mail, MessageCircle, FileText,
    Edit, Download, X, CheckCircle, AlertCircle, Search
} from 'lucide-react';

export default function QuotesPage() {
    const { user } = useAuth();
    const { showSuccess, showError, showWarning, showInfo } = useToast();
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showSendModal, setShowSendModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, quoteId: null });

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
        items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
        vatRate: 22,
        notes: ''
    });

    useEffect(() => {
        loadQuotes();
    }, []);

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

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]
        });
    };

    const handleRemoveItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;

        if (field === 'quantity' || field === 'unitPrice') {
            newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unitPrice || 0);
        }

        setFormData({ ...formData, items: newItems });
    };

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
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
            // Download PDF first
            await downloadPDF(editingId);

            // Prepare email data
            const subject = `Preventivo ${formData.number || 'WORK360'}`;
            const body = `Buongiorno ${formData.client.name},

In allegato il preventivo richiesto.

Dettagli:
- Numero preventivo: ${formData.number}
- Data: ${new Date(formData.date).toLocaleDateString('it-IT')}
- Totale: €${calculateTotal().toFixed(2)}

Cordiali saluti,
${user?.company?.name || 'La tua azienda'}`;

            // Create Gmail compose URL
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(formData.client.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

            // Open Gmail in new tab
            window.open(gmailUrl, '_blank');

            showSuccess('✅ PDF scaricato! Gmail aperto - Allega manualmente il PDF dalla cartella Download.');
            setTimeout(() => {
                setShowSendModal(false);
                resetForm();
            }, 2000);
        } catch (error) {
            console.error('Error preparing email:', error);
            showError('❌ Errore nella preparazione dell\'email');
        } finally {
            setSending(false);
        }
    };

    const handleSendViaWhatsApp = async () => {
        if (!formData.client.phone) {
            showError('Inserisci il telefono del cliente');
            return;
        }
        if (!editingId) return;

        setSending(true);
        try {
            await downloadPDF(editingId);
            showSuccess('📥 PDF scaricato! Tra 2 secondi si aprirà WhatsApp: ricordati di allegare il PDF dalla cartella Download.');
            await new Promise(resolve => setTimeout(resolve, 2000));

            const response = await communicationAPI.sendWhatsAppQuote(editingId, {
                phone: formData.client.phone,
                message: `Ciao ${formData.client.name}, ecco il preventivo ${formData.number || 'richiesto'}! 📄`
            });

            if (response.data.whatsappLink) {
                window.open(response.data.whatsappLink, '_blank');
                setTimeout(() => {
                    showSuccess('✅ WhatsApp aperto! ALLEGA MANUALMENTE il PDF dalla cartella Download prima di inviare.');
                    setShowSendModal(false);
                    resetForm();
                }, 500);
            }
        } catch (error) {
            console.error('Error sending WhatsApp:', error);
            showError("❌ Errore nell'invio WhatsApp");
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
            items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
            vatRate: 22,
            notes: ''
        });
    };

    const handleEdit = (quote) => {
        setFormData(quote);
        setEditingId(quote._id);
        setShowModal(true);
    };

    const handleDelete = async (e, quoteId) => {
        e.preventDefault();
        e.stopPropagation();
        setDeleteConfirm({ isOpen: true, quoteId });
    };

    const confirmDelete = async () => {
        try {
            await quoteAPI.delete(deleteConfirm.quoteId);
            loadQuotes();
            showSuccess('Preventivo eliminato con successo');
        } catch (error) {
            console.error('Error deleting quote:', error);
            showError('Errore nell\'eliminazione del preventivo');
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

    if (loading) {
        return (
            <Layout title="Preventivi">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Preventivi">


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
                    className="px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    Crea Preventivo
                </button>
            </div>

            {/* Quotes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quotes.map(quote => (
                    <div key={quote._id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow flex flex-col justify-between">
                        <div className="mb-6">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{quote.client.name}</h3>
                                <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                    {quote.number}
                                </span>
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

            {/* Create/Edit Modal */}
            {showModal && (
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
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Telefono (WhatsApp)</label>
                                            <input type="tel" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900" value={formData.client.phone} onChange={(e) => setFormData({ ...formData, client: { ...formData.client, phone: e.target.value } })} />
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
                                        <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                                            <div className="col-span-6 md:col-span-5">Descrizione</div>
                                            <div className="col-span-2 text-center">Q.tà</div>
                                            <div className="col-span-2 text-center">Prezzo</div>
                                            <div className="col-span-2 text-right">Totale</div>
                                            <div className="col-span-1"></div>
                                        </div>

                                        {formData.items.map((item, index) => (
                                            <div key={index} className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <div className="col-span-6 md:col-span-5">
                                                    <input type="text" className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-900 placeholder-slate-400" placeholder="Descrizione..." value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} required />
                                                </div>
                                                <div className="col-span-2">
                                                    <input type="number" className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-center text-sm" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} required />
                                                </div>
                                                <div className="col-span-2">
                                                    <input type="number" step="0.01" className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-center text-sm" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)} required />
                                                </div>
                                                <div className="col-span-2 text-right font-bold text-slate-900 text-sm">
                                                    €{item.total.toFixed(2)}
                                                </div>
                                                <div className="col-span-1 text-right">
                                                    <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-400 hover:text-red-600 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-end mt-6">
                                        <div className="bg-slate-900 text-white px-6 py-3 rounded-xl flex items-center gap-4 shadow-lg">
                                            <span className="text-slate-300 font-medium">Totale Documento</span>
                                            <span className="text-2xl font-bold">€{calculateTotal().toFixed(2)}</span>
                                        </div>
                                    </div>
                                </section>

                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                    <button type="button" onClick={resetForm} className="notranslate px-6 py-3 text-slate-600 font-semibold hover:bg-slate-50 rounded-lg transition-colors">
                                        <span>Chiudi</span>
                                    </button>
                                    <button type="submit" disabled={sending} className="notranslate px-8 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-all shadow-md flex items-center gap-2">
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
            )}

            {/* Send Options Modal */}
            {showSendModal && (
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
                                onClick={handleSendViaWhatsApp}
                                disabled={sending}
                                className="w-full py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <MessageCircle className="w-5 h-5" /> Invia via WhatsApp
                            </button>
                            <button
                                onClick={() => setShowSendModal(false)}
                                className="w-full py-3 text-slate-400 font-medium hover:text-slate-600 transition-colors mt-4"
                            >
                                Chiudi
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
        </Layout>
    );
}
