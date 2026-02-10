import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, Calendar, Clock, AlertTriangle } from 'lucide-react';

const TYPE_OPTIONS = [
    { value: 'FERIE', label: 'Ferie' },
    { value: 'PERMESSO', label: 'Permesso' }
];

const MODE_OPTIONS = [
    { value: 'DAY', label: 'Giornata' },
    { value: 'HOURS', label: 'Ore' }
];

const CATEGORY_OPTIONS = [
    { value: 'PERSONALE', label: 'Personale' },
    { value: 'MEDICO', label: 'Medico' },
    { value: 'LEGGE_104', label: 'Legge 104' },
    { value: 'ALTRO', label: 'Altro' }
];

const DAY_PART_OPTIONS = [
    { value: 'FULL', label: 'Giornata intera' },
    { value: 'AM', label: 'Mattina' },
    { value: 'PM', label: 'Pomeriggio' }
];

export default function AbsenceRequestForm({ onSubmit, onClose, initialData, loading, overlaps }) {
    const [form, setForm] = useState({
        type: 'FERIE',
        mode: null,
        category: '',
        startDate: '',
        endDate: '',
        dayPart: '',
        startTime: '',
        endTime: '',
        notes: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (initialData) {
            setForm({
                type: initialData.type || 'FERIE',
                mode: initialData.mode || null,
                category: initialData.category || '',
                startDate: initialData.startDate || '',
                endDate: initialData.endDate || '',
                dayPart: initialData.dayPart || '',
                startTime: initialData.startTime ? initialData.startTime.substring(0, 5) : '',
                endTime: initialData.endTime ? initialData.endTime.substring(0, 5) : '',
                notes: initialData.notes || ''
            });
        }
    }, [initialData]);

    const isSingleDay = !form.endDate || form.startDate === form.endDate;
    const isPermesso = form.type === 'PERMESSO';
    const isHoursMode = isPermesso && form.mode === 'HOURS';
    const isDayMode = isPermesso && form.mode === 'DAY';

    const validate = () => {
        const errs = {};
        if (!form.startDate) errs.startDate = 'Data di inizio obbligatoria';
        if (form.endDate && form.endDate < form.startDate) errs.endDate = 'La data di fine non può essere precedente alla data di inizio';

        if (isPermesso) {
            if (!form.mode) errs.mode = 'Seleziona la modalità (Giornata o Ore)';
            if (!form.category) errs.category = 'Seleziona la categoria';

            if (isHoursMode) {
                if (!form.startTime) errs.startTime = 'Ora di inizio obbligatoria';
                if (!form.endTime) errs.endTime = 'Ora di fine obbligatoria';
                if (form.startTime && form.endTime && form.startTime >= form.endTime) {
                    errs.endTime = 'L\'ora di fine deve essere successiva all\'ora di inizio';
                }
            }
            if (isDayMode && !form.dayPart) {
                errs.dayPart = 'Seleziona il tipo di giornata';
            }
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;

        const payload = {
            type: form.type,
            startDate: form.startDate,
            endDate: form.endDate || null,
            notes: form.notes || null
        };

        if (isPermesso) {
            payload.mode = form.mode;
            payload.category = form.category;

            if (isHoursMode) {
                payload.startTime = form.startTime;
                payload.endTime = form.endTime;
                payload.dayPart = null;
            } else {
                payload.dayPart = form.dayPart;
                payload.startTime = null;
                payload.endTime = null;
            }
        } else {
            // FERIE
            payload.mode = null;
            payload.category = null;
            payload.startTime = null;
            payload.endTime = null;
            payload.dayPart = isSingleDay ? (form.dayPart || null) : null;
        }

        onSubmit(payload);
    };

    const handleChange = (field, value) => {
        setForm(prev => {
            const updated = { ...prev, [field]: value };

            // Reset dependent fields on type change
            if (field === 'type') {
                if (value === 'FERIE') {
                    updated.mode = null;
                    updated.category = '';
                    updated.startTime = '';
                    updated.endTime = '';
                } else {
                    updated.mode = 'DAY';
                }
            }

            // Reset time/daypart on mode change
            if (field === 'mode') {
                if (value === 'HOURS') {
                    updated.dayPart = '';
                } else {
                    updated.startTime = '';
                    updated.endTime = '';
                }
            }

            return updated;
        });

        // Clear field error
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const inputClass = (field) =>
        `w-full px-4 py-3 bg-white border ${errors[field] ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'} rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6] transition-all`;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="sticky top-0 bg-white rounded-t-[2rem] px-6 pt-6 pb-4 border-b border-slate-100 z-10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-[#8B5CF6]" />
                            {initialData ? 'Modifica e Reinvia' : 'Nuova Richiesta'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Overlap Warning */}
                    {overlaps && overlaps.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-amber-800">Attenzione: sovrapposizione</p>
                                <p className="text-xs text-amber-700 mt-1">
                                    Hai già {overlaps.length} {overlaps.length === 1 ? 'richiesta approvata' : 'richieste approvate'} nello stesso periodo. Puoi comunque procedere.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Requested Changes Notice */}
                    {initialData?.requestedChanges && (
                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                            <p className="text-sm font-bold text-purple-800 mb-1">Modifiche richieste:</p>
                            <p className="text-sm text-purple-700">{initialData.requestedChanges}</p>
                        </div>
                    )}

                    {/* Type Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo di assenza</label>
                        <div className="grid grid-cols-2 gap-3">
                            {TYPE_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleChange('type', opt.value)}
                                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${form.type === opt.value
                                        ? 'border-[#8B5CF6] bg-purple-50 text-[#8B5CF6]'
                                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mode Selection (only for PERMESSO) */}
                    {isPermesso && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Modalità</label>
                            <div className="grid grid-cols-2 gap-3">
                                {MODE_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleChange('mode', opt.value)}
                                        className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${form.mode === opt.value
                                            ? 'border-[#8B5CF6] bg-purple-50 text-[#8B5CF6]'
                                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            {errors.mode && <p className="text-red-500 text-xs mt-1">{errors.mode}</p>}
                        </div>
                    )}

                    {/* Category (only for PERMESSO) */}
                    {isPermesso && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Categoria</label>
                            <select
                                value={form.category}
                                onChange={(e) => handleChange('category', e.target.value)}
                                className={inputClass('category')}
                            >
                                <option value="">Seleziona categoria...</option>
                                {CATEGORY_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                        </div>
                    )}

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Data inizio</label>
                            <input
                                type="date"
                                value={form.startDate}
                                onChange={(e) => handleChange('startDate', e.target.value)}
                                className={inputClass('startDate')}
                            />
                            {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Data fine</label>
                            <input
                                type="date"
                                value={form.endDate}
                                onChange={(e) => handleChange('endDate', e.target.value)}
                                min={form.startDate}
                                className={inputClass('endDate')}
                            />
                            {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
                        </div>
                    </div>

                    {/* Day Part (PERMESSO+DAY or FERIE single day) */}
                    {(isDayMode || (form.type === 'FERIE' && isSingleDay)) && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Fascia oraria</label>
                            <div className="grid grid-cols-3 gap-2">
                                {DAY_PART_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleChange('dayPart', opt.value)}
                                        className={`py-2.5 px-3 rounded-xl border-2 font-bold text-xs transition-all ${form.dayPart === opt.value
                                            ? 'border-[#8B5CF6] bg-purple-50 text-[#8B5CF6]'
                                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            {errors.dayPart && <p className="text-red-500 text-xs mt-1">{errors.dayPart}</p>}
                        </div>
                    )}

                    {/* Time Pickers (PERMESSO+HOURS only) */}
                    {isHoursMode && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                                    <Clock className="w-4 h-4" /> Ora inizio
                                </label>
                                <input
                                    type="time"
                                    value={form.startTime}
                                    onChange={(e) => handleChange('startTime', e.target.value)}
                                    className={inputClass('startTime')}
                                />
                                {errors.startTime && <p className="text-red-500 text-xs mt-1">{errors.startTime}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                                    <Clock className="w-4 h-4" /> Ora fine
                                </label>
                                <input
                                    type="time"
                                    value={form.endTime}
                                    onChange={(e) => handleChange('endTime', e.target.value)}
                                    className={inputClass('endTime')}
                                />
                                {errors.endTime && <p className="text-red-500 text-xs mt-1">{errors.endTime}</p>}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Note (opzionale)</label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            maxLength={1000}
                            rows={3}
                            placeholder="Aggiungi dettagli..."
                            className={`${inputClass('notes')} resize-none`}
                        />
                        <p className="text-xs text-slate-400 mt-1">{form.notes.length}/1000</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 px-4 bg-[#8B5CF6] text-white font-bold rounded-xl hover:bg-[#7C3AED] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
                        >
                            {loading ? 'Invio in corso...' : (initialData ? 'Reinvia Richiesta' : 'Invia Richiesta')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

AbsenceRequestForm.propTypes = {
    onSubmit: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    initialData: PropTypes.object,
    loading: PropTypes.bool,
    overlaps: PropTypes.array
};
