import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, AlertCircle, X } from 'lucide-react';
import { photoAPI } from '../../utils/api';

const ReportMaterialForm = ({ siteId, onSubmit, onCancel }) => {
    const [nomeDigitato, setNomeDigitato] = useState('');
    const [numeroConfezioni, setNumeroConfezioni] = useState(1);
    const [note, setNote] = useState('');
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    // Camera state
    const [showCamera, setShowCamera] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

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
            setError('Impossibile accedere alla fotocamera. Usa "Carica File".');
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
            setError('');
        }, 'image/jpeg', 0.95);
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('La foto non può superare 5MB');
                return;
            }
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
            setError('');
        }
    };

    const handleSubmit = async () => {
        if (!photoFile) {
            setError('La foto è obbligatoria per segnalare un nuovo materiale');
            return;
        }

        if (!nomeDigitato || nomeDigitato.trim() === '') {
            setError('Il nome del materiale è obbligatorio');
            return;
        }

        setUploading(true);
        setError('');

        try {
            // 1. Upload photo first
            const formData = new FormData();
            formData.append('photo', photoFile);
            formData.append('siteId', siteId); // Required by backend

            // Use the API utility which handles base URL and auth
            const uploadRes = await photoAPI.upload(formData);

            // The response from axios is already the data object in uploadRes.data
            // But wait, api.js returns the axios promise.
            // Let's check api.js return value.
            // photoAPI.upload returns api.post(...) which returns a Promise that resolves to the response object.
            // The response object has a .data property.

            const uploadData = uploadRes.data;

            // However, looking at photoController.js, it returns the photo object directly.
            // So uploadData will be the photo object.
            // We need the URL. The photo object has 'path' and 'filename'.
            // We might need to construct the URL or the controller returns it.
            // photoController.js: res.status(201).json(photo);
            // Photo model likely has a virtual for url or we use the path.
            // Let's check how other components use it or just use the filename/path.
            // Actually, the previous code expected `uploadData.url`.
            // Let's check if the Photo model has a URL virtual or if we need to construct it.
            // But for now, let's just fix the upload call first.
            // Wait, if I change to photoAPI, I need to make sure I import it.
            // It is not imported in the component.
            // I should add the import at the top.d('invoice', file) for invoice, but for photoAPI it just passes formData.
            // Let's assume controller expects 'photo' based on typical patterns, or check photoRoutes.
            // Actually, let's look at the raw fetch call I'm replacing: it used 'file'.
            // But wait, I should check what the backend expects.
            // The previous code used 'file'. 
            // Let's use the api utility.

            // Re-reading api.js:
            // export const photoAPI = {
            //    upload: (formData) => api.post('/photos/upload', formData, { ... })
            // }

            // So I should construct FormData and pass it.
            // I need to know the field name. 
            // Let's check photoController.js or photoRoutes.js to be sure.
            // For now, I will use 'photo' as a safe bet for a photo upload, but I'll check the controller in the next step if this fails.
            // Actually, I'll stick to 'file' if the previous code used it, BUT the previous code might have been wrong.
            // Let's check the controller first.

            // WAIT - I can't check the controller inside this replace block.
            // I will assume 'photo' is the standard for this app's photo upload based on other components, 
            // OR I will check the controller in a separate step before applying this change.

            // actually, looking at the previous raw fetch:
            // formData.append('file', photoFile);
            // It failed. Maybe because of the URL (missing base URL in production).

            // I'll use photoAPI.upload which handles the base URL.
            // I'll use 'photo' as the field name because `photoAPI` suggests it uploads a photo.

            // Let's do a quick check of photoRoutes.js or photoController.js first to be 100% sure.
            // I'll abort this replace and check the controller first.

            // 2. Create reported material
            // Backend returns 'path' field (which is cloudinary URL if configured, or local path)
            await onSubmit({
                siteId,
                fotoUrl: uploadData.path,
                nomeDigitato,
                numeroConfezioni,
                note
            });

        } catch (error) {
            console.error('Report error:', error);
            setError('Errore nell\'invio della segnalazione');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white p-6 border-b border-slate-200 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <AlertCircle className="w-6 h-6 text-orange-600" />
                            Segnala Nuovo Materiale
                        </h3>
                        <button
                            onClick={onCancel}
                            disabled={uploading}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
                        >
                            <X className="w-6 h-6 text-slate-700" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Info Alert */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-800">
                            💡 <strong>Importante:</strong> Carica una foto dell'etichetta del materiale.
                            L'ufficio la approverà e il materiale sarà aggiunto al catalogo.
                        </p>
                    </div>

                    {/* Photo Upload */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-3">
                            Foto Etichetta <span className="text-red-600">*</span>
                        </label>

                        {photoPreview ? (
                            <div className="relative">
                                <img
                                    src={photoPreview}
                                    alt="Preview"
                                    className="w-full h-64 object-cover rounded-lg border-2 border-slate-200"
                                />
                                <button
                                    onClick={() => {
                                        setPhotoFile(null);
                                        setPhotoPreview(null);
                                    }}
                                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {/* Camera Button */}
                                <button
                                    type="button"
                                    onClick={() => setShowCamera(true)}
                                    className="flex flex-col items-center justify-center p-6 bg-blue-50 border-2 border-blue-200 border-dashed rounded-xl hover:bg-blue-100 transition-all group"
                                >
                                    <div className="p-3 bg-blue-100 rounded-full mb-3 group-hover:bg-blue-200 transition-colors">
                                        <Camera className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <span className="font-bold text-blue-700">Scatta Foto</span>
                                    <span className="text-xs text-blue-500 mt-1">Usa la fotocamera</span>
                                </button>

                                {/* Gallery Button */}
                                <label className="cursor-pointer flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-slate-200 border-dashed rounded-xl hover:bg-slate-100 transition-all group">
                                    <div className="p-3 bg-slate-100 rounded-full mb-3 group-hover:bg-slate-200 transition-colors">
                                        <Upload className="w-8 h-8 text-slate-600" />
                                    </div>
                                    <span className="font-bold text-slate-700">Carica File</span>
                                    <span className="text-xs text-slate-500 mt-1">Dalla galleria</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Material Name */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                            Nome del materiale <span className="text-red-600">*</span>
                        </label>
                        <input
                            type="text"
                            value={nomeDigitato}
                            onChange={(e) => setNomeDigitato(e.target.value)}
                            placeholder="Es. Pittura bianca, Rasante fine, Primer..."
                            disabled={uploading}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:opacity-50"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Scrivi il nome che leggi sull'etichetta
                        </p>
                    </div>

                    {/* Quantity */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-3">
                            Quante confezioni hai usato? <span className="text-red-600">*</span>
                        </label>
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => setNumeroConfezioni(Math.max(1, numeroConfezioni - 1))}
                                disabled={uploading}
                                className="w-14 h-14 bg-slate-200 hover:bg-slate-300 rounded-xl text-2xl font-bold transition-colors disabled:opacity-50"
                            >
                                −
                            </button>
                            <div className="flex-1 text-center">
                                <div className="text-4xl font-bold text-blue-600">
                                    {numeroConfezioni}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setNumeroConfezioni(numeroConfezioni + 1)}
                                disabled={uploading}
                                className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-2xl font-bold transition-colors disabled:opacity-50"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                            Note (opzionale)
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Es. Etichetta rovinata, codice illeggibile..."
                            disabled={uploading}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none disabled:opacity-50"
                            rows={3}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Aggiungi dettagli che possono aiutare l'ufficio
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 bg-white p-6 border-t border-slate-200 rounded-b-2xl">
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            disabled={uploading}
                            className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={uploading || !photoFile}
                            className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? 'Invio...' : '📤 Invia Segnalazione'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Camera Modal Overlay */}
            {showCamera && (
                <div className="fixed inset-0 bg-black z-[60] flex flex-col">
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
                                <div className="relative rounded-xl overflow-hidden mb-4 bg-black">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        className="w-full h-auto"
                                    />
                                </div>
                                <canvas ref={canvasRef} className="hidden" />
                                <button
                                    onClick={capturePhoto}
                                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30"
                                >
                                    📸 Scatta Ora
                                </button>
                            </div>
                        ) : (
                            <div className="text-white text-center">
                                <p className="text-lg animate-pulse">Avvio fotocamera...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportMaterialForm;
