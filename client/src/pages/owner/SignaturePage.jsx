import { useState, useRef, useEffect } from 'react';
import Layout from '../../components/Layout';
import { userAPI } from '../../utils/api';
import { PenTool, Save, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

export default function SignaturePage() {
    const canvasRef = useRef();
    const [signatureText, setSignatureText] = useState('');
    const [signature, setSignature] = useState(null);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [selectedFont, setSelectedFont] = useState('Dancing Script');

    const fonts = [
        'Dancing Script',
        'Pacifico',
        'Satisfy',
        'Great Vibes',
        'Allura'
    ];

    useEffect(() => {
        loadSignature();
        // Load Google Fonts
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Pacifico&family=Satisfy&family=Great+Vibes&family=Allura&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }, []);

    useEffect(() => {
        if (signatureText) {
            generateSignaturePreview();
        }
    }, [signatureText, selectedFont]);

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const loadSignature = async () => {
        try {
            const response = await userAPI.getProfile();
            if (response.data.signature) {
                setSignature(response.data.signature);
            }
        } catch (error) {
            console.error('Error loading signature:', error);
            showNotification('error', 'Errore nel caricamento della firma');
        }
    };

    const generateSignaturePreview = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Set font and style
        ctx.font = `bold 60px "${selectedFont}", cursive`;
        ctx.fillStyle = '#0F172A';
        ctx.textBaseline = 'middle';

        // Measure text to center it
        const metrics = ctx.measureText(signatureText);
        const x = (canvas.width - metrics.width) / 2;
        const y = canvas.height / 2;

        // Draw text
        ctx.fillText(signatureText, x, y);
    };

    const handleSave = async () => {
        if (!signatureText || signatureText.trim() === '') {
            showNotification('error', 'Scrivi il tuo nome per generare la firma!');
            return;
        }

        setLoading(true);
        try {
            // Generate final signature
            const canvas = canvasRef.current;
            const dataURL = canvas.toDataURL('image/png');

            await userAPI.updateSignature(dataURL);

            setSignature(dataURL);
            showNotification('success', 'Firma salvata con successo!');

        } catch (error) {
            console.error('Error saving signature:', error);
            const errorMsg = error.response?.data?.message || 'Errore nel salvataggio. Riprova.';
            showNotification('error', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout title="Firma Elettronica">
            {notification && (
                <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 font-semibold flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {notification.message}
                </div>
            )}

            <div className="max-w-3xl mx-auto space-y-8">
                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 md:p-8 shadow-sm">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-2">
                            <PenTool className="w-6 h-6 text-slate-900" />
                            Genera la tua Firma
                        </h2>
                        <p className="text-slate-500">
                            Scrivi il tuo nome e scegli lo stile. La firma verrà generata automaticamente.
                        </p>
                    </div>

                    {/* Text Input */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Il tuo nome
                        </label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all text-lg"
                            placeholder="Es: Mario Rossi"
                            value={signatureText}
                            onChange={(e) => setSignatureText(e.target.value)}
                        />
                    </div>

                    {/* Font Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                            Stile della firma
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {fonts.map(font => (
                                <button
                                    key={font}
                                    type="button"
                                    onClick={() => setSelectedFont(font)}
                                    className={`px-4 py-2 rounded-lg border transition-all text-lg ${selectedFont === font
                                        ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    style={{ fontFamily: `"${font}", cursive` }}
                                >
                                    {font}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview Canvas */}
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 mb-6 flex items-center justify-center min-h-[150px]">
                        <canvas
                            role="img"
                            aria-label="Anteprima firma"
                            ref={canvasRef}
                            width={600}
                            height={150}
                            className="max-w-full h-auto"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <button
                            onClick={() => setSignatureText('')}
                            className="px-4 py-2.5 text-slate-600 font-semibold hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-5 h-5" />
                            Pulisci
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading || !signatureText}
                            className={`px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-all flex items-center gap-2 ${(!signatureText || loading) ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Salvataggio...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Salva Firma
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {signature && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 md:p-8 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            Firma Attuale
                        </h3>
                        <div className="bg-white border border-slate-200 rounded-xl p-4 inline-block shadow-sm">
                            <img
                                src={signature}
                                alt="Firma salvata"
                                className="max-h-24 max-w-full"
                            />
                        </div>
                        <p className="mt-4 text-sm text-slate-500">
                            Questa è la firma che apparirà sui tuoi preventivi e SAL.
                        </p>
                    </div>
                )}
            </div>
        </Layout>
    );
}
