import { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { colouraMaterialAPI } from '../../utils/api';

const ExcelImportModal = ({ onClose, onImport }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('upload'); // 'upload' or 'preview' or 'complete'
    const fileInputRef = useRef(null);

    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Validate file type
        const fileType = selectedFile.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls', 'csv'].includes(fileType)) {
            alert('Formato file non valido. Usa Excel (.xlsx, .xls) o CSV (.csv)');
            return;
        }

        setFile(selectedFile);
        await getPreview(selectedFile);
    };

    const getPreview = async (file) => {
        setLoading(true);
        try {
            const response = await colouraMaterialAPI.importExcel(file, true);
            setPreview(response.data);
            setStep('preview');
        } catch (error) {
            console.error('Preview error:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Errore nel caricamento del file';
            alert(errorMsg);
            setFile(null);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmImport = async () => {
        setLoading(true);
        try {
            const response = await colouraMaterialAPI.importExcel(file, false);
            setPreview(response.data);
            setStep('complete');

            // Call parent callback after short delay to show success
            setTimeout(() => {
                onImport();
                onClose();
            }, 2000);
        } catch (error) {
            console.error('Import error:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Errore nell\'importazione';
            alert(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-6 h-6 text-green-600" />
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">
                                    Importa da Excel/CSV
                                </h3>
                                <p className="text-sm text-slate-600">
                                    Carica il file con i materiali del catalogo
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
                        >
                            <X className="w-6 h-6 text-slate-700" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'upload' && (
                        <div>
                            {/* Instructions */}
                            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <h4 className="font-bold text-blue-900 mb-2">📋 Formato file richiesto</h4>
                                <p className="text-sm text-blue-800 mb-2">Il file Excel/CSV deve contenere le seguenti colonne:</p>
                                <ul className="text-sm text-blue-800 space-y-1 ml-4">
                                    <li>• <strong>Codice prodotto</strong> (facoltativo)</li>
                                    <li>• <strong>Marca</strong> (obbligatorio)</li>
                                    <li>• <strong>Nome Prodotto</strong> (obbligatorio)</li>
                                    <li>• <strong>Categoria</strong> (Pittura interna, Pittura esterna, Stucco, Primer, Rasante, Altro)</li>
                                    <li>• <strong>Quantità/UM</strong> (es. "15L", "20kg") (obbligatorio)</li>
                                    <li>• <strong>Prezzo</strong> (opzionale)</li>
                                    <li>• <strong>Fornitore</strong> (verrà ignorato)</li>
                                </ul>
                            </div>

                            {/* Upload Area */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                                <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                                <p className="text-lg font-medium text-slate-700 mb-2">
                                    Clicca per caricare o trascina il file qui
                                </p>
                                <p className="text-sm text-slate-500">
                                    Formati supportati: .xlsx, .xls, .csv
                                </p>
                                {file && (
                                    <div className="mt-4 inline-block bg-green-100 text-green-800 px-4 py-2 rounded-lg">
                                        <FileSpreadsheet className="w-4 h-4 inline mr-2" />
                                        {file.name}
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>
                    )}

                    {step === 'preview' && preview && (
                        <div>
                            {/* Stats */}
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-bold text-blue-900">{preview.stats.totalRows}</p>
                                    <p className="text-xs text-blue-700">Righe totali</p>
                                </div>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-bold text-green-900">{preview.stats.validMaterials}</p>
                                    <p className="text-xs text-green-700">Da importare</p>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-bold text-amber-900">{preview.stats.duplicateRows}</p>
                                    <p className="text-xs text-amber-700">Duplicati</p>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-bold text-red-900">{preview.stats.errorRows}</p>
                                    <p className="text-xs text-red-700">Errori</p>
                                </div>
                            </div>

                            {/* Errors */}
                            {preview.errors && preview.errors.length > 0 && (
                                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
                                    <div className="flex items-start gap-2 mb-2">
                                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <h4 className="font-bold text-red-900 mb-1">Errori trovati</h4>
                                            <div className="text-sm text-red-800 space-y-1 max-h-32 overflow-y-auto">
                                                {preview.errors.map((error, i) => (
                                                    <p key={i}>• {error}</p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Duplicates */}
                            {preview.duplicates && preview.duplicates.length > 0 && (
                                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <div className="flex items-start gap-2 mb-2">
                                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <h4 className="font-bold text-amber-900 mb-1">Materiali già presenti (verranno saltati)</h4>
                                            <div className="text-sm text-amber-800 space-y-1 max-h-32 overflow-y-auto">
                                                {preview.duplicates.map((dup, i) => (
                                                    <p key={i}>• Riga {dup.row}: {dup.codice} - {dup.nome}</p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Preview materials sample */}
                            {preview.materials && preview.materials.length > 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                    <h4 className="font-bold text-green-900 mb-3">Anteprima materiali (primi 5)</h4>
                                    <div className="space-y-2">
                                        {preview.materials.slice(0, 5).map((mat, i) => (
                                            <div key={i} className="bg-white rounded p-3 text-sm">
                                                <p className="font-bold text-slate-900">{mat.nome}</p>
                                                <div className="flex gap-4 text-xs text-slate-600 mt-1">
                                                    <span>Codice: <strong>{mat.codiceProdotto}</strong></span>
                                                    <span>Marca: {mat.marca}</span>
                                                    <span>Capacità: {mat.capacitaValore}{mat.capacitaUnita}</span>
                                                    {mat.prezzoPerConfezione && <span>Prezzo: €{mat.prezzoPerConfezione}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {preview.materials.length > 5 && (
                                        <p className="text-xs text-green-700 mt-2">
                                            ...e altri {preview.materials.length - 5} materiali
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'complete' && preview && (
                        <div className="text-center py-12">
                            <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Importazione completata!</h3>
                            <p className="text-lg text-slate-600 mb-4">
                                {preview.importedCount} materiali importati con successo
                            </p>
                            {preview.stats.errorRows > 0 && (
                                <p className="text-sm text-amber-600">
                                    {preview.stats.errorRows} righe con errori sono state saltate
                                </p>
                            )}
                            {preview.stats.duplicateRows > 0 && (
                                <p className="text-sm text-amber-600">
                                    {preview.stats.duplicateRows} duplicati sono stati saltati
                                </p>
                            )}
                        </div>
                    )}

                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-600">
                                {step === 'upload' ? 'Analisi file in corso...' : 'Importazione in corso...'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!loading && step !== 'complete' && (
                    <div className="p-6 border-t border-slate-200 bg-slate-50">
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Annulla
                            </button>
                            {step === 'preview' && preview && preview.stats.validMaterials > 0 && (
                                <button
                                    onClick={handleConfirmImport}
                                    className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors"
                                >
                                    Importa {preview.stats.validMaterials} materiali
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExcelImportModal;
