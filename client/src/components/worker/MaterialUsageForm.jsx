import { useState, useEffect } from 'react';
import { Package, CheckCircle, Edit2 } from 'lucide-react';

const MaterialUsageForm = ({ material, siteId, onConfirm, onCancel, editMode = false, initialData = null }) => {
    const [numeroConfezioni, setNumeroConfezioni] = useState(1);
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Pre-fill form if editing
    useEffect(() => {
        if (editMode && initialData) {
            setNumeroConfezioni(initialData.quantity || initialData.numeroConfezioni || 1);
            setNote(initialData.notes || initialData.note || '');
        }
    }, [editMode, initialData]);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await onConfirm({
                materialId: material.id,
                siteId,
                numeroConfezioni,
                note,
                isEdit: editMode,
                tempId: initialData?.tempId // Pass tempId if editing
            });
        } catch (error) {
            console.error('Submit error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md animate-in zoom-in slide-in-from-bottom-4 duration-300">
                <div className="p-6">
                    {/* Success/Edit Icon */}
                    <div className="flex items-center justify-center mb-4">
                        <div className={`w-20 h-20 ${editMode ? 'bg-blue-100' : 'bg-green-100'} rounded-full flex items-center justify-center`}>
                            {editMode ? (
                                <Edit2 className="w-12 h-12 text-blue-600" />
                            ) : (
                                <CheckCircle className="w-12 h-12 text-green-600" />
                            )}
                        </div>
                    </div>

                    <h3 className="text-2xl font-bold text-center text-slate-900 mb-6">
                        {editMode ? 'Modifica Materiale' : 'Materiale Selezionato'}
                    </h3>

                    {/* Material Info */}
                    <div className={`${editMode ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'} border rounded-xl p-4 mb-6`}>
                        <p className={`font-bold ${editMode ? 'text-blue-900' : 'text-green-900'} text-lg mb-2`}>
                            {material.nome_prodotto}
                        </p>
                        <div className={`space-y-1 text-sm ${editMode ? 'text-blue-800' : 'text-green-800'}`}>
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
                            Quante confezioni {editMode ? 'vuoi usare' : 'hai usato'}?
                        </label>
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => setNumeroConfezioni(Math.max(1, numeroConfezioni - 1))}
                                className="w-16 h-16 bg-slate-200 hover:bg-slate-300 rounded-xl text-3xl font-bold transition-all hover:scale-110 active:scale-95"
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
                                className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-3xl font-bold transition-all hover:scale-110 active:scale-95"
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
                            className="flex-1 py-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all text-lg disabled:opacity-50 hover:scale-[1.02] active:scale-95"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className={`flex-1 py-4 ${editMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white font-bold rounded-xl transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95`}
                        >
                            {submitting ? 'Salvataggio...' : (editMode ? 'Salva Modifiche' : 'Aggiungi al Carrello')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaterialUsageForm;
