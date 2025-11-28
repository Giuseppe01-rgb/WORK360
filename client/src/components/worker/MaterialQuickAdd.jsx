import { useState } from 'react';
import { Package, CheckCircle } from 'lucide-react';
import MaterialOCRScanner from './MaterialOCRScanner';
import MaterialCatalogSearch from './MaterialCatalogSearch';
import ReportNewMaterial from './ReportNewMaterial';
import ManualMaterialEntry from './ManualMaterialEntry';

const MaterialQuickAdd = ({ selectedSite, onSuccess }) => {
    const [step, setStep] = useState('idle'); // idle, scanning, found, notfound, search, report, manual-entry
    const [scannedMaterial, setScannedMaterial] = useState(null);
    const [scannedCode, setScannedCode] = useState('');
    const [quantidade, setQuantidade] = useState(1);
    const [ocrData, setOcrData] = useState(null); // Store data extracted from OCR

    const handleScanComplete = (scanResult) => {
        if (scanResult.found) {
            // Material found in catalog
            setScannedMaterial(scanResult.material);
            setScannedCode(scanResult.codiceLetto);
            setStep('found');
        } else {
            // Material not found
            setScannedCode(scanResult.codiceLetto || '');
            setStep('notfound');
        }
    };

    const handleMaterialSelect = (material) => {
        setScannedMaterial(material);
        setStep('found');
    };

    const handleConfirmUsage = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/material-usage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    siteId: selectedSite,
                    materialId: scannedMaterial._id,
                    numeroConfezioni: quantidade
                })
            });

            if (!response.ok) throw new Error('Errore nel salvataggio');

            onSuccess?.();
            resetFlow();
        } catch (error) {
            console.error('Usage save error:', error);
            alert('Errore nel salvataggio');
        }
    };

    const handleReportNewMaterial = async (reportData) => {
        try {
            // First upload photo
            const formData = new FormData();
            formData.append('file', reportData.photoFile);

            const token = localStorage.getItem('token');
            const uploadRes = await fetch('/api/photos/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!uploadRes.ok) throw new Error('Errore upload foto');

            const uploadData = await uploadRes.json();

            // Then create reported material
            const response = await fetch('/api/reported-materials', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    siteId: selectedSite,
                    fotoUrl: uploadData.url,
                    codiceLetto: reportData.codiceLetto,
                    nomeDigitato: reportData.nomeDigitato,
                    categoriaDigitata: reportData.categoriaDigitata,
                    numeroConfezioni: reportData.numeroConfezioni
                })
            });

            if (!response.ok) throw new Error('Errore nel salvataggio della segnalazione');

            alert('Segnalazione inviata! L\'ufficio la controllerà a breve.');
            resetFlow();
            onSuccess?.();
        } catch (error) {
            console.error('Report error:', error);
            alert('Errore nell\'invio della segnalazione');
        }
    };

    const handleManualMaterialEntry = async (formData) => {
        try {
            const token = localStorage.getItem('token');

            // Build quantita string if values provided
            let quantita = '';
            if (formData.quantita_valore && formData.quantita_unita) {
                quantita = `${formData.quantita_valore} ${formData.quantita_unita}`;
            } else if (formData.quantita_valore) {
                quantita = formData.quantita_valore;
            }

            // Create usage tracking entry
            const response = await fetch('/api/material-usage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    siteId: selectedSite,
                    manualEntry: {
                        codice_prodotto: formData.codice_prodotto,
                        nome_prodotto: formData.nome_prodotto,
                        quantita: quantita
                    },
                    numeroConfezioni: formData.pezzi
                })
            });

            if (!response.ok) throw new Error('Errore nel salvataggio');

            onSuccess?.();
            resetFlow();
        } catch (error) {
            console.error('Manual entry save error:', error);
            alert('Errore nel salvataggio');
        }
    };

    const resetFlow = () => {
        setStep('idle');
        setScannedMaterial(null);
        setScannedCode('');
        setQuantidade(1);
        setOcrData(null);
    };

    if (!selectedSite) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-800">
                    ⚠️ Seleziona prima un cantiere
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* Main CTA Button */}
            {step === 'idle' && (
                <button
                    onClick={() => setStep('scanning')}
                    className="w-full py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-xl rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-3"
                >
                    <Package className="w-8 h-8" />
                    Aggiungi materiale usato
                </button>
            )}

            {/* Scanner Modal */}
            {step === 'scanning' && (
                <MaterialOCRScanner
                    onScanComplete={handleScanComplete}
                    onClose={resetFlow}
                />
            )}

            {/* Material Found - Confirmation */}
            {step === 'found' && scannedMaterial && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6">
                            <div className="flex items-center justify-center mb-4">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-12 h-12 text-green-600" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-center text-slate-900 mb-6">
                                Materiale trovato!
                            </h3>

                            {/* Material Info */}
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                                <p className="font-bold text-green-900 text-lg mb-2">{scannedMaterial.nome_prodotto}</p>
                                <div className="space-y-1 text-sm text-green-800">
                                    <p><span className="font-semibold">Marca:</span> {scannedMaterial.marca}</p>
                                    <p><span className="font-semibold">Categoria:</span> {scannedMaterial.categoria}</p>
                                    {scannedMaterial.quantita && (
                                        <p><span className="font-semibold">Confezione:</span> {scannedMaterial.quantita}</p>
                                    )}
                                    {scannedMaterial.codice_prodotto && (
                                        <p><span className="font-semibold">Codice:</span> {scannedMaterial.codice_prodotto}</p>
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
                                        onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                                        className="w-16 h-16 bg-slate-200 hover:bg-slate-300 rounded-xl text-3xl font-bold transition-colors"
                                    >
                                        −
                                    </button>
                                    <div className="flex-1 text-center">
                                        <div className="text-5xl font-bold text-blue-600">{quantidade}</div>
                                    </div>
                                    <button
                                        onClick={() => setQuantidade(quantidade + 1)}
                                        className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-3xl font-bold transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={resetFlow}
                                    className="flex-1 py-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-lg"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleConfirmUsage}
                                    className="flex-1 py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors text-lg"
                                >
                                    Conferma
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Material Not Found - Choose Action */}
            {step === 'notfound' && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-center text-slate-900 mb-3">
                            Non troviamo questo materiale
                        </h3>
                        <p className="text-center text-slate-600 mb-6">
                            Scegli come vuoi continuare
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => setStep('manual-entry')}
                                className="w-full py-4 bg-green-600 text-white font-bold text-lg rounded-xl hover:bg-green-700 transition-colors"
                            >
                                ✍️ Inserisci manualmente
                            </button>
                            <button
                                onClick={() => setStep('search')}
                                className="w-full py-4 bg-blue-600 text-white font-bold text-lg rounded-xl hover:bg-blue-700 transition-colors"
                            >
                                🔍 Cerca nell'elenco
                            </button>
                            <button
                                onClick={() => setStep('report')}
                                className="w-full py-4 bg-orange-600 text-white font-bold text-lg rounded-xl hover:bg-orange-700 transition-colors"
                            >
                                📢 Segnala nuovo materiale
                            </button>
                            <button
                                onClick={resetFlow}
                                className="w-full py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Annulla
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Search Modal */}
            {step === 'search' && (
                <MaterialCatalogSearch
                    onSelect={handleMaterialSelect}
                    onClose={resetFlow}
                    onReportNew={() => setStep('report')}
                />
            )}

            {/* Report New Material Modal */}
            {step === 'report' && (
                <ReportNewMaterial
                    initialCode={scannedCode}
                    onSubmit={handleReportNewMaterial}
                    onClose={resetFlow}
                />
            )}

            {/* Manual Material Entry */}
            {step === 'manual-entry' && (
                <ManualMaterialEntry
                    initialData={ocrData || { codice_prodotto: scannedCode }}
                    onSubmit={handleManualMaterialEntry}
                    onClose={resetFlow}
                    onSearchCatalog={() => setStep('search')}
                />
            )}
        </div>
    );
};

export default MaterialQuickAdd;
