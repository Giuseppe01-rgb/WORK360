import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useConfirmModal } from '../../context/ConfirmModalContext';
import { siteAPI, analyticsAPI, workActivityAPI, noteAPI, economiaAPI } from '../../utils/api';
import {
    Building2, MapPin, Calendar, Clock, Package, Users,
    Edit, Trash2, Plus, X, ArrowLeft, CheckCircle, AlertCircle, Search,
    FileText, Camera, Zap, Download
} from 'lucide-react';
import { exportSiteReport } from '../../utils/excelExport';

const SiteDetails = ({ site, onBack, onDelete, showConfirm }) => {
    // v1.2.1 - Economie integration
    const [report, setReport] = useState(null);
    const [employeeHours, setEmployeeHours] = useState([]);
    const [notes, setNotes] = useState([]);
    const [economie, setEconomie] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('data');
    const [selectedReport, setSelectedReport] = useState(null);

    const sections = [
        { id: 'data', label: 'Dati' },
        { id: 'reports', label: 'Rapporti giornalieri' },
        { id: 'economie', label: 'Economie' },
        { id: 'notes', label: 'Note' },
        { id: 'photos', label: 'Foto' }
    ];

    const handleDeleteNote = async (noteId) => {
        const confirmed = await showConfirm({
            title: 'Elimina nota',
            message: 'Sei sicuro di voler eliminare questa nota?',
            confirmText: 'Elimina',
            variant: 'danger'
        });
        if (!confirmed) return;
        try {
            await noteAPI.delete(noteId);
            const notesData = await noteAPI.getAll({ siteId: site.id });
            setNotes(notesData.data);
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    const handleDeleteEconomia = async (economiaId) => {
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
            setEconomie(economieData.data);
        } catch (error) {
            console.error('Error deleting economia:', error);
        }
    };

    useEffect(() => {
        const loadDetails = async () => {
            try {
                const [rep, hours, notesData, economieData] = await Promise.all([
                    analyticsAPI.getSiteReport(site.id),
                    analyticsAPI.getHoursPerEmployee({ siteId: site.id }),
                    noteAPI.getAll({ siteId: site.id }),
                    economiaAPI.getBySite(site.id)
                ]);
                setReport(rep.data);
                setEmployeeHours(hours.data);
                setNotes(notesData.data);
                setEconomie(economieData.data);
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{site.name}</h2>
                        <div className="flex items-center gap-2 text-slate-500">
                            <MapPin className="w-4 h-4" />
                            <span>{site.address}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => exportSiteReport(site, report, employeeHours, economie)}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors font-medium"
                        title="Esporta report Excel per il commercialista"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Esporta Excel</span>
                    </button>
                    <button
                        onClick={onDelete}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Elimina Cantiere</span>
                    </button>
                </div>
            </div>

            {/* Desktop Tabs */}
            <div className="hidden md:flex border-b border-slate-200 mb-6">
                {sections.map(section => (
                    <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`px-6 py-3 font-semibold transition-colors ${activeSection === section.id
                            ? 'border-b-2 border-purple-600 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        {section.label}
                    </button>
                ))}
            </div>

            {/* Mobile Selector */}
            <div className="md:hidden mb-6">
                <select
                    value={activeSection}
                    onChange={(e) => setActiveSection(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                    {sections.map(section => (
                        <option key={section.id} value={section.id}>
                            {section.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Content - Dati */}
            {activeSection === 'data' && (
                <div className="space-y-6 md:space-y-8">
                    {/* Cost Summary Card */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <Users className="w-6 h-6 text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Costo Totale Cantiere</h3>
                        </div>

                        {(() => {
                            // Calculate costs
                            const totalHours = employeeHours.reduce((sum, emp) => sum + emp.totalHours, 0);
                            const laborCost = totalHours * 30; // 30€/hour for labor

                            const totalMaterialCost = report?.materials?.reduce((sum, mat) => {
                                return sum + (mat.totalCost || 0);
                            }, 0) || 0;

                            const economieHours = economie.reduce((sum, e) => sum + e.hours, 0);
                            const economieCost = economieHours * 30; // 30€/hour for economie

                            const totalCost = laborCost + totalMaterialCost + economieCost;

                            return (
                                <>
                                    <div className="text-5xl md:text-6xl font-black text-green-600 mb-4">
                                        {totalCost.toFixed(2)}€
                                    </div>
                                    <p className="text-sm text-green-700 mb-4">aggiornato in tempo reale</p>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                            <span className="text-sm font-medium text-slate-700">Manodopera: {laborCost.toFixed(2)}€</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                            <span className="text-sm font-medium text-slate-700">Materiali: {totalMaterialCost.toFixed(2)}€</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                                            <span className="text-sm font-medium text-slate-700">Economie: {economieCost.toFixed(2)}€</span>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    {/* Margin Card */}
                    {report?.contractValue ? (
                        <div className={`border rounded-2xl p-6 md:p-8 ${report.margin?.marginCurrentValue >= 0
                            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'
                            : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-100'
                            }`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${report.margin?.marginCurrentValue >= 0
                                        ? 'bg-green-100'
                                        : 'bg-red-100'
                                        }`}>
                                        <FileText className={`w-6 h-6 ${report.margin?.marginCurrentValue >= 0
                                            ? 'text-green-600'
                                            : 'text-red-600'
                                            }`} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">
                                        {report.status === 'completed' ? 'Margine finale' : 'Margine cantiere'}
                                    </h3>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${report.status === 'completed'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {report.status === 'completed' ? 'A CONSUNTIVO' : 'PROVVISORIO'}
                                </span>
                            </div>

                            <div className={`text-5xl md:text-6xl font-black mb-4 ${report.margin?.marginCurrentValue >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                                }`}>
                                {report.margin?.marginCurrentValue?.toFixed(2) || '0.00'}€
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                    <span className="text-sm font-medium text-slate-700">
                                        {report.status === 'completed' ? 'Prezzo fatturato' : 'Prezzo pattuito'}: {report.contractValue?.toFixed(2)}€
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                    <span className="text-sm font-medium text-slate-700">
                                        {report.status === 'completed' ? 'Costo totale' : 'Costi maturati'}: {report.siteCost?.total?.toFixed(2)}€
                                    </span>
                                </div>
                                {report.status !== 'completed' && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                                        <span className="text-sm font-medium text-slate-700">
                                            Costo su ricavo: {report.margin?.costVsRevenuePercent?.toFixed(1)}%
                                        </span>
                                    </div>
                                )}
                                {report.status === 'completed' && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                                        <span className="text-sm font-medium text-slate-700">
                                            Margine %: {report.margin?.marginCurrentPercent?.toFixed(1)}%
                                        </span>
                                    </div>
                                )}
                            </div>

                            {report.status !== 'completed' && (
                                <p className="text-xs text-slate-500 italic">
                                    Valore provvisorio basato sui costi registrati finora.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-slate-500" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Margine cantiere</h3>
                            </div>
                            <p className="text-slate-600 mb-4">
                                Inserisci il prezzo pattuito per vedere il margine di questo cantiere.
                            </p>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // handleEdit(e, site); // Assuming handleEdit is defined elsewhere or passed as prop
                                }}
                                className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                Modifica cantiere →
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        <div className="bg-slate-50 p-4 md:p-6 rounded-2xl">
                            <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Ore Totali
                            </h3>
                            <p className="text-2xl md:text-3xl font-bold text-slate-900">
                                {report?.totalHours?.toFixed(2) || '0.00'} <span className="text-lg font-normal text-slate-500">h</span>
                            </p>
                        </div>
                        <div className="bg-slate-50 p-4 md:p-6 rounded-2xl">
                            <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                                <Package className="w-4 h-4" /> Materiali
                            </h3>
                            <p className="text-2xl md:text-3xl font-bold text-slate-900">
                                {report?.materials?.length || 0} <span className="text-lg font-normal text-slate-500">tipi</span>
                            </p>
                        </div>
                        <div className="bg-slate-50 p-4 md:p-6 rounded-2xl">
                            <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                                <Users className="w-4 h-4" /> Dipendenti
                            </h3>
                            <p className="text-2xl md:text-3xl font-bold text-slate-900">
                                {employeeHours?.length || 0}
                            </p>
                        </div>

                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm overflow-hidden">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Users className="w-5 h-5 text-slate-400" />
                                Ore per Dipendente
                            </h3>
                            {employeeHours.length > 0 ? (
                                <div className="space-y-3 overflow-x-auto">
                                    {employeeHours.map((emp) => (
                                        <div key={emp.id.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg min-w-[200px]">
                                            <span className="font-medium text-slate-700 truncate mr-2">{emp.id.firstName} {emp.id.lastName}</span>
                                            <span className="font-bold text-slate-900 whitespace-nowrap">{emp.totalHours.toFixed(2)} h</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-400 italic">Nessuna ora registrata.</p>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm overflow-hidden">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Package className="w-5 h-5 text-slate-400" />
                                Materiali Utilizzati
                            </h3>
                            {report?.materials?.length > 0 ? (
                                <div className="space-y-3 overflow-x-auto">
                                    {report.materials.map((mat) => (
                                        <div key={mat.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg min-w-[200px]">
                                            <span className="font-medium text-slate-700 truncate mr-2">{mat.id}</span>
                                            <span className="font-bold text-slate-900 whitespace-nowrap">{mat.totalQuantity} {mat.unit}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-400 italic">Nessun materiale registrato.</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm inline-block min-w-[250px]">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Costo Cantiere</h3>
                            <p className="text-3xl md:text-4xl font-bold text-slate-900 mb-1">
                                {report?.siteCost?.total?.toFixed(2) || '0,00'}€
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Content - Rapporti giornalieri */}
            {activeSection === 'reports' && (
                <div className="space-y-4">
                    {report?.dailyReports?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {report.dailyReports.map((dailyReport) => (
                                <div
                                    key={dailyReport.id}
                                    onClick={() => setSelectedReport(dailyReport)}
                                    className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer border border-slate-100 group"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                                                {dailyReport.user?.firstName?.charAt(0)}{dailyReport.user?.lastName?.charAt(0)}
                                            </div>
                                            <span className="font-semibold text-slate-900 text-sm">
                                                {dailyReport.user?.firstName} {dailyReport.user?.lastName}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-500 font-medium">
                                            {new Date(dailyReport.date).toLocaleString('it-IT', {
                                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>

                                    <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed">
                                        {dailyReport.activityType}
                                    </p>

                                    <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
                                        <button
                                            onClick={(e) => handleDeleteReport(e, dailyReport.id)}
                                            className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                                            title="Elimina"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <span className="text-xs font-bold text-blue-600 group-hover:underline">Leggi tutto</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl p-12 text-center shadow-sm animate-in fade-in duration-200">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Calendar className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Rapporti Giornalieri</h3>
                            <p className="text-slate-500">Nessun rapporto giornaliero registrato per questo cantiere.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Content - Note */}
            {activeSection === 'notes' && (
                <div className="space-y-4">
                    {notes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {notes.map((note) => (
                                <div key={note.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs">
                                                {note.user?.firstName?.charAt(0)}{note.user?.lastName?.charAt(0)}
                                            </div>
                                            <span className="font-semibold text-slate-900 text-sm">
                                                {note.user?.firstName} {note.user?.lastName}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-500 font-medium">
                                            {new Date(note.date).toLocaleString('it-IT', {
                                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <p className="text-slate-600 text-sm whitespace-pre-wrap">{note.content}</p>
                                    <div className="mt-4 pt-3 border-t border-slate-50 flex justify-end">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // We need to pass the function from parent or define it here?
                                                // SiteDetails is defined inside SiteManagement file but it's a separate component.
                                                // The handleDeleteNote is defined in SiteManagement (parent of SiteDetails? No, SiteManagement renders SiteDetails).
                                                // Wait, SiteDetails is defined IN the same file.
                                                // I need to move handleDeleteNote inside SiteDetails or pass it down.
                                                // Let's move it inside SiteDetails since it has the state.
                                                handleDeleteNote(note.id);
                                            }}
                                            className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                                            title="Elimina"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl p-12 text-center shadow-sm animate-in fade-in duration-200">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Note</h3>
                            <p className="text-slate-500">Nessuna nota disponibile per questo cantiere.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Content - Economie */}
            {activeSection === 'economie' && (
                <div className="space-y-4">
                    {economie.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {economie.map((economia) => (
                                <div key={economia.id} className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                                                <Zap className="w-4 h-4 text-amber-600" />
                                            </div>
                                            <span className="font-semibold text-slate-900 text-sm">
                                                {economia.worker?.name} {economia.worker?.surname}
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteEconomia(economia.id);
                                            }}
                                            className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                                            title="Elimina"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
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
                        <div className="bg-white rounded-2xl p-12 text-center shadow-sm animate-in fade-in duration-200">
                            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Zap className="w-8 h-8 text-amber-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Economie</h3>
                            <p className="text-slate-500">Nessuna economia disponibile per questo cantiere.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Content - Foto */}
            {activeSection === 'photos' && (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm animate-in fade-in duration-200">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Camera className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Foto</h3>
                    <p className="text-slate-500">Nessuna foto caricata per questo cantiere.</p>
                </div>
            )}
            {/* Report Modal */}
            {selectedReport && (
                <ReportModal report={selectedReport} onClose={() => setSelectedReport(null)} />
            )}
        </div>
    );
};

const ReportModal = ({ report, onClose }) => {
    if (!report) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                            {report.user?.firstName?.charAt(0)}{report.user?.lastName?.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">{report.user?.firstName} {report.user?.lastName}</h3>
                            <p className="text-xs text-slate-500">
                                {new Date(report.date).toLocaleDateString('it-IT', {
                                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-lg">
                        {report.activityType}
                    </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-b-2xl flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-colors">
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function SiteManagement() {
    const { showConfirm } = useConfirmModal();
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSite, setEditingSite] = useState(null);
    const [selectedSite, setSelectedSite] = useState(null);
    const [notification, setNotification] = useState(null);

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
            const [rep] = await Promise.all([
                analyticsAPI.getSiteReport(selectedSite.id)
            ]);
            setReport(rep.data);
            showNotification('success', 'Rapporto eliminato');
        } catch (error) {
            console.error('Error deleting report:', error);
            showNotification('error', 'Errore nell\'eliminazione');
        }
    };



    // Calculate stats
    const totalSites = sites.length;
    const activeSites = sites.filter(s => s.status === 'active' || s.status === 'planned').length;
    const archivedSites = sites.filter(s => s.status === 'completed' || s.status === 'suspended').length;

    if (selectedSite) {
        return (
            <Layout title="Dettagli Cantiere">
                <SiteDetails
                    site={selectedSite}
                    onBack={() => setSelectedSite(null)}
                    onDelete={(e) => {
                        handleDelete(e, selectedSite.id);
                        setSelectedSite(null);
                    }}
                    showConfirm={showConfirm}
                />
            </Layout>
        );
    }

    if (loading) {
        return (
            <Layout title="Gestione Cantieri">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Gestione Cantieri">
            {notification && (
                <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 font-semibold flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {notification.message}
                </div>
            )}

            <div className="mb-8 flex justify-between items-center">
                <div className="relative max-w-md w-full hidden md:block">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Cerca cantiere..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Nuovo Cantiere
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 mb-1">Tutti i Cantieri</p>
                        <p className="text-3xl font-bold text-slate-900">{totalSites}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <Building2 className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 mb-1">In Corso</p>
                        <p className="text-3xl font-bold text-orange-600">{activeSites}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 mb-1">Archiviati</p>
                        <p className="text-3xl font-bold text-green-600">{archivedSites}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Sites List */}
            <div className="grid gap-4">
                {sites.map(site => (
                    <div
                        key={site.id}
                        onClick={() => setSelectedSite(site)}
                        className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    >
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                                    {site.name}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        {site.address}
                                    </div>
                                    {site.startDate && (
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(site.startDate).toLocaleDateString('it-IT')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${site.status === 'active' ? 'bg-green-100 text-green-700' :
                                    site.status === 'planned' ? 'bg-blue-100 text-blue-700' :
                                        'bg-slate-100 text-slate-700'
                                    }`}>
                                    {site.status === 'active' ? 'In Corso' : site.status === 'planned' ? 'Pianificato' : 'Archiviato'}
                                </span>

                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => handleEdit(e, site)}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                                        title="Modifica"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(e, site.id)}
                                        className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                                        title="Elimina"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl relative">
                        <button
                            onClick={resetForm}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-slate-500" />
                        </button>

                        <div className="p-6 md:p-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                {editingSite ? 'Modifica Cantiere' : 'Nuovo Cantiere'}
                            </h2>
                            <p className="text-slate-500 mb-8">Inserisci i dettagli del cantiere</p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome Cantiere *</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Indirizzo *</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Data Inizio *</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Data Fine (prevista)</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Stato</label>
                                        <select
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="planned">Pianificato</option>
                                            <option value="active">Attivo</option>
                                            <option value="completed">Completato</option>
                                            <option value="suspended">Sospeso</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrizione</label>
                                        <textarea
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[100px]"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Prezzo pattuito (€ IVA esclusa)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                                            value={formData.contractValue}
                                            onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-6 py-3 bg-white border-2 border-slate-900 text-slate-900 font-semibold hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        Annulla
                                    </button>
                                    {editingSite && (
                                        <button
                                            type="button"
                                            onClick={async (e) => {
                                                const confirmed = await showConfirm({
                                                    title: 'Elimina cantiere',
                                                    message: 'Eliminare questo cantiere?',
                                                    confirmText: 'Elimina',
                                                    variant: 'danger'
                                                });
                                                if (confirmed) {
                                                    handleDelete(e, editingSite.id);
                                                    resetForm();
                                                }
                                            }}
                                            className="px-6 py-3 bg-red-50 text-red-600 font-semibold hover:bg-red-100 rounded-lg transition-colors mr-auto"
                                        >
                                            Elimina
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        {editingSite ? 'Salva Modifiche' : 'Crea Cantiere'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
