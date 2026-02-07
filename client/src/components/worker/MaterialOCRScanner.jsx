import { useState, useRef, useEffect } from 'react';
import { X, Camera, AlertCircle, Loader } from 'lucide-react';
import PropTypes from 'prop-types';

const MaterialOCRScanner = ({ onScanComplete, onClose }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    useEffect(() => {
        if (isCameraActive && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isCameraActive]);

    const startCamera = async () => {
        try {
            setError('');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });

            streamRef.current = stream;
            setIsCameraActive(true);
        } catch (err) {
            console.error('Camera access error:', err);
            setError('Impossibile accedere alla fotocamera. Controlla i permessi del browser.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    };

    const capturePhoto = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        setIsProcessing(true);
        setError('');

        try {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            // Set canvas size to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw video frame to canvas
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);

            // Convert canvas to blob
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/jpeg', 0.95);
            });

            // Create FormData and send to API
            const formData = new FormData();
            formData.append('image', blob, 'capture.jpg');

            const response = await fetch('/api/material-usage/scan', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Errore nella scansione');
            }

            // Stop camera before callback
            stopCamera();
            onScanComplete(data);
        } catch (err) {
            console.error('Scan error:', err);
            setError(err.message || 'Errore nella scansione dell\'immagine');
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex flex-col z-50">
            {/* Header */}
            <div className="bg-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Camera className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-bold text-slate-900">Scansiona l'etichetta</h3>
                </div>
                <button
                    onClick={() => {
                        stopCamera();
                        onClose();
                    }}
                    disabled={isProcessing}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
                >
                    <X className="w-6 h-6 text-slate-700" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
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
                                        stopCamera();
                                        onClose();
                                    }}
                                    className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Chiudi
                                </button>
                                <button
                                    onClick={() => {
                                        setError('');
                                        startCamera();
                                    }}
                                    className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                                >
                                    Riprova
                                </button>
                            </div>
                        </div>
                    </div>
                ) : isProcessing ? (
                    <div className="bg-white rounded-xl p-8 max-w-md w-full">
                        <div className="flex flex-col items-center text-center">
                            <Loader className="w-16 h-16 text-blue-600 animate-spin mb-4" />
                            <h4 className="text-lg font-bold text-slate-900 mb-2">Scansiono...</h4>
                            <p className="text-slate-600">
                                Sto leggendo il codice dall'etichetta
                            </p>
                        </div>
                    </div>
                ) : isCameraActive ? (
                    <div className="w-full max-w-2xl">
                        {/* Camera preview */}
                        <div className="relative rounded-xl overflow-hidden shadow-2xl mb-6">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-auto"
                            />
                            {/* Overlay guide */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="border-4 border-blue-500 border-dashed rounded-lg w-3/4 h-2/3 opacity-50"></div>
                            </div>
                        </div>

                        {/* Hidden canvas for capture */}
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Capture button */}
                        <button
                            onClick={capturePhoto}
                            className="w-full py-4 bg-blue-600 text-white font-bold text-lg rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Camera className="w-6 h-6" />
                            Scatta Foto
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl p-8 max-w-md w-full">
                        <div className="flex flex-col items-center text-center">
                            <Loader className="w-16 h-16 text-blue-600 animate-spin mb-4" />
                            <h4 className="text-lg font-bold text-slate-900 mb-2">Avvio fotocamera...</h4>
                        </div>
                    </div>
                )}
            </div>

            {/* Instructions */}
            {isCameraActive && !error && !isProcessing && (
                <div className="bg-white/10 backdrop-blur-sm p-4 text-white text-center text-sm">
                    <p>💡 <strong>Consiglio:</strong> Centra il codice nel riquadro e scatta quando è ben illuminato</p>
                </div>
            )}
        </div>
    );
};

MaterialOCRScanner.propTypes = {
    onScanComplete: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired
};

export default MaterialOCRScanner;
