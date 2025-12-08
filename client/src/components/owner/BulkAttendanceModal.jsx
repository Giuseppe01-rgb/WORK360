import { useState, useEffect } from 'react';
import { X, Users, MapPin, Calendar, Clock, Plus, Trash2, CheckCircle } from 'lucide-react';
import { attendanceAPI, siteAPI, userAPI } from '../../utils/api';
import { useToast } from '../../context/ToastContext';

export default function BulkAttendanceModal({ onClose, onSuccess }) {
    const { showSuccess, showError } = useToast();
    const [users, setUsers] = useState([]);
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);

    const [selectedWorkers, setSelectedWorkers] = useState([]);
    const [selectedSite, setSelectedSite] = useState('');
    const [defaultClockIn, setDefaultClockIn] = useState('08:00');
    const [defaultClockOut, setDefaultClockOut] = useState('17:00');
    const [dateEntries, setDateEntries] = useState([
        { date: new Date().toISOString().split('T')[0], clockIn: '08:00', clockOut: '17:00' }
    ]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [usersRes, sitesRes] = await Promise.all([
                userAPI.getAll(),
                siteAPI.getAll()
            ]);
            setUsers(usersRes.data || []);
            setSites(sitesRes.data || []);
        } catch (error) {
            showError('Errore caricamento dati');
        }
    };

    const toggleWorker = (workerId) => {
        if (selectedWorkers.includes(workerId)) {
            setSelectedWorkers(selectedWorkers.filter(id => id !== workerId));
        } else {
            setSelectedWorkers([...selectedWorkers, workerId]);
        }
    };

    const toggleAllWorkers = () => {
        if (selectedWorkers.length === users.length) {
            setSelectedWorkers([]);
        } else {
            setSelectedWorkers(users.map(u => u.id));
        }
    };

    const addDateEntry = () => {
        setDateEntries([
            ...dateEntries,
            { date: '', clockIn: defaultClockIn, clockOut: defaultClockOut }
        ]);
    };

    const removeDateEntry = (index) => {
        setDateEntries(dateEntries.filter((_, i) => i !== index));
    };

    const updateDateEntry = (index, field, value) => {
        const updated = [...dateEntries];
        updated[index][field] = value;
        setDateEntries(updated);
    };

    const applyDefaultTimes = () => {
        setDateEntries(dateEntries.map(entry => ({
            ...entry,
            clockIn: defaultClockIn,
            clockOut: defaultClockOut
        })));
    };

    const getTotalCount = () => {
        return selectedWorkers.length * dateEntries.filter(d => d.date).length;
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                workers: selectedWorkers,
                siteId: selectedSite,
                dates: dateEntries.filter(d => d.date)
            };

            const response = await attendanceAPI.bulkCreate(payload);

            if (response.data.errors && response.data.errors.length > 0) {
                showError(`Creati ${response.data.created} presenze. ${response.data.errors.length} errori.`);
            } else {
                showSuccess(`${response.data.created} presenze create con successo!`);
            }

            onSuccess();
            onClose();
        } catch (error) {
            showError(error.response?.data?.message || 'Errore durante la creazione');
        } finally {
            setLoading(false);
        }
    };

    const canProceedStep1 = selectedWorkers.length > 0 && selectedSite;
    const canProceedStep2 = dateEntries.some(d => d.date && d.clockIn);
    const canSubmit = canProceedStep1 && canProceedStep2;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-6 flex items-center justify-between text-white">
                    <div>
                        <h3 className="text-2xl font-bold">Aggiunta Rapida Presenze</h3>
                        <p className="text-slate-300 text-sm mt-1">
                            Step {step}/3 - {step === 1 ? 'Operai e Cantiere' : step === 2 ? 'Date e Orari' : 'Anteprima'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="bg-slate-100 h-2">
                    <div className="bg-slate-900 h-full transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }}></div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    Cantiere *
                                </label>
                                <select
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    value={selectedSite}
                                    onChange={(e) => setSelectedSite(e.target.value)}
                                >
                                    <option value="">Seleziona cantiere...</option>
                                    {sites.map(site => (
                                        <option key={site.id} value={site.id}>{site.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Operai * ({selectedWorkers.length} selezionati)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={toggleAllWorkers}
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                                    >
                                        {selectedWorkers.length === users.length ? 'Deseleziona Tutti' : 'Seleziona Tutti'}
                                    </button>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-64 overflow-y-auto">
                                    {users.length === 0 ? (
                                        <p className="text-slate-500 text-sm text-center py-4">Nessun operaio disponibile</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {users.map(user => (
                                                <label
                                                    key={user.id}
                                                    className="flex items-center gap-3 p-3 hover:bg-white rounded-lg cursor-pointer transition-colors"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedWorkers.includes(user.id)}
                                                        onChange={() => toggleWorker(user.id)}
                                                        className="w-5 h-5 text-slate-900 rounded focus:ring-slate-900"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-slate-900">
                                                            {user.firstName || user.username}
                                                        </div>
                                                        {user.role && (
                                                            <div className="text-xs text-slate-500">{user.role}</div>
                                                        )}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Orari Standard
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-blue-800 mb-1">Ora Entrata</label>
                                        <input
                                            type="time"
                                            className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                                            value={defaultClockIn}
                                            onChange={(e) => setDefaultClockIn(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-blue-800 mb-1">Ora Uscita</label>
                                        <input
                                            type="time"
                                            className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                                            value={defaultClockOut}
                                            onChange={(e) => setDefaultClockOut(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={applyDefaultTimes}
                                    className="mt-3 w-full text-sm font-semibold text-blue-700 hover:text-blue-900 transition-colors"
                                >
                                    Applica a tutte le date
                                </button>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Date e Orari *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addDateEntry}
                                        className="text-sm font-semibold text-slate-900 hover:text-slate-700 flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Aggiungi Data
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {dateEntries.map((entry, index) => (
                                        <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Data</label>
                                                    <input
                                                        type="date"
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={entry.date}
                                                        onChange={(e) => updateDateEntry(index, 'date', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Entrata</label>
                                                    <input
                                                        type="time"
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        value={entry.clockIn}
                                                        onChange={(e) => updateDateEntry(index, 'clockIn', e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Uscita</label>
                                                        <input
                                                            type="time"
                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                            value={entry.clockOut}
                                                            onChange={(e) => updateDateEntry(index, 'clockOut', e.target.value)}
                                                        />
                                                    </div>
                                                    {dateEntries.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeDateEntry(index)}
                                                            className="self-end p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Rimuovi"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    Riepilogo Creazione
                                </h4>
                                <p className="text-green-800">
                                    Stai per creare <strong>{getTotalCount()} presenze</strong>:
                                </p>
                                <ul className="text-sm text-green-700 mt-2 space-y-1">
                                    <li>• {selectedWorkers.length} operai</li>
                                    <li>• {dateEntries.filter(d => d.date).length} date</li>
                                    <li>• Cantiere: {sites.find(s => s.id === selectedSite)?.name}</li>
                                </ul>
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto max-h-96">
                                    <table className="w-full">
                                        <thead className="bg-slate-100 sticky top-0">
                                            <tr>
                                                <th className="text-left px-4 py-3 font-semibold text-slate-700 text-sm">Operaio</th>
                                                <th className="text-left px-4 py-3 font-semibold text-slate-700 text-sm">Data</th>
                                                <th className="text-left px-4 py-3 font-semibold text-slate-700 text-sm">Entrata</th>
                                                <th className="text-left px-4 py-3 font-semibold text-slate-700 text-sm">Uscita</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedWorkers.flatMap(workerId =>
                                                dateEntries
                                                    .filter(d => d.date)
                                                    .map((entry, idx) => {
                                                        const user = users.find(u => u.id === workerId);
                                                        return (
                                                            <tr key={`${workerId}-${idx}`} className="border-t border-slate-100 hover:bg-slate-50">
                                                                <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                                                    {user?.firstName || user?.username}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-slate-600">
                                                                    {new Date(entry.date).toLocaleDateString('it-IT')}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-slate-600">{entry.clockIn}</td>
                                                                <td className="px-4 py-3 text-sm text-slate-600">{entry.clockOut}</td>
                                                            </tr>
                                                        );
                                                    })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-200 p-6 bg-slate-50">
                    <div className="flex gap-3">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={() => setStep(step - 1)}
                                className="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                Indietro
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
                        >
                            Annulla
                        </button>
                        <div className="flex-1"></div>
                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={() => setStep(step + 1)}
                                disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                                className="px-6 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continua →
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading || !canSubmit}
                                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Creazione...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        Crea {getTotalCount()} Presenze
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div >
        </div >
    );
}
