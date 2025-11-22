import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { analyticsAPI, siteAPI } from '../../utils/api';
import { Building2, Users, Clock, BarChart3, UserCheck, Package } from 'lucide-react';

export default function OwnerDashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [dashData, sitesData] = await Promise.all([
                analyticsAPI.getDashboard().catch(() => ({ data: { activeSites: 0, totalWorkers: 0, todayAttendance: 0 } })),
                siteAPI.getAll().catch(() => ({ data: [] }))
            ]);

            setDashboard(dashData.data);
            setSites(sitesData.data.slice(0, 5)); // Latest 5 sites
        } catch (error) {
            console.error('Error loading dashboard:', error);
            setDashboard({ activeSites: 0, totalWorkers: 0, todayAttendance: 0 });
            setSites([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout title="Dashboard Titolare">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                        <p className="text-sm text-slate-600">Caricamento...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Dashboard Titolare">
            <div className="space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Active Sites */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-slate-100 rounded-xl">
                                <Building2 className="w-6 h-6 text-slate-900" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-600">Cantieri Attivi</p>
                            <p className="text-4xl font-bold text-slate-900">
                                {dashboard?.activeSites || 0}
                            </p>
                        </div>
                    </div>

                    {/* Total Employees */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-slate-100 rounded-xl">
                                <Users className="w-6 h-6 text-slate-900" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-600">Dipendenti</p>
                            <p className="text-4xl font-bold text-slate-900">
                                {dashboard?.totalEmployees || 0}
                            </p>
                        </div>
                    </div>

                    {/* Monthly Hours */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-slate-100 rounded-xl">
                                <Clock className="w-6 h-6 text-slate-900" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-600">Ore Questo Mese</p>
                            <p className="text-4xl font-bold text-slate-900">
                                {dashboard?.monthlyHours?.toFixed(1) || 0}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Azioni Rapide</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Sites Management */}
                        <Link
                            to="/owner/sites"
                            className="group bg-white rounded-2xl border border-slate-200 p-6 hover:border-slate-900 hover:shadow-md transition-all"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-slate-900 transition-colors">
                                    <Building2 className="w-6 h-6 text-slate-900 group-hover:text-white transition-colors" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-slate-900">
                                        Gestione Cantieri
                                    </h3>
                                    <p className="text-sm text-slate-600">
                                        Crea e gestisci i cantieri, assegna operai e monitora i progressi
                                    </p>
                                </div>
                            </div>
                        </Link>

                        {/* Attendance */}
                        <Link
                            to="/owner/attendance"
                            className="group bg-white rounded-2xl border border-slate-200 p-6 hover:border-slate-900 hover:shadow-md transition-all"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-slate-900 transition-colors">
                                    <UserCheck className="w-6 h-6 text-slate-900 group-hover:text-white transition-colors" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                                        Registro Presenze
                                    </h3>
                                    <p className="text-sm text-slate-600">
                                        Visualizza tutte le timbrature dei dipendenti con posizione GPS
                                    </p>
                                </div>
                            </div>
                        </Link>

                        {/* Analytics */}
                        <Link
                            to="/owner/analytics"
                            className="group bg-white rounded-2xl border border-slate-200 p-6 hover:border-slate-900 hover:shadow-md transition-all"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-slate-900 transition-colors">
                                    <BarChart3 className="w-6 h-6 text-slate-900 group-hover:text-white transition-colors" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                                        Analisi Dati
                                    </h3>
                                    <p className="text-sm text-slate-600">
                                        Report dettagliati su ore, materiali e performance dei cantieri
                                    </p>
                                </div>
                            </div>
                        </Link>

                        {/* Suppliers */}
                        <Link
                            to="/owner/suppliers"
                            className="group bg-white rounded-2xl border border-slate-200 p-6 hover:border-slate-900 hover:shadow-md transition-all"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-slate-900 transition-colors">
                                    <Package className="w-6 h-6 text-slate-900 group-hover:text-white transition-colors" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                                        Fornitori
                                    </h3>
                                    <p className="text-sm text-slate-600">
                                        Gestisci fornitori e ottieni raccomandazioni intelligenti
                                    </p>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Recent Sites */}
                {sites.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Cantieri Recenti</h2>
                            <Link
                                to="/owner/sites"
                                className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                Vedi tutti →
                            </Link>
                        </div>

                        <div className="space-y-3">
                            {sites.map(site => (
                                <div
                                    key={site._id}
                                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                                            <Building2 className="w-5 h-5 text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">{site.name}</p>
                                            <p className="text-sm text-slate-600">
                                                Inizio: {new Date(site.startDate).toLocaleDateString('it-IT')}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`px-3 py-1 text-xs font-semibold rounded-full ${site.status === 'active'
                                            ? 'bg-green-100 text-green-700'
                                            : site.status === 'planned'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-slate-100 text-slate-700'
                                            }`}
                                    >
                                        {site.status === 'active' ? 'Attivo' :
                                            site.status === 'planned' ? 'Pianificato' :
                                                site.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
