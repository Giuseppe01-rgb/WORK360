import { useState, useEffect } from 'react';
import { workActivityAPI, userAPI } from '../../utils/api';
import { BarChart3, TrendingUp, Clock, DollarSign, Activity } from 'lucide-react';

const ActivityProductivityAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState({});
    const [filter, setFilter] = useState({
        groupBy: 'activity',
        startDate: '',
        endDate: ''
    });
    const [users, setUsers] = useState([]);

    useEffect(() => {
        loadData();
    }, [filter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [analyticsRes, usersRes] = await Promise.all([
                workActivityAPI.getAnalytics(filter),
                userAPI.getAll()
            ]);
            setAnalytics(analyticsRes.data || []);
            setUsers(usersRes.data || []);
        } catch (error) {
            console.error('Error loading productivity analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const getUserName = (userId) => {
        const user = users.find(u => u.id === userId);
        return user?.name || 'Sconosciuto';
    };

    const formatDuration = (decimalHours) => {
        if (!decimalHours) return '0 min';
        const totalMinutes = Math.round(decimalHours * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes} min`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Raggruppa per</label>
                        <select
                            value={filter.groupBy}
                            onChange={(e) => setFilter({ ...filter, groupBy: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                        >
                            <option value="activity">Attività</option>
                            <option value="user">Dipendente</option>
                            <option value="site">Cantiere</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Data Inizio</label>
                        <input
                            type="date"
                            value={filter.startDate}
                            onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Data Fine</label>
                        <input
                            type="date"
                            value={filter.endDate}
                            onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                        />
                    </div>
                </div>
            </div>

            {/* Productivity Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analytics.length > 0 ? (
                    analytics.map((item, index) => {
                        const label = filter.groupBy === 'user'
                            ? getUserName(item.id)
                            : item.id;
                        const productivity = item.productivity?.toFixed(2) || 0;

                        return (
                            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-blue-100 rounded-lg">
                                        <Activity className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-slate-500">Produttività</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {Math.round(productivity)}
                                        </p>
                                        <p className="text-xs text-slate-400">{item.unit || 'u'}/h</p>
                                    </div>
                                </div>
                                <h3 className="font-semibold text-slate-900 mb-2">{label}</h3>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Quantità totale:</span>
                                        <span className="font-medium">{item.totalQuantity} {item.unit}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Tempo totale:</span>
                                        <span className="font-medium">{formatDuration(item.totalHours)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Attività:</span>
                                        <span className="font-medium">{item.activityCount}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full text-center py-12 text-slate-500">
                        <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p>Nessun dato disponibile per il periodo selezionato</p>
                    </div>
                )}
            </div>

            {/* Productivity Bar Chart */}
            {analytics.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Confronto Produttività
                    </h3>
                    <div className="space-y-3">
                        {analytics.map((item, index) => {
                            const label = filter.groupBy === 'user'
                                ? getUserName(item.id)
                                : item.id;
                            const productivity = item.productivity || 0;
                            const maxProductivity = Math.max(...analytics.map(a => a.productivity || 0));
                            const percentage = maxProductivity > 0 ? (productivity / maxProductivity) * 100 : 0;

                            return (
                                <div key={index}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-slate-700">{label}</span>
                                        <span className="text-sm font-bold text-blue-600">
                                            {Math.round(productivity)} {item.unit || 'u'}/h
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-3">
                                        <div
                                            className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all"
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Come leggere i dati</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Produttività</strong> = Quanto lavoro viene svolto in un'ora (es. mq/h).</li>
                            <li>Esempio: <strong>100 mq/h</strong> significa che in un'ora vengono fatti 100 metri quadri.</li>
                            <li>Valori più alti indicano maggiore velocità ed efficienza.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivityProductivityAnalytics;
