import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { siteAPI, analyticsAPI, noteAPI, photoAPI } from '../../utils/api';
import {
    Building2, MapPin, Calendar, Clock, Package, Users,
    Edit, Trash2, Plus, X, ArrowLeft, CheckCircle, AlertCircle, Search, ChevronRight,
    FileText, Camera, Image
} from 'lucide-react';

const SiteDetails = ({ site, onBack }) => {
    const [activeTab, setActiveTab] = useState('dati');
    const [report, setReport] = useState(null);
    const [employeeHours, setEmployeeHours] = useState([]);
    const [notes, setNotes] = useState([]);
    const [dailyReports, setDailyReports] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNote, setSelectedNote] = useState(null);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [showMaterialsModal, setShowMaterialsModal] = useState(false);
    const [showEmployeesModal, setShowEmployeesModal] = useState(false);

    useEffect(() => {
        const loadDetails = async () => {
            try {
                const [rep, hours, notesData, reportsData, photosData] = await Promise.all([
                    analyticsAPI.getSiteReport(site._id),
                    analyticsAPI.getHoursPerEmployee({ siteId: site._id }),
                    noteAPI.getAll({ siteId: site._id, type: 'note' }),
                    noteAPI.getAll({ siteId: site._id, type: 'daily_report' }),
                    photoAPI.getAll({ siteId: site._id })
                ]);
                setReport(rep.data);
                setEmployeeHours(hours.data);
                setNotes(notesData.data || []);
                setDailyReports(reportsData.data || []);
                setPhotos(photosData.data || []);
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 w-full max-w-full overflow-hidden">
            <div className="flex items-center gap-4 mb-6">
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

            {/* TAB SWITCHER */}
            <div className="bg-white rounded-2xl p-2 shadow-sm">
                <div className="flex gap-2 overflow-x-auto">
                    {[
                        { id: 'dati', label: 'Dati', icon: Clock },
                        { id: 'report', label: 'Report Giornaliero', icon: FileText },
                        { id: 'note', label: 'Note', icon: FileText },
                        { id: 'foto', label: 'Foto', icon: Camera },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${isActive
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/20'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* DATI TAB */}
            {activeTab === 'dati' && (
                <>
                    {/* COSTO CANTIERE - TOP CARD */}
                    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 relative overflow-hidden max-w-full">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-10 -mt-10 opacity-50"></div>
                        <div className="relative z-10">
                            <h3 className="text-base md:text-lg font-bold text-slate-500 mb-2 flex items-center gap-2">
                                <span className="p-2 bg-green-100 rounded-lg text-green-600">
                                    <Clock className="w-4 h-4 md:w-5 md:h-5" />
                                </span>
                                Costo Totale Cantiere
                            </h3>
                            <div className="flex flex-wrap items-baseline gap-2">
                                <p className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900">
                                    {report?.siteCost?.total?.toFixed(2) || '0,00'}€
                                </p>
                                <span className="text-xs md:text-sm text-slate-500 font-medium">aggiornato in tempo reale</span>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 mt-4 text-xs md:text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
                                    <span className="text-slate-600 break-words">Manodopera: <strong>{report?.siteCost?.labor?.toFixed(2) || '0,00'}€</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-purple-500 flex-shrink-0"></div>
                                    <span className="text-slate-600 break-words">Materiali: <strong>{report?.siteCost?.materials?.toFixed(2) || '0,00'}€</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SUMMARY GRID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Ore Totali
                            </h3>
                            <p className="text-3xl font-bold text-slate-900">
                                {report?.totalHours?.toFixed(2) || '0.00'} <span className="text-lg font-normal text-slate-500">h</span>
                            </p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                                <Package className="w-4 h-4" /> Materiali
                            </h3>
                            <p className="text-3xl font-bold text-slate-900">
                                {report?.materials?.length || 0} <span className="text-lg font-normal text-slate-500">tipi</span>
                            </p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                                <Users className="w-4 h-4" /> Dipendenti
                            </h3>
                            <p className="text-3xl font-bold text-slate-900">
                                {employeeHours?.length || 0}
                            </p>
                        </div>
                    </div>

                    {/* INTERACTIVE CARDS GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
                        {/* EMPLOYEES CARD */}
                        <div
                            onClick={() => setShowEmployeesModal(true)}
                            className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer group max-w-full"
                        >
                            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-slate-400" />
                                    Dettaglio Dipendenti
                                </h3>
                                <span className="text-blue-600 text-sm font-bold group-hover:underline flex items-center gap-1">
                                    Vedi tutti <ChevronRight className="w-4 h-4" />
                                </span>
                            </div>
                            {employeeHours.length > 0 ? (
                                <div className="space-y-3">
                                    {employeeHours.slice(0, 3).map((emp) => (
                                        <div key={emp._id._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                            <div>
                                                <span className="font-bold text-slate-700 block">{emp._id.firstName} {emp._id.lastName}</span>
                                                <span className="text-xs text-slate-500">
                                                    {emp._id.hourlyCost ? `€${emp._id.hourlyCost.toFixed(2)}/h` : 'Costo orario non impostato'}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-slate-900 block">{emp.totalHours.toFixed(2)} h</span>
                                                <span className="text-xs font-bold text-green-600">
                                                    €{((emp.totalHours || 0) * (emp._id.hourlyCost || 0)).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {employeeHours.length > 3 && (
                                        <p className="text-center text-sm text-slate-400 pt-2">
                                            +{employeeHours.length - 3} altri dipendenti...
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-slate-400 italic">Nessuna ora registrata.</p>
                            )}
                        </div>

                        {/* MATERIALS CARD */}
                        <div
                            onClick={() => setShowMaterialsModal(true)}
                            className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer group max-w-full"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-slate-400" />
                                    Dettaglio Materiali
                                </h3>
                                <span className="text-purple-600 text-sm font-bold group-hover:underline flex items-center gap-1">
                                    Vedi tutti <ChevronRight className="w-4 h-4" />
                                </span>
                            </div>
                            {report?.materials?.length > 0 ? (
                                <div className="space-y-3">
                                    {report.materials.slice(0, 3).map((mat) => (
                                        <div key={mat._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-slate-50 rounded-lg group-hover:bg-purple-50 transition-colors">
                                            <div>
                                                <span className="font-bold text-slate-700 block">{mat._id}</span>
                                                <span className="text-xs text-slate-500">
                                                    {mat.unitPrice ? `€${mat.unitPrice.toFixed(2)}/${mat.unit}` : 'Prezzo non disp.'}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-slate-900 block">{mat.totalQuantity} {mat.unit}</span>
                                                <span className="text-xs font-bold text-green-600">
                                                    €{(mat.totalCost || 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {report.materials.length > 3 && (
                                        <p className="text-center text-sm text-slate-400 pt-2">
                                            +{report.materials.length - 3} altri materiali...
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-slate-400 italic">Nessun materiale registrato.</p>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* REPORT GIORNALIERO TAB */}
            {activeTab === 'report' && (
                <div className="space-y-4">
                    {dailyReports.length > 0 ? (
                        dailyReports.map((note) => (
                            <div
                                key={note._id}
                                onClick={() => setSelectedNote(note)}
                                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-all cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h4 className="font-bold text-slate-900">
                                            {note.user?.firstName} {note.user?.lastName}
                                        </h4>
                                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                            <span>{new Date(note.createdAt).toLocaleDateString('it-IT')}</span>
                                            <span>•</span>
                                            <span>{new Date(note.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-slate-600 line-clamp-2">{note.content}</p>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">Nessun report giornaliero disponibile</p>
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
                                key={note._id}
                                onClick={() => setSelectedNote(note)}
                                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-all cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h4 className="font-bold text-slate-900">
                                            {note.user?.firstName} {note.user?.lastName}
                                        </h4>
                                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                            <span>{new Date(note.createdAt).toLocaleDateString('it-IT')}</span>
                                            <span>•</span>
                                            <span>{new Date(note.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-slate-600 line-clamp-2">{note.content}</p>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
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
                                    key={photo._id}
                                    onClick={() => setSelectedPhoto(photo)}
                                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all cursor-pointer"
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
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                            <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">Nessuna foto disponibile</p>
                        </div>
                    )}
                </div>
            )}

            {/* Note Detail Modal */}
            {selectedNote && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-4 md:p-4 overflow-y-auto" onClick={() => setSelectedNote(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl my-auto shadow-2xl max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
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
                    <div className="bg-white rounded-2xl w-full max-w-4xl my-auto shadow-2xl max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
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
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between z-10">
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
                                            <tr key={emp._id._id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-slate-900">{emp._id.firstName} {emp._id.lastName}</div>
                                                    <div className="text-xs text-slate-500">{emp._id.username}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-700">
                                                    {emp.totalHours.toFixed(2)} h
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-700">
                                                    {emp._id.hourlyCost ? `€ ${emp._id.hourlyCost.toFixed(2)}` : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-green-600 font-mono">
                                                    € {((emp.totalHours || 0) * (emp._id.hourlyCost || 0)).toFixed(2)}
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
                                                € {employeeHours.reduce((acc, curr) => acc + (curr.totalHours * (curr._id.hourlyCost || 0)), 0).toFixed(2)}
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
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between z-10">
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
                                            <tr key={mat._id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="px-4 py-3 font-bold text-slate-900">
                                                    {mat._id}
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
        status: 'planned'
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
                await siteAPI.update(editingSite._id, formData);
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
            status: site.status
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
        setFormData({ name: '', address: '', description: '', startDate: '', endDate: '', status: 'planned' });
        setEditingSite(null);
        setShowModal(false);
    };

    const filteredSites = sites.filter(site =>
        site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <Layout title="Cantieri">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                </div>
            </Layout>
        );
    }

    if (selectedSite) {
        return (
            <Layout title="Dettagli Cantiere">
                <SiteDetails site={selectedSite} onBack={() => setSelectedSite(null)} />
            </Layout>
        );
    }

    return (
        <Layout title={`Benvenuto, ${user?.firstName}`}>
            {notification && (
                <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 font-semibold flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {notification.message}
                </div>
            )}

            {sites.length === 0 ? (
                // Empty State
                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                        <Building2 className="w-12 h-12 text-slate-400" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-3">Nessun cantiere attivo</h2>
                    <p className="text-slate-500 mb-8 max-w-md text-lg">
                        Inizia creando il tuo primo cantiere per gestire presenze, materiali e lavori.
                    </p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-3 text-lg transform hover:-translate-y-1"
                    >
                        <Plus className="w-6 h-6" />
                        CREA NUOVO CANTIERE
                    </button>
                </div>
            ) : (
                // Sites List
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="relative max-w-md w-full">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Cerca cantiere..."
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                        >
                            <Plus className="w-5 h-5" />
                            Nuovo Cantiere
                        </button>
                    </div>

                    <div className="grid gap-4">
                        {filteredSites.map(site => (
                            <div
                                key={site._id}
                                onClick={() => setSelectedSite(site)}
                                className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group animate-in fade-in slide-in-from-bottom-2 relative"
                            >
                                <ChevronRight className="absolute top-6 right-6 w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pr-8">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-900 transition-colors">
                                                <Building2 className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                {site.name}
                                            </h3>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 ml-1">
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

                                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-100 pt-4 md:pt-0 mt-2 md:mt-0">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${site.status === 'active' ? 'bg-green-100 text-green-700' :
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
                                                onClick={(e) => handleDelete(e, site._id)}
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
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-4 md:p-4 animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-2xl my-auto shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
                        <button
                            onClick={resetForm}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-slate-500" />
                        </button>

                        <div className="p-4 md:p-6 lg:p-8 overflow-y-auto flex-1">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                {editingSite ? 'Modifica Cantiere' : 'Nuovo Cantiere'}
                            </h2>
                            <p className="text-slate-500 mb-8">Inserisci i dettagli del cantiere</p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-slate-900 mb-1.5">Nome Cantiere *</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            placeholder="Es. Ristrutturazione Villa Rossi"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-slate-900 mb-1.5">Indirizzo *</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            required
                                            placeholder="Via Roma 1, Milano"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-900 mb-1.5">Data Inizio *</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-900 mb-1.5">Stato</label>
                                        <select
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
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
                                        <label className="block text-sm font-bold text-slate-900 mb-1.5">Descrizione</label>
                                        <textarea
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all min-h-[100px]"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Note aggiuntive..."
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-6 py-3 bg-white border-2 border-slate-900 text-slate-900 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
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
