import PropTypes from 'prop-types';
import { X, Calendar, Clock, User, FileText, History, AlertCircle } from 'lucide-react';

const STATUS_CONFIG = {
    PENDING: { label: 'In attesa', color: 'bg-amber-100 text-amber-800' },
    APPROVED: { label: 'Approvata', color: 'bg-green-100 text-green-800' },
    REJECTED: { label: 'Rifiutata', color: 'bg-red-100 text-red-800' },
    CANCELLED: { label: 'Annullata', color: 'bg-slate-100 text-slate-600' },
    CHANGES_REQUESTED: { label: 'Modifiche richieste', color: 'bg-purple-100 text-purple-800' }
};

const TYPE_LABELS = { FERIE: 'Ferie', PERMESSO: 'Permesso' };
const MODE_LABELS = { HOURS: 'Ore', DAY: 'Giornata' };
const CATEGORY_LABELS = { PERSONALE: 'Personale', MEDICO: 'Medico', LEGGE_104: 'Legge 104', ALTRO: 'Altro' };
const DAY_PART_LABELS = { FULL: 'Giornata intera', AM: 'Mattina', PM: 'Pomeriggio' };

function formatDate(dateStr) {
    if (!dateStr) return '–';
    return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatTime(timeStr) {
    if (!timeStr) return '–';
    return timeStr.substring(0, 5);
}

function formatDateTime(dateStr) {
    if (!dateStr) return '–';
    return new Date(dateStr).toLocaleString('it-IT', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

export default function AbsenceRequestDetail({ request, onClose, onResubmit }) {
    if (!request) return null;

    const statusConf = STATUS_CONFIG[request.status] || STATUS_CONFIG.PENDING;
    const canResubmit = request.status === 'CHANGES_REQUESTED';

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="sticky top-0 bg-white rounded-t-[2rem] px-6 pt-6 pb-4 border-b border-slate-100 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-slate-900">Dettaglio Richiesta</h2>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusConf.color}`}>
                                {statusConf.label}
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* Request Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <InfoItem icon={Calendar} label="Tipo" value={TYPE_LABELS[request.type]} />
                        {request.mode && <InfoItem icon={Clock} label="Modalità" value={MODE_LABELS[request.mode]} />}
                        {request.category && <InfoItem icon={FileText} label="Categoria" value={CATEGORY_LABELS[request.category]} />}
                        {request.is104 && (
                            <div className="col-span-2">
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                                    Legge 104
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Dates & Times */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">Data inizio</span>
                            <span className="text-sm font-bold text-slate-900">{formatDate(request.startDate)}</span>
                        </div>
                        {request.endDate && request.endDate !== request.startDate && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Data fine</span>
                                <span className="text-sm font-bold text-slate-900">{formatDate(request.endDate)}</span>
                            </div>
                        )}
                        {request.dayPart && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Fascia</span>
                                <span className="text-sm font-bold text-slate-900">{DAY_PART_LABELS[request.dayPart]}</span>
                            </div>
                        )}
                        {request.startTime && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Orario</span>
                                <span className="text-sm font-bold text-slate-900">
                                    {formatTime(request.startTime)} – {formatTime(request.endTime)}
                                </span>
                            </div>
                        )}
                        {request.durationMinutes && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Durata</span>
                                <span className="text-sm font-bold text-slate-900">
                                    {Math.floor(request.durationMinutes / 60)}h {request.durationMinutes % 60}m
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    {request.notes && (
                        <div>
                            <h4 className="text-sm font-bold text-slate-600 mb-2">Note</h4>
                            <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{request.notes}</p>
                        </div>
                    )}

                    {/* Decision Info */}
                    {(request.decisionNote || request.requestedChanges) && (
                        <div className={`rounded-xl p-4 ${request.status === 'REJECTED' ? 'bg-red-50 border border-red-100' : 'bg-purple-50 border border-purple-100'}`}>
                            {request.decider && (
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="w-4 h-4 text-slate-500" />
                                    <span className="text-xs text-slate-500">
                                        Decisione di {request.decider.firstName} {request.decider.lastName}
                                    </span>
                                    {request.decisionAt && (
                                        <span className="text-xs text-slate-400">
                                            il {formatDateTime(request.decisionAt)}
                                        </span>
                                    )}
                                </div>
                            )}
                            {request.decisionNote && (
                                <div className="mb-2">
                                    <h4 className="text-sm font-bold text-slate-700 mb-1">Nota di decisione</h4>
                                    <p className="text-sm text-slate-600">{request.decisionNote}</p>
                                </div>
                            )}
                            {request.requestedChanges && (
                                <div>
                                    <h4 className="text-sm font-bold text-purple-800 mb-1 flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" /> Modifiche richieste
                                    </h4>
                                    <p className="text-sm text-purple-700">{request.requestedChanges}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Revision History */}
                    {request.revisions && request.revisions.length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                                <History className="w-4 h-4" /> Cronologia revisioni
                            </h4>
                            <div className="space-y-2">
                                {request.revisions.map((rev) => (
                                    <div key={rev.id} className="bg-slate-50 rounded-xl p-3 text-xs">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-slate-700">
                                                Revisione #{rev.revisionNumber}
                                            </span>
                                            <span className="text-slate-400">{formatDateTime(rev.createdAt)}</span>
                                        </div>
                                        {rev.changedByUser && (
                                            <span className="text-slate-500">
                                                di {rev.changedByUser.firstName} {rev.changedByUser.lastName}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="text-xs text-slate-400 flex justify-between pt-2 border-t border-slate-100">
                        <span>Rev. #{request.revisionNumber}</span>
                        <span>Creata il {formatDateTime(request.createdAt)}</span>
                    </div>

                    {/* Action: Resubmit */}
                    {canResubmit && (
                        <button
                            onClick={() => onResubmit(request)}
                            className="w-full py-3 bg-[#8B5CF6] text-white font-bold rounded-xl hover:bg-[#7C3AED] transition-colors shadow-lg shadow-purple-500/20"
                        >
                            ✏️ Modifica e Reinvia
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoItem({ icon: Icon, label, value }) {
    return (
        <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-slate-400" />
            <div>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-sm font-bold text-slate-900">{value}</p>
            </div>
        </div>
    );
}

InfoItem.propTypes = {
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired
};

AbsenceRequestDetail.propTypes = {
    request: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    onResubmit: PropTypes.func.isRequired
};
