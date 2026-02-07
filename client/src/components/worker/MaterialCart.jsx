import { ShoppingCart, Edit2, Trash2, Plus, Send, Package } from 'lucide-react';
import PropTypes from 'prop-types';

export default function MaterialCart({
    cartItems = [],
    onEdit,
    onDelete,
    onAddMore,
    onSubmitAll,
    loading = false
}) {
    if (cartItems.length === 0) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-[2.5rem] p-6 mb-6 border-2 border-amber-200 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                        <ShoppingCart className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900">Carrello Materiali</h3>
                        <p className="text-sm text-amber-700 font-medium">
                            {cartItems.length} {cartItems.length === 1 ? 'materiale' : 'materiali'} in attesa
                        </p>
                    </div>
                </div>
                <div className="bg-amber-500 text-white text-lg font-black px-4 py-2 rounded-full shadow-md">
                    {cartItems.length}
                </div>
            </div>

            {/* Cart Items */}
            <div className="space-y-3 mb-6">
                {cartItems.map((item, index) => (
                    <div
                        key={item.tempId || index}
                        className="bg-white rounded-xl p-4 shadow-md border border-amber-100 hover:shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Package className="w-5 h-5 text-purple-600" />
                                    <h4 className="font-bold text-slate-900 text-lg">
                                        {item.materialName || item.material?.displayName || 'Materiale'}
                                    </h4>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-purple-600">
                                        {item.quantity}
                                    </span>
                                    <span className="text-lg text-slate-600 font-medium">
                                        {item.unit || item.material?.unit}
                                    </span>
                                </div>
                                {item.notes && (
                                    <p className="text-sm text-slate-600 mt-2 italic">
                                        {item.notes}
                                    </p>
                                )}
                                {item.photoPreview && (
                                    <div className="mt-3">
                                        <img
                                            src={item.photoPreview}
                                            alt="Preview"
                                            className="w-20 h-20 object-cover rounded-lg border-2 border-slate-200"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2 ml-4">
                                <button
                                    onClick={() => onEdit(item)}
                                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all hover:scale-110 active:scale-95"
                                    title="Modifica"
                                >
                                    <Edit2 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => onDelete(item.tempId)}
                                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all hover:scale-110 active:scale-95"
                                    title="Elimina"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add More Button */}
            <button
                onClick={onAddMore}
                disabled={loading}
                className="w-full py-3 bg-white border-2 border-amber-300 text-amber-700 font-bold rounded-xl hover:bg-amber-50 hover:border-amber-400 transition-all flex items-center justify-center gap-2 mb-4 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Plus className="w-5 h-5" />
                Aggiungi Altro Materiale
            </button>

            {/* Submit All Button */}
            <button
                onClick={onSubmitAll}
                disabled={loading || cartItems.length === 0}
                className="w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white font-black text-lg rounded-xl shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40 transition-all flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
            >
                {loading ? (
                    <>
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        Invio in corso...
                    </>
                ) : (
                    <>
                        <Send className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        Invia Tutti ({cartItems.length} {cartItems.length === 1 ? 'materiale' : 'materiali'})
                    </>
                )}
            </button>

            {/* Info Footer */}
            <p className="text-xs text-center text-amber-700 mt-4 font-medium">
                💡 I materiali saranno inviati solo quando premi "Invia Tutti"
            </p>
        </div>
    );
}

MaterialCart.propTypes = {
    cartItems: PropTypes.array,
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onAddMore: PropTypes.func.isRequired,
    onSubmitAll: PropTypes.func.isRequired,
    loading: PropTypes.bool
};
