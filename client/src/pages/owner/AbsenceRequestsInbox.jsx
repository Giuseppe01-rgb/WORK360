import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { absenceRequestAPI, userAPI } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
    CalendarDays, ChevronDown, UserCircle, Check, X as XIcon,
    MessageSquare, Loader2, Filter, Search
} from 'lucide-react';

const STATUS_CONFIG = {
    PENDING: { label: 'In attesa', color: 'bg-amber-100 text-amber-800', ring: 'ring-amber-200' },
    APPROVED: { label: 'Approvata', color: 'bg-green-100 text-green-800', ring: 'ring-green-200' },
    REJECTED: { label: 'Rifiutata', color: 'bg-red-100 text-red-800', ring: 'ring-red-200' },
    CANCELLED: { label: 'Annullata', color: 'bg-slate-100 text-slate-600', ring: 'ring-slate-200' },
    CHANGES_REQUESTED: { label: 'Modifiche richieste', color: 'bg-purple-100 text-purple-800', ring: 'ring-purple-200' }
};

const TYPE_LABELS = { FERIE: 'Ferie', PERMESSO: 'Permesso' };
const CATEGORY_LABELS = { PERSONALE: 'Personale', MEDICO: 'Medico', LEGGE_104: 'Legge 104', ALTRO: 'Altro' };
const DAY_PART_LABELS = { FULL: 'Giornata intera', AM: 'Mattina', PM: 'Pomeriggio' };

