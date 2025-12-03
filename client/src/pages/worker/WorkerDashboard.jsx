import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { attendanceAPI, siteAPI, materialAPI, equipmentAPI, noteAPI, photoAPI, workActivityAPI, materialMasterAPI, materialUsageAPI, reportedMaterialAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Clock, Package, FileText, Camera, MapPin, LogIn, LogOut, Upload, Plus, Scan } from 'lucide-react';
import TimeDistributionModal from '../../components/worker/TimeDistributionModal';
import BarcodeScanner from '../../components/common/BarcodeScanner';
import MaterialsList from '../../components/worker/MaterialsList';
import MaterialSearch from '../../components/worker/MaterialSearch';
import MaterialUsageForm from '../../components/worker/MaterialUsageForm';
import ReportMaterialForm from '../../components/worker/ReportMaterialForm';

export default function WorkerDashboard() {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'attendance';
    const [activeAttendance, setActiveAttendance] = useState(null);
    const [todayAttendance, setTodayAttendance] = useState(null);
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState('');
    const [showGeoHelp, setShowGeoHelp] = useState(false);
    const [loading, setLoading] = useState(true); // Start loading to prevent flicker

    // Form states
    const [materialForm, setMaterialForm] = useState({ name: '', quantity: '', unit: '' });
    const [noteText, setNoteText] = useState('');
    const [photoFile, setPhotoFile] = useState(null);
    const [photoCaption, setPhotoCaption] = useState('');

    // Activity tracking states
    const [todayActivities, setTodayActivities] = useState([]);
    const [showTimeDistribution, setShowTimeDistribution] = useState(false);
    const [editingActivity, setEditingActivity] = useState(null);

    // Barcode scanner states
    const [showScanner, setShowScanner] = useState(false);
    const [scannedMaterial, setScannedMaterial] = useState(null);
    const [showNewMaterialForm, setShowNewMaterialForm] = useState(false);
    const [scannedBarcode, setScannedBarcode] = useState('');

    // Materials management states
    const [todayMaterials, setTodayMaterials] = useState([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const [showMaterialSearch, setShowMaterialSearch] = useState(false);
    const [showMaterialUsageForm, setShowMaterialUsageForm] = useState(false);
    const [showReportForm, setShowReportForm] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [sitesData, attendanceData, myRecordsData] = await Promise.all([
                siteAPI.getAll(),
                attendanceAPI.getActive(),
                attendanceAPI.getMyRecords({
                    startDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
                    endDate: new Date(new Date().setHours(23, 59, 59, 999)).toISOString()
                })
            ]);
            setSites(sitesData.data);

            // Set active attendance (open session)
            if (attendanceData.data && attendanceData.data._id) {
                setActiveAttendance(attendanceData.data);
                const siteId = attendanceData.data.site?._id || attendanceData.data.site;
                setSelectedSite(siteId);
            }

            // Set today's attendance (latest one, could be closed)
            if (myRecordsData.data && myRecordsData.data.length > 0) {
                // Get the latest one
                const latest = myRecordsData.data[myRecordsData.data.length - 1];
                setTodayAttendance(latest);
            } else if (attendanceData.data && attendanceData.data._id) {
                // If no records found but active exists (e.g. first one today), use active
                setTodayAttendance(attendanceData.data);
            }

            // Load today's activities
            await loadTodayActivities();
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTodayActivities = async () => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const response = await workActivityAPI.getAll({
                startDate: today.toISOString(),
                endDate: new Date().toISOString()
            });
            setTodayActivities(response.data || []);
        } catch (error) {
            console.error('Error loading today activities:', error);
        }
    };

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
                ...location // Spread location to send latitude/longitude at top level
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
        // Proceed directly with clock out
        await performClockOut();
    };

    const performClockOut = async () => {
        setLoading(true);
        try {
            const location = await getLocation();
            await attendanceAPI.clockOut({
                attendanceId: activeAttendance._id,
                ...location
            });
            setActiveAttendance(null);
            setSelectedSite('');
            setTodayActivities([]);
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
            // Create Material record ONLY (for inventory/cost)
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

    const handleActivitySubmit = async (e) => {
        e.preventDefault();
        if (!selectedSite) {
            showError('Seleziona un cantiere');
            return;
        }
        try {
            if (editingActivity) {
                // Update existing activity
                const response = await workActivityAPI.update(editingActivity._id, {
                    activityType: materialForm.name,
                    quantity: 1,
                    unit: 'report',
                    date: new Date()
                });

                // Update in local state
                setTodayActivities(prev => prev.map(act =>
                    act._id === editingActivity._id ? response.data : act
                ));

                showSuccess('Rapporto aggiornato');
                setEditingActivity(null);
            } else {
                // Create WorkActivity record ONLY (for time tracking/productivity)
                // For daily reports, we set default quantity/unit as they are now description-based
                const response = await workActivityAPI.create({
                    siteId: selectedSite,
                    activityType: materialForm.name,
                    quantity: 1, // Default quantity
                    unit: 'report', // Default unit
                    date: new Date()
                });

                // Add to today's activities
                setTodayActivities(prev => [...prev, response.data]);

                showSuccess('Rapporto salvato');
            }
            setMaterialForm({ name: '', quantity: '', unit: '' });
        } catch (error) {
            showError(editingActivity ? 'Errore aggiornamento rapporto' : 'Errore salvataggio rapporto');
        }
    };

    const handleEditActivity = (activity) => {
        setEditingActivity(activity);
        setMaterialForm({
            name: activity.activityType,
            quantity: '',
            unit: ''
        });
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingActivity(null);
        setMaterialForm({ name: '', quantity: '', unit: '' });
    };

    // Barcode handlers
    const handleBarcodeScanned = async (barcode) => {
        setShowScanner(false);
        setScannedBarcode(barcode);

        try {
            const response = await materialMasterAPI.getByBarcode(barcode);
            if (response.data.found) {
                // Material exists - show confirmation
                setScannedMaterial(response.data.material);
                setMaterialForm({
                    name: response.data.material.displayName,
                    quantity: '',
                    unit: response.data.material.unit
                });
            } else {
                // Material not found - show new material form
                setShowNewMaterialForm(true);
                setMaterialForm({ name: '', quantity: '', unit: '' });
            }
        } catch (error) {
            if (error.response?.status === 404) {
                // Material not found - show new material form
                setShowNewMaterialForm(true);
                setMaterialForm({ name: '', quantity: '', unit: '' });
            } else {
                showError('Errore nella ricerca del materiale');
            }
        }
    };

    const handleSaveNewMaterial = async (e) => {
        e.preventDefault();
        try {
            const newMaterial = await materialMasterAPI.create({
                displayName: materialForm.name,
                unit: materialForm.unit || 'pz',
                barcode: scannedBarcode,
                supplier: '',
                price: null
            });

            showSuccess('Materiale aggiunto al catalogo!');

            // Ask if they want to add to daily report
            if (window.confirm('Vuoi aggiungere questo materiale al report di oggi?')) {
                setScannedMaterial(newMaterial.data);
                setShowNewMaterialForm(false);
                // Material form is already filled, just need quantity
            } else {
                // Reset
                setShowNewMaterialForm(false);
                setScannedBarcode('');
                setMaterialForm({ name: '', quantity: '', unit: '' });
            }
        } catch (error) {
            showError('Errore nel salvataggio del materiale');
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
        if (!photoFile) return;

        try {
            const formData = new FormData();
            formData.append('siteId', selectedSite);
            formData.append('photo', photoFile);
            formData.append('caption', photoCaption);

            await photoAPI.create(formData);
            setPhotoFile(null);
            setPhotoCaption('');
            alert('Foto caricata con successo!');
        } catch (error) {
            console.error('Photo upload error:', error);
            alert('Errore nel caricamento della foto');
        }
    };

    // Materials Management Functions
    const loadTodayMaterials = async () => {
        setLoadingMaterials(true);
        try {
            const response = await materialUsageAPI.getTodayUsage(selectedSite);
            setTodayMaterials(response.data);
        } catch (error) {
            console.error('Load today materials error:', error);
            showError('Errore nel caricamento dei materiali');
        } finally {
            setLoadingMaterials(false);
        }
    };

    const handleMaterialSelect = (material) => {
        setSelectedMaterial(material);
        setShowMaterialSearch(false);
        setShowMaterialUsageForm(true);
    };

    const handleMaterialUsageConfirm = async (usageData) => {
        try {
            await materialUsageAPI.recordUsage(usageData);
            showSuccess('Materiale registrato con successo!');
            setShowMaterialUsageForm(false);
            setSelectedMaterial(null);
            loadTodayMaterials();
        } catch (error) {
            console.error('Record usage error:', error);
            showError('Errore nella registrazione del materiale');
            throw error;
        }
    };

    const handleReportMaterial = async (reportData) => {
        try {
            await reportedMaterialAPI.report(reportData);
            showSuccess('Segnalazione inviata! L\'ufficio la approverà a breve.');
            setShowReportForm(false);
            loadTodayMaterials();
        } catch (error) {
            console.error('Report material error:', error);
            showError('Errore nell\'invio della segnalazione');
            throw error;
        }
    };

    const resetMaterialFlow = () => {
        setShowMaterialSearch(false);
        setShowMaterialUsageForm(false);
        setShowReportForm(false);
        setSelectedMaterial(null);
    };

    // Load today's materials when tab becomes active
    useEffect(() => {
        if (activeTab === 'materials' && selectedSite) {
            loadTodayMaterials();
        }
    }, [activeTab, selectedSite]);

    const handleDeleteMaterial = async (usageId) => {
        if (!window.confirm('Sei sicuro di voler eliminare questo materiale?')) return;

        try {
            await materialUsageAPI.delete(usageId);
            // Refresh list
            loadTodayMaterials();
        } catch (error) {
            console.error('Delete error:', error);
            alert('Errore durante l\'eliminazione');
        }
    };

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





                {/* ATTENDANCE TAB */}
                {activeTab === 'attendance' && (
                    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
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
                    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Package className="w-6 h-6" />
                                Materiali Utilizzati Oggi
                            </h3>
                        </div>

                        {/* Site Selection */}
                        {!selectedSite ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                                <p className="text-amber-800">
                                    ⚠️ Seleziona un cantiere per gestire i materiali
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Today's Materials List */}
                                <div className="mb-6">
                                    <MaterialsList
                                        materials={todayMaterials}
                                        loading={loadingMaterials}
                                        onDelete={handleDeleteMaterial}
                                    />
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={() => setShowMaterialSearch(true)}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-6 h-6" />
                                    Aggiungi Materiale
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Material Search Modal */}
                {showMaterialSearch && (
                    <MaterialSearch
                        siteId={selectedSite}
                        onSelect={handleMaterialSelect}
                        onClose={resetMaterialFlow}
                        onReportNew={() => setShowReportForm(true)}
                    />
                )}

                {/* Material Usage Form */}
                {showMaterialUsageForm && selectedMaterial && (
                    <MaterialUsageForm
                        material={selectedMaterial}
                        siteId={selectedSite}
                        onConfirm={handleMaterialUsageConfirm}
                        onCancel={resetMaterialFlow}
                    />
                )}

                {/* Report Material Form */}
                {showReportForm && (
                    <ReportMaterialForm
                        siteId={selectedSite}
                        onSubmit={handleReportMaterial}
                        onCancel={resetMaterialFlow}
                    />
                )}

                {/* NOTES TAB */}
                {activeTab === 'notes' && (
                    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
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
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                            >
                                <FileText className="w-5 h-5" />
                                Salva Nota
                            </button>
                        </form>
                    </div>
                )}

                {/* PHOTOS TAB */}
                {activeTab === 'photos' && (
                    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
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
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                            >
                                <Upload className="w-5 h-5" />
                                Carica Foto
                            </button>
                        </form>
                    </div>
                )}

                {/* DAILY REPORT TAB */}
                {activeTab === 'daily-report' && (
                    <div className="space-y-6">
                        {/* Activity List & Entry in Report Tab */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Package className="w-6 h-6 text-slate-900" />
                                    Attività Svolte
                                </h3>
                                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                    {todayActivities.length} registrate
                                </span>
                            </div>

                            {/* Warning if no activities */}
                            {todayActivities.length === 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
                                    <div className="p-2 bg-amber-100 rounded-lg h-fit">
                                        <Clock className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-amber-900 text-sm">Nessuna attività registrata</h4>
                                        <p className="text-sm text-amber-700 mt-1">
                                            Per calcolare correttamente le ore lavorate, devi aggiungere le attività specifiche (es. "Rasatura 20mq") usando il modulo qui sotto.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Activity Entry Form */}
                            {editingActivity && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-blue-900 text-sm">Modifica in corso</h4>
                                            <p className="text-sm text-blue-700">Stai modificando un'attività esistente</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-200 transition-colors"
                                    >
                                        Annulla
                                    </button>
                                </div>
                            )}

                            <form onSubmit={handleActivitySubmit} className="space-y-4 mb-8 border-b border-slate-100 pb-8">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Cantiere</label>
                                    <CustomSelect
                                        value={selectedSite}
                                        onChange={(e) => setSelectedSite(e.target.value)}
                                        options={sites}
                                        placeholder="Seleziona..."
                                        disabled={editingActivity !== null}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Descrizione Attività</label>
                                    <textarea
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none min-h-[120px]"
                                        placeholder="Descrivi il lavoro svolto..."
                                        value={materialForm.name}
                                        onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                                        required
                                    />
                                </div>
                                {/* Hidden fields for backend compatibility */}
                                <div className="hidden">
                                    <input type="number" value="1" readOnly />
                                    <input type="text" value="report" readOnly />
                                </div>

                                <div className="flex gap-3">
                                    {editingActivity && (
                                        <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-all"
                                        >
                                            Annulla
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className={`py-3 font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${editingActivity ? 'flex-1 bg-blue-600 text-white hover:bg-blue-700' : 'w-full bg-slate-900 text-white hover:bg-slate-800'}`}
                                    >
                                        <FileText className="w-5 h-5" />
                                        {editingActivity ? 'Aggiorna Attività' : 'Salva il rapporto'}
                                    </button>
                                </div>
                            </form>

                            {/* List of Today's Activities */}
                            {todayActivities.length > 0 && (
                                <div className="space-y-3 mb-6">
                                    <h4 className="font-semibold text-slate-900 text-sm uppercase tracking-wider">Attività di Oggi</h4>
                                    {todayActivities.map((activity, idx) => (
                                        <div key={idx} className={`flex justify-between items-center p-3 rounded-lg border transition-all ${editingActivity?._id === activity._id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                                            <div>
                                                <p className="font-medium text-slate-900">{activity.activityType}</p>
                                                <p className="text-xs text-slate-500">{activity.quantity} {activity.unit}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {activity.percentageTime > 0 && (
                                                    <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">
                                                        {activity.percentageTime}% ({Math.round(activity.durationHours * 60)} min)
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleEditActivity(activity)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Modifica attività"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm('Eliminare questa attività?')) {
                                                            try {
                                                                await workActivityAPI.delete(activity._id);
                                                                showSuccess('Attività eliminata');
                                                                if (editingActivity?._id === activity._id) {
                                                                    setEditingActivity(null);
                                                                    setMaterialForm({ name: '', quantity: '', unit: '' });
                                                                }
                                                                loadTodayActivities();
                                                            } catch (error) {
                                                                showError('Errore eliminazione attività');
                                                            }
                                                        }
                                                    }}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Elimina attività"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Time Distribution Button */}
                            {todayActivities.length > 0 && (
                                <button
                                    onClick={() => setShowTimeDistribution(true)}
                                    disabled={!todayAttendance || !todayAttendance.totalHours}
                                    className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Clock className="w-5 h-5" />
                                    Distribuisci Tempo
                                </button>
                            )}
                        </div>

                        {/* Report Text Area */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <FileText className="w-6 h-6 text-slate-900" />
                                Note Aggiuntive Report
                            </h3>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const submitReport = async () => {
                                    if (!selectedSite) {
                                        showError('Seleziona un cantiere');
                                        return;
                                    }
                                    try {
                                        await noteAPI.create({
                                            siteId: selectedSite,
                                            content: noteText,
                                            type: 'daily_report'
                                        });
                                        showSuccess('Report testuale salvato');
                                        setNoteText('');
                                    } catch (error) {
                                        showError('Errore salvataggio report');
                                    }
                                };
                                submitReport();
                            }} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Note / Problemi / Dettagli</label>
                                    <textarea
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none min-h-[120px]"
                                        placeholder="Descrivi eventuali problemi o dettagli extra..."
                                        value={noteText}
                                        onChange={(e) => setNoteText(e.target.value)}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                                >
                                    <FileText className="w-5 h-5" />
                                    Salva Note Report
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>



            {/* Barcode Scanner Modal */}
            {showScanner && (
                <BarcodeScanner
                    onScan={handleBarcodeScanned}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {/* New Material Form Modal */}
            {showNewMaterialForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Scan className="w-6 h-6 text-blue-600" />
                            Nuovo Materiale da Barcode
                        </h3>
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-900 font-medium">
                                Codice: <span className="font-mono">{scannedBarcode}</span>
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                                Materiale non trovato nel catalogo. Crea una nuova voce.
                            </p>
                        </div>
                        <form onSubmit={handleSaveNewMaterial} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Nome Materiale *</label>
                                <input
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                                    placeholder="Es. Cemento Portland"
                                    value={materialForm.name}
                                    onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Unità di Misura *</label>
                                <input
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                                    placeholder="kg, L, pz, mq..."
                                    value={materialForm.unit}
                                    onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowNewMaterialForm(false);
                                        setScannedBarcode('');
                                        setMaterialForm({ name: '', quantity: '', unit: '' });
                                    }}
                                    className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                                >
                                    Salva
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Material Confirmation Modal (Existing Material) */}
            {scannedMaterial && !showNewMaterialForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Package className="w-6 h-6 text-green-600" />
                            Materiale Trovato
                        </h3>
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                            <p className="font-bold text-green-900 text-lg">{scannedMaterial.displayName}</p>
                            <div className="mt-2 space-y-1 text-sm text-green-800">
                                <p><span className="font-semibold">Categoria:</span> {scannedMaterial.family}</p>
                                {scannedMaterial.spec && (
                                    <p><span className="font-semibold">Spec:</span> {scannedMaterial.spec}</p>
                                )}
                                {scannedMaterial.supplier && (
                                    <p><span className="font-semibold">Fornitore:</span> {scannedMaterial.supplier}</p>
                                )}
                                <p><span className="font-semibold">Unità:</span> {scannedMaterial.unit}</p>
                            </div>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            await handleActivitySubmit(e);
                            setScannedMaterial(null);
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Cantiere *</label>
                                <CustomSelect
                                    value={selectedSite}
                                    onChange={(e) => setSelectedSite(e.target.value)}
                                    options={sites}
                                    placeholder="Seleziona..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Quantità Utilizzata *</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                                    placeholder="0"
                                    value={materialForm.quantity}
                                    onChange={(e) => setMaterialForm({ ...materialForm, quantity: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setScannedMaterial(null);
                                        setMaterialForm({ name: '', quantity: '', unit: '' });
                                    }}
                                    className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Annulla
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors"
                                >
                                    Aggiungi al Report
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}

