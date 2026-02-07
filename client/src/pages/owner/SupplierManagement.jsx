import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { supplierAPI } from '../../utils/api';
import { Truck, Star, Phone, Mail, MapPin, Plus, X, Edit, Trash2, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';

export default function SupplierManagement() {
    const [suppliers, setSuppliers] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        specialties: '',
        rating: 5,
        notes: ''
    });

    useEffect(() => {
        loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        try {
            const [suppliersResp, recommendationsResp] = await Promise.all([
                supplierAPI.getAll(),
                supplierAPI.getRecommendations()
            ]);

            setSuppliers(suppliersResp.data);
            setRecommendations(recommendationsResp.data);
        } catch (error) {
            console.error('Error loading suppliers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const submitData = {
            ...formData,
            specialties: formData.specialties.split(',').map(s => s.trim()).filter(s => s)
        };

        try {
            if (editingSupplier) {
                await supplierAPI.update(editingSupplier.id, submitData);
                setMessage({ type: 'success', text: 'Fornitore aggiornato con successo!' });
            } else {
                await supplierAPI.create(submitData);
                setMessage({ type: 'success', text: 'Fornitore creato con successo!' });
            }

            resetForm();
            loadSuppliers();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Errore nell\'operazione' });
        }
    };

    const handleEdit = (supplier) => {
        setEditingSupplier(supplier);
        setFormData({
            name: supplier.name,
            category: supplier.category || '',
            contactPerson: supplier.contactPerson || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || '',
            specialties: supplier.specialties?.join(', ') || '',
            rating: supplier.rating || 5,
            notes: supplier.notes || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Sei sicuro di voler eliminare questo fornitore?')) return;

        try {
            await supplierAPI.delete(id);
            setMessage({ type: 'success', text: 'Fornitore eliminato!' });
            loadSuppliers();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Errore nell\'eliminazione' });
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            category: '',
            contactPerson: '',
            email: '',
            phone: '',
            address: '',
            specialties: '',
            rating: 5,
            notes: ''
        });
        setEditingSupplier(null);
        setShowForm(false);
    };

    const renderStars = (rating) => {
        return [...new Array(5)].map((_, i) => (
            <Star key={i} className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} />
        ));
    };

    if (loading) {
        return (
            <Layout title="Gestione Fornitori">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Gestione Fornitori">
            {message.text && (
                <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 font-semibold flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            <div className="mb-8 flex justify-between items-center">
                <p className="text-slate-500">Gestisci i tuoi fornitori e visualizza raccomandazioni intelligenti.</p>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20"
                >
                    {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {showForm ? 'Chiudi' : 'Nuovo Fornitore'}
                </button>
            </div>

            {/* Recommendations Section */}
            {recommendations.length > 0 && (
                <div className="bg-blue-50 rounded-[2.5rem] p-6 mb-8">
                    <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        Raccomandazioni Intelligenti
                    </h3>
                    <p className="text-sm text-blue-700 mb-6">
                        Basate sui materiali più utilizzati nei tuoi cantieri
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {recommendations.map((rec, idx) => (
                            <div
                                key={idx}
                                className="bg-white p-4 rounded-xl shadow-sm"
                            >
                                <div className="font-bold text-slate-900 mb-2">
                                    {rec.category}
                                </div>
                                <div className="text-sm text-slate-600 mb-1">
                                    Materiale più usato: <span className="font-semibold text-blue-600">{rec.topMaterial}</span>
                                </div>
                                <div className="text-xs text-slate-400">
                                    Utilizzi totali: {rec.totalUsed}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Form */}
            {showForm && (
                <div className="bg-white rounded-[2.5rem] p-6 mb-8 shadow-lg animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">
                        {editingSupplier ? 'Modifica Fornitore' : 'Nuovo Fornitore'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Nome Fornitore *</label>
                                <input
                                    id="name"
                                    type="text"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                                <input
                                    id="category"
                                    type="text"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    placeholder="es. Edilizia, Idraulica..."
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                />
                            </div>

                            <div>
                                <label htmlFor="contactPerson" className="block text-sm font-medium text-slate-700 mb-1">Persona di Contatto</label>
                                <input
                                    id="contactPerson"
                                    type="text"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    value={formData.contactPerson}
                                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Telefono</label>
                                <input
                                    id="phone"
                                    type="tel"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>

                            <div>
                                <label htmlFor="rating" className="block text-sm font-medium text-slate-700 mb-1">Valutazione</label>
                                <select
                                    id="rating"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    value={formData.rating}
                                    onChange={(e) => setFormData({ ...formData, rating: Number.parseInt(e.target.value) })}
                                >
                                    <option value="1">1 Stella</option>
                                    <option value="2">2 Stelle</option>
                                    <option value="3">3 Stelle</option>
                                    <option value="4">4 Stelle</option>
                                    <option value="5">5 Stelle</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">Indirizzo</label>
                            <input
                                id="address"
                                type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>

                        <div>
                            <label htmlFor="specialties" className="block text-sm font-medium text-slate-700 mb-1">Specializzazioni (separate da virgola)</label>
                            <input
                                id="specialties"
                                type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                placeholder="es. Mattoni, Cemento, Sabbia"
                                value={formData.specialties}
                                onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                            />
                        </div>

                        <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">Note</label>
                            <textarea
                                id="notes"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[100px]"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-2.5 bg-white border-2 border-slate-900 text-slate-900 font-semibold hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                type="submit"
                                className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                {editingSupplier ? 'Salva Modifiche' : 'Crea Fornitore'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Suppliers List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {suppliers.length === 0 ? (
                    <div className="col-span-full p-12 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                        <Truck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">Nessun fornitore presente</h3>
                        <p className="text-slate-500 mb-6">Aggiungi il tuo primo fornitore per iniziare a tracciare i contatti.</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all inline-flex items-center gap-2 shadow-lg shadow-purple-500/20"
                        >
                            <Plus className="w-5 h-5" />
                            Nuovo Fornitore
                        </button>
                    </div>
                ) : (
                    suppliers.map(supplier => (
                        <div key={supplier.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                                        {supplier.name}
                                    </h3>
                                    {supplier.category && (
                                        <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-md">
                                            {supplier.category}
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-0.5">
                                    {renderStars(supplier.rating)}
                                </div>
                            </div>

                            <div className="space-y-2 mb-6">
                                {supplier.contactPerson && (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 text-xs">👤</span>
                                        {supplier.contactPerson}
                                    </div>
                                )}
                                {supplier.phone && (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 text-xs">
                                            <Phone className="w-3 h-3" />
                                        </span>
                                        <a href={`tel:${supplier.phone}`} className="hover:text-blue-600 transition-colors">
                                            {supplier.phone}
                                        </a>
                                    </div>
                                )}
                                {supplier.email && (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 text-xs">
                                            <Mail className="w-3 h-3" />
                                        </span>
                                        <a href={`mailto:${supplier.email}`} className="hover:text-blue-600 transition-colors">
                                            {supplier.email}
                                        </a>
                                    </div>
                                )}
                                {supplier.address && (
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 text-xs">
                                            <MapPin className="w-3 h-3" />
                                        </span>
                                        {supplier.address}
                                    </div>
                                )}
                            </div>

                            {supplier.specialties?.length > 0 && (
                                <div className="mb-6">
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Specializzazioni</div>
                                    <div className="flex flex-wrap gap-2">
                                        {supplier.specialties.map((spec, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md border border-slate-200">
                                                {spec}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {supplier.notes && (
                                <div className="mb-6 p-3 bg-yellow-50 rounded-lg border border-yellow-100 text-sm text-yellow-800 italic">
                                    "{supplier.notes}"
                                </div>
                            )}

                            <div className="flex gap-2 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => handleEdit(supplier)}
                                    className="flex-1 py-2 bg-slate-50 text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Edit className="w-4 h-4" />
                                    Modifica
                                </button>
                                <button
                                    onClick={() => handleDelete(supplier.id)}
                                    className="flex-1 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Elimina
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Layout>
    );
}
