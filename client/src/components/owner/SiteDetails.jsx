import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { analyticsAPI, noteAPI, photoAPI, economiaAPI, materialUsageAPI, colouraMaterialAPI, siteAPI, workActivityAPI } from '../../utils/api';
import { Plus, Users, Clock, X, ChevronRight, Package, MapPin, Edit, Trash2, ArrowLeft, RefreshCw, Search, FileText, Camera, Zap, Download, AlertCircle } from 'lucide-react';
import PortalModal from '../../components/PortalModal';
import { useData } from '../../context/DataContext';
import { exportSiteReport } from '../../utils/excelExport';

const SiteDetails = ({ site, onBack, onDelete, showConfirm }) => {
    const { siteReports, getSiteReport } = useData();
    // Resolve siteId early to ensure it's available for all effects and handlers
    const siteId = site?.id || site?._id;
    const reportState = siteId ? (siteReports[siteId] || { data: null, status: 'idle' }) : { data: null, status: 'idle' };

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
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [editingMaterial, setEditingMaterial] = useState(null);
    const [catalogMaterials, setCatalogMaterials] = useState([]);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [showMaterialSelector, setShowMaterialSelector] = useState(false);
    const [newSelectedMaterial, setNewSelectedMaterial] = useState(null);
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

    const loadCatalogMaterials = async () => {
        try {
            const response = await colouraMaterialAPI.getAll();
            setCatalogMaterials(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error loading catalog:', error);
            setCatalogMaterials([]);
        }
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

    const handleSaveMaterial = async (usageId, updatedData) => {
        try {
            await materialUsageAPI.update(usageId, updatedData);
            await loadMaterialUsages();
            // Refresh report to update totals
            const rep = await analyticsAPI.getSiteReport(site.id);
            setReport(rep.data);
            setEditingMaterial(null);
            setSelectedMaterial(null);
            setNewSelectedMaterial(null);
            setShowMaterialSelector(false);
            setCatalogSearch('');
        } catch (error) {
            console.error('Error updating material usage:', error);
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
        if (!bulkEconomieForm.hours || Number.parseFloat(bulkEconomieForm.hours) <= 0) {
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
                hours: Number.parseFloat(bulkEconomieForm.hours),
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



    // Sync context report to local state for compatibility with existing UI
    useEffect(() => {
        if (reportState.data) {
            setReport(reportState.data);
        } else if (reportState.status === 'loading') {
            setReport(null); // Clear previous site data while loading new one
        }
    }, [reportState.data, reportState.status]);

    useEffect(() => {
        if (!siteId) return;

        console.log(`[SiteDetails] SiteId changed to: ${siteId}. Resetting states...`);

        // Reset all local data states when siteId changes to avoid showing stale data
        setReport(null);
        setEmployeeHours([]);
        setNotes([]);
        setDailyReports([]);
        setPhotos([]);
        setEconomie([]);
        setLoading(true);
    }, [siteId]);

    useEffect(() => {
        let isMounted = true;

        const loadDetails = async () => {
            if (!siteId) return;

            console.log(`[SiteDetails] Triggering load for site ${siteId}...`);
            getSiteReport(siteId);

            try {
                // If we don't have report data yet, ensure loading state is true
                if (!reportState.data) {
                    setLoading(true);
                }

                // Helper for side-data with logging
                const safeFetch = async (name, promise, fallback = { data: [] }) => {
                    try {
                        const res = await promise;
                        return res;
                    }
                    catch (e) {
                        console.error(`[SiteDetails] ${name} failed:`, e);
                        return fallback;
                    }
                };

                const [hours, notesData, reportsData, photosData, economieData] = await Promise.all([
                    safeFetch('hours', analyticsAPI.getHoursPerEmployee({ siteId })),
                    safeFetch('notes', noteAPI.getAll({ siteId, type: 'note' })),
                    safeFetch('daily_reports', workActivityAPI.getAll({ siteId })),
                    safeFetch('photos', photoAPI.getAll({ siteId })),
                    safeFetch('economie', economiaAPI.getBySite(siteId))
                ]);

                if (isMounted) {
                    setEmployeeHours(hours.data || []);
                    setNotes(notesData.data || []);
                    setDailyReports(reportsData.data || []);
                    setPhotos(photosData.data || []);
                    setEconomie(economieData.data || []);
                    setLoading(false);
                }
            } catch (err) {
                console.error("[SiteDetails] Critical error loading site details:", err);
                if (isMounted) setLoading(false);
            }
        };

        loadDetails();
        return () => { isMounted = false; };
    }, [siteId, getSiteReport]);


    // Computed loading state for UI
    // Block blocking load ONLY if we have absolutely no data. 
    // If we have report data (from context or cache), show it while side-data loads.
    const isBlockingLoad = (!reportState.data && reportState.status === 'loading') || (loading && !reportState.data);

    // We need to inject this logic into the render.
    // Since I am replacing the `useEffect`, I can't easily change the `if (loading)` render guard later in the file without another replace.
    // But maintaining `setLoading(false)` in the effect combined with `isBlockingLoad` logic might be tricky if `loading` local state is used elsewhere.

    // Strategy:
    // 1. Keep local `loading` for the "side data" (notes, etc).
    // 2. But for the main `report`, use context.
    // 3. To avoid flicker, ensure `setReport` is called immediately when `reportState.data` is available.


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
            </div>
        );
    }

    // Calculations for the cost card (economie are NOT costs, they are additional revenue)
    const laborCost = Number.parseFloat(report?.siteCost?.labor) || 0;
    const materialCost = Number.parseFloat(report?.siteCost?.materials) || 0;
    // Economie are revenue, not costs - calculate for display only
    // IMPORTANT: Parse hours as float to avoid string concatenation issues
    const economieHours = (economie || []).reduce((sum, e) => sum + (Number.parseFloat(e.hours) || 0), 0);
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
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors text-slate-900"
                        title="Back"
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

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => exportSiteReport(site, report, employeeHours, economie)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors font-bold text-sm"
                        title="Esporta Excel"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Esporta</span>
                    </button>
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                            title="Elimina cantiere"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* DUPLICATE SITE WARNING */}
            {report?.dataSplitWarning && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-2 rounded-r-xl shadow-sm">
                    <div className="flex items-start">
                        <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0" />
                        <div className="ml-3">
                            <h3 className="text-sm font-bold text-amber-800">
                                ⚠️ Attenzione: Possibile duplicazione cantiere
                            </h3>
                            <p className="mt-1 text-xs text-amber-700">
                                {report.dataSplitWarning.message}
                            </p>
                        </div>
                    </div>
                </div>
            )}

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
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 mb-6 relative overflow-hidden">
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
                        {report?.costIncidence && report.costIncidence.materialsIncidencePercent != null ? (
                            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 mb-6">
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
                                            {(report.costIncidence.materialsIncidencePercent || 0).toFixed(1)}
                                            <span className="text-lg text-purple-400 ml-1">%</span>
                                        </p>
                                    </div>
                                    {/* Manodopera % */}
                                    <div>
                                        <p className="text-slate-500 text-sm font-medium mb-1">Manodopera</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {(report.costIncidence.laborIncidencePercent || 0).toFixed(1)}
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
                                    <h3 className="text-slate-700 font-bold text-sm">Incidenza materiali / manodopera</h3>
                                </div>
                                <p className="text-slate-600 text-sm">
                                    Nessun dato di costo disponibile per calcolare l'incidenza.
                                </p>
                            </div>
                        )}

                        {/* MARGIN CARD */}
                        {(() => {
                            const contractVal = Number.parseFloat(report?.contractValue);
                            const isValidContract = !Number.isNaN(contractVal) && contractVal > 0;
                            return isValidContract;
                        })() ? (
                            <div className={`p-6 rounded-[2.5rem] shadow-sm border mb-6 relative overflow-hidden ${report.margin?.marginCurrentValue >= 0
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
                                        const contractVal = Number.parseFloat(report.contractValue) || 0;
                                        const totalRevenue = contractVal + economieRevenue;
                                        const adjustedMargin = totalRevenue - totalCost;
                                        // Check for NaN and fallback to 0
                                        const displayMargin = Number.isNaN(adjustedMargin) ? 0 : adjustedMargin;
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
                                            {(Number.parseFloat(report.contractValue) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                                <span>Margine %</span>
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
                            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 mb-6">
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
                            <div className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm">
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
                            <div className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm">
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
                                role="button"
                                tabIndex={0}
                                onClick={() => setShowEmployeesModal(true)}
                                onKeyDown={(e) => e.key === 'Enter' && setShowEmployeesModal(true)}
                                className="bg-white rounded-[2.5rem] border border-slate-100 p-5 hover:shadow-lg transition-all cursor-pointer group flex items-center justify-between"
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
                                role="button"
                                tabIndex={0}
                                onClick={handleOpenMaterialsModal}
                                onKeyDown={(e) => e.key === 'Enter' && handleOpenMaterialsModal()}
                                className="bg-white rounded-[2.5rem] border border-slate-100 p-5 hover:shadow-lg transition-all cursor-pointer group flex items-center justify-between"
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
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedNote({ ...dailyReport, content: dailyReport.activityType })}
                                    onKeyDown={(e) => e.key === 'Enter' && setSelectedNote({ ...dailyReport, content: dailyReport.activityType })}
                                    className="bg-white rounded-[2.5rem] border border-slate-100 p-6 hover:shadow-md transition-all cursor-pointer group"
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
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-12 text-center">
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
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-[2.5rem] border border-amber-100">
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
                                            <label htmlFor="bulkHours" className="block text-sm font-medium text-slate-700 mb-1">Ore totali</label>
                                            <input
                                                id="bulkHours"
                                                type="number"
                                                step="0.5"
                                                min="0.5"
                                                value={bulkEconomieForm.hours}
                                                onChange={(e) => setBulkEconomieForm({ ...bulkEconomieForm, hours: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-lg font-bold"
                                                placeholder="es. 200"
                                                required
                                            />
                                            <p className="text-xs text-slate-500 mt-1">= {((Number.parseFloat(bulkEconomieForm.hours) || 0) * 30).toFixed(2)}€ di valore</p>
                                        </div>
                                        <div>
                                            <label htmlFor="bulkDescription" className="block text-sm font-medium text-slate-700 mb-1">Descrizione</label>
                                            <input
                                                id="bulkDescription"
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
                                    <div key={economia.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-amber-100 relative group">
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
                            <div className="bg-white rounded-[2.5rem] p-12 text-center shadow-sm">
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
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedNote(note)}
                                    onKeyDown={(e) => e.key === 'Enter' && setSelectedNote(note)}
                                    className="bg-white rounded-[2.5rem] border border-slate-100 p-6 hover:shadow-md transition-all cursor-pointer"
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
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-12 text-center">
                                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-400 font-medium">Nessuna nota disponibile</p>
                            </div>
                        )
                        }
                    </div >
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
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedPhoto(photo)}
                                        onKeyDown={(e) => e.key === 'Enter' && setSelectedPhoto(photo)}
                                        className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden hover:shadow-md transition-all cursor-pointer group relative"
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
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-12 text-center">
                                <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-400 font-medium">Nessuna foto disponibile</p>
                            </div>
                        )
                        }
                    </div >
                )
            }

            {/* Note Detail Modal */}
            {
                selectedNote && (
                    <div
                        role="button"
                        aria-label="Chiudi modal"
                        tabIndex={0}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-4 md:p-4 overflow-y-auto"
                        onClick={(e) => { if (e.target === e.currentTarget) setSelectedNote(null); }}
                        onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') setSelectedNote(null); }}
                    >
                        <div className="bg-white rounded-[2.5rem] w-full max-w-2xl my-auto shadow-2xl max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
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
                    <div
                        role="button"
                        aria-label="Chiudi modal"
                        tabIndex={0}
                        className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-4 md:p-4 overflow-y-auto"
                        onClick={(e) => { if (e.target === e.currentTarget) setSelectedPhoto(null); }}
                        onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') setSelectedPhoto(null); }}
                    >
                        <div className="bg-white rounded-[2.5rem] w-full max-w-4xl my-auto shadow-2xl max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
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
            {
                showEmployeesModal && (
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
                )
            }


            {/* Materials Full-Screen View */}
            {
                showMaterialsModal && (
                    <PortalModal onClose={() => { setShowMaterialsModal(false); setSelectedMaterial(null); setEditingMaterial(null); }}>
                        <div className="fixed inset-0 h-[100dvh] w-screen bg-white z-[9999] flex flex-col overscroll-none touch-none">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white pt-safe-header">
                                <button
                                    onClick={() => { setShowMaterialsModal(false); setSelectedMaterial(null); setEditingMaterial(null); }}
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
                                            {materialUsages.reduce((acc, curr) => acc + (curr.numeroConfezioni || 0), 0)}
                                            <span className="text-xl text-slate-400 ml-1">pz</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-slate-500 text-sm">Costo totale</p>
                                        <p className="text-3xl font-bold text-green-600">
                                            {materialUsages.reduce((acc, curr) => {
                                                const material = curr.materialMaster || curr.material;
                                                const price = Number.parseFloat(material?.price) || Number.parseFloat(material?.prezzo) || 0;
                                                return acc + (price * (curr.numeroConfezioni || 0));
                                            }, 0).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            <span className="text-xl text-green-400 ml-1">€</span>
                                        </p>
                                    </div>
                                </div>
                                <p className="text-slate-400 text-sm mt-2">{materialUsages.length} utilizzi</p>
                            </div>

                            {/* Materials List */}
                            <div className="flex-1 overflow-y-auto pb-safe-bottom">
                                {loadingMaterials ? (
                                    <div className="flex items-center justify-center py-12">
                                        <RefreshCw className="w-8 h-8 text-slate-300 animate-spin" />
                                    </div>
                                ) : materialUsages.length > 0 ? (
                                    materialUsages.map((usage, index) => {
                                        const material = usage.materialMaster || usage.material;
                                        const materialName = material?.displayName || material?.nome_prodotto || 'Materiale';
                                        const unitPrice = Number.parseFloat(material?.price) || Number.parseFloat(material?.prezzo) || 0;
                                        const totalCost = unitPrice * (usage.numeroConfezioni || 0);

                                        return (
                                            <button
                                                key={usage.id}
                                                type="button"
                                                onClick={() => setSelectedMaterial(usage)}
                                                className={`w-full text-left px-4 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors ${index !== materialUsages.length - 1 ? 'border-b border-slate-100' : ''}`}
                                            >
                                                <div className="flex-1">
                                                    <p className="font-semibold text-slate-900">{materialName}</p>
                                                    <p className="text-sm text-slate-400">
                                                        {usage.numeroConfezioni} {material?.unit || 'conf'} × €{unitPrice.toFixed(2)}
                                                    </p>
                                                    <p className="text-xs text-slate-300 mt-1">
                                                        {new Date(usage.dataOra).toLocaleDateString('it-IT')} • {usage.user?.firstName} {usage.user?.lastName}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-lg font-bold text-green-600">
                                                        {totalCost.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                                                    </p>
                                                    <ChevronRight className="w-5 h-5 text-slate-300" />
                                                </div>
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <Package className="w-12 h-12 text-slate-300 mb-3" />
                                        <p className="text-slate-400">Nessun materiale registrato</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Material Detail Modal */}
                        {selectedMaterial && !editingMaterial && (
                            <div
                                role="button"
                                aria-label="Chiudi modal"
                                tabIndex={0}
                                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-[10000]"
                                onClick={(e) => { if (e.target === e.currentTarget) setSelectedMaterial(null); }}
                                onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') setSelectedMaterial(null); }}
                            >
                                <div className="bg-white rounded-t-[2.5rem] w-full max-w-lg shadow-2xl animate-in slide-in-from-bottom duration-300">
                                    <div className="flex items-center justify-between px-6 pt-4 pb-2">
                                        <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                                        <button
                                            onClick={() => setSelectedMaterial(null)}
                                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                        >
                                            <X className="w-5 h-5 text-slate-400" />
                                        </button>
                                    </div>
                                    <div className="p-6 pt-2">
                                        <h3 className="text-xl font-bold text-slate-900 mb-4">
                                            {(selectedMaterial.materialMaster || selectedMaterial.material)?.displayName || (selectedMaterial.materialMaster || selectedMaterial.material)?.nome_prodotto || 'Materiale'}
                                        </h3>

                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="bg-slate-50 p-4 rounded-2xl">
                                                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Quantità</p>
                                                <p className="text-2xl font-bold text-slate-900">
                                                    {selectedMaterial.numeroConfezioni}
                                                    <span className="text-sm text-slate-400 ml-1">
                                                        {(selectedMaterial.materialMaster || selectedMaterial.material)?.unit || 'conf'}
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-2xl">
                                                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Prezzo Unit.</p>
                                                <p className="text-2xl font-bold text-slate-900">
                                                    €{(Number.parseFloat((selectedMaterial.materialMaster || selectedMaterial.material)?.price) || Number.parseFloat((selectedMaterial.materialMaster || selectedMaterial.material)?.prezzo) || 0).toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="bg-green-50 p-4 rounded-2xl col-span-2">
                                                <p className="text-xs text-green-600 uppercase tracking-wide mb-1">Totale</p>
                                                <p className="text-3xl font-bold text-green-600">
                                                    €{((Number.parseFloat((selectedMaterial.materialMaster || selectedMaterial.material)?.price) || Number.parseFloat((selectedMaterial.materialMaster || selectedMaterial.material)?.prezzo) || 0) * selectedMaterial.numeroConfezioni).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-sm text-slate-500 mb-6">
                                            <p>Registrato il {new Date(selectedMaterial.dataOra).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                            <p>da {selectedMaterial.user?.firstName} {selectedMaterial.user?.lastName}</p>
                                            {selectedMaterial.note && <p className="mt-2 italic">"{selectedMaterial.note}"</p>}
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setEditingMaterial(selectedMaterial)}
                                                className="flex-1 py-4 px-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Edit className="w-5 h-5" />
                                                Modifica
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleDeleteMaterialUsage(selectedMaterial.id);
                                                    setSelectedMaterial(null);
                                                }}
                                                className="py-4 px-6 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Material Edit Modal */}
                        {editingMaterial && (
                            <div
                                role="button"
                                aria-label="Chiudi modal"
                                tabIndex={0}
                                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10001] p-4"
                                onClick={(e) => {
                                    if (e.target === e.currentTarget) {
                                        setEditingMaterial(null);
                                        setShowMaterialSelector(false);
                                        setNewSelectedMaterial(null);
                                        setCatalogSearch('');
                                    }
                                }}
                                onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { setEditingMaterial(null); setShowMaterialSelector(false); setNewSelectedMaterial(null); setCatalogSearch(''); } }}
                            >
                                <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
                                    <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
                                        <h3 className="text-lg font-bold text-slate-900">Modifica Materiale</h3>
                                        <button onClick={() => { setEditingMaterial(null); setShowMaterialSelector(false); setNewSelectedMaterial(null); setCatalogSearch(''); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                            <X className="w-5 h-5 text-slate-400" />
                                        </button>
                                    </div>
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.target);
                                        const updateData = {
                                            numeroConfezioni: Number.parseInt(formData.get('quantity')),
                                            note: formData.get('note')
                                        };
                                        // Include new materialId if user selected a different material
                                        if (newSelectedMaterial) {
                                            updateData.materialId = newSelectedMaterial.id;
                                        }
                                        handleSaveMaterial(editingMaterial.id, updateData);
                                    }} className="p-6 space-y-4 overflow-y-auto flex-1">
                                        {/* Material Selector Section */}
                                        <div>
                                            <span className="block text-sm font-semibold text-slate-700 mb-2">Materiale</span>
                                            {showMaterialSelector ? (
                                                <div className="space-y-2">
                                                    {/* Search Input */}
                                                    <div className="relative">
                                                        <label htmlFor="materialSearch" className="sr-only">Cerca materiale</label>
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                        <input
                                                            id="materialSearch"
                                                            type="text"
                                                            value={catalogSearch}
                                                            onChange={(e) => setCatalogSearch(e.target.value)}
                                                            placeholder="Cerca materiale..."
                                                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                                                            autoFocus
                                                        />
                                                    </div>
                                                    {/* Material List */}
                                                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                                                        {catalogMaterials
                                                            .filter(m => {
                                                                const query = catalogSearch.toLowerCase();
                                                                return m.nome_prodotto?.toLowerCase().includes(query) ||
                                                                    m.marca?.toLowerCase().includes(query) ||
                                                                    m.categoria?.toLowerCase().includes(query);
                                                            })
                                                            .slice(0, 20)
                                                            .map(material => (
                                                                <button
                                                                    key={material.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setNewSelectedMaterial(material);
                                                                        setShowMaterialSelector(false);
                                                                        setCatalogSearch('');
                                                                    }}
                                                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition-colors"
                                                                >
                                                                    <p className="font-medium text-slate-900">{material.nome_prodotto}</p>
                                                                    <p className="text-xs text-slate-400">{material.marca} • {material.categoria}</p>
                                                                </button>
                                                            ))}
                                                        {catalogMaterials.filter(m => {
                                                            const query = catalogSearch.toLowerCase();
                                                            return m.nome_prodotto?.toLowerCase().includes(query) ||
                                                                m.marca?.toLowerCase().includes(query);
                                                        }).length === 0 && (
                                                                <p className="text-center py-4 text-slate-400 text-sm">Nessun materiale trovato</p>
                                                            )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setShowMaterialSelector(false); setCatalogSearch(''); }}
                                                        className="w-full py-2 text-sm text-slate-500 hover:text-slate-700"
                                                    >
                                                        Annulla
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <div className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                                                        <p className="font-medium text-slate-900">
                                                            {newSelectedMaterial?.nome_prodotto || (editingMaterial.materialMaster || editingMaterial.material)?.displayName || (editingMaterial.materialMaster || editingMaterial.material)?.nome_prodotto || 'Materiale'}
                                                        </p>
                                                        {(newSelectedMaterial || editingMaterial.materialMaster || editingMaterial.material) && (
                                                            <p className="text-xs text-slate-400">
                                                                {newSelectedMaterial?.marca || (editingMaterial.materialMaster || editingMaterial.material)?.family || ''}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            loadCatalogMaterials();
                                                            setShowMaterialSelector(true);
                                                        }}
                                                        className="px-4 py-3 bg-blue-50 text-blue-600 font-semibold rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-1"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                        Cambia
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label htmlFor="editQuantity" className="block text-sm font-semibold text-slate-700 mb-2">Quantità</label>
                                            <input
                                                id="editQuantity"
                                                type="number"
                                                name="quantity"
                                                defaultValue={editingMaterial.numeroConfezioni}
                                                min="1"
                                                required
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="editNotes" className="block text-sm font-semibold text-slate-700 mb-2">Note</label>
                                            <textarea
                                                id="editNotes"
                                                name="note"
                                                defaultValue={editingMaterial.note || ''}
                                                rows="2"
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                                            />
                                        </div>
                                        <div className="flex gap-3 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => { setEditingMaterial(null); setShowMaterialSelector(false); setNewSelectedMaterial(null); setCatalogSearch(''); }}
                                                className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                            >
                                                Annulla
                                            </button>
                                            <button
                                                type="submit"
                                                className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all"
                                            >
                                                Salva
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </PortalModal>
                )
            }
        </div >
    );
};

SiteDetails.propTypes = {
    site: PropTypes.object.isRequired,
    onBack: PropTypes.func.isRequired,
    showConfirm: PropTypes.func
};

export default SiteDetails;