function formatDate(dateStr) {
    if (!dateStr) return '–';
    return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateRange(start, end) {
    if (!end || start === end) return formatDate(start);
    return `${formatDate(start)} – ${formatDate(end)}`;
}

export default function AbsenceRequestsInbox() {
    const { showSuccess, showError } = useToast();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '', type: '', employeeId: '', month: '', is104: '' });
    const [employees, setEmployees] = useState([]);
    const [actionModal, setActionModal] = useState(null); // { type: 'approve'|'reject'|'request-changes', request }
    const [actionLoading, setActionLoading] = useState(false);
    const [decisionNote, setDecisionNote] = useState('');
    const [requestedChanges, setRequestedChanges] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    const loadRequests = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params[key] = value;
            });
            const response = await absenceRequestAPI.getAll(params);
            setRequests(response.data.data || []);
        } catch (error) {
            showError('Errore nel caricamento delle richieste');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    useEffect(() => {
        const loadEmployees = async () => {
            try {
                const response = await userAPI.getAll();
                setEmployees(response.data || []);
            } catch (error) {
                console.error('Error loading employees:', error);
            }
        };
        loadEmployees();
    }, []);

    const handleApprove = async () => {
        if (!actionModal) return;
        try {
            setActionLoading(true);
            await absenceRequestAPI.approve(actionModal.request.id, {
                decisionNote: decisionNote || undefined
            });
            showSuccess('Richiesta approvata');
            setActionModal(null);
            setDecisionNote('');
            loadRequests();
        } catch (error) {
            showError(error.response?.data?.message || 'Errore nell\'approvazione');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!actionModal || !decisionNote.trim()) {
            showError('La nota di decisione è obbligatoria per il rifiuto');
            return;
        }
        try {
            setActionLoading(true);
            await absenceRequestAPI.reject(actionModal.request.id, {
                decisionNote: decisionNote.trim()
            });
            showSuccess('Richiesta rifiutata');
            setActionModal(null);
            setDecisionNote('');
            loadRequests();
        } catch (error) {
            showError(error.response?.data?.message || 'Errore nel rifiuto');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRequestChanges = async () => {
        if (!actionModal || !requestedChanges.trim()) {
            showError('Le modifiche richieste sono obbligatorie');
            return;
        }
        try {
            setActionLoading(true);
            await absenceRequestAPI.requestChanges(actionModal.request.id, {
                requestedChanges: requestedChanges.trim()
            });
            showSuccess('Richiesta di modifiche inviata');
            setActionModal(null);
            setRequestedChanges('');
            loadRequests();
        } catch (error) {
            showError(error.response?.data?.message || 'Errore nella richiesta modifiche');
        } finally {
            setActionLoading(false);
        }
    };

    const openActionModal = (type, request) => {
        setActionModal({ type, request });
        setDecisionNote('');
        setRequestedChanges('');
    };

    return (
        <Layout title="Ferie e Permessi">
            <div className="max-w-5xl mx-auto">
                {/* Filters */}
                <div className="bg-white rounded-[2rem] p-5 shadow-sm mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-5 h-5 text-slate-500" />
                        <h3 className="font-bold text-slate-700">Filtri</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20"
                        >
                            <option value="">Tutti gli stati</option>
                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>

                        <select
                            value={filters.type}
                            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20"
                        >
                            <option value="">Tutti i tipi</option>
                            <option value="FERIE">Ferie</option>
                            <option value="PERMESSO">Permesso</option>
                        </select>

                        <select
                            value={filters.employeeId}
                            onChange={(e) => setFilters(prev => ({ ...prev, employeeId: e.target.value }))}
                            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20"
                        >
                            <option value="">Tutti i dipendenti</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.firstName} {emp.lastName}
                                </option>
                            ))}
                        </select>

                        <input
                            type="month"
                            value={filters.month}
                            onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
                            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20"
                            placeholder="Mese"
                        />

                        <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filters.is104 === 'true'}
                                onChange={(e) => setFilters(prev => ({ ...prev, is104: e.target.checked ? 'true' : '' }))}
                                className="rounded text-[#8B5CF6] focus:ring-[#8B5CF6]"
                            />
                            <span className="text-sm font-medium text-slate-700">L. 104</span>
                        </label>
                    </div>
                </div>

                {/* Requests List */}
                <div className="bg-white rounded-[2rem] p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <CalendarDays className="w-6 h-6 text-[#8B5CF6]" />
                            Richieste ({requests.length})
                        </h3>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-12">
                            <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">Nessuna richiesta trovata</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {requests.map((req) => {
                                const statusConf = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
                                const isExpanded = expandedId === req.id;
                                const isPending = req.status === 'PENDING';

                                return (
                                    <div
                                        key={req.id}
                                        className={`rounded-2xl border transition-all ${isExpanded ? 'border-[#8B5CF6]/30 ring-2 ring-[#8B5CF6]/10' : 'border-slate-100 hover:border-slate-200'}`}
                                    >
                                        {/* Row Header */}
                                        <div
                                            className="p-4 flex items-center gap-4 cursor-pointer"
                                            onClick={() => setExpandedId(isExpanded ? null : req.id)}
                                        >
                                            {/* Employee */}
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <UserCircle className="w-6 h-6 text-slate-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 truncate">
                                                        {req.employee ? `${req.employee.firstName} ${req.employee.lastName}` : '–'}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {formatDateRange(req.startDate, req.endDate)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Tags */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusConf.color}`}>
                                                    {statusConf.label}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-600">
                                                    {TYPE_LABELS[req.type]}
                                                </span>
                                                {req.is104 && (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                                                        L.104
                                                    </span>
                                                )}
                                            </div>

                                            {/* Quick Actions (pending only) */}
                                            {isPending && (
                                                <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => openActionModal('approve', req)}
                                                        className="p-2 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors"
                                                        title="Approva"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openActionModal('reject', req)}
                                                        className="p-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-colors"
                                                        title="Rifiuta"
                                                    >
                                                        <XIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openActionModal('request-changes', req)}
                                                        className="p-2 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors"
                                                        title="Richiedi modifiche"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}

                                            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>

                                        {/* Expanded Detail */}
                                        {isExpanded && (
                                            <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                    {req.category && (
                                                        <div>
                                                            <span className="text-slate-400 text-xs block">Categoria</span>
                                                            <span className="font-bold text-slate-700">{CATEGORY_LABELS[req.category]}</span>
                                                        </div>
                                                    )}
                                                    {req.mode && (
                                                        <div>
                                                            <span className="text-slate-400 text-xs block">Modalità</span>
                                                            <span className="font-bold text-slate-700">{req.mode === 'HOURS' ? 'Ore' : 'Giornata'}</span>
                                                        </div>
                                                    )}
                                                    {req.dayPart && (
                                                        <div>
                                                            <span className="text-slate-400 text-xs block">Fascia</span>
                                                            <span className="font-bold text-slate-700">{DAY_PART_LABELS[req.dayPart]}</span>
                                                        </div>
                                                    )}
                                                    {req.durationMinutes && (
                                                        <div>
                                                            <span className="text-slate-400 text-xs block">Durata</span>
                                                            <span className="font-bold text-slate-700">
                                                                {Math.floor(req.durationMinutes / 60)}h {req.durationMinutes % 60}m
                                                            </span>
                                                        </div>
                                                    )}
                                                    {req.startTime && (
                                                        <div>
                                                            <span className="text-slate-400 text-xs block">Orario</span>
                                                            <span className="font-bold text-slate-700">
                                                                {req.startTime?.substring(0, 5)} – {req.endTime?.substring(0, 5)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="text-slate-400 text-xs block">Revisione</span>
                                                        <span className="font-bold text-slate-700">#{req.revisionNumber}</span>
                                                    </div>
                                                </div>
                                                {req.notes && (
                                                    <div className="mt-3 p-3 bg-slate-50 rounded-xl">
                                                        <span className="text-xs text-slate-400 block mb-1">Note</span>
                                                        <p className="text-sm text-slate-700">{req.notes}</p>
                                                    </div>
                                                )}
                                                {req.decisionNote && (
                                                    <div className="mt-2 p-3 bg-amber-50 rounded-xl">
                                                        <span className="text-xs text-amber-500 block mb-1">Nota decisione</span>
                                                        <p className="text-sm text-amber-800">{req.decisionNote}</p>
                                                    </div>
                                                )}
                                                {req.requestedChanges && (
                                                    <div className="mt-2 p-3 bg-purple-50 rounded-xl">
                                                        <span className="text-xs text-purple-500 block mb-1">Modifiche richieste</span>
                                                        <p className="text-sm text-purple-800">{req.requestedChanges}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Modal */}
            {actionModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">
                            {actionModal.type === 'approve' && '✅ Approva Richiesta'}
                            {actionModal.type === 'reject' && '❌ Rifiuta Richiesta'}
                            {actionModal.type === 'request-changes' && '✏️ Richiedi Modifiche'}
                        </h3>

                        <div className="bg-slate-50 rounded-xl p-3 mb-4 text-sm">
                            <p className="font-bold text-slate-700">
                                {actionModal.request.employee?.firstName} {actionModal.request.employee?.lastName}
                            </p>
                            <p className="text-slate-500">
                                {TYPE_LABELS[actionModal.request.type]} — {formatDateRange(actionModal.request.startDate, actionModal.request.endDate)}
                            </p>
                        </div>

                        {(actionModal.type === 'approve' || actionModal.type === 'reject') && (
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Nota {actionModal.type === 'reject' ? '(obbligatoria)' : '(opzionale)'}
                                </label>
                                <textarea
                                    value={decisionNote}
                                    onChange={(e) => setDecisionNote(e.target.value)}
                                    rows={3}
                                    placeholder="Aggiungi una nota..."
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6] resize-none"
                                    required={actionModal.type === 'reject'}
                                />
                            </div>
                        )}

                        {actionModal.type === 'request-changes' && (
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Modifiche richieste (obbligatorio)
                                </label>
                                <textarea
                                    value={requestedChanges}
                                    onChange={(e) => setRequestedChanges(e.target.value)}
                                    rows={3}
                                    placeholder="Descrivi le modifiche necessarie..."
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6] resize-none"
                                    required
                                />
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setActionModal(null); setDecisionNote(''); setRequestedChanges(''); }}
                                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={() => {
                                    if (actionModal.type === 'approve') handleApprove();
                                    else if (actionModal.type === 'reject') handleReject();
                                    else handleRequestChanges();
                                }}
                                disabled={actionLoading}
                                className={`flex-1 py-3 font-bold rounded-xl transition-colors disabled:opacity-50 shadow-lg ${actionModal.type === 'approve'
                                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-500/20'
                                    : actionModal.type === 'reject'
                                        ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/20'
                                        : 'bg-[#8B5CF6] text-white hover:bg-[#7C3AED] shadow-purple-500/20'
                                    }`}
                            >
                                {actionLoading ? 'Attendere...' : (
                                    actionModal.type === 'approve' ? 'Approva'
                                        : actionModal.type === 'reject' ? 'Rifiuta'
                                            : 'Invia Richiesta'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
