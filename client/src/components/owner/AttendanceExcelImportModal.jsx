import { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertTriangle, AlertCircle, Clock, User, Calendar } from 'lucide-react';
import { attendanceAPI } from '../../utils/api';

const AttendanceExcelImportModal = ({ onClose, onImport }) => {
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
            const response = await attendanceAPI.importExcel(file, true);
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
            const response = await attendanceAPI.importExcel(file, false);
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-6 h-6 text-green-600" />
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">
                                    Importa Presenze da Excel
                                </h3>
                                <p className="text-sm text-slate-600">
                                    Carica un file con Data, Dipendente, Ore e Cantiere
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
                                <p className="text-sm text-blue-800 mb-2">Il file Excel deve contenere le seguenti colonne:</p>
                                <ul className="text-sm text-blue-800 space-y-1 ml-4">
                                    <li>• <strong>Data</strong> (formato: GG/MM/AAAA o AAAA-MM-GG)</li>
                                    <li>• <strong>Dipendente</strong> (nome e cognome o username)</li>
                                    <li>• <strong>Ore</strong> (numero di ore lavorate, es. 8)</li>
                                    <li>• <strong>Cantiere</strong> (nome del cantiere)</li>
                                </ul>
                                <div className="mt-3 pt-3 border-t border-blue-200">
                                    <p className="text-xs text-blue-700">
                                        <Clock className="w-3 h-3 inline mr-1" />
                                        L'app calcolerà automaticamente: <strong>Entrata 07:00</strong> → <strong>Uscita calcolata</strong> (es. 8h → 15:00 nette)
                                    </p>
                                </div>
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
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-bold text-blue-900">{preview.stats.totalRows}</p>
                                    <p className="text-xs text-blue-700">Righe totali</p>
                                </div>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-bold text-green-900">{preview.stats.validAttendances}</p>
                                    <p className="text-xs text-green-700">Da importare</p>
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

                            {/* Preview attendances sample */}
                            {preview.attendances && preview.attendances.length > 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                    <h4 className="font-bold text-green-900 mb-3">Anteprima presenze (prime 5)</h4>
                                    <div className="space-y-2">
                                        {preview.attendances.slice(0, 5).map((att, i) => (
                                            <div key={i} className="bg-white rounded p-3 text-sm flex flex-wrap items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-slate-400" />
                                                    <span className="font-bold text-slate-900">{att.employeeName}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-slate-400" />
                                                    <span className="text-slate-600">{att.date}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-slate-400" />
                                                    <span className="text-slate-600">{att.clockIn} - {att.clockOut}</span>
                                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{att.hours}h</span>
                                                </div>
                                                <div className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                                                    📍 {att.siteName}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {preview.attendances.length > 5 && (
                                        <p className="text-xs text-green-700 mt-2">
                                            ...e altre {preview.attendances.length - 5} presenze
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
                                {preview.importedCount} presenze importate con successo
                            </p>
                            {preview.errors && preview.errors.length > 0 && (
                                <p className="text-sm text-amber-600">
                                    {preview.errors.length} righe con errori sono state saltate
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
                            {step === 'preview' && preview && preview.stats.validAttendances > 0 && (
                                <button
                                    onClick={handleConfirmImport}
                                    className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors"
                                >
                                    Importa {preview.stats.validAttendances} presenze
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceExcelImportModal;
