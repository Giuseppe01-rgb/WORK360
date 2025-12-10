import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, CheckCircle, Copy, ChevronDown, Check } from 'lucide-react';
import { attendanceAPI, siteAPI, userAPI } from '../../utils/api';
import { useToast } from '../../context/ToastContext';

// Multi-select dropdown component
function MultiSelect({ options, selected, onChange, placeholder }) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (id) => {
        if (selected.includes(id)) {
            onChange(selected.filter(s => s !== id));
        } else {
            onChange([...selected, id]);
        }
    };

    const selectedNames = options
        .filter(o => selected.includes(o.id))
        .map(o => o.firstName || o.username)
        .join(', ');

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 text-left flex items-center justify-between"
            >
                <span className={selected.length === 0 ? 'text-slate-400' : 'text-slate-900 truncate'}>
                    {selected.length === 0 ? placeholder : `${selected.length} selezionati`}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {options.map(option => (
                        <label
                            key={option.id}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selected.includes(option.id)
                                    ? 'bg-slate-900 border-slate-900'
                                    : 'border-slate-300'
                                }`}>
                                {selected.includes(option.id) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-sm">{option.firstName || option.username}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function BulkAttendanceModal({ onClose, onSuccess }) {
    const { showSuccess, showError } = useToast();
    const [users, setUsers] = useState([]);
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(false);

    // Cart of attendance entries - userIds is now an array for multi-select
    const [entries, setEntries] = useState([
        {
            id: Date.now(),
            siteId: '',
            userIds: [], // Array of user IDs
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
        const lastEntry = entries[entries.length - 1];
        setEntries([
            ...entries,
            {
                id: Date.now(),
                siteId: lastEntry?.siteId || '',
                userIds: [],
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
                userIds: [] // Reset operai for new row
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

    // Count total attendances (entries × users per entry)
    const getTotalAttendances = () => {
        return entries.reduce((sum, e) => {
            if (e.siteId && e.userIds.length > 0 && e.date && e.clockIn) {
                return sum + e.userIds.length;
            }
            return sum;
        }, 0);
    };

    const handleSubmit = async () => {
        const totalCount = getTotalAttendances();
        if (totalCount === 0) {
            showError('Compila almeno una riga completa');
            return;
        }

        setLoading(true);
        try {
            // Expand entries: each row with multiple users becomes multiple attendances
            const attendances = [];
            for (const entry of entries) {
                if (entry.siteId && entry.userIds.length > 0 && entry.date && entry.clockIn) {
                    for (const userId of entry.userIds) {
                        attendances.push({
                            userId,
                            siteId: entry.siteId,
                            date: entry.date,
                            clockIn: entry.clockIn,
                            clockOut: entry.clockOut || null
                        });
                    }
                }
            }

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

    const totalCount = getTotalAttendances();

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-slate-900 p-6 flex items-center justify-between text-white">
                    <div>
                        <h3 className="text-2xl font-bold">Aggiungi Presenze</h3>
                        <p className="text-slate-300 text-sm mt-1">
                            {totalCount} {totalCount === 1 ? 'presenza pronta' : 'presenze pronte'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Entries List */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-3">
                        {entries.map((entry) => (
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

                                    {/* Operai - Multi Select */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                                            Operai {entry.userIds.length > 0 && `(${entry.userIds.length})`}
                                        </label>
                                        <MultiSelect
                                            options={users}
                                            selected={entry.userIds}
                                            onChange={(ids) => updateEntry(entry.id, 'userIds', ids)}
                                            placeholder="Seleziona..."
                                        />
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
                            disabled={loading || totalCount === 0}
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
                                    Crea {totalCount} {totalCount === 1 ? 'Presenza' : 'Presenze'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
