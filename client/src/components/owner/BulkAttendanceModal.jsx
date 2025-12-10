import { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle, Copy } from 'lucide-react';
import { attendanceAPI, siteAPI, userAPI } from '../../utils/api';
import { useToast } from '../../context/ToastContext';

export default function BulkAttendanceModal({ onClose, onSuccess }) {
    const { showSuccess, showError } = useToast();
    const [users, setUsers] = useState([]);
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(false);

    // Cart of attendance entries - each row is independent
    const [entries, setEntries] = useState([
        {
            id: Date.now(),
            siteId: '',
            userId: '',
            date: new Date().toISOString().split('T')[0],
            clockIn: '08:00',
            clockOut: '17:00'
        }
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

    const addEntry = () => {
        // Copy values from last entry for convenience
        const lastEntry = entries[entries.length - 1];
        setEntries([
            ...entries,
            {
                id: Date.now(),
                siteId: lastEntry?.siteId || '',
                userId: '',
                date: lastEntry?.date || new Date().toISOString().split('T')[0],
                clockIn: lastEntry?.clockIn || '08:00',
                clockOut: lastEntry?.clockOut || '17:00'
            }
        ]);
    };

    const duplicateEntry = (entry) => {
        setEntries([
            ...entries,
            {
                ...entry,
                id: Date.now(),
                userId: '' // Reset operaio for new row
            }
        ]);
    };

    const removeEntry = (id) => {
        if (entries.length > 1) {
            setEntries(entries.filter(e => e.id !== id));
        }
    };

    const updateEntry = (id, field, value) => {
        setEntries(entries.map(e =>
            e.id === id ? { ...e, [field]: value } : e
        ));
    };

    const getValidEntries = () => {
        return entries.filter(e => e.siteId && e.userId && e.date && e.clockIn);
    };

    const handleSubmit = async () => {
        const validEntries = getValidEntries();
        if (validEntries.length === 0) {
            showError('Compila almeno una riga completa');
            return;
        }

        setLoading(true);
        try {
            // Convert to the format expected by backend
            const attendances = validEntries.map(e => ({
                userId: e.userId,
                siteId: e.siteId,
                date: e.date,
                clockIn: e.clockIn,
                clockOut: e.clockOut || null
            }));

            const response = await attendanceAPI.bulkCreate({ attendances });

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

    const validCount = getValidEntries().length;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-slate-900 p-6 flex items-center justify-between text-white">
                    <div>
                        <h3 className="text-2xl font-bold">Aggiungi Presenze</h3>
                        <p className="text-slate-300 text-sm mt-1">
                            {validCount} {validCount === 1 ? 'presenza pronta' : 'presenze pronte'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Entries List */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-3">
                        {entries.map((entry, index) => (
                            <div
                                key={entry.id}
                                className="bg-slate-50 border border-slate-200 rounded-xl p-4"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                                    {/* Cantiere */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Cantiere</label>
                                        <select
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={entry.siteId}
                                            onChange={(e) => updateEntry(entry.id, 'siteId', e.target.value)}
                                        >
                                            <option value="">Seleziona...</option>
                                            {sites.map(site => (
                                                <option key={site.id} value={site.id}>{site.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Operaio */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Operaio</label>
                                        <select
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={entry.userId}
                                            onChange={(e) => updateEntry(entry.id, 'userId', e.target.value)}
                                        >
                                            <option value="">Seleziona...</option>
                                            {users.map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {user.firstName || user.username}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Data */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Data</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={entry.date}
                                            onChange={(e) => updateEntry(entry.id, 'date', e.target.value)}
                                        />
                                    </div>

                                    {/* Entrata */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Entrata</label>
                                        <input
                                            type="time"
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={entry.clockIn}
                                            onChange={(e) => updateEntry(entry.id, 'clockIn', e.target.value)}
                                        />
                                    </div>

                                    {/* Uscita */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Uscita</label>
                                        <input
                                            type="time"
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={entry.clockOut}
                                            onChange={(e) => updateEntry(entry.id, 'clockOut', e.target.value)}
                                        />
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-1">
                                        <button
                                            type="button"
                                            onClick={() => duplicateEntry(entry)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Duplica riga"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        {entries.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeEntry(entry.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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

                    {/* Add Row Button */}
                    <button
                        type="button"
                        onClick={addEntry}
                        className="mt-4 w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 font-semibold hover:border-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Aggiungi Riga
                    </button>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 p-6 bg-slate-50">
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
                        >
                            Annulla
                        </button>
                        <div className="flex-1"></div>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading || validCount === 0}
                            className="px-6 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Creazione...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    Crea {validCount} {validCount === 1 ? 'Presenza' : 'Presenze'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
