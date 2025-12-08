import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { siteAPI, analyticsAPI, noteAPI, photoAPI, workActivityAPI, economiaAPI } from '../../utils/api';
import {
    Building2, MapPin, Calendar, Clock, Package, Users,
    Edit, Trash2, Plus, X, ArrowLeft, CheckCircle, AlertCircle, Search, ChevronRight,
    FileText, Camera, Image, Zap, Bell, MoreVertical
} from 'lucide-react';

const SiteDetails = ({ site, onBack }) => {
    const [activeTab, setActiveTab] = useState('dati');
    const [report, setReport] = useState(null);
    const [employeeHours, setEmployeeHours] = useState([]);
    const [notes, setNotes] = useState([]);
    const [dailyReports, setDailyReports] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [economie, setEconomie] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNote, setSelectedNote] = useState(null);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [showMaterialsModal, setShowMaterialsModal] = useState(false);
    const [showEmployeesModal, setShowEmployeesModal] = useState(false);

    const handleDeleteNote = async (e, noteId) => {
        e.stopPropagation();
        if (!window.confirm('Sei sicuro di voler eliminare questa nota?')) return;
        try {
            await noteAPI.delete(noteId);
            const notesData = await noteAPI.getAll({ siteId: site.id, type: 'note' });
            setNotes(notesData.data || []);
        } catch (error) {
            console.error('Error deleting note:', error);
            alert(`Errore nell'eliminazione della nota: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleDeleteReport = async (e, reportId) => {
        e.stopPropagation();
        if (!window.confirm('Sei sicuro di voler eliminare questo rapporto?')) return;
        try {
            await workActivityAPI.delete(reportId);
            const rep = await analyticsAPI.getSiteReport(site.id);
            setReport(rep.data);
        } catch (error) {
            console.error('Error deleting report:', error);
            alert(`Errore nell'eliminazione del report: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleDeleteEconomia = async (e, economiaId) => {
        e.stopPropagation();
        if (!window.confirm('Sei sicuro di voler eliminare questa economia?')) return;
        try {
            await economiaAPI.delete(economiaId);
            const economieData = await economiaAPI.getBySite(site.id);
            setEconomie(economieData.data);
        } catch (error) {
            console.error('Error deleting economia:', error);
            alert('Errore nell\'eliminazione');
        }
    };

    useEffect(() => {
        const loadDetails = async () => {
            try {
                const [rep, hours, notesData, reportsData, photosData, economieData] = await Promise.all([
                    analyticsAPI.getSiteReport(site.id),
                    analyticsAPI.getHoursPerEmployee({ siteId: site.id }),
                    noteAPI.getAll({ siteId: site.id, type: 'note' }),
                    noteAPI.getAll({ siteId: site.id, type: 'daily_report' }),
                    photoAPI.getAll({ siteId: site.id }),
                    economiaAPI.getBySite(site.id)
                ]);
                setReport(rep.data);
                setEmployeeHours(hours.data);
                setNotes(notesData.data || []);
                setPhotos(photosData.data || []);
                setEconomie(economieData.data || []);
            } catch (err) {
                console.error("Error loading site details:", err);
            } finally {
                setLoading(false);
            }
        };
        loadDetails();
    }, [site]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
            </div>
        );
    }

    // Calculations for the cost card
    const laborCost = report?.siteCost?.labor || 0;
    const materialCost = report?.siteCost?.materials || 0;
    const economieCost = economie.reduce((sum, e) => sum + e.hours, 0) * 30;
    const totalCost = laborCost + materialCost + economieCost;

    // Calculate percentages for progress bars (avoid division by zero)
    const maxVal = totalCost > 0 ? totalCost : 1;
    const laborPct = (laborCost / maxVal) * 100;
    const materialPct = (materialCost / maxVal) * 100;
    const economiePct = (economieCost / maxVal) * 100;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 w-full max-w-full overflow-hidden pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 mb-2">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors text-slate-900"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-2xl font-black text-slate-900">{site.name}</h2>
                    <div className="flex items-center gap-1 text-slate-500 text-sm font-medium">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{site.address}</span>
                    </div>
                </div>
                <div className="ml-auto">
                    <button className="p-2 relative">
                        <Bell className="w-6 h-6 text-slate-400" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                    </button>
                </div>
            </div>

            {/* TAB SWITCHER */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {[
                    { id: 'dati', label: 'Dati', icon: Clock },
                    { id: 'report', label: 'Report Giornaliero', icon: FileText },
                    { id: 'economie', label: 'Economie', icon: Zap },
                    { id: 'note', label: 'Note', icon: FileText },
                    { id: 'foto', label: 'Foto', icon: Camera },
                ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all whitespace-nowrap ${isActive
                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            {isActive && <tab.icon className="w-4 h-4" />}
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* DATI TAB */}
            {activeTab === 'dati' && (
                <>
                    {/* COSTO CANTIERE - NEW DESIGN */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                    <span className="font-bold text-lg">$</span>
                                </div>
                                <div>
                                    <h3 className="text-slate-500 font-bold text-sm leading-tight">Costo Totale<br />Cantiere</h3>
                                </div>
                            </div>
                            <span className="bg-green-50 text-green-600 text-[10px] font-bold px-3 py-1 rounded-full tracking-wide">
                                IN TEMPO REALE
                            </span>
                        </div>

                        <div className="mb-8">
                            <p className="text-5xl font-black text-slate-900 tracking-tight">
                                {totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span className="text-3xl text-slate-400 font-medium ml-1">€</span>
                            </p>
                        </div>

                        <div className="space-y-6">
                            {/* Materiali */}
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="flex items-center gap-2 text-slate-600 font-bold">
                                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                                        Materiali
                                    </span>
                                    <span className="font-black text-slate-900">{materialCost.toFixed(2)}€</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${materialPct}%` }}></div>
                                </div>
                            </div>

                            {/* Manodopera */}
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="flex items-center gap-2 text-slate-600 font-bold">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                        Manodopera
                                    </span>
                                    <span className="font-black text-slate-900">{laborCost.toFixed(2)}€</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${laborPct}%` }}></div>
                                </div>
                            </div>

                            {/* Economie */}
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="flex items-center gap-2 text-slate-600 font-bold">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                        Economie
                                    </span>
                                    <span className="font-black text-slate-900">{economieCost.toFixed(2)}€</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${economiePct}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COST INCIDENCE CARD */}
                    {report?.costIncidence?.materialsIncidencePercent !== null ? (
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-slate-500 font-bold text-sm leading-tight">
                                            Incidenza materiali /<br />manodopera
                                        </h3>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                                        Materiali
                                    </span>
                                    <span className="font-black text-slate-900 text-2xl">{report.costIncidence.materialsIncidencePercent.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                        Manodopera
                                    </span>
                                    <span className="font-black text-slate-900 text-2xl">{report.costIncidence.laborIncidencePercent.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                                    <Package className="w-5 h-5 text-slate-500" />
                                </div>
                                <h3 className="text-slate-700 font-bold text-sm">Incidenza materiali / manodopera</h3>
                            </div>
                            <p className="text-slate-600 text-sm">
                                Nessun dato di costo disponibile per calcolare l'incidenza.
                            </p>
                        </div>
                    )}

                    {/* MARGIN CARD */}
                    {report?.contractValue ? (
                        <div className={`p-6 rounded-3xl shadow-sm border mb-6 relative overflow-hidden ${report.margin?.marginCurrentValue >= 0
                            ? 'bg-white border-green-100'
                            : 'bg-white border-red-100'
                            }`}>
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${report.margin?.marginCurrentValue >= 0
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-red-100 text-red-600'
                                        }`}>
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-slate-500 font-bold text-sm leading-tight">
                                            {report.status === 'completed' ? 'Margine finale' : 'Margine'}<br />cantiere
                                        </h3>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-bold px-3 py-1 rounded-full tracking-wide ${report.status === 'completed'
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'bg-amber-50 text-amber-600'
                                    }`}>
                                    {report.status === 'completed' ? 'A CONSUNTIVO' : 'PROVVISORIO'}
                                </span>
                            </div>

                            <div className="mb-6">
                                <p className={`text-5xl font-black tracking-tight ${report.margin?.marginCurrentValue >= 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                    }`}>
                                    {(report.margin?.marginCurrentValue || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    <span className="text-3xl text-slate-400 font-medium ml-1">€</span>
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                        {report.status === 'completed' ? 'Prezzo fatturato' : 'Prezzo pattuito'}
                                    </span>
                                    <span className="font-black text-slate-900">{(report.contractValue || 0).toFixed(2)}€</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                                        {report.status === 'completed' ? 'Costo totale' : 'Costi maturati'}
                                    </span>
                                    <span className="font-black text-slate-900">{totalCost.toFixed(2)}€</span>
                                </div>
                                {report.status !== 'completed' && (
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                            Costo su ricavo
                                        </span>
                                        <span className="font-black text-slate-900">{(report.margin?.costVsRevenuePercent || 0).toFixed(1)}%</span>
                                    </div>
                                )}
                                {report.status === 'completed' && (
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                            Margine %
                                        </span>
                                        <span className="font-black text-slate-900">{(report.margin?.marginCurrentPercent || 0).toFixed(1)}%</span>
                                    </div>
                                )}
                            </div>

                            {report.status !== 'completed' && (
                                <p className="text-xs text-slate-500 italic mt-4">
                                    Valore provvisorio basato sui costi registrati finora.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-slate-500" />
                                </div>
                                <h3 className="text-slate-700 font-bold text-sm">Margine cantiere</h3>
                            </div>
                            <p className="text-slate-600 text-sm mb-4">
                                Inserisci il prezzo pattuito per vedere il margine di questo cantiere.
                            </p>
                            <button
                                onClick={onBack}
                                className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                Modifica cantiere →
                            </button>
                        </div>
                    )}

                    {/* SUMMARY GRID - NEW DESIGN */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <span className="text-green-500 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">
                                    <Users className="w-3 h-3 inline mr-1" />
                                    Active
                                </span>
                            </div>
                            <h3 className="text-slate-500 font-medium text-sm mb-1">Ore Totali</h3>
                            <p className="text-3xl font-black text-slate-900">
                                {report?.totalHours?.toFixed(2) || '0.00'} <span className="text-lg font-medium text-slate-400">h</span>
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                                    <Package className="w-5 h-5" />
                                </div>
                                <span className="text-purple-600 text-xs font-bold bg-purple-50 px-2 py-1 rounded-full">
                                    +{report?.materials?.length || 0}
                                </span>
                            </div>
                            <h3 className="text-slate-500 font-medium text-sm mb-1">Materiali</h3>
                            <p className="text-3xl font-black text-slate-900">
                                {report?.materials?.reduce((acc, curr) => acc + curr.totalQuantity, 0) || 0} <span className="text-lg font-medium text-slate-400">pz</span>
                            </p>
                        </div>
                    </div>

                    {/* Accesso Rapido Header */}
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Accesso Rapido</h3>

                    {/* INTERACTIVE CARDS GRID */}
                    <div className="space-y-4">
                        {/* EMPLOYEES CARD */}
                        <div
                            onClick={() => setShowEmployeesModal(true)}
                            className="bg-white rounded-3xl border border-slate-100 p-5 hover:shadow-lg transition-all cursor-pointer group flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">Dettaglio Dipendenti</h3>
                                    <p className="text-sm text-slate-500">{employeeHours.length} dipendenti attivi</p>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-orange-500" />
                            </div>
                        </div>

                        {/* MATERIALS CARD */}
                        <div
                            onClick={() => setShowMaterialsModal(true)}
                            className="bg-white rounded-3xl border border-slate-100 p-5 hover:shadow-lg transition-all cursor-pointer group flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500">
                                    <Package className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">Dettaglio Materiali</h3>
                                    <p className="text-sm text-slate-500">{report?.materials?.length || 0} tipi di materiali</p>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-purple-50 group-hover:text-purple-500 transition-colors">
                                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-500" />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* REPORT GIORNALIERO TAB */}
            {activeTab === 'report' && (
                <div className="space-y-4">
                    {report?.dailyReports?.length > 0 ? (
                        report.dailyReports.map((dailyReport) => (
                            <div
                                key={dailyReport.id}
                                onClick={() => setSelectedNote({ ...dailyReport, content: dailyReport.activityType })}
                                className="bg-white rounded-3xl border border-slate-100 p-6 hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h4 className="font-bold text-slate-900">
                                            {dailyReport.user?.firstName} {dailyReport.user?.lastName}
                                        </h4>
                                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                            <span>{new Date(dailyReport.date).toLocaleDateString('it-IT')}</span>
                                            <span>•</span>
                                            <span>{new Date(dailyReport.date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteReport(e, dailyReport.id)}
                                        className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors opacity-100 md:opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-slate-600 line-clamp-2">{dailyReport.activityType}</p>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center">
                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">Nessun report giornaliero disponibile</p>
                        </div>
                    )}
                </div>
            )}

            {/* ECONOMIE TAB */}
            {activeTab === 'economie' && (
                <div className="space-y-4">
                    {economie.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {economie.map((economia) => (
                                <div key={economia.id} className="bg-white p-6 rounded-3xl shadow-sm border border-amber-100 relative group">
                                    <button
                                        onClick={(e) => handleDeleteEconomia(e, economia.id)}
                                        className="absolute top-4 right-4 p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold">
                                            {economia.worker?.name?.charAt(0)}{economia.worker?.surname?.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900">{economia.worker?.name} {economia.worker?.surname}</h4>
                                            <p className="text-xs text-slate-500">Operaio</p>
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-amber-600" />
                                            <span className="text-2xl font-bold text-amber-600">{economia.hours}</span>
                                            <span className="text-sm text-slate-500">{economia.hours === 1 ? 'ora' : 'ore'}</span>
                                        </div>
                                    </div>
                                    <p className="text-slate-600 text-sm whitespace-pre-wrap mb-3">{economia.description}</p>
                                    <div className="pt-3 border-t border-slate-50">
                                        <span className="text-xs text-slate-500 font-medium">
                                            {new Date(economia.date).toLocaleString('it-IT', {
                                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
                            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Zap className="w-8 h-8 text-amber-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Economie</h3>
                            <p className="text-slate-500">Nessuna economia disponibile per questo cantiere.</p>
                        </div>
                    )}
                </div>
            )}

            {/* NOTE TAB */}
            {activeTab === 'note' && (
                <div className="space-y-4">
                    {notes.length > 0 ? (
                        notes.map((note) => (
                            <div
                                key={note.id}
                                onClick={() => setSelectedNote(note)}
                                className="bg-white rounded-3xl border border-slate-100 p-6 hover:shadow-md transition-all cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h4 className="font-bold text-slate-900">
                                            {note.user?.firstName} {note.user?.lastName}
                                        </h4>
                                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                            <span>{new Date(note.date).toLocaleDateString('it-IT')}</span>
                                            <span>•</span>
                                            <span>{new Date(note.date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteNote(e, note.id)}
                                        className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors opacity-100 md:opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-slate-600 line-clamp-2">{note.content}</p>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center">
                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">Nessuna nota disponibile</p>
                        </div>
                    )}
                </div>
            )}

            {/* FOTO TAB */}
            {activeTab === 'foto' && (
                <div>
                    {photos.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {photos.map((photo) => (
                                <div
                                    key={photo.id}
                                    onClick={() => setSelectedPhoto(photo)}
                                    className="bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-md transition-all cursor-pointer"
                                >
                                    <div className="aspect-video bg-slate-100 relative">
                                        <img
                                            src={photo.photoUrl}
                                            alt={photo.caption || 'Foto cantiere'}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="p-4">
                                        <h4 className="font-bold text-slate-900 text-sm mb-1">
                                            {photo.user?.firstName} {photo.user?.lastName}
                                        </h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                            <span>{new Date(photo.createdAt).toLocaleDateString('it-IT')}</span>
                                            <span>•</span>
                                            <span>{new Date(photo.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        {photo.caption && (
                                            <p className="text-slate-600 text-sm line-clamp-2">{photo.caption}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center">
                            <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">Nessuna foto disponibile</p>
                        </div>
                    )}
                </div>
            )}

            {/* Note Detail Modal */}
            {selectedNote && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-4 md:p-4 overflow-y-auto" onClick={() => setSelectedNote(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-2xl my-auto shadow-2xl max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">
                                    {selectedNote.user?.firstName} {selectedNote.user?.lastName}
                                </h3>
                                <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                    <span>{new Date(selectedNote.createdAt).toLocaleDateString('it-IT')}</span>
                                    <span>•</span>
                                    <span>{new Date(selectedNote.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedNote(null)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-700 whitespace-pre-wrap">{selectedNote.content}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Detail Modal */}
            {selectedPhoto && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-4 md:p-4 overflow-y-auto" onClick={() => setSelectedPhoto(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-4xl my-auto shadow-2xl max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">
                                    {selectedPhoto.user?.firstName} {selectedPhoto.user?.lastName}
                                </h3>
                                <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                    <span>{new Date(selectedPhoto.createdAt).toLocaleDateString('it-IT')}</span>
                                    <span>•</span>
                                    <span>{new Date(selectedPhoto.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6">
                            <img
                                src={selectedPhoto.photoUrl}
                                alt={selectedPhoto.caption || 'Foto cantiere'}
                                className="w-full rounded-xl mb-4"
                            />
                            {selectedPhoto.caption && (
                                <p className="text-slate-700">{selectedPhoto.caption}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Employees Detail Modal */}
            {showEmployeesModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-4 md:p-4 overflow-y-auto" onClick={() => setShowEmployeesModal(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex items-center justify-between z-10">
                            <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <Users className="w-6 h-6 text-blue-600" />
                                Dettaglio Costi Dipendenti
                            </h3>
                            <button
                                onClick={() => setShowEmployeesModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="text-left px-4 py-3 font-bold text-slate-700">Dipendente</th>
                                            <th className="text-right px-4 py-3 font-bold text-slate-700">Ore Totali</th>
                                            <th className="text-right px-4 py-3 font-bold text-slate-700">Costo Orario</th>
                                            <th className="text-right px-4 py-3 font-bold text-slate-700">Costo Totale</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employeeHours.map((emp) => (
                                            <tr key={emp.id.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-slate-900">{emp.id.firstName} {emp.id.lastName}</div>
                                                    <div className="text-xs text-slate-500">{emp.id.username}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-700">
                                                    {emp.totalHours.toFixed(2)} h
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-700">
                                                    {emp.id.hourlyCost ? `€ ${emp.id.hourlyCost.toFixed(2)}` : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-green-600 font-mono">
                                                    € {((emp.totalHours || 0) * (emp.id.hourlyCost || 0)).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 font-bold">
                                        <tr>
                                            <td className="px-4 py-3 text-slate-900">TOTALE</td>
                                            <td className="px-4 py-3 text-right text-slate-900">
                                                {employeeHours.reduce((acc, curr) => acc + curr.totalHours, 0).toFixed(2)} h
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-900">-</td>
                                            <td className="px-4 py-3 text-right text-green-600">
                                                € {employeeHours.reduce((acc, curr) => acc + (curr.totalHours * (curr.id.hourlyCost || 0)), 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Materials Detail Modal */}
            {showMaterialsModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-4 md:p-4 overflow-y-auto" onClick={() => setShowMaterialsModal(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex items-center justify-between z-10">
                            <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <Package className="w-6 h-6 text-purple-600" />
                                Dettaglio Costi Materiali
                            </h3>
                            <button
                                onClick={() => setShowMaterialsModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="text-left px-4 py-3 font-bold text-slate-700">Materiale</th>
                                            <th className="text-right px-4 py-3 font-bold text-slate-700">Quantità</th>
                                            <th className="text-right px-4 py-3 font-bold text-slate-700">Prezzo Unit.</th>
                                            <th className="text-right px-4 py-3 font-bold text-slate-700">Costo Totale</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report?.materials?.map((mat) => (
                                            <tr key={mat.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="px-4 py-3 font-bold text-slate-900">
                                                    {mat.name}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-700">
                                                    {mat.totalQuantity} {mat.unit}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-700">
                                                    {mat.unitPrice ? `€ ${mat.unitPrice.toFixed(2)}` : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-green-600 font-mono">
                                                    € {(mat.totalCost || 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 font-bold">
                                        <tr>
                                            <td className="px-4 py-3 text-slate-900" colSpan="3">TOTALE</td>
                                            <td className="px-4 py-3 text-right text-green-600">
                                                € {report?.materials?.reduce((acc, curr) => acc + (curr.totalCost || 0), 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function OwnerDashboard() {
    const { user } = useAuth();
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSite, setEditingSite] = useState(null);
    const [selectedSite, setSelectedSite] = useState(null);
    const [notification, setNotification] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        description: '',
        startDate: '',
        endDate: '',
        status: 'planned',
        contractValue: ''
    });

    useEffect(() => {
        loadSites();
    }, []);

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const loadSites = async () => {
        try {
            const response = await siteAPI.getAll();
            setSites(response.data);
        } catch (error) {
            showNotification('error', 'Errore nel caricamento dei cantieri');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingSite) {
                await siteAPI.update(editingSite.id, formData);
                showNotification('success', 'Cantiere aggiornato con successo!');
            } else {
                await siteAPI.create(formData);
                showNotification('success', 'Cantiere creato con successo!');
            }
            resetForm();
            loadSites();
        } catch (error) {
            showNotification('error', error.message || 'Errore nell\'operazione');
        }
    };

    const handleEdit = (e, site) => {
        e.stopPropagation();
        setEditingSite(site);
        setFormData({
            name: site.name,
            address: site.address || '',
            description: site.description || '',
            startDate: site.startDate ? new Date(site.startDate).toISOString().split('T')[0] : '',
            endDate: site.endDate ? new Date(site.endDate).toISOString().split('T')[0] : '',
            status: site.status,
            contractValue: site.contractValue || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm('Sei sicuro di voler eliminare questo cantiere?')) return;

        try {
            await siteAPI.delete(id);
            showNotification('success', 'Cantiere eliminato!');
            loadSites();
        } catch (error) {
            showNotification('error', 'Errore nell\'eliminazione');
        }
    };

    const resetForm = () => {
        setFormData({ name: '', address: '', description: '', startDate: '', endDate: '', status: 'planned', contractValue: '' });
        setEditingSite(null);
        setShowModal(false);
    };

    const filteredSites = sites.filter(site =>
        site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <Layout title="Cantieri" hideHeader={true}>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                </div>
            </Layout>
        );
    }

    if (selectedSite) {
        return (
            <Layout title="Dettagli Cantiere" hideHeader={true}>
                <SiteDetails site={selectedSite} onBack={() => setSelectedSite(null)} />
            </Layout>
        );
    }

    return (
        <Layout title={`Benvenuto, ${user?.firstName}`} hideHeader={true}>
            {notification && (
                <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 font-semibold flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {notification.message}
                </div>
            )}

            <div className="space-y-6 pb-20">
                {/* HEADER - UPDATED */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <p className="text-slate-500 font-medium">Bentornato,</p>
                        <h1 className="text-3xl font-black text-slate-900">{user?.firstName}</h1>
                    </div>
                    <button className="p-3 bg-white rounded-full shadow-sm border border-slate-100 relative">
                        <Bell className="w-6 h-6 text-slate-600" />
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>
                </div>

                {/* SEARCH - UPDATED */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cerca cantiere..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white pl-12 pr-4 py-4 rounded-2xl border-none shadow-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                {/* NEW SITE BUTTON - UPDATED */}
                <button
                    onClick={() => setShowModal(true)}
                    className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/40 flex items-center justify-center gap-2 mb-8 transition-all active:scale-95 hover:shadow-2xl hover:shadow-blue-500/50"
                >
                    <Plus className="w-6 h-6" />
                    Nuovo Cantiere
                </button>

                {/* SITES LIST - UPDATED */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-900 text-lg">Cantieri attivi</h3>
                        <button className="text-blue-600 font-bold text-sm">Vedi tutti</button>
                    </div>

                    {filteredSites.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                <Building2 className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Nessun cantiere trovato</h3>
                            <p className="text-slate-500 max-w-xs mx-auto">
                                Non ci sono cantieri che corrispondono alla tua ricerca.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredSites.map((site) => (
                                <div
                                    key={site.id}
                                    onClick={() => setSelectedSite(site)}
                                    className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 relative group active:scale-[0.98] transition-all cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600">
                                                <Building2 className="w-7 h-7" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-lg">{site.name}</h3>
                                                <div className="flex items-center gap-1 text-slate-500 text-sm">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    <span>{site.address}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={(e) => handleEdit(e, site)} className="p-2 text-slate-400 hover:text-slate-600">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm font-medium text-slate-600">
                                                {new Date(site.startDate).toLocaleDateString('it-IT')}
                                            </span>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide ${site.status === 'active' ? 'bg-green-100 text-green-700' :
                                            site.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                            {site.status === 'active' ? 'IN CORSO' :
                                                site.status === 'completed' ? 'COMPLETATO' : 'PIANIFICATO'}
                                        </span>
                                    </div>

                                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                        <span className="text-slate-500 font-bold text-sm">Vedi dettagli</span>
                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Nuovo/Modifica Cantiere */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={resetForm}>
                    <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900">
                                {editingSite ? 'Modifica Cantiere' : 'Nuovo Cantiere'}
                            </h3>
                            <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Cantiere</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                                    placeholder="Es. Ristrutturazione Villa Rossi"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Indirizzo</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        required
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                                        placeholder="Via Roma 123, Milano"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Data Inizio</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Data Fine (prevista)</label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Stato</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all appearance-none bg-white"
                                >
                                    <option value="planned">Pianificato</option>
                                    <option value="active">In Corso</option>
                                    <option value="completed">Completato</option>
                                    <option value="suspended">Sospeso</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Prezzo pattuito (€ IVA esclusa)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.contractValue}
                                    onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                                    placeholder="0.00"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all transform active:scale-[0.98] mt-4 shadow-lg shadow-slate-900/20"
                            >
                                {editingSite ? 'Salva Modifiche' : 'Crea Cantiere'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
