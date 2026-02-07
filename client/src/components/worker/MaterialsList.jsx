import { Package, Clock } from 'lucide-react';

const MaterialsList = ({ materials, loading, onDelete }) => {
    if (loading) {
        return (
            <div className="animate-pulse space-y-3">
                <div className="h-16 bg-slate-100 rounded-lg"></div>
                <div className="h-16 bg-slate-100 rounded-lg"></div>
            </div>
        );
    }

    if (!materials || materials.length === 0) {
        return (
            <div className="text-center py-12 bg-slate-50 rounded-xl">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nessun materiale utilizzato oggi</p>
            </div>
        );
    }

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Helper to get material data - backend returns 'materialMaster' alias
    const getMaterial = (usage) => usage.materialMaster || usage.material;

    const getMaterialDisplayName = (usage) => {
        const material = getMaterial(usage);
        if (material) {
            return material.nome_prodotto || material.displayName || 'Materiale';
        }
        if (usage.stato === 'da_approvare') {
            return 'Materiale da approvare';
        }
        return 'Materiale non specificato';
    };

    // Calculate total price for a usage
    const getTotalPrice = (usage) => {
        const material = getMaterial(usage);
        if (material?.prezzo && usage.numeroConfezioni) {
            const total = Number.parseFloat(material.prezzo) * usage.numeroConfezioni;
            return total.toFixed(2);
        }
        return null;
    };

    const getStatusBadge = (stato) => {
        switch (stato) {
            case 'catalogato':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                        ✓ Catalogato
                    </span>
                );
            case 'da_approvare':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                        ⏳ In attesa
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

    return (
        <div className="space-y-3">
            {materials.map((usage) => {
                const material = getMaterial(usage);
                const totalPrice = getTotalPrice(usage);

                return (
                    <div
                        key={usage.id}
                        className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors group"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Package className="w-5 h-5 text-blue-600" />
                                    <h4 className="font-semibold text-slate-900">
                                        {getMaterialDisplayName(usage)}
                                    </h4>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        <span>{formatTime(usage.dataOra)}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-blue-600">
                                            {usage.numeroConfezioni}
                                        </span>{' '}
                                        confezioni
                                    </div>
                                    {material?.quantita && (
                                        <div className="text-xs bg-slate-100 px-2 py-1 rounded">
                                            {material.quantita}
                                        </div>
                                    )}
                                    {totalPrice && (
                                        <div className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded">
                                            €{totalPrice}
                                        </div>
                                    )}
                                    {usage.site?.name && (
                                        <div className="text-xs">
                                            📍 {usage.site.name}
                                        </div>
                                    )}
                                </div>
                                {usage.note && (
                                    <p className="mt-2 text-sm text-slate-600 italic">
                                        "{usage.note}"
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                {getStatusBadge(usage.stato)}
                                {onDelete && (
                                    <button
                                        onClick={() => onDelete(usage.id)}
                                        className="text-slate-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"
                                        title="Elimina"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 6h18"></path>
                                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MaterialsList;
