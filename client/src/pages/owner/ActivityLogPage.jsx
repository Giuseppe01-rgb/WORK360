import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { auditLogAPI } from '../../utils/api';
import {
    Activity, Building2, Clock, Package, User, Calendar,
    Filter, RefreshCw, ChevronDown
} from 'lucide-react';

export default function ActivityLogPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        from: '',
        to: '',
        action: ''
    });
    const [actionTypes, setActionTypes] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [total, setTotal] = useState(0);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.from) params.from = filters.from;
            if (filters.to) params.to = filters.to;
            if (filters.action) params.action = filters.action;
            params.limit = 50;

            const response = await auditLogAPI.getAll(params);
            setLogs(response.data.logs || []);
            setTotal(response.data.total || 0);
        } catch (error) {
            console.error('Error loading activity logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadActionTypes = async () => {
        try {
            const response = await auditLogAPI.getActions();
            setActionTypes(response.data || []);
        } catch (error) {
            console.error('Error loading action types:', error);
        }
    };

    useEffect(() => {
        loadLogs();
        loadActionTypes();
    }, []);

    const handleApplyFilters = () => {
        loadLogs();
    };

    const handleResetFilters = () => {
        setFilters({ from: '', to: '', action: '' });
        setTimeout(loadLogs, 0);
    };

    const getActionIcon = (targetType) => {
        switch (targetType) {
            case 'site': return <Building2 className="w-5 h-5" />;
            case 'attendance': return <Clock className="w-5 h-5" />;
            case 'material': return <Package className="w-5 h-5" />;
            case 'company': return <Building2 className="w-5 h-5" />;
            default: return <Activity className="w-5 h-5" />;
        }
    };

    const getActionColor = (action) => {
        if (action?.includes('CREATED')) return 'bg-green-100 text-green-600';
        if (action?.includes('UPDATED')) return 'bg-blue-100 text-blue-600';
        if (action?.includes('DELETED')) return 'bg-red-100 text-red-600';
        if (action?.includes('CLOCK')) return 'bg-amber-100 text-amber-600';
        if (action?.includes('EXPORTED')) return 'bg-purple-100 text-purple-600';
        return 'bg-slate-100 text-slate-600';
    };

    const formatAction = (action) => {
        return action?.replaceAll('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()) || '';
    };

    return (
        <Layout title="Riepilogo Attività" hideHeader={true}>
            <div className="space-y-6 pb-20">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Riepilogo Attività</h1>
                        <p className="text-slate-500">Registro di tutte le azioni eseguite</p>
                    </div>
                    <button
                        onClick={loadLogs}
                        className="p-3 bg-white rounded-full shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"
                        title="Aggiorna"
                    >
                        <RefreshCw className={`w-5 h-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Filters Toggle */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                    <Filter className="w-4 h-4" />
                    Filtri
                    <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="dateFrom" className="block text-sm font-medium text-slate-700 mb-1">Da</label>
                                <input
                                    id="dateFrom"
                                    type="date"
                                    value={filters.from}
                                    onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label htmlFor="dateTo" className="block text-sm font-medium text-slate-700 mb-1">A</label>
                                <input
                                    id="dateTo"
                                    type="date"
                                    value={filters.to}
                                    onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label htmlFor="actionType" className="block text-sm font-medium text-slate-700 mb-1">Tipo azione</label>
                                <select
                                    id="actionType"
                                    value={filters.action}
                                    onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                                >
                                    <option value="">Tutte le azioni</option>
                                    {actionTypes.map((action) => (
                                        <option key={action} value={action}>{formatAction(action)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleApplyFilters}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Applica
                            </button>
                            <button
                                onClick={handleResetFilters}
                                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 p-4">
                    <p className="text-slate-600">
                        <span className="font-bold text-slate-900">{total}</span> attività registrate
                    </p>
                </div>

                {/* Activity List */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                            <p className="text-slate-500 mt-3">Caricamento...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="p-12 text-center">
                            <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Nessuna attività</h3>
                            <p className="text-slate-500">Non ci sono attività registrate per i filtri selezionati.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {logs.map((log) => (
                                <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getActionColor(log.action)}`}>
                                            {getActionIcon(log.targetType)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-bold text-slate-900">
                                                        {log.user?.name || 'Sistema'}
                                                    </p>
                                                    <p className="text-slate-600">
                                                        {formatAction(log.action)}
                                                        {log.meta?.name && (
                                                            <span className="text-slate-400"> — {log.meta.name}</span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-sm text-slate-500">
                                                        {new Date(log.createdAt).toLocaleDateString('it-IT')}
                                                    </p>
                                                    <p className="text-sm text-slate-400">
                                                        {new Date(log.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Additional info */}
                                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                                {log.targetType && (
                                                    <span className="bg-slate-100 px-2 py-1 rounded">
                                                        {log.targetType}
                                                    </span>
                                                )}
                                                {log.ipAddress && (
                                                    <span>IP: {log.ipAddress}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
