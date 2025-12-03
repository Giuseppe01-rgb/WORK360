import { useState, useEffect } from 'react';
import { X, Calendar, User, MapPin, Clock } from 'lucide-react';
import { attendanceAPI, siteAPI, userAPI } from '../../utils/api';
import { useToast } from '../../context/ToastContext';

export default function AttendanceModal({ attendance, onClose, onSuccess }) {
    const { showSuccess, showError } = useToast();
    const [users, setUsers] = useState([]);
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        userId: '',
        siteId: '',
        clockInTime: '',
        clockOutTime: '',
        notes: ''
    });

    useEffect(() => {
        loadData();
        if (attendance) {
            // Edit mode - populate form
            setFormData({
                userId: attendance.user?._id || '',
                siteId: attendance.site?._id || '',
                clockInTime: attendance.clockIn?.time ? formatDateTimeLocal(new Date(attendance.clockIn.time)) : '',
                clockOutTime: attendance.clockOut?.time ? formatDateTimeLocal(new Date(attendance.clockOut.time)) : '',
                notes: attendance.notes || ''
            });
        }
    }, [attendance]);

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

    const formatDateTimeLocal = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const calculateHours = () => {
        if (!formData.clockInTime || !formData.clockOutTime) return null;
        const start = new Date(formData.clockInTime);
        const end = new Date(formData.clockOutTime);
        const diffMs = end - start;
        if (diffMs <= 0) return null;
        const diffHrs = diffMs / 3600000;
        return diffHrs.toFixed(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (attendance) {
                // Update existing
                await attendanceAPI.update(attendance._id, formData);
                showSuccess('Presenza aggiornata con successo');
            } else {
                // Create new
                await attendanceAPI.createManual(formData);
                showSuccess('Presenza creata con successo');
            }
            onSuccess();
            onClose();
        } catch (error) {
            showError(error.response?.data?.message || 'Errore durante il salvataggio');
        } finally {
            setLoading(false);
        }
    };

    const hours = calculateHours();

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">
                        {attendance ? 'Modifica Presenza' : 'Aggiungi Presenza Manuale'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* User Select */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Operaio *
                        </label>
                        <select
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                            value={formData.userId}
                            onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                            required
                            disabled={!!attendance}
                        >
                            <option value="">Seleziona operaio...</option>
                            {users.map(user => (
                                <option key={user._id} value={user._id}>
                                    {user.firstName || user.username}
                                </option>
                            ))}
                        </select>
                        {attendance && (
                            <p className="text-xs text-slate-500 mt-1">L'operaio non può essere modificato</p>
                        )}
                    </div>

                    {/* Site Select */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Cantiere *
                        </label>
                        <select
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                            value={formData.siteId}
                            onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                            required
                        >
                            <option value="">Seleziona cantiere...</option>
                            {sites.map(site => (
                                <option key={site._id} value={site._id}>{site.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Clock In DateTime */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Data e Ora Entrata *
                        </label>
                        <input
                            type="datetime-local"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                            value={formData.clockInTime}
                            onChange={(e) => setFormData({ ...formData, clockInTime: e.target.value })}
                            required
                        />
                    </div>

                    {/* Clock Out DateTime */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Data e Ora Uscita
                        </label>
                        <input
                            type="datetime-local"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                            value={formData.clockOutTime}
                            onChange={(e) => setFormData({ ...formData, clockOutTime: e.target.value })}
                        />
                        <p className="text-xs text-slate-500 mt-1">Lascia vuoto se la presenza è ancora in corso</p>
                    </div>

                    {/* Calculated Hours */}
                    {hours !== null && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-green-800">
                                <Clock className="w-5 h-5" />
                                <span className="font-semibold">Ore Totali Calcolate:</span>
                                <span className="font-bold text-lg">{hours}h</span>
                            </div>
                        </div>
                    )}

                    {hours === null && formData.clockInTime && formData.clockOutTime && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">
                            ⚠️ L'ora di uscita deve essere dopo l'ora di entrata
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Note
                        </label>
                        <textarea
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[100px]"
                            placeholder="Note aggiuntive (opzionale)..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (formData.clockOutTime && hours === null)}
                            className="flex-1 px-6 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Salvataggio...' : (attendance ? 'Aggiorna' : 'Crea Presenza')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
