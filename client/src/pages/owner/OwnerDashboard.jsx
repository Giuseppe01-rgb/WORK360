import { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { useConfirmModal } from '../../context/ConfirmModalContext';
import { siteAPI, analyticsAPI, noteAPI, photoAPI, workActivityAPI, economiaAPI, materialUsageAPI } from '../../utils/api';
import { Plus, Users, Clock, ArrowRight, X, ChevronRight, Package, MapPin, Calendar, Edit, Trash2, Eye, ArrowLeft, RefreshCw, Smartphone, Monitor, Search } from 'lucide-react';
import PortalModal from '../../components/PortalModal';

const SiteDetails = ({ site, onBack, showConfirm }) => {
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
    const [materialUsages, setMaterialUsages] = useState([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const [recalculating, setRecalculating] = useState(false);

    // Bulk economie form state
    const [showBulkEconomieForm, setShowBulkEconomieForm] = useState(false);
    const [bulkEconomieForm, setBulkEconomieForm] = useState({ hours: '', description: '' });
    const [loadingBulkEconomie, setLoadingBulkEconomie] = useState(false);

    const loadMaterialUsages = async () => {
        setLoadingMaterials(true);
        try {
            const res = await materialUsageAPI.getBySite(site.id);
            setMaterialUsages(res.data || []);
        } catch (error) {
            console.error('Error loading material usages:', error);
        } finally {
            setLoadingMaterials(false);
        }
    };

    const handleOpenMaterialsModal = () => {
        setShowMaterialsModal(true);
        loadMaterialUsages();
    };

    const handleDeleteMaterialUsage = async (usageId) => {
        const confirmed = await showConfirm({
            title: 'Elimina materiale',
            message: 'Sei sicuro di voler eliminare questo utilizzo materiale?',
            confirmText: 'Elimina',
            variant: 'danger'
        });
        if (!confirmed) return;
        try {
            await materialUsageAPI.delete(usageId);
            await loadMaterialUsages();
            // Reload report to update totals
            const rep = await analyticsAPI.getSiteReport(site.id);
            setReport(rep.data);
        } catch (error) {
            console.error('Error deleting material usage:', error);
        }
    };

    const handleDeleteNote = async (e, noteId) => {
        e.stopPropagation();
        const confirmed = await showConfirm({
            title: 'Elimina nota',
            message: 'Sei sicuro di voler eliminare questa nota?',
            confirmText: 'Elimina',
            variant: 'danger'
        });
        if (!confirmed) return;
        try {
            await noteAPI.delete(noteId);
            const notesData = await noteAPI.getAll({ siteId: site.id, type: 'note' });
            setNotes(notesData.data || []);
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    const handleDeleteReport = async (e, reportId) => {
        e.stopPropagation();
        const confirmed = await showConfirm({
            title: 'Elimina rapporto',
            message: 'Sei sicuro di voler eliminare questo rapporto?',
            confirmText: 'Elimina',
            variant: 'danger'
        });
        if (!confirmed) return;
        try {
            await workActivityAPI.delete(reportId);
            const rep = await analyticsAPI.getSiteReport(site.id);
            setReport(rep.data);
        } catch (error) {
            console.error('Error deleting report:', error);
        }
    };

    const handleDeleteEconomia = async (e, economiaId) => {
        e.stopPropagation();
        const confirmed = await showConfirm({
            title: 'Elimina economia',
            message: 'Sei sicuro di voler eliminare questa economia?',
            confirmText: 'Elimina',
            variant: 'danger'
        });
        if (!confirmed) return;
        try {
            await economiaAPI.delete(economiaId);
            const economieData = await economiaAPI.getBySite(site.id);
            setEconomie(economieData.data || []);
            // Refresh report to update totals
            const rep = await analyticsAPI.getSiteReport(site.id);
            setReport(rep.data);
            alert('✅ Economia eliminata con successo');
        } catch (error) {
            console.error('Error deleting economia:', error);
            alert('❌ Errore nell\'eliminazione dell\'economia: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleRecalculateCosts = async () => {
        const confirmed = await showConfirm({
            title: 'Ricalcola costi',
            message: 'Questa operazione aggiornerà i costi di tutte le presenze con le tariffe orarie attuali dei dipendenti. Continuare?',
            confirmText: 'Ricalcola',
            variant: 'warning'
        });
        if (!confirmed) return;

        setRecalculating(true);
        try {
            const result = await siteAPI.recalculateCosts(site.id);
            // Reload report to get updated costs
            const rep = await analyticsAPI.getSiteReport(site.id);
            setReport(rep.data);
            alert(`✅ ${result.data.message}\n\nVecchio costo: €${result.data.oldTotalCost}\nNuovo costo: €${result.data.newTotalCost}\nDifferenza: €${result.data.difference}`);
        } catch (error) {
            console.error('Error recalculating costs:', error);
            alert('Errore nel ricalcolo dei costi');
        } finally {
            setRecalculating(false);
        }
    };

    // Handle bulk economie submission
    const handleBulkEconomieSubmit = async (e) => {
        e.preventDefault();
        if (!bulkEconomieForm.hours || parseFloat(bulkEconomieForm.hours) <= 0) {
            alert('Inserisci un numero di ore valido');
            return;
        }
        if (!bulkEconomieForm.description || bulkEconomieForm.description.trim().length < 5) {
            alert('La descrizione deve contenere almeno 5 caratteri');
            return;
        }

        setLoadingBulkEconomie(true);
        try {
            await economiaAPI.createBulk({
                siteId: site.id,
                hours: parseFloat(bulkEconomieForm.hours),
                description: bulkEconomieForm.description.trim()
            });
            // Refresh economie list
            const economieData = await economiaAPI.getBySite(site.id);
            setEconomie(economieData.data || []);
            // Refresh report for updated totals
            const rep = await analyticsAPI.getSiteReport(site.id);
            setReport(rep.data);
            // Reset form
            setBulkEconomieForm({ hours: '', description: '' });
            setShowBulkEconomieForm(false);
        } catch (error) {
            console.error('Error creating bulk economia:', error);
            alert(error.response?.data?.message || 'Errore nell\'aggiunta delle economie');
        } finally {
            setLoadingBulkEconomie(false);
        }
    };

    const handleDeletePhoto = async (e, photoId) => {
        e.stopPropagation();
        const confirmed = await showConfirm({
            title: 'Elimina foto',
            message: 'Sei sicuro di voler eliminare questa foto?',
            confirmText: 'Elimina',
            variant: 'danger'
        });
        if (!confirmed) return;
        try {
            await photoAPI.delete(photoId);
            const photosData = await photoAPI.getAll({ siteId: site.id });
            setPhotos(photosData.data || []);
        } catch (error) {
            console.error('Error deleting photo:', error);
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

    // Calculations for the cost card (economie are NOT costs, they are additional revenue)
    const laborCost = parseFloat(report?.siteCost?.labor) || 0;
    const materialCost = parseFloat(report?.siteCost?.materials) || 0;
    // Economie are revenue, not costs - calculate for display only
    // IMPORTANT: Parse hours as float to avoid string concatenation issues
    const economieHours = (economie || []).reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);
    const economieRevenue = economieHours * 30; // 30€/hour billable to client
    // Total cost excludes economie (they add to revenue, not costs)
    const totalCost = laborCost + materialCost;

    // Calculate percentages for progress bars (avoid division by zero)
    const maxVal = totalCost > 0 ? totalCost : 1;
    const laborPct = (laborCost / maxVal) * 100;
    const materialPct = (materialCost / maxVal) * 100;

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
            {
                activeTab === 'dati' && (
                    <>
                        {/* COSTO CANTIERE - NEW DESIGN */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                        <span className="font-bold text-lg">$</span>
                                    </div>
                                    <div>
                                        <h3 className="text-slate-500 font-bold text-sm">Costo Totale Cantiere</h3>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="bg-green-50 text-green-600 text-[10px] font-bold px-3 py-1 rounded-full tracking-wide">
                                        IN TEMPO REALE
                                    </span>
                                    <button
                                        onClick={handleRecalculateCosts}
                                        disabled={recalculating}
                                        className="p-2 hover:bg-blue-50 rounded-full text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
                                        title="Ricalcola costi con tariffe attuali"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Apple Health Style - Main Value */}
                            <div className="mb-6">
                                <p className="text-4xl font-black text-slate-900 tracking-tight">
                                    {totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    <span className="text-2xl text-slate-400 font-medium ml-1">€</span>
                                </p>
                            </div>

                            {/* Apple Health Style - Breakdown */}
                            <div className="space-y-4">
                                {/* Materiali */}
                                <div className="border-b border-slate-100 pb-4">
                                    <p className="text-slate-500 text-sm font-medium mb-1">Materiali</p>
                                    <p className="text-xl font-bold text-purple-600">
                                        {materialCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        <span className="text-base text-purple-400 ml-1">€</span>
                                        <span className="text-sm text-slate-400 ml-2">({materialPct.toFixed(0)}%)</span>
                                    </p>
                                </div>
                                {/* Manodopera */}
                                <div>
                                    <p className="text-slate-500 text-sm font-medium mb-1">Manodopera</p>
                                    <p className="text-xl font-bold text-blue-600">
                                        {laborCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        <span className="text-base text-blue-400 ml-1">€</span>
                                        <span className="text-sm text-slate-400 ml-2">({laborPct.toFixed(0)}%)</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* INCIDENCE CARD - Apple Health Style */}
                        {report?.costIncidence?.materialsIncidencePercent !== null ? (
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-slate-500 font-bold text-sm">Incidenza Costi</h3>
                                </div>

                                <div className="space-y-4">
                                    {/* Materiali % */}
                                    <div className="border-b border-slate-100 pb-4">
                                        <p className="text-slate-500 text-sm font-medium mb-1">Materiali</p>
                                        <p className="text-2xl font-bold text-purple-600">
                                            {report.costIncidence.materialsIncidencePercent.toFixed(1)}
                                            <span className="text-lg text-purple-400 ml-1">%</span>
                                        </p>
                                    </div>
                                    {/* Manodopera % */}
                                    <div>
                                        <p className="text-slate-500 text-sm font-medium mb-1">Manodopera</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {report.costIncidence.laborIncidencePercent.toFixed(1)}
                                            <span className="text-lg text-blue-400 ml-1">%</span>
                                        </p>
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
                        {(() => {
                            const contractVal = parseFloat(report?.contractValue);
                            const isValidContract = !isNaN(contractVal) && contractVal > 0;
                            return isValidContract;
                        })() ? (
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
                                    {(() => {
                                        // Calculate margin including economie as additional revenue
                                        // Ensure contractValue is a valid number
                                        const contractVal = parseFloat(report.contractValue) || 0;
                                        const totalRevenue = contractVal + economieRevenue;
                                        const adjustedMargin = totalRevenue - totalCost;
                                        // Check for NaN and fallback to 0
                                        const displayMargin = isNaN(adjustedMargin) ? 0 : adjustedMargin;
                                        return (
                                            <p className={`text-5xl font-black tracking-tight ${displayMargin >= 0
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                                }`}>
                                                {displayMargin.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                <span className="text-3xl text-slate-400 font-medium ml-1">€</span>
                                            </p>
                                        );
                                    })()}
                                </div>

                                {/* Apple Health Style Metrics */}
                                <div className="space-y-5">
                                    {/* Prezzo pattuito */}
                                    <div className="border-b border-slate-100 pb-4">
                                        <p className="text-slate-500 text-sm font-medium mb-1">
                                            {report.status === 'completed' ? 'Prezzo fatturato' : 'Prezzo pattuito'}
                                        </p>
                                        <p className="text-2xl font-bold text-slate-900">
                                            {(parseFloat(report.contractValue) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            <span className="text-lg text-slate-400 ml-1">€</span>
                                        </p>
                                    </div>

                                    {/* Economie - only show if > 0 */}
                                    {economieRevenue > 0 && (
                                        <div className="border-b border-slate-100 pb-4">
                                            <p className="text-slate-500 text-sm font-medium mb-1">Economie</p>
                                            <p className="text-2xl font-bold text-green-600">
                                                +{economieRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                <span className="text-lg text-green-400 ml-1">€</span>
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">{economieHours.toFixed(1)} ore × 30€/h</p>
                                        </div>
                                    )}

                                    {/* Costi maturati */}
                                    <div className="border-b border-slate-100 pb-4">
                                        <p className="text-slate-500 text-sm font-medium mb-1">
                                            {report.status === 'completed' ? 'Costo totale' : 'Costi maturati'}
                                        </p>
                                        <p className="text-2xl font-bold text-slate-900">
                                            {totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            <span className="text-lg text-slate-400 ml-1">€</span>
                                        </p>
                                    </div>

                                    {/* Costo su ricavo */}
                                    {report.status !== 'completed' && (
                                        <div>
                                            <p className="text-slate-500 text-sm font-medium mb-1">Costo su ricavo</p>
                                            <p className="text-2xl font-bold text-slate-900">
                                                {(report.margin?.costVsRevenuePercent || 0).toFixed(1)}
                                                <span className="text-lg text-slate-400 ml-1">%</span>
                                            </p>
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

                        {/* SUMMARY GRID - APPLE HEALTH STYLE */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {/* Ore Totali Card */}
                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-blue-600 font-semibold text-sm">Ore Totali</h3>
                                </div>
                                <p className="text-2xl font-black text-slate-900 whitespace-nowrap">
                                    {report?.totalHours?.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                                    <span className="text-base font-medium text-slate-400 ml-1">h</span>
                                </p>
                            </div>

                            {/* Materiali Card */}
                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                                        <Package className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-purple-600 font-semibold text-sm">Materiali</h3>
                                </div>
                                <p className="text-2xl font-black text-slate-900 whitespace-nowrap">
                                    {report?.materials?.reduce((acc, curr) => acc + curr.totalQuantity, 0)?.toLocaleString('it-IT') || 0}
                                    <span className="text-base font-medium text-slate-400 ml-1">pz</span>
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
                                onClick={handleOpenMaterialsModal}
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
                )
            }

            {/* REPORT GIORNALIERO TAB */}
            {
                activeTab === 'report' && (
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
                )
            }

            {/* ECONOMIE TAB */}
            {
                activeTab === 'economie' && (
                    <div className="space-y-4">
                        {/* Quick Add Button and Form */}
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-100">
                            {!showBulkEconomieForm ? (
                                <button
                                    onClick={() => setShowBulkEconomieForm(true)}
                                    className="flex items-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-sm"
                                >
                                    <Plus className="w-5 h-5" />
                                    Aggiungi ore economie velocemente
                                </button>
                            ) : (
                                <form onSubmit={handleBulkEconomieSubmit} className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-bold text-slate-900">Inserimento rapido economie</h4>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowBulkEconomieForm(false);
                                                setBulkEconomieForm({ hours: '', description: '' });
                                            }}
                                            className="p-1 hover:bg-amber-200 rounded-lg text-slate-500"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Ore totali</label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0.5"
                                                value={bulkEconomieForm.hours}
                                                onChange={(e) => setBulkEconomieForm({ ...bulkEconomieForm, hours: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-lg font-bold"
                                                placeholder="es. 200"
                                                required
                                            />
                                            <p className="text-xs text-slate-500 mt-1">= {((parseFloat(bulkEconomieForm.hours) || 0) * 30).toFixed(2)}€ di valore</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Descrizione</label>
                                            <input
                                                type="text"
                                                value={bulkEconomieForm.description}
                                                onChange={(e) => setBulkEconomieForm({ ...bulkEconomieForm, description: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                                                placeholder="es. Economie pregresse da contratto"
                                                required
                                                minLength={5}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loadingBulkEconomie}
                                        className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loadingBulkEconomie ? (
                                            <><RefreshCw className="w-5 h-5 animate-spin" /> Salvataggio...</>
                                        ) : (
                                            <><Plus className="w-5 h-5" /> Aggiungi {bulkEconomieForm.hours || 0} ore</>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Economie List */}
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
                )
            }

            {/* NOTE TAB */}
            {
                activeTab === 'note' && (
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
                )
            }

            {/* FOTO TAB */}
            {
                activeTab === 'foto' && (
                    <div>
                        {photos.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {photos.map((photo) => (
                                    <div
                                        key={photo.id}
                                        onClick={() => setSelectedPhoto(photo)}
                                        className="bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-md transition-all cursor-pointer group relative"
                                    >
                                        <button
                                            onClick={(e) => handleDeletePhoto(e, photo.id)}
                                            className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-red-50 rounded-full text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 z-10 shadow-sm"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
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
                )
            }

            {/* Note Detail Modal */}
            {
                selectedNote && (
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
                )
            }

            {/* Photo Detail Modal */}
            {
                selectedPhoto && (
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
                )
            }

            {/* Employees Full-Screen View */}
            {showEmployeesModal && (
                <PortalModal onClose={() => setShowEmployeesModal(false)}>
                    <div className="fixed inset-0 h-[100dvh] w-screen bg-white z-[9999] flex flex-col overscroll-none touch-none">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white pt-safe-header">
                            <button
                                onClick={() => setShowEmployeesModal(false)}
                                className="flex items-center gap-2 text-blue-600 font-semibold"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                Indietro
                            </button>
                            <h1 className="text-lg font-bold text-slate-900">Dipendenti</h1>
                            <div className="w-20"></div>
                        </div>

                        {/* Summary Header */}
                        <div className="bg-slate-50 px-4 py-5 flex-shrink-0">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-slate-500 text-sm">Ore totali</p>
                                    <p className="text-3xl font-bold text-slate-900">
                                        {employeeHours.reduce((acc, curr) => acc + curr.totalHours, 0).toFixed(0)}
                                        <span className="text-xl text-slate-400 ml-1">h</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-500 text-sm">Costo totale</p>
                                    <p className="text-3xl font-bold text-green-600">
                                        {employeeHours.reduce((acc, curr) => acc + (curr.totalHours * (curr.id.hourlyCost || 0)), 0).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        <span className="text-xl text-green-400 ml-1">€</span>
                                    </p>
                                </div>
                            </div>
                            <p className="text-slate-400 text-sm mt-2">{employeeHours.length} dipendenti</p>
                        </div>

                        {/* Employee List */}
                        <div className="flex-1 overflow-y-auto pb-safe-bottom">
                            {employeeHours.map((emp, index) => (
                                <div key={emp.id.id} className={`px-4 py-4 flex items-center justify-between ${index !== employeeHours.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-900">{emp.id.firstName} {emp.id.lastName}</p>
                                        <p className="text-sm text-slate-400">{emp.totalHours.toFixed(0)}h × €{emp.id.hourlyCost?.toFixed(2) || '0'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-green-600">
                                            {((emp.totalHours || 0) * (emp.id.hourlyCost || 0)).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </PortalModal>
            )}


            {/* Materials Full-Screen View */}
            {showMaterialsModal && (
                <PortalModal onClose={() => setShowMaterialsModal(false)}>
                    <div className="fixed inset-0 h-[100dvh] w-screen bg-white z-[9999] flex flex-col overscroll-none touch-none">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white pt-safe-header">
                            <button
                                onClick={() => setShowMaterialsModal(false)}
                                className="flex items-center gap-2 text-purple-600 font-semibold"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                Indietro
                            </button>
                            <h1 className="text-lg font-bold text-slate-900">Materiali</h1>
                            <div className="w-20"></div>
                        </div>

                        {/* Summary Header */}
                        <div className="bg-slate-50 px-4 py-5 flex-shrink-0">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-slate-500 text-sm">Quantità totale</p>
                                    <p className="text-3xl font-bold text-slate-900">
                                        {report?.materials?.reduce((acc, curr) => acc + curr.totalQuantity, 0) || 0}
                                        <span className="text-xl text-slate-400 ml-1">pz</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-500 text-sm">Costo totale</p>
                                    <p className="text-3xl font-bold text-green-600">
                                        {report?.materials?.reduce((acc, curr) => acc + (curr.totalCost || 0), 0).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        <span className="text-xl text-green-400 ml-1">€</span>
                                    </p>
                                </div>
                            </div>
                            <p className="text-slate-400 text-sm mt-2">{report?.materials?.length || 0} tipologie</p>
                        </div>

                        {/* Materials List */}
                        <div className="flex-1 overflow-y-auto pb-safe-bottom">
                            {report?.materials?.map((mat, index) => (
                                <div key={mat.id} className={`px-4 py-4 flex items-center justify-between ${index !== (report?.materials?.length || 0) - 1 ? 'border-b border-slate-100' : ''}`}>
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-900">{mat.name}</p>
                                        <p className="text-sm text-slate-400">
                                            {mat.totalQuantity} {mat.unit} × €{mat.unitPrice?.toFixed(2) || '0'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-green-600">
                                            {(mat.totalCost || 0).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </PortalModal>
            )}
        </div >
    );
};

export default function OwnerDashboard() {
    const { user } = useAuth();
    const { showConfirm } = useConfirmModal();
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSite, setEditingSite] = useState(null);
    const [selectedSite, setSelectedSite] = useState(null);
    const [notification, setNotification] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active'); // 'all', 'active', 'completed', 'planned', 'suspended'
    const [showScrollIndicator, setShowScrollIndicator] = useState(true);
    const filterTabsRef = useRef(null);

    // Handle scroll to show/hide arrow indicator
    const handleFilterScroll = (e) => {
        const el = e.target;
        const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 10;
        setShowScrollIndicator(!isAtEnd);
    };

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

        // Validate contractValue if provided
        if (formData.contractValue) {
            const contractVal = parseFloat(formData.contractValue);
            if (isNaN(contractVal)) {
                showNotification('error', 'Prezzo pattuito non valido: inserisci un numero');
                return;
            }
            if (contractVal > 9999999999) {
                showNotification('error', 'Prezzo pattuito troppo alto: massimo 9.999.999.999€');
                return;
            }
            if (contractVal < 0) {
                showNotification('error', 'Prezzo pattuito non può essere negativo');
                return;
            }
        }

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
            console.error('Site creation/update error:', error);
            // Get the most specific error message available
            const errorMsg = error.response?.data?.message
                || error.response?.data?.error
                || error.message
                || 'Errore sconosciuto';
            showNotification('error', `Errore nella ${editingSite ? 'modifica' : 'creazione'} del cantiere: ${errorMsg}`);
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
        const confirmed = await showConfirm({
            title: 'Elimina cantiere',
            message: 'Sei sicuro di voler eliminare questo cantiere? Tutti i dati associati verranno eliminati.',
            confirmText: 'Elimina',
            variant: 'danger'
        });
        if (!confirmed) return;

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

    const filteredSites = sites.filter(site => {
        // Status filter
        const matchesStatus = statusFilter === 'all' || site.status === statusFilter;
        // Search filter
        const matchesSearch = site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            site.address.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

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
                <SiteDetails site={selectedSite} onBack={() => setSelectedSite(null)} showConfirm={showConfirm} />
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

                {/* STATUS FILTER TABS - Clean & Scrollable */}
                <div className="relative mb-6">
                    {/* Fade gradient to indicate scrollability */}
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-100 to-transparent pointer-events-none z-10 md:hidden"></div>

                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                        {[
                            { value: 'all', label: 'Tutti' },
                            { value: 'active', label: 'In corso' },
                            { value: 'completed', label: 'Completati' },
                            { value: 'planned', label: 'Pianificati' },
                            { value: 'suspended', label: 'Sospesi' }
                        ].map(tab => {
                            const count = tab.value === 'all'
                                ? sites.length
                                : sites.filter(s => s.status === tab.value).length;
                            const isActive = statusFilter === tab.value;
                            return (
                                <button
                                    key={tab.value}
                                    onClick={() => setStatusFilter(tab.value)}
                                    className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${isActive
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                        }`}
                                >
                                    {tab.label}
                                    <span className={`ml-1.5 ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* NEW SITE BUTTON */}
                <button
                    onClick={() => setShowModal(true)}
                    className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/40 flex items-center justify-center gap-2 mb-8 transition-all active:scale-95 hover:shadow-2xl hover:shadow-blue-500/50"
                >
                    <Plus className="w-6 h-6" />
                    Nuovo Cantiere
                </button>

                {/* SITES LIST */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-900 text-lg">
                            {statusFilter === 'all' ? 'Tutti i cantieri' :
                                statusFilter === 'active' ? 'Cantieri attivi' :
                                    statusFilter === 'completed' ? 'Cantieri completati' :
                                        statusFilter === 'planned' ? 'Cantieri pianificati' : 'Cantieri sospesi'}
                        </h3>
                        <span className="text-slate-500 text-sm font-medium">{filteredSites.length} risultati</span>
                    </div>

                    {filteredSites.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                <Building2 className="w-12 h-12 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Nessun cantiere trovato</h3>
                            <p className="text-slate-500 max-w-xs mx-auto">
                                Non ci sono cantieri che corrispondono ai filtri selezionati.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredSites.map((site) => {
                                // Status config
                                const statusConfig = {
                                    active: { label: 'In corso', bgClass: 'bg-green-100', textClass: 'text-green-700' },
                                    completed: { label: 'Completato', bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
                                    planned: { label: 'Pianificato', bgClass: 'bg-amber-100', textClass: 'text-amber-700' },
                                    suspended: { label: 'Sospeso', bgClass: 'bg-red-100', textClass: 'text-red-700' }
                                }[site.status] || { label: 'Sconosciuto', bgClass: 'bg-slate-100', textClass: 'text-slate-700' };

                                // Calculate days since start
                                const startDate = new Date(site.startDate);
                                const today = new Date();
                                const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

                                // Has contract value
                                const hasContract = parseFloat(site.contractValue) > 0;
                                const contractValue = parseFloat(site.contractValue) || 0;

                                return (
                                    <div
                                        key={site.id}
                                        onClick={() => setSelectedSite(site)}
                                        className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 cursor-pointer active:scale-[0.98] transition-all hover:shadow-lg hover:border-slate-200"
                                    >
                                        {/* Header - Name + Status + Actions */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600 flex-shrink-0">
                                                    <Building2 className="w-7 h-7" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-slate-900 text-lg truncate">{site.name}</h3>
                                                    <div className="flex items-center gap-1 text-slate-500 text-sm">
                                                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                                        <span className="truncate">{site.address}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Actions - Always Visible */}
                                            <div className="flex gap-1 flex-shrink-0">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(e, site); }}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Modifica"
                                                >
                                                    <Edit className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(e, site.id); }}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Elimina"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Metrics Row */}
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            {/* Start Date */}
                                            <div className="bg-slate-50 rounded-2xl p-3 text-center">
                                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Inizio</p>
                                                <p className="text-slate-900 font-bold text-sm">
                                                    {startDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                                                </p>
                                            </div>

                                            {/* Duration */}
                                            <div className="bg-slate-50 rounded-2xl p-3 text-center">
                                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Durata</p>
                                                <p className="text-slate-900 font-bold text-sm">
                                                    {daysDiff >= 0 ? daysDiff : 0} <span className="text-slate-400 font-normal text-xs">gg</span>
                                                </p>
                                            </div>

                                            {/* Contract Value or Placeholder */}
                                            <div className={`rounded-2xl p-3 text-center ${hasContract ? 'bg-gradient-to-br from-purple-50 to-indigo-50' : 'bg-slate-50'}`}>
                                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Valore</p>
                                                {hasContract ? (
                                                    <p className="text-purple-600 font-bold text-sm">
                                                        {contractValue >= 1000000
                                                            ? `${(contractValue / 1000000).toFixed(1)}M`
                                                            : contractValue >= 1000
                                                                ? `${(contractValue / 1000).toFixed(0)}k`
                                                                : contractValue.toFixed(0)
                                                        }
                                                        <span className="text-purple-400 font-normal text-xs">€</span>
                                                    </p>
                                                ) : (
                                                    <p className="text-slate-400 font-medium text-sm">—</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Footer - Status Badge + CTA */}
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                                                    {statusConfig.label}
                                                </span>
                                                {site.assignedWorkers?.length > 0 && (
                                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                                        <Users className="w-3.5 h-3.5" />
                                                        <span>{site.assignedWorkers.length}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <span className="text-sm font-medium">Vedi dettagli</span>
                                                <ChevronRight className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Data Inizio</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full max-w-full block min-h-[50px] bg-white appearance-none px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-base"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Data Fine (prevista)</label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full max-w-full block min-h-[50px] bg-white appearance-none px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-base"
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
                                    type="text"
                                    inputMode="decimal"
                                    pattern="[0-9]*\.?[0-9]*"
                                    value={formData.contractValue}
                                    onChange={(e) => {
                                        // Allow only numbers and decimal point
                                        const val = e.target.value.replace(/[^0-9.]/g, '');
                                        setFormData({ ...formData, contractValue: val });
                                    }}
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
