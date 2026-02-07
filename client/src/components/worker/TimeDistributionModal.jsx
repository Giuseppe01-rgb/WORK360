import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { workActivityAPI } from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const TimeDistributionModal = ({ activities, totalHours, onClose, onSuccess }) => {
    const { showSuccess, showError } = useToast();
    const [percentages, setPercentages] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);

    // Initialize percentages evenly distributed
    useEffect(() => {
        if (activities.length > 0) {
            const evenPercentage = Number.parseFloat((100 / activities.length).toFixed(1));
            const initial = {};
            activities.forEach((activity, index) => {
                // Give the first activity any leftover to ensure we start at exactly 100%
                if (index === 0) {
                    initial[activity.id] = Number.parseFloat((100 - evenPercentage * (activities.length - 1)).toFixed(1));
                } else {
                    initial[activity.id] = evenPercentage;
                }
            });
            setPercentages(initial);
        }
    }, [activities]);

    const handlePercentageChange = (activityId, value) => {
        const numValue = Number.parseFloat(value) || 0;
        if (numValue >= 0 && numValue <= 100) {
            setPercentages(prev => ({ ...prev, [activityId]: numValue }));
        }
    };

    const calculateHours = (percentage) => {
        return (totalHours * (percentage / 100)).toFixed(2);
    };

    const getTotalPercentage = () => {
        return Object.values(percentages).reduce((sum, p) => sum + p, 0).toFixed(1);
    };

    const handleAutoRebalance = () => {
        const total = Number.parseFloat(getTotalPercentage());
        if (total === 0) return;

        // Normalize all percentages to sum to 100
        const rebalanced = {};
        Object.entries(percentages).forEach(([id, value]) => {
            rebalanced[id] = Number.parseFloat(((value / total) * 100).toFixed(1));
        });

        // Adjust for rounding errors - add/subtract from largest percentage
        const newTotal = Object.values(rebalanced).reduce((sum, p) => sum + p, 0);
        const diff = 100 - newTotal;
        if (Math.abs(diff) > 0) {
            const maxId = Object.entries(rebalanced).reduce((a, b) => b[1] > a[1] ? b : a, ['', 0])[0];
            rebalanced[maxId] = Number.parseFloat((rebalanced[maxId] + diff).toFixed(1));
        }

        setPercentages(rebalanced);
    };

    const formatDuration = (decimalHours) => {
        const totalMinutes = Math.round(decimalHours * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes} min`;
    };

    const handleSubmit = async () => {
        const total = Number.parseFloat(getTotalPercentage());

        if (Math.abs(total - 100) > 0.1) {
            showError(`La somma deve essere esattamente 100% (attuale: ${total}%)`);
            return;
        }

        setIsProcessing(true);
        try {
            const activitiesData = activities.map(activity => ({
                id: activity.id,
                percentageTime: percentages[activity.id]
            }));

            await workActivityAPI.distributeTime({ activities: activitiesData });
            showSuccess('Distribuzione del tempo salvata con successo!');
            // Don't set isProcessing(false) here because onSuccess will unmount the component
            onSuccess();
        } catch (error) {
            showError(error.response?.data?.message || 'Errore nel salvataggio della distribuzione');
            setIsProcessing(false); // Only reset if error occurred (component still mounted)
        }
    };

    const total = Number.parseFloat(getTotalPercentage());
    const isValid = Math.abs(total - 100) < 0.1;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Clock className="w-6 h-6 text-blue-600" />
                                Distribuzione del Tempo
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                Totale giornata: <span className="font-semibold text-slate-700">{formatDuration(totalHours)}</span>
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>
                </div>

                {/* Activities List */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {activities.map((activity) => {
                            const percentage = percentages[activity.id] || 0;
                            const hours = calculateHours(percentage);

                            return (
                                <div key={activity.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <div className="mb-3">
                                        <h3 className="font-semibold text-slate-900">
                                            {activity.activityType}
                                        </h3>
                                        <p className="text-sm text-slate-600">
                                            {activity.quantity} {activity.unit}
                                        </p>
                                    </div>

                                    {/* Slider */}
                                    <div className="mb-3">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="1"
                                            value={percentage}
                                            onChange={(e) => handlePercentageChange(activity.id, e.target.value)}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                            style={{
                                                background: `linear-gradient(to right, rgb(37, 99, 235) ${percentage}%, rgb(226, 232, 240) ${percentage}%)`
                                            }}
                                        />
                                    </div>

                                    {/* Percentage Input & Hours Display */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                value={percentage}
                                                onChange={(e) => handlePercentageChange(activity.id, e.target.value)}
                                                className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                            />
                                            <span className="text-sm font-medium text-slate-600">%</span>
                                        </div>
                                        <div className="flex-1 text-right">
                                            <span className="text-lg font-bold text-blue-600">{formatDuration(Number.parseFloat(hours))}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100">
                    {/* Total Display */}
                    <div className={`mb-4 p-4 rounded-xl flex items-center justify-between ${isValid
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-amber-50 border border-amber-200'
                        }`}>
                        <div className="flex items-center gap-2">
                            {isValid ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                            )}
                            <span className={`font-medium ${isValid ? 'text-green-700' : 'text-amber-700'}`}>
                                Totale: {total}%
                            </span>
                        </div>
                        {!isValid && (
                            <button
                                onClick={handleAutoRebalance}
                                className="px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors text-sm"
                            >
                                Ribilancia Auto
                            </button>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="flex-1 px-6 py-3 bg-white border-2 border-slate-900 text-slate-900 font-semibold hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-50"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!isValid || isProcessing}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Salvataggio...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    Conferma Distribuzione
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimeDistributionModal;
