import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Calendar, ChevronRight, Filter, Loader2 } from 'lucide-react';

const STATUS_CONFIG = {
    PENDING: { label: 'In attesa', color: 'bg-amber-100 text-amber-800' },
    APPROVED: { label: 'Approvata', color: 'bg-green-100 text-green-800' },
    REJECTED: { label: 'Rifiutata', color: 'bg-red-100 text-red-800' },
    CANCELLED: { label: 'Annullata', color: 'bg-slate-100 text-slate-600' },
    CHANGES_REQUESTED: { label: 'Modifiche richieste', color: 'bg-purple-100 text-purple-800' }
};

const TYPE_LABELS = {
    FERIE: 'Ferie',
    PERMESSO: 'Permesso'
};

const CATEGORY_LABELS = {
    PERSONALE: 'Personale',
    MEDICO: 'Medico',
    LEGGE_104: 'Legge 104',
    ALTRO: 'Altro'
};

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatDateRange(startDate, endDate) {
    if (!endDate || startDate === endDate) {
        return formatDate(startDate);
    }
    return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

export default function AbsenceRequestList({ requests, loading, onSelectRequest, onCancel, statusFilter, onFilterChange }) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
            </div>
        );
    }

    if (!requests || requests.length === 0) {
        return (
            <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Nessuna richiesta trovata</p>
                <p className="text-slate-400 text-sm mt-1">Usa il pulsante sopra per creare una nuova richiesta</p>
            </div>
        );
    }

    return (
        <div>
            {/* Status Filter */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <button
                    onClick={() => onFilterChange('')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${!statusFilter
                        ? 'bg-[#8B5CF6] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                >
                    Tutte
                </button>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <button
                        key={key}
                        onClick={() => onFilterChange(key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${statusFilter === key
                            ? 'bg-[#8B5CF6] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        {config.label}
                    </button>
                ))}
            </div>

            {/* Request Cards */}
            <div className="space-y-3">
                {requests.map((request) => {
                    const statusConf = STATUS_CONFIG[request.status] || STATUS_CONFIG.PENDING;
                    const canCancel = request.status === 'PENDING' || request.status === 'CHANGES_REQUESTED';

                    return (
                        <div
                            key={request.id}
                            className="bg-slate-50 rounded-2xl p-4 hover:bg-slate-100 transition-all cursor-pointer group border border-slate-100"
                            onClick={() => onSelectRequest(request)}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusConf.color}`}>
                                            {statusConf.label}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                                            {TYPE_LABELS[request.type] || request.type}
                                        </span>
                                        {request.category && (
                                            <span className="text-xs text-slate-400">
                                                {CATEGORY_LABELS[request.category] || request.category}
                                            </span>
                                        )}
                                        {request.is104 && (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                                                L.104
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-slate-900">
                                        {formatDateRange(request.startDate, request.endDate)}
                                    </p>
                                    {request.dayPart && request.dayPart !== 'FULL' && (
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {request.dayPart === 'AM' ? 'Solo mattina' : 'Solo pomeriggio'}
                                        </p>
                                    )}
                                    {request.durationMinutes && (
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Durata: {Math.floor(request.durationMinutes / 60)}h {request.durationMinutes % 60}m
                                        </p>
                                    )}
                                    {request.status === 'CHANGES_REQUESTED' && (
                                        <p className="text-xs text-purple-600 font-medium mt-1">
                                            ✏️ Modifiche richieste — clicca per dettagli
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {canCancel && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCancel(request.id);
                                            }}
                                            className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                        >
                                            Annulla
                                        </button>
                                    )}
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

AbsenceRequestList.propTypes = {
    requests: PropTypes.array,
    loading: PropTypes.bool,
    onSelectRequest: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    statusFilter: PropTypes.string,
    onFilterChange: PropTypes.func.isRequired
};
