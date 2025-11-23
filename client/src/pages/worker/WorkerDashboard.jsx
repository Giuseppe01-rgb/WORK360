import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { attendanceAPI, siteAPI, materialAPI, equipmentAPI, noteAPI, photoAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Clock, Package, FileText, Camera, MapPin, LogIn, LogOut, Upload, Plus } from 'lucide-react';

export default function WorkerDashboard() {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const [activeTab, setActiveTab] = useState('attendance');
    const [activeAttendance, setActiveAttendance] = useState(null);
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState('');
    const [showGeoHelp, setShowGeoHelp] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form states
    const [materialForm, setMaterialForm] = useState({ name: '', quantity: '', unit: '' });
    const [noteText, setNoteText] = useState('');
    const [photoFile, setPhotoFile] = useState(null);
    const [photoCaption, setPhotoCaption] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [sitesData, attendanceData] = await Promise.all([
                siteAPI.getAll(),
                attendanceAPI.getActive()
            ]);
            setSites(sitesData.data);
            if (attendanceData.data && attendanceData.data._id) {
                setActiveAttendance(attendanceData.data);
                // Handle populated site object
                const siteId = attendanceData.data.site?._id || attendanceData.data.site;
                setSelectedSite(siteId);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    // ... existing getLocation ...

    // ... existing handlers ...

    // Custom Select Component for better UI
    const CustomSelect = ({ value, onChange, options, placeholder, disabled }) => (
        <div className="relative">
            <select
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all disabled:bg-slate-50 disabled:text-slate-400"
                value={value}
                onChange={onChange}
                disabled={disabled}
            >
                <option value="">{placeholder}</option>
                {options.length === 0 && <option disabled>Nessun cantiere trovato (Verifica con il titolare)</option>}
                {options.map(opt => (
                    <option key={opt._id} value={opt._id}>{opt.name}</option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    );

    const getLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalizzazione non supportata dal tuo browser'));
            } else {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        });
                    },
                    (error) => {
                        console.error('Geolocation error:', error);
                        let message = 'Errore geolocalizzazione';
                        if (error.code === error.PERMISSION_DENIED) {
                            setShowGeoHelp(true);
                            message = 'Permesso geolocalizzazione negato. Clicca su "Aiuto" per istruzioni.';
                        } else if (error.code === error.POSITION_UNAVAILABLE) {
                            message = 'Posizione non disponibile. Assicurati che il GPS sia attivo.';
                        } else if (error.code === error.TIMEOUT) {
                            message = 'Timeout: impossibile ottenere la posizione. Riprova.';
                        }
                        reject(new Error(message));
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            }
        });
    };

    const handleClockIn = async () => {
        if (!selectedSite) {
            showError('Seleziona un cantiere');
            return;
        }

        setLoading(true);
        try {
            const location = await getLocation();
            const response = await attendanceAPI.clockIn({
                siteId: selectedSite,
                location
            });
            setActiveAttendance(response.data);
            showSuccess('Entrata registrata con successo');
        } catch (error) {
            showError(error.message || 'Errore durante la timbratura');
        } finally {
            setLoading(false);
        }
    };

    const handleClockOut = async () => {
        setLoading(true);
        try {
            const location = await getLocation();
            await attendanceAPI.clockOut({
                attendanceId: activeAttendance._id,
                ...location
            });
            setActiveAttendance(null);
            setSelectedSite('');
            showSuccess('Uscita registrata con successo');
        } catch (error) {
            showError(error.message || 'Errore durante la timbratura');
        } finally {
            setLoading(false);
        }
    };

    const handleMaterialSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSite) {
            showError('Seleziona un cantiere');
            return;
        }
        try {
            await materialAPI.create({
                siteId: selectedSite,
                ...materialForm
            });
            showSuccess('Materiale registrato');
            setMaterialForm({ name: '', quantity: '', unit: '' });
        } catch (error) {
            showError('Errore salvataggio materiale');
        }
    };

    const handleNoteSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSite) {
            showError('Seleziona un cantiere');
            return;
        }
        try {
            await noteAPI.create({
                siteId: selectedSite,
                content: noteText
            });
            showSuccess('Nota salvata');
            setNoteText('');
        } catch (error) {
            showError('Errore salvataggio nota');
        }
    };

    const handlePhotoSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSite || !photoFile) {
            showError('Seleziona cantiere e foto');
            return;
        }

        const formData = new FormData();
        formData.append('photo', photoFile);
        formData.append('siteId', selectedSite);
        formData.append('caption', photoCaption);

        try {
            await photoAPI.upload(formData);
            showSuccess('Foto caricata');
            setPhotoFile(null);
            setPhotoCaption('');
        } catch (error) {
            showError('Errore caricamento foto');
        }
    };

    const tabs = [
        { id: 'attendance', label: 'Timbratura', icon: Clock },
        { id: 'materials', label: 'Materiali', icon: Package },
        { id: 'notes', label: 'Note', icon: FileText },
        { id: 'photos', label: 'Foto', icon: Camera },
    ];

    return (
        <Layout title="WORK360 Operaio" subtitle={user?.username}>
            <div className="max-w-3xl mx-auto">
                {/* Geo Help Modal */}
                {showGeoHelp && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                    <MapPin className="w-8 h-8 text-red-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">
                                    Geolocalizzazione Disabilitata
                                </h3>
                                <p className="text-slate-600 mb-6">
                                    Per timbrare è <strong>obbligatorio</strong> fornire la posizione.
                                    Il browser ha bloccato l'accesso.
                                </p>

                                <div className="bg-slate-50 rounded-xl p-4 text-left w-full mb-6 text-sm text-slate-700">
                                    <p className="font-bold mb-2">Come attivarla:</p>
                                    <ol className="list-decimal pl-4 space-y-2">
                                        <li>Clicca sull'icona del lucchetto 🔒 o delle impostazioni ⚙️ nella barra dell'indirizzo</li>
                                        <li>Cerca "Posizione" o "Geolocalizzazione"</li>
                                        <li>Seleziona <strong>"Consenti"</strong> o "Chiedi ogni volta"</li>
                                        <li>Ricarica la pagina</li>
                                    </ol>
                                </div>

                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => setShowGeoHelp(false)}
                                        className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                    >
                                        Chiudi
                                    </button>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="flex-1 py-3 px-4 bg-[#5D5FEF] text-white font-bold rounded-xl hover:bg-[#4B4DDB] transition-colors"
                                    >
                                        Ricarica Pagina
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs Navigation */}
                <div className="flex overflow-x-auto bg-white rounded-xl border border-slate-200 p-1 mb-6 shadow-sm">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>



                {/* ATTENDANCE TAB */}
                {activeTab === 'attendance' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-2">
                                <Clock className="w-6 h-6 text-slate-900" />
                                Registra Presenza
                            </h2>
                            <p className="text-slate-500">Seleziona il cantiere e registra la tua attività</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Seleziona Cantiere
                                </label>
                                <CustomSelect
                                    value={selectedSite}
                                    onChange={(e) => setSelectedSite(e.target.value)}
                                    options={sites}
                                    placeholder="Scegli un cantiere..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    onClick={handleClockIn}
                                    disabled={loading || activeAttendance}
                                    className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${loading || activeAttendance
                                        ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-green-50 border-green-100 text-green-700 hover:border-green-200 hover:bg-green-100'
                                        }`}
                                >
                                    <div className={`p-3 rounded-full mb-3 ${loading || activeAttendance ? 'bg-slate-100' : 'bg-green-200'
                                        }`}>
                                        <LogIn className="w-6 h-6" />
                                    </div>
                                    <span className="font-bold text-lg">Entrata</span>
                                    <span className="text-sm opacity-75">Inizia turno</span>
                                </button>

                                <button
                                    onClick={handleClockOut}
                                    disabled={loading || !activeAttendance}
                                    className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${loading || !activeAttendance
                                        ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-red-50 border-red-100 text-red-700 hover:border-red-200 hover:bg-red-100'
                                        }`}
                                >
                                    <div className={`p-3 rounded-full mb-3 ${loading || !activeAttendance ? 'bg-slate-100' : 'bg-red-200'
                                        }`}>
                                        <LogOut className="w-6 h-6" />
                                    </div>
                                    <span className="font-bold text-lg">Uscita</span>
                                    <span className="text-sm opacity-75">Termina turno</span>
                                </button>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mt-4">
                                <MapPin className="w-4 h-4" />
                                <span>La tua posizione GPS verrà registrata automaticamente</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* MATERIALS TAB */}
                {activeTab === 'materials' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Package className="w-6 h-6" />
                            Materiali Utilizzati
                        </h3>
                        <form onSubmit={handleMaterialSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Cantiere</label>
                                <CustomSelect
                                    value={selectedSite}
                                    onChange={(e) => setSelectedSite(e.target.value)}
                                    options={sites}
                                    placeholder="Seleziona..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Materiale</label>
                                <input
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                    placeholder="Es. Cemento, Mattoni..."
                                    value={materialForm.name}
                                    onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Quantità</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                        placeholder="0"
                                        value={materialForm.quantity}
                                        onChange={(e) => setMaterialForm({ ...materialForm, quantity: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Unità</label>
                                    <input
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                        placeholder="pz, kg, m..."
                                        value={materialForm.unit}
                                        onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Aggiungi Materiale
                            </button>
                        </form>
                    </div>
                )}

                {/* NOTES TAB */}
                {activeTab === 'notes' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <FileText className="w-6 h-6" />
                            Note di Lavoro
                        </h3>
                        <form onSubmit={handleNoteSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Cantiere</label>
                                <CustomSelect
                                    value={selectedSite}
                                    onChange={(e) => setSelectedSite(e.target.value)}
                                    options={sites}
                                    placeholder="Seleziona..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Nota</label>
                                <textarea
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none min-h-[120px]"
                                    placeholder="Descrivi il lavoro svolto o problemi riscontrati..."
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                            >
                                <FileText className="w-5 h-5" />
                                Salva Nota
                            </button>
                        </form>
                    </div>
                )}

                {/* PHOTOS TAB */}
                {activeTab === 'photos' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Camera className="w-6 h-6" />
                            Carica Foto
                        </h3>
                        <form onSubmit={handlePhotoSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Cantiere</label>
                                <CustomSelect
                                    value={selectedSite}
                                    onChange={(e) => setSelectedSite(e.target.value)}
                                    options={sites}
                                    placeholder="Seleziona..."
                                />
                            </div>

                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setPhotoFile(e.target.files[0])}
                                    required
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="w-8 h-8 text-slate-400" />
                                    <p className="text-sm font-medium text-slate-600">
                                        {photoFile ? photoFile.name : 'Clicca per caricare una foto'}
                                    </p>
                                    <p className="text-xs text-slate-400">PNG, JPG fino a 10MB</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Didascalia</label>
                                <input
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                                    placeholder="Descrizione della foto..."
                                    value={photoCaption}
                                    onChange={(e) => setPhotoCaption(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                            >
                                <Upload className="w-5 h-5" />
                                Carica Foto
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </Layout>
    );
}
