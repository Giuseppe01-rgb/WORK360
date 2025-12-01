import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { analyticsAPI, siteAPI } from '../../utils/api';
import { BarChart3, Users, Clock, Building2, Package, Calendar, Filter, Activity } from 'lucide-react';
import ActivityProductivityAnalytics from '../../components/owner/ActivityProductivityAnalytics';

export default function AnalyticsDashboard() {
    const [analytics, setAnalytics] = useState(null);
    const [siteStats, setSiteStats] = useState([]);
    const [selectedSite, setSelectedSite] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, [selectedSite]);

    const loadAnalytics = async () => {
        try {
            const params = selectedSite ? { siteId: selectedSite } : {};
            const [analyticsResp, sitesResp] = await Promise.all([
                analyticsAPI.getDashboard(params),
                analyticsAPI.getSiteStats()
            ]);

            setAnalytics(analyticsResp.data);
            setSiteStats(sitesResp.data);
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout title="Analisi Dati">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Analisi Dati">
            {/* Filter */}
            <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <Filter className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Filtra per Cantiere</label>
                        <select
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                            value={selectedSite}
                            onChange={(e) => setSelectedSite(e.target.value)}
                        >
                            <option value="">Tutti i cantieri</option>
                            {siteStats.map(stat => (
                                <option key={stat.site._id} value={stat.site._id}>
                                    {stat.site.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Company-Wide Cost Card */}
            {analytics?.companyCosts && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-10 -mt-10 opacity-50"></div>
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold text-slate-500 mb-2 flex items-center gap-2">
                            <span className="p-2 bg-green-100 rounded-lg text-green-600">
                                <BarChart3 className="w-5 h-5" />
                            </span>
                            Costo Totale Azienda
                        </h3>
                        <div className="flex items-baseline gap-2">
                            <p className="text-4xl md:text-5xl font-black text-slate-900">
                                {analytics.companyCosts.total.toFixed(2)}€
                            </p>
                            <span className="text-sm text-slate-500 font-medium">tutti i cantieri</span>
                        </div>
                        <div className="flex gap-6 mt-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-slate-600">Manodopera: <strong>{analytics.companyCosts.labor.toFixed(2)}€</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                <span className="text-slate-600">Materiali: <strong>{analytics.companyCosts.materials.toFixed(2)}€</strong></span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Cantieri Attivi</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                        {analytics?.activeSites || 0}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Dipendenti Totali</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                        {analytics?.totalEmployees || 0}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                            <Clock className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Ore Questo Mese</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                        {analytics?.monthlyHours?.toFixed(1) || 0}<span className="text-lg font-normal text-slate-500 ml-1">h</span>
                    </div>
                </div>
            </div>

            {/* Weekly Hours */}
            {analytics?.weeklyHours && (
                <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-slate-400" />
                        Ore Settimanali
                    </h3>
                    <div className="space-y-3">
                        {analytics.weeklyHours.map(day => (
                            <div
                                key={day._id}
                                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"
                            >
                                <div className="font-semibold text-slate-700 capitalize">
                                    {new Date(day._id).toLocaleDateString('it-IT', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                                        {day.count} presenze
                                    </div>
                                    <div className="font-bold text-slate-900 text-lg w-20 text-right">
                                        {day.totalHours.toFixed(1)}h
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Site Statistics */}
            <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-slate-400" />
                    Statistiche per Cantiere
                </h3>

                {siteStats.length === 0 ? (
                    <p className="text-center text-slate-500 py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Nessun dato disponibile
                    </p>
                ) : (
                    <div className="grid gap-6">
                        {siteStats.map(stat => (
                            <div
                                key={stat.site._id}
                                className="bg-slate-50 p-6 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-slate-400" />
                                        {stat.site.name}
                                    </h4>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${stat.site.status === 'active' ? 'bg-green-100 text-green-700' :
                                        stat.site.status === 'planned' ? 'bg-blue-100 text-blue-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {stat.site.status === 'active' ? 'In Corso' : stat.site.status === 'planned' ? 'Pianificato' : 'Archiviato'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-white p-4 rounded-lg border border-slate-100">
                                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Presenze</div>
                                        <div className="font-bold text-xl text-slate-900">
                                            {stat.totalAttendances}
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-lg border border-slate-100">
                                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Ore Lavorate</div>
                                        <div className="font-bold text-xl text-slate-900">
                                            {stat.totalHours.toFixed(1)}h
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-lg border border-slate-100">
                                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Dipendenti</div>
                                        <div className="font-bold text-xl text-slate-900">
                                            {stat.uniqueWorkers}
                                        </div>
                                    </div>
                                </div>

                                {stat.materials?.length > 0 && (
                                    <div className="pt-4 border-t border-slate-200">
                                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Package className="w-4 h-4" />
                                            Materiali Utilizzati
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {stat.materials.slice(0, 5).map((mat, idx) => (
                                                <span key={idx} className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-sm text-slate-700 font-medium shadow-sm">
                                                    {mat.name} <span className="text-slate-400 ml-1">{mat.quantity} {mat.unit}</span>
                                                </span>
                                            ))}
                                            {stat.materials.length > 5 && (
                                                <span className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 text-sm text-slate-500 font-medium">
                                                    +{stat.materials.length - 5} altri
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Activity Productivity Analytics */}
            <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-slate-400" />
                    Produttività Attività
                </h3>
                <ActivityProductivityAnalytics />
            </div>

            {/* Material Summary */}
            {analytics?.materialSummary && analytics.materialSummary.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Package className="w-5 h-5 text-slate-400" />
                        Riepilogo Materiali
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {analytics.materialSummary.map((material, idx) => (
                            <div
                                key={idx}
                                className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100"
                            >
                                <div className="font-semibold text-slate-700">{material.name}</div>
                                <div className="flex items-center gap-4">
                                    <div className="text-sm text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                                        {material.count} utilizzi
                                    </div>
                                    <div className="font-bold text-slate-900">
                                        {material.totalQuantity} {material.unit}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Layout>
    );
}
