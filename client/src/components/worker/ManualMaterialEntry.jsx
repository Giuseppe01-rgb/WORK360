import { useState } from 'react';
import { Package, X, Search, Loader2 } from 'lucide-react';

const ManualMaterialEntry = ({ initialData = {}, onSubmit, onClose, onSearchCatalog }) => {
    const [formData, setFormData] = useState({
        codice_prodotto: initialData.codice_prodotto || '',
        nome_prodotto: initialData.nome_prodotto || '',
        quantita_valore: initialData.quantita_valore || '',
        quantita_unita: initialData.quantita_unita || '',
        pezzi: initialData.pezzi || 1
    });

    const [searching, setSearching] = useState(false);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        if (!formData.nome_prodotto) {
            alert('Il nome del prodotto è obbligatorio');
            return;
        }
        if (formData.pezzi < 1) {
            alert('Devi usare almeno 1 pezzo');
            return;
        }
        onSubmit(formData);
    };

    // Auto-search catalog when codice_prodotto is entered
    const handleCodeChange = async (value) => {
        handleChange('codice_prodotto', value);

        if (value.length >= 3) {
            setSearching(true);
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/coloura-materials/search?q=${encodeURIComponent(value)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const materials = await response.json();

                if (materials.length > 0) {
                    const match = materials[0];
                    setFormData({
                        codice_prodotto: match.codice_prodotto || '',
                        nome_prodotto: match.nome_prodotto || '',
                        quantita_valore: match.quantita?.match(/(\d+[.,]?\d*)/)?.[1] || '',
                        quantita_unita: match.quantita?.match(/[a-z]+/i)?.[0] || '',
                        pezzi: 1
                    });
                }
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setSearching(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white p-6 border-b border-slate-200 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Package className="w-6 h-6 text-blue-600" />
                            Aggiungi Materiale
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-slate-700" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* Codice Prodotto (opzionale, autocomplete) */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                            Codice Prodotto <span className="text-slate-400 font-normal">(opzionale)</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.codice_prodotto}
                                onChange={(e) => handleCodeChange(e.target.value.toUpperCase())}
                                placeholder="Es. ARV225A"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none uppercase pr-24"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                                {searching && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
                                <button
                                    onClick={onSearchCatalog}
                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200 transition-colors flex items-center gap-1"
                                >
                                    <Search className="w-4 h-4" />
                                    Cerca
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">💡 Digita il codice per suggerimenti automatici</p>
                    </div>

                    {/* Nome Prodotto (obbligatorio) */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                            Nome Prodotto <span className="text-red-600">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.nome_prodotto}
                            onChange={(e) => handleChange('nome_prodotto', e.target.value)}
                            placeholder="Es. Ugello autopulente 225"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                    </div>

                    {/* Quantità per Confezione */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                            Quantità per Confezione <span className="text-slate-400 font-normal">(opzionale)</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                value={formData.quantita_valore}
                                onChange={(e) => handleChange('quantita_valore', e.target.value)}
                                placeholder="375"
                                className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                            />
                            <input
                                type="text"
                                value={formData.quantita_unita}
                                onChange={(e) => handleChange('quantita_unita', e.target.value.toLowerCase())}
                                placeholder="ml, lt, kg..."
                                className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none lowercase"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Es. "375" + "ml" oppure "14" + "lt"</p>
                    </div>

                    {/* Pezzi Usati (obbligatorio) */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-3">
                            Pezzi Usati <span className="text-red-600">*</span>
                        </label>
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => handleChange('pezzi', Math.max(1, formData.pezzi - 1))}
                                className="w-14 h-14 bg-slate-200 hover:bg-slate-300 rounded-xl text-2xl font-bold transition-colors"
                            >
                                −
                            </button>
                            <div className="flex-1 text-center">
                                <div className="text-4xl font-bold text-blue-600">{formData.pezzi}</div>
                                <div className="text-xs text-slate-500 mt-1">confezioni</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleChange('pezzi', formData.pezzi + 1)}
                                className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-2xl font-bold transition-colors"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 bg-white p-6 border-t border-slate-200 rounded-b-2xl">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            ✓ Conferma
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManualMaterialEntry;
