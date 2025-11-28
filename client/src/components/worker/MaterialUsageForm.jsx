import { useState } from 'react';
import { Package, CheckCircle } from 'lucide-react';

const MaterialUsageForm = ({ material, siteId, onConfirm, onCancel }) => {
    const [numeroConfezioni, setNumeroConfezioni] = useState(1);
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await onConfirm({
                materialId: material._id,
                siteId,
                numeroConfezioni,
                note
            });
        } catch (error) {
            console.error('Submit error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="p-6">
                    {/* Success Icon */}
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-12 h-12 text-green-600" />
                        </div>
                    </div>

                    <h3 className="text-2xl font-bold text-center text-slate-900 mb-6">
                        Materiale Selezionato
                    </h3>

                    {/* Material Info */}
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                        <p className="font-bold text-green-900 text-lg mb-2">
                            {material.nome_prodotto}
                        </p>
                        <div className="space-y-1 text-sm text-green-800">
                            <p><span className="font-semibold">Marca:</span> {material.marca}</p>
                            <p><span className="font-semibold">Categoria:</span> {material.categoria}</p>
                            {material.quantita && (
                                <p>
                                    <span className="font-semibold">Confezione:</span>{' '}
                                    {material.quantita}
                                </p>
                            )}
                            {material.codice_prodotto && (
                                <p>
                                    <span className="font-semibold">Codice:</span>{' '}
                                    {material.codice_prodotto}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Quantity Selector */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-900 mb-3">
                            Quante confezioni hai usato?
                        </label>
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => setNumeroConfezioni(Math.max(1, numeroConfezioni - 1))}
                                className="w-16 h-16 bg-slate-200 hover:bg-slate-300 rounded-xl text-3xl font-bold transition-colors"
                            >
                                −
                            </button>
                            <div className="flex-1 text-center">
                                <div className="text-5xl font-bold text-blue-600">
                                    {numeroConfezioni}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setNumeroConfezioni(numeroConfezioni + 1)}
                                className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-3xl font-bold transition-colors"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Optional Note */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                            Note (opzionale)
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Es. Confezione danneggiata..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none"
                            rows={2}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            disabled={submitting}
                            className="flex-1 py-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-lg disabled:opacity-50"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex-1 py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Salvataggio...' : 'Conferma'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaterialUsageForm;
