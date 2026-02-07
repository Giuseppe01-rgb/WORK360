import { useState, useRef, useEffect } from 'react';
import { Camera, X, Upload, AlertCircle } from 'lucide-react';
import PropTypes from 'prop-types';

const ReportNewMaterial = ({ onSubmit, onClose, initialCode = '' }) => {
    const [formData, setFormData] = useState({
        nomeDigitato: '',
        categoriaDigitata: 'Altro',
        numeroConfezioni: 1
    });
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);

    const categories = [
        'Pittura interna',
        'Pittura esterna',
        'Stucco',
        'Primer',
        'Rasante',
        'Altro'
    ];

    useEffect(() => {
        if (showCamera) {
            startCamera();
        }
        return () => stopCamera();
    }, [showCamera]);

    useEffect(() => {
        if (isCameraActive && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isCameraActive]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });

            streamRef.current = stream;
            setIsCameraActive(true);
        } catch (err) {
            console.error('Camera access error:', err);
            alert('Impossibile accedere alla fotocamera');
            setShowCamera(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
            const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
            setPhotoFile(file);
            setPhotoPreview(canvas.toDataURL('image/jpeg'));
            setShowCamera(false);
            stopCamera();
        }, 'image/jpeg', 0.95);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!photoFile) {
            alert('La foto è obbligatoria');
            return;
        }

        setLoading(true);
        try {
            await onSubmit({
                ...formData,
                photoFile,
                codiceLetto: initialCode
            });
        } catch (error) {
            console.error('Submit error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900">
                            Segnala nuovo materiale
                        </h3>
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
                        >
                            <X className="w-6 h-6 text-slate-700" />
                        </button>
                    </div>
                    {initialCode && (
                        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800">
                            Codice letto: <span className="font-mono font-bold">{initialCode}</span>
                        </div>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Photo */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="block text-sm font-bold text-slate-900">
                                📸 Foto dell'etichetta *
                            </span>
                            {photoPreview && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPhotoFile(null);
                                        setPhotoPreview('');
                                    }}
                                    className="text-xs text-red-600 hover:underline"
                                >
                                    Rimuovi
                                </button>
                            )}
                        </div>

                        {photoPreview ? (
                            <div className="relative">
                                <img
                                    src={photoPreview}
                                    alt="Preview"
                                    className="w-full h-48 object-cover rounded-lg border-2 border-green-500"
                                />
                                <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">
                                    ✓ Foto caricata
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCamera(true)}
                                    className="w-full border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors"
                                >
                                    <Camera className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                                    <p className="text-sm font-medium text-slate-700">
                                        Apri fotocamera
                                    </p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full border-2 border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors"
                                >
                                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                    <p className="text-xs text-slate-600">
                                        Carica da galleria
                                    </p>
                                </button>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>

                    {/* Name */}
                    <div>
                        <label htmlFor="newMaterialName" className="block text-sm font-bold text-slate-900 mb-2">
                            🏷 Nome del materiale (come lo vedi sul secchio) *
                        </label>
                        <input
                            id="newMaterialName"
                            type="text"
                            placeholder="Es. Pittura bianca opaca"
                            value={formData.nomeDigitato}
                            onChange={(e) => setFormData({ ...formData, nomeDigitato: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-lg"
                            required
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label htmlFor="newMaterialCategory" className="block text-sm font-bold text-slate-900 mb-2">
                            📂 Categoria
                        </label>
                        <select
                            id="newMaterialCategory"
                            value={formData.categoriaDigitata}
                            onChange={(e) => setFormData({ ...formData, categoriaDigitata: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-lg"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Quantity */}
                    <div>
                        <span className="block text-sm font-bold text-slate-900 mb-2">
                            🔢 Quanti secchi/sacchi hai usato?
                        </span>
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({
                                    ...prev,
                                    numeroConfezioni: Math.max(1, prev.numeroConfezioni - 1)
                                }))}
                                className="w-14 h-14 bg-slate-200 hover:bg-slate-300 rounded-xl text-2xl font-bold transition-colors flex items-center justify-center"
                            >
                                −
                            </button>
                            <div className="flex-1 text-center">
                                <div className="text-4xl font-bold text-blue-600">
                                    {formData.numeroConfezioni}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {formData.numeroConfezioni === 1 ? 'confezione' : 'confezioni'}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({
                                    ...prev,
                                    numeroConfezioni: prev.numeroConfezioni + 1
                                }))}
                                className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-2xl font-bold transition-colors flex items-center justify-center"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800">
                                <p className="font-semibold">Cosa succede dopo:</p>
                                <p className="mt-1">L'ufficio controllerà la segnalazione e aggiungerà il materiale al catalogo. Da quel momento sarà disponibile per tutti.</p>
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 py-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-lg disabled:opacity-50"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !photoFile}
                            className="flex-1 py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Invio...' : 'Invia segnalazione'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Camera Modal */}
            {showCamera && (
                <div className="fixed inset-0 bg-black z-50 flex flex-col">
                    <div className="bg-white p-4 flex items-center justify-between">
                        <h3 className="text-lg font-bold">Scatta Foto</h3>
                        <button
                            onClick={() => {
                                setShowCamera(false);
                                stopCamera();
                            }}
                            className="p-2 hover:bg-slate-100 rounded-full"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 flex items-center justify-center p-4">
                        {isCameraActive ? (
                            <div className="w-full max-w-2xl">
                                <div className="relative rounded-xl overflow-hidden mb-4">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        className="w-full h-auto"
                                    >
                                        <track kind="captions" />
                                    </video>
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="border-4 border-white border-dashed rounded-lg w-3/4 h-2/3 opacity-50"></div>
                                    </div>
                                </div>
                                <canvas ref={canvasRef} className="hidden" />
                                <button
                                    onClick={capturePhoto}
                                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700"
                                >
                                    Scatta Foto
                                </button>
                            </div>
                        ) : (
                            <div className="text-white text-center">
                                <p className="text-lg">Avvio fotocamera...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

ReportNewMaterial.propTypes = {
    onSubmit: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    initialCode: PropTypes.string
};

export default ReportNewMaterial;
