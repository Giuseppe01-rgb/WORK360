import { useState, useEffect } from 'react';
import { Search, Package, TrendingUp, Loader2, X } from 'lucide-react';
import PropTypes from 'prop-types';
import { colouraMaterialAPI, materialUsageAPI } from '../../utils/api';

const MaterialSearch = ({ siteId, onSelect, onClose, onReportNew }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [allMaterials, setAllMaterials] = useState([]); // All catalog materials
    const [mostUsed, setMostUsed] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMostUsed, setLoadingMostUsed] = useState(false);
    const [activeTab, setActiveTab] = useState('search'); // 'search' or 'most-used'

    // Load ALL catalog materials on mount
    useEffect(() => {
        loadAllMaterials();
    }, []);

    // Load most used materials for this site
    useEffect(() => {
        if (siteId && activeTab === 'most-used') {
            loadMostUsed();
        }
    }, [siteId, activeTab]);

    const loadAllMaterials = async () => {
        setLoading(true);
        try {
            const response = await colouraMaterialAPI.getAll();
            console.log(`📦 Loaded ${response.data.length} materials from catalog`);
            setAllMaterials(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Load catalog error:', error);
            setAllMaterials([]);
        } finally {
            setLoading(false);
        }
    };

    const loadMostUsed = async () => {
        setLoadingMostUsed(true);
        try {
            const response = await materialUsageAPI.getMostUsedBySite(siteId);
            setMostUsed(response.data);
        } catch (error) {
            console.error('Error loading most used:', error);
        } finally {
            setLoadingMostUsed(false);
        }
    };

    // Client-side filtering of all materials
    const filteredMaterials = searchQuery.trim() === ''
        ? allMaterials
        : allMaterials.filter(material => {
            const query = searchQuery.toLowerCase();
            return (
                material.nome_prodotto?.toLowerCase().includes(query) ||
                material.marca?.toLowerCase().includes(query) ||
                material.codice_prodotto?.toLowerCase().includes(query) ||
                material.categoria?.toLowerCase().includes(query)
            );
        });

    const MaterialCard = ({ material, onClick, usageStats }) => (
        <button
            onClick={onClick}
            className="w-full p-4 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all text-left"
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h4 className="font-bold text-slate-900 mb-1">
                        {material.nome_prodotto}
                    </h4>
                    <div className="flex flex-wrap gap-2 text-sm">
                        <span className="text-slate-600">{material.marca}</span>
                        {material.quantita && (
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                                {material.quantita}
                            </span>
                        )}
                        <span className="text-slate-500">{material.categoria}</span>
                    </div>
                    {usageStats && (
                        <div className="mt-2 text-xs text-slate-500">
                            📊 Usato {usageStats.usageCount} volte ({usageStats.totalConfezioni} conf. totali)
                        </div>
                    )}
                </div>
                {material.codice_prodotto && (
                    <div className="text-xs text-slate-400 font-mono ml-2">
                        {material.codice_prodotto}
                    </div>
                )}
            </div>
        </button>
    );

    // Helper component for loading states
    const LoadingState = ({ message = 'Caricamento...' }) => (
        <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-600">{message}</p>
        </div>
    );

    // Helper component for empty states
    const EmptyState = ({ icon: Icon, title, subtitle, action }) => (
        <div className="text-center py-12">
            <Icon className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            {title && <p className="text-slate-600 font-medium mb-2">{title}</p>}
            {subtitle && <p className="text-slate-500 text-sm mb-4">{subtitle}</p>}
            {action}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Package className="w-6 h-6 text-blue-600" />
                            Seleziona Materiale
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-slate-700" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => setActiveTab('search')}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${activeTab === 'search'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            <Search className="w-4 h-4 inline mr-2" />
                            Cerca
                        </button>
                        <button
                            onClick={() => setActiveTab('most-used')}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${activeTab === 'most-used'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            <TrendingUp className="w-4 h-4 inline mr-2" />
                            Più Usati
                        </button>
                    </div>

                    {/* Search Input */}
                    {activeTab === 'search' && (
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cerca per nome, marca, codice..."
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none pr-10"
                                autoFocus
                            />
                            {loading && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'search' && (
                        <>
                            {loading && <LoadingState message="Caricamento catalogo..." />}

                            {!loading && allMaterials.length === 0 && (
                                <EmptyState
                                    icon={Package}
                                    title="Catalogo vuoto"
                                    subtitle="Nessun materiale disponibile"
                                />
                            )}

                            {!loading && allMaterials.length > 0 && filteredMaterials.length === 0 && (
                                <EmptyState
                                    icon={Package}
                                    title="Nessun materiale trovato"
                                    subtitle={`Nessun materiale corrisponde a "${searchQuery}"`}
                                    action={
                                        <button
                                            onClick={() => {
                                                onClose();
                                                if (onReportNew) onReportNew();
                                            }}
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition-colors shadow-lg"
                                        >
                                            📢 Non lo trovo → Segnala Nuovo Materiale
                                        </button>
                                    }
                                />
                            )}

                            {!loading && filteredMaterials.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-sm text-slate-600 mb-2">
                                        {searchQuery ? (
                                            <>Trovati <strong>{filteredMaterials.length}</strong> materiali</>
                                        ) : (
                                            <>Catalogo completo: <strong>{allMaterials.length}</strong> materiali</>
                                        )}
                                    </p>
                                    {filteredMaterials.map((material) => (
                                        <MaterialCard
                                            key={material.id}
                                            material={material}
                                            onClick={() => onSelect(material)}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}


                    {activeTab === 'most-used' && (
                        <>
                            {loadingMostUsed && <LoadingState />}

                            {!loadingMostUsed && mostUsed.length === 0 && (
                                <EmptyState
                                    icon={TrendingUp}
                                    subtitle="Nessun materiale usato in questo cantiere"
                                />
                            )}

                            {!loadingMostUsed && mostUsed.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-sm text-slate-600 mb-4">
                                        🔥 I 5 materiali più usati in questo cantiere
                                    </p>
                                    {mostUsed.map((item) => (
                                        <MaterialCard
                                            key={item.material.id}
                                            material={item.material}
                                            onClick={() => onSelect(item.material)}
                                            usageStats={{
                                                totalConfezioni: item.totalConfezioni,
                                                usageCount: item.usageCount
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                </div>
            </div>
        </div>
    );
};

MaterialSearch.propTypes = {
    siteId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onSelect: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    onReportNew: PropTypes.func.isRequired
};

export default MaterialSearch;
