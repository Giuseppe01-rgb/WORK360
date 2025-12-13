import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { analyticsAPI, siteAPI } from '../../utils/api';
import { BarChart3, Users, Clock, Building2, Package, Calendar, Filter, FileText, Download } from 'lucide-react';
import { exportAnalyticsReport } from '../../utils/excelExport';

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
                siteAPI.getAll()
            ]);

            setAnalytics(analyticsResp.data);

            // Load real stats for each site
            const siteStatsPromises = sitesResp.data.map(async (site) => {
                try {
                    const siteReport = await analyticsAPI.getSiteReport(site.id);
                    return {
                        site: site,
                        totalAttendances: siteReport.data.totalAttendances || 0,
                        totalHours: siteReport.data.totalHours || 0,
                        uniqueWorkers: siteReport.data.uniqueWorkers || 0,
                        materials: siteReport.data.materials?.slice(0, 5) || [],
                        marginPercent: siteReport.data.marginPercent,
                        marginStatus: siteReport.data.status || 'unknown'
                    };
                } catch (err) {
                    console.error(`Error loading stats for site ${site.id}:`, err);
                    return {
                        site: site,
                        totalAttendances: 0,
                        totalHours: 0,
                        uniqueWorkers: 0,
                        materials: [],
                        marginPercent: null,
                        marginStatus: 'unknown'
                    };
                }
            });

            const siteStatsData = await Promise.all(siteStatsPromises);
            setSiteStats(siteStatsData);
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
            <div className="bg-white rounded-[2.5rem] p-6 mb-8 shadow-sm">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4 flex-1 min-w-[250px]">
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
                                    <option key={stat.site.id} value={stat.site.id}>
                                        {stat.site.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={() => exportAnalyticsReport(analytics, siteStats)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors font-medium"
                        title="Esporta report Excel per il commercialista"
                    >
                        <Download className="w-4 h-4" />
                        <span>Esporta Excel</span>
                    </button>
                </div>
            </div>

            {/* Company-Wide Cost Card */}
            {analytics?.companyCosts && (
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 mb-6 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <span className="font-bold text-lg">$</span>
                            </div>
                            <div>
                                <h3 className="text-slate-500 font-bold text-sm">Costo Totale Azienda</h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="bg-green-50 text-green-600 text-[10px] font-bold px-3 py-1 rounded-full tracking-wide">
                                IN TEMPO REALE
                            </span>
                        </div>
                    </div>

                    <div className="mb-6">
                        <p className="text-4xl font-black text-slate-900 tracking-tight">
                            {analytics.companyCosts.total.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="text-2xl text-slate-400 font-medium ml-1">€</span>
                        </p>
                    </div>

                    <div className="space-y-4">
                        {/* Materiali */}
                        <div className="border-b border-slate-100 pb-4">
                            <p className="text-slate-500 text-sm font-medium mb-1">Materiali</p>
                            <p className="text-xl font-bold text-purple-600">
                                {analytics.companyCosts.materials.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="text-base text-purple-400 ml-1">€</span>
                                <span className="text-sm text-slate-400 ml-2">({analytics.companyCostIncidence.materialsIncidencePercent.toFixed(0)}%)</span>
                            </p>
                        </div>
                        {/* Manodopera */}
                        <div>
                            <p className="text-slate-500 text-sm font-medium mb-1">Manodopera</p>
                            <p className="text-xl font-bold text-blue-600">
                                {analytics.companyCosts.labor.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="text-base text-blue-400 ml-1">€</span>
                                <span className="text-sm text-slate-400 ml-2">({analytics.companyCostIncidence.laborIncidencePercent.toFixed(0)}%)</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Company-Wide Cost Incidence Card */}
            {analytics?.companyCostIncidence?.materialsIncidencePercent !== null ? (
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 mb-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <Package className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-slate-500 font-bold text-sm leading-tight">
                                    Incidenza costi<br />aziendali
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Materiali % */}
                        <div className="border-b border-slate-100 pb-4">
                            <p className="text-slate-500 text-sm font-medium mb-1">Materiali</p>
                            <p className="text-2xl font-bold text-purple-600">
                                {analytics.companyCostIncidence.materialsIncidencePercent.toFixed(1)}
                                <span className="text-lg text-purple-400 ml-1">%</span>
                            </p>
                        </div>
                        {/* Manodopera % */}
                        <div>
                            <p className="text-slate-500 text-sm font-medium mb-1">Manodopera</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {analytics.companyCostIncidence.laborIncidencePercent.toFixed(1)}
                                <span className="text-lg text-blue-400 ml-1">%</span>
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-slate-500" />
                        </div>
                        <h3 className="text-slate-700 font-bold text-sm">Incidenza costi aziendali</h3>
                    </div>
                    <p className="text-slate-600 text-sm">
                        Non ci sono ancora dati sufficienti per calcolare l'incidenza dei costi.
                    </p>
                </div>
            )}

            {/* Company-Wide Margin Card */}
            {analytics?.companyMargin?.totalContractValue ? (
                <div className={`p-6 rounded-[2.5rem] shadow-sm border mb-6 relative overflow-hidden ${analytics.companyMargin.marginValue >= 0
                    ? 'bg-white border-green-100'
                    : 'bg-white border-red-100'
                    }`}>
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${analytics.companyMargin.marginValue >= 0
                                ? 'bg-green-100 text-green-600'
                                : 'bg-red-100 text-red-600'
                                }`}>
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-slate-500 font-bold text-sm leading-tight">
                                    Margine<br />aziendale
                                </h3>
                            </div>
                        </div>
                        <span className="bg-amber-50 text-amber-600 text-[10px] font-bold px-3 py-1 rounded-full tracking-wide">
                            PROVVISORIO
                        </span>
                    </div>

                    <div className="mb-6">
                        <p className={`text-5xl font-black tracking-tight ${analytics.companyMargin.marginValue >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                            }`}>
                            {(analytics.companyMargin.marginValue || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="text-3xl text-slate-400 font-medium ml-1">€</span>
                        </p>
                        <p className="text-sm text-slate-500 mt-2">
                            {analytics.companyMargin.sitesWithContractValue} cantieri su {analytics.companyMargin.totalSites} con prezzo pattuito
                        </p>
                    </div>

                    <div className="space-y-5">
                        {/* Prezzo pattuito */}
                        <div className="border-b border-slate-100 pb-4">
                            <p className="text-slate-500 text-sm font-medium mb-1">Fatturato previsto</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {(analytics.companyMargin.totalContractValue || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="text-lg text-slate-400 ml-1">€</span>
                            </p>
                        </div>

                        {/* Costi totali */}
                        <div className="border-b border-slate-100 pb-4">
                            <p className="text-slate-500 text-sm font-medium mb-1">Costi totali</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {analytics.companyCosts.total.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="text-lg text-slate-400 ml-1">€</span>
                            </p>
                        </div>

                        {/* Costo su ricavo */}
                        <div>
                            <p className="text-slate-500 text-sm font-medium mb-1">Costo su ricavo</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {(analytics.companyMargin.costVsRevenuePercent || 0).toFixed(1)}
                                <span className="text-lg text-slate-400 ml-1">%</span>
                            </p>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500 italic mt-4">
                        Margine complessivo calcolato sommando i prezzi pattuiti di tutti i cantieri.
                    </p>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                            <FileText className="w-5 h-5 text-slate-500" />
                        </div>
                        <h3 className="text-slate-700 font-bold text-sm">Margine aziendale</h3>
                    </div>
                    <p className="text-slate-600 text-sm mb-4">
                        {analytics?.companyMargin?.totalSites > 0
                            ? 'Inserisci il prezzo pattuito per i cantieri per vedere il margine aziendale.'
                            : 'Crea dei cantieri per vedere il margine aziendale.'}
                    </p>
                    {analytics?.companyMargin?.totalSites > 0 && (
                        <p className="text-xs text-slate-500">
                            0 cantieri su {analytics.companyMargin.totalSites} hanno un prezzo pattuito.
                        </p>
                    )}
                </div>
            )}

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 rounded-2xl text-blue-600">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Cantieri Attivi</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                        {analytics?.activeSites || 0}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-50 rounded-2xl text-green-600">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Dipendenti Totali</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                        {analytics?.totalEmployees || 0}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-50 rounded-2xl text-purple-600">
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
                <div className="bg-white rounded-[2.5rem] p-6 mb-8 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-slate-400" />
                        Ore Settimanali
                    </h3>
                    <div className="space-y-3">
                        {analytics.weeklyHours.map(day => (
                            <div
                                key={day.id}
                                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"
                            >
                                <div className="font-semibold text-slate-700 capitalize">
                                    {new Date(day.id).toLocaleDateString('it-IT', {
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
            <div className="bg-white rounded-[2.5rem] p-6 mb-8 shadow-sm">
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
                                key={stat.site.id}
                                className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 hover:border-slate-300 transition-colors"
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

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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

                                    <div className="bg-white p-4 rounded-lg border border-slate-100">
                                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Margine Stimato</div>
                                        <div className="flex items-center gap-2">
                                            <div className="font-bold text-xl text-slate-900">
                                                {stat.marginPercent != null ? `${stat.marginPercent.toFixed(1)}%` : '—'}
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${stat.marginStatus === 'high' ? 'bg-green-100 text-green-700' :
                                                stat.marginStatus === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                    stat.marginStatus === 'low' ? 'bg-red-100 text-red-700' :
                                                        'bg-slate-100 text-slate-500'
                                                }`}>
                                                {stat.marginStatus === 'high' ? 'Buono' :
                                                    stat.marginStatus === 'medium' ? 'Medio' :
                                                        stat.marginStatus === 'low' ? 'Basso' : 'N/D'}
                                            </span>
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



            {/* Material Summary */}
            {analytics?.materialSummary && analytics.materialSummary.length > 0 && (
                <div className="bg-white rounded-[2.5rem] p-6 shadow-sm">
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
