import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { attendanceAPI, siteAPI, userAPI } from '../../utils/api';
import { Calendar, MapPin, Clock, User, Filter, RefreshCcw, CheckCircle, AlertCircle, Plus, Edit2, Trash2, Zap, Download, FileSpreadsheet } from 'lucide-react';
import { exportAttendanceReport } from '../../utils/excelExport';
import AttendanceModal from '../../components/owner/AttendanceModal';
import BulkAttendanceModal from '../../components/owner/BulkAttendanceModal';
import AttendanceExcelImportModal from '../../components/owner/AttendanceExcelImportModal';
import { useToast } from '../../context/ToastContext';
import { useConfirmModal } from '../../context/ConfirmModalContext';

export default function AttendanceList() {
    const { showSuccess, showError } = useToast();
    const { showConfirm } = useConfirmModal();
    const [attendances, setAttendances] = useState([]);
    const [sites, setSites] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showExcelImportModal, setShowExcelImportModal] = useState(false);
    const [editingAttendance, setEditingAttendance] = useState(null);
    const [filters, setFilters] = useState({
        siteId: '',
        userId: '',
        startDate: '',
        endDate: '',
        status: 'all'
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        loadAttendances();
    }, [filters]);

    const loadData = async () => {
        try {
            const [sitesResponse, usersResponse] = await Promise.all([
                siteAPI.getAll(),
                userAPI.getAll()
            ]);
            setSites(sitesResponse.data || []);
            setUsers(usersResponse.data?.filter(u => u.role === 'worker') || []);
        } catch (error) {
            console.error('Error loading data:', error);
            setSites([]);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const loadAttendances = async () => {
        try {
            const params = {};
            if (filters.siteId) params.siteId = filters.siteId;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;

            const response = await attendanceAPI.getAll(params);
            let data = response.data || [];

            // Filter by status
            if (filters.status === 'active') {
                data = data.filter(att => !att.clockOut?.time);
            } else if (filters.status === 'completed') {
                data = data.filter(att => att.clockOut?.time);
            }

            // Filter by user
            if (filters.userId) {
                data = data.filter(att => att.user?.id === filters.userId);
            }

            setAttendances(data);
        } catch (error) {
            console.error('Error loading attendances:', error);
            setAttendances([]);
        }
    };

    const calculateDuration = (clockIn, clockOut) => {
        if (!clockOut?.time) return null; // Will use LiveDuration component instead

        const start = new Date(clockIn.time);
        const end = new Date(clockOut.time);
        const diffMs = end - start;
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);

        return `${diffHrs}h ${diffMins}m`;
    };

    // Live duration component for in-progress attendances
    const LiveDuration = ({ clockInTime }) => {
        const [duration, setDuration] = useState('');
        const [tick, setTick] = useState(0);

        useEffect(() => {
            const calculateLive = () => {
                const start = new Date(clockInTime);
                const now = new Date();
                const diffMs = now - start;
                if (diffMs < 0) {
                    setDuration('0h 0m');
                    return;
                }
                const diffHrs = Math.floor(diffMs / 3600000);
                const diffMins = Math.floor((diffMs % 3600000) / 60000);
                setDuration(`${diffHrs}h ${diffMins}m`);
            };

            calculateLive(); // Calculate immediately
            const interval = setInterval(() => {
                calculateLive();
                setTick(t => t + 1); // Force re-render for animation
            }, 60000); // Update every minute

            return () => clearInterval(interval);
        }, [clockInTime]);

        return (
            <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span className="text-blue-600 font-bold">{duration}</span>
                <span className="text-xs text-blue-400">live</span>
            </span>
        );
    };

    const getTotalHours = () => {
        return attendances
            .filter(att => att.clockOut?.time)
            .reduce((total, att) => {
                const start = new Date(att.clockIn.time);
                const end = new Date(att.clockOut.time);
                const diffHrs = (end - start) / 3600000;
                return total + diffHrs;
            }, 0)
            .toFixed(1);
    };

    const handleCreateAttendance = () => {
        setEditingAttendance(null);
        setShowModal(true);
    };

    const handleEditAttendance = (attendance) => {
        setEditingAttendance(attendance);
        setShowModal(true);
    };

    const handleDeleteAttendance = async (attendanceId) => {
        const confirmed = await showConfirm({
            title: 'Elimina presenza',
            message: 'Sei sicuro di voler eliminare questa presenza?',
            confirmText: 'Elimina',
            variant: 'danger'
        });
        if (!confirmed) return;

        try {
            await attendanceAPI.delete(attendanceId);
            showSuccess('Presenza eliminata con successo');
            loadAttendances();
        } catch (error) {
            showError(error.response?.data?.message || 'Errore durante l\'eliminazione');
        }
    };

    const handleModalSuccess = () => {
        loadAttendances();
    };

    if (loading) {
        return (
            <Layout title="Registro Presenze">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Registro Presenze">
            {/* Filters */}
            <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Filter className="w-5 h-5 text-slate-400" />
                        Filtri
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                const siteName = filters.siteId
                                    ? sites.find(s => s.id === parseInt(filters.siteId))?.name
                                    : null;
                                const dateRange = (filters.startDate || filters.endDate)
                                    ? `${filters.startDate || 'inizio'} - ${filters.endDate || 'oggi'}`
                                    : null;
                                exportAttendanceReport(attendances, { siteName, dateRange });
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                            title="Esporta presenze in Excel"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Esporta</span>
                        </button>
                        <button
                            onClick={() => setFilters({ siteId: '', userId: '', startDate: '', endDate: '', status: 'all' })}
                            className="text-sm font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Reset
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Row 1: Cantiere e Operaio */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Cantiere</label>
                            <select
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={filters.siteId}
                                onChange={(e) => setFilters({ ...filters, siteId: e.target.value })}
                            >
                                <option value="">Tutti i cantieri</option>
                                {sites.map(site => (
                                    <option key={site.id} value={site.id}>{site.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Operaio</label>
                            <select
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                value={filters.userId}
                                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                            >
                                <option value="">Tutti gli operai</option>
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName || user.username}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 2: Stato */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Stato</label>
                        <select
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="all">Tutti</option>
                            <option value="active">In corso</option>
                            <option value="completed">Completati</option>
                        </select>
                    </div>

                    {/* Row 3: Date su stessa riga */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Data Inizio</label>
                            <input
                                type="date"
                                className="w-full max-w-full block min-h-[50px] px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-slate-900 appearance-none"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Data Fine</label>
                            <input
                                type="date"
                                className="w-full max-w-full block min-h-[50px] px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-slate-900 appearance-none"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <div className="text-sm font-medium text-slate-500 mb-1">Presenze Totali</div>
                    <div className="text-3xl font-bold text-slate-900">
                        {attendances.length}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <div className="text-sm font-medium text-slate-500 mb-1">In Corso</div>
                    <div className="text-3xl font-bold text-blue-600">
                        {attendances.filter(att => !att.clockOut?.time).length}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <div className="text-sm font-medium text-slate-500 mb-1">Ore Totali</div>
                    <div className="text-3xl font-bold text-slate-900">
                        {getTotalHours()}<span className="text-lg font-normal text-slate-500 ml-1">h</span>
                    </div>
                </div>
            </div>

            {/* Attendance List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h3 className="text-lg font-bold text-slate-900">Lista Presenze</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowExcelImportModal(true)}
                            className="px-4 py-2 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            Importa Excel
                        </button>
                        <button
                            onClick={() => setShowBulkModal(true)}
                            className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Aggiungi Presenze
                        </button>
                    </div>
                </div>

                {attendances.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Nessuna presenza</h3>
                        <p className="text-slate-500">Non ci sono presenze che corrispondono ai filtri selezionati.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {attendances.map(attendance => {
                            // Safe data extraction
                            const userName = attendance?.user?.firstName ||
                                attendance?.user?.username ||
                                'Utente Sconosciuto';
                            const siteName = attendance?.site?.name || 'Cantiere Non Specificato';
                            const isCompleted = !!(attendance?.clockOut?.time);
                            const clockInTime = attendance?.clockIn?.time;
                            const clockOutTime = attendance?.clockOut?.time;
                            const clockInCoords = attendance?.clockIn?.location?.coordinates;
                            const clockOutCoords = attendance?.clockOut?.location?.coordinates;

                            return (
                                <div key={attendance.id} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-100 group">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 text-slate-600">
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                                                    {userName}
                                                </div>
                                                <div className="text-slate-500 flex items-center gap-1 text-sm">
                                                    <MapPin className="w-3 h-3" />
                                                    {siteName}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {isCompleted ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                            {isCompleted ? 'Completato' : 'In corso'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-0 md:pl-16 mb-6">
                                        <div>
                                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Entrata</div>
                                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                {clockInTime ? new Date(clockInTime).toLocaleString('it-IT', {
                                                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                }) : 'N/A'}
                                            </div>
                                            {clockInCoords && clockInCoords.length === 2 && (
                                                <button
                                                    onClick={() => window.open(`https://www.google.com/maps?q=${clockInCoords[1]},${clockInCoords[0]}`, '_blank')}
                                                    className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                >
                                                    <MapPin className="w-3 h-3" />
                                                    Vedi posizione
                                                </button>
                                            )}
                                        </div>

                                        <div>
                                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Uscita</div>
                                            {isCompleted ? (
                                                <>
                                                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-slate-400" />
                                                        {clockOutTime ? new Date(clockOutTime).toLocaleString('it-IT', {
                                                            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                        }) : 'N/A'}
                                                    </div>
                                                    {clockOutCoords && clockOutCoords.length === 2 && (
                                                        <button
                                                            onClick={() => window.open(`https://www.google.com/maps?q=${clockOutCoords[1]},${clockOutCoords[0]}`, '_blank')}
                                                            className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                        >
                                                            <MapPin className="w-3 h-3" />
                                                            Vedi posizione
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-sm text-slate-500 italic">In corso...</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pl-0 md:pl-16 pt-4 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-slate-500">Durata:</span>
                                            {isCompleted ? (
                                                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-sm">
                                                    {calculateDuration(attendance.clockIn, attendance.clockOut)}
                                                </span>
                                            ) : (
                                                <span className="bg-blue-50 px-3 py-1 rounded-full text-sm">
                                                    <LiveDuration clockInTime={clockInTime} />
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    handleEditAttendance(attendance);
                                                }}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Modifica presenza"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    handleDeleteAttendance(attendance.id);
                                                }}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Elimina presenza"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Attendance Modal */}
            {showModal && (
                <AttendanceModal
                    attendance={editingAttendance}
                    onClose={() => {
                        setShowModal(false);
                        setEditingAttendance(null);
                    }}
                    onSuccess={handleModalSuccess}
                />
            )}

            {/* Bulk Attendance Modal */}
            {showBulkModal && (
                <BulkAttendanceModal
                    onClose={() => setShowBulkModal(false)}
                    onSuccess={handleModalSuccess}
                />
            )}

            {/* Excel Import Modal */}
            {showExcelImportModal && (
                <AttendanceExcelImportModal
                    onClose={() => setShowExcelImportModal(false)}
                    onImport={handleModalSuccess}
                />
            )}
        </Layout>
    );
}
