import { useState, useEffect, useCallback } from 'react';
import { Package, Search, AlertCircle, X, Loader2 } from 'lucide-react';

const MaterialCatalogSearch = ({ onSelect, onClose, onReportNew }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [categoria, setCategoria] = useState('');
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const categories = [
        'Pittura interna',
        'Pittura esterna',
        'Stucco',
        'Primer',
        'Rasante',
        'Altro'
    ];

    const handleSearch = useCallback(async () => {
        if (searchQuery.length < 2) {
            setMaterials([]);
            setSearched(false);
            return;
        }

        setLoading(true);
        setSearched(true);
        try {
            const token = localStorage.getItem('token');
            const url = `/api/coloura-materials/search?q=${encodeURIComponent(searchQuery)}${categoria ? `&categoria=${categoria}` : ''}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            setMaterials(data);
        } catch (error) {
            console.error('Search error:', error);
            setMaterials([]);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, categoria]);

    // Debounced autocomplete
    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch();
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery, categoria]);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Search className="w-6 h-6 text-blue-600" />
                            Cerca materiale
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-slate-700" />
                        </button>
                    </div>

                    {/* Search Form */}
                    <div className="space-y-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Inizia a digitare per cercare..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none pr-10"
                                autoFocus
                            />
                            {loading && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                </div>
                            )}
                        </div>
                        <select
                            value={categoria}
                            onChange={(e) => setCategoria(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        >
                            <option value="">Tutte le categorie</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 italic">
                            💡 I risultati appaiono automaticamente mentre digiti
                        </p>
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!searched ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Package className="w-16 h-16 text-slate-300 mb-4" />
                            <p className="text-slate-500">
                                Digita almeno 2 lettere per cercare
                            </p>
                        </div>
                    ) : materials.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <AlertCircle className="w-16 h-16 text-amber-400 mb-4" />
                            <h4 className="text-lg font-bold text-slate-900 mb-2">
                                Nessun materiale trovato
                            </h4>
                            <p className="text-slate-600 mb-6">
                                Prova a modificare la ricerca o segnala un nuovo materiale
                            </p>
                            <button
                                onClick={onReportNew}
                                className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors"
                            >
                                Segnala nuovo materiale
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {materials.map(material => (
                                <button
                                    key={material.id}
                                    onClick={() => onSelect(material)}
                                    className="w-full p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all text-left"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-900 text-lg mb-1">
                                                {material.nome_prodotto}
                                            </p>
                                            <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                                                <span className="bg-white px-2 py-1 rounded">{material.marca}</span>
                                                <span className="bg-white px-2 py-1 rounded">{material.categoria}</span>
                                                {material.quantita && (
                                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">
                                                        {material.quantita}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {material.codice_prodotto && (
                                            <div className="text-xs text-slate-500 font-mono ml-2">
                                                {material.codice_prodotto}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 bg-slate-50">
                    <button
                        onClick={onReportNew}
                        className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors"
                    >
                        Non trovo il materiale → Segnala nuovo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MaterialCatalogSearch;
