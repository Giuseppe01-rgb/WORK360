import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';
import PropTypes from 'prop-types';

const BarcodeScanner = ({ onScan, onClose }) => {
    const scannerRef = useRef(null);
    const html5QrCodeRef = useRef(null);
    const [error, setError] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        startScanner();
        return () => stopScanner();
    }, []);

    const startScanner = async () => {
        try {
            setError('');
            setIsScanning(true);

            // Create scanner instance
            html5QrCodeRef.current = new Html5Qrcode('barcode-scanner');

            // Get available cameras
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
                // Prefer back camera (usually index 0 or has 'back' in label)
                const backCamera = devices.find(d => d.label.toLowerCase().includes('back')) || devices[0];

                // Start scanning
                await html5QrCodeRef.current.start(
                    backCamera.id,
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    (decodedText) => {
                        // Success callback - barcode scanned
                        onScan(decodedText);
                        stopScanner();
                    },
                    (errorMessage) => {
                        // Error callback (usually "no code found", ignore these)
                        // console.log('Scan error:', errorMessage);
                    }
                );
            } else {
                setError('Nessuna fotocamera trovata sul dispositivo');
                setIsScanning(false);
            }
        } catch (err) {
            console.error('Scanner error:', err);
            setError(err.message || 'Errore nell\'accesso alla fotocamera. Verifica i permessi.');
            setIsScanning(false);
        }
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            try {
                await html5QrCodeRef.current.stop();
                html5QrCodeRef.current.clear();
            } catch (err) {
                console.error('Error stopping scanner:', err);
            }
        }
        setIsScanning(false);
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
            {/* Header */}
            <div className="bg-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Camera className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-bold text-slate-900">Scansiona Codice</h3>
                </div>
                <button
                    onClick={() => {
                        stopScanner();
                        onClose();
                    }}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <X className="w-6 h-6 text-slate-700" />
                </button>
            </div>

            {/* Scanner Container */}
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                {error ? (
                    <div className="bg-white rounded-xl p-6 max-w-md w-full">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 mb-2">Errore</h4>
                            <p className="text-slate-600 mb-6">{error}</p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => {
                                        onClose();
                                    }}
                                    className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Chiudi
                                </button>
                                <button
                                    onClick={() => {
                                        setError('');
                                        startScanner();
                                    }}
                                    className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                                >
                                    Riprova
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-md">
                        {/* Scanner viewport */}
                        <div
                            id="barcode-scanner"
                            className="rounded-xl overflow-hidden shadow-2xl"
                        ></div>

                        {/* Instructions */}
                        <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4 text-white text-center">
                            <p className="font-semibold mb-2">Posiziona il codice a barre nel riquadro</p>
                            <p className="text-sm text-white/80">
                                Supporta EAN-13, UPC, Code128 e altri formati
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

BarcodeScanner.propTypes = {
    onScan: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired
};

export default BarcodeScanner;

