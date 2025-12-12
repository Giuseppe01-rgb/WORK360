import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2, MapPin, ArrowLeft, FileText, Camera, Calendar, Clock, User, Loader2
} from 'lucide-react';
import { siteAPI, workActivityAPI, noteAPI, photoAPI } from '../../utils/api';
import Layout from '../../components/Layout';
import { useToast } from '../../context/ToastContext';

const SiteDetails = ({ site, onBack }) => {
    const { showError } = useToast();
    const [reports, setReports] = useState([]);
    const [notes, setNotes] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('reports');

    const sections = [
        { id: 'reports', label: 'Rapporti giornalieri' },
        { id: 'notes', label: 'Note' },
        { id: 'photos', label: 'Foto' }
    ];

    useEffect(() => {
        const loadDetails = async () => {
            try {
                setLoading(true);
                const [reportsData, notesData, photosData] = await Promise.all([
                    workActivityAPI.getAll({ siteId: site.id }),
                    noteAPI.getAll({ siteId: site.id }),
                    photoAPI.getAll({ siteId: site.id })
                ]);
                setReports(reportsData.data || []);
                setNotes(notesData.data || []);
                setPhotos(photosData.data || []);
            } catch (err) {
                console.error("Error loading site details:", err);
                showError('Errore nel caricamento dei dettagli');
            } finally {
                setLoading(false);
            }
        };
        loadDetails();
    }, [site]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-12 h-12 text-slate-400 animate-spin" />
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
                            <span>{site.address}, {site.city}</span>
                        </div>
                    </div>
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

            {/* Content - Rapporti giornalieri */}
            {activeSection === 'reports' && (
                <div className="space-y-4">
                    {reports.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {reports.map((report) => (
                                <div
                                    key={report.id}
                                    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                                                {report.user?.firstName ? report.user.firstName.charAt(0) + report.user.lastName?.charAt(0) : (report.user?.username?.charAt(0).toUpperCase() || '?')}
                                            </div>
                                            <span className="font-semibold text-slate-900 text-sm">
                                                {report.user?.firstName ? `${report.user.firstName} ${report.user.lastName}` : (report.user?.username || 'Utente')}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-500 font-medium">
                                            {new Date(report.date || report.createdAt).toLocaleString('it-IT', {
                                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>

                                    <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed whitespace-pre-wrap">
                                        {report.activityType || report.description}
                                    </p>
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
                                                {note.user?.firstName ? note.user.firstName.charAt(0) + note.user.lastName?.charAt(0) : (note.user?.username?.charAt(0).toUpperCase() || '?')}
                                            </div>
                                            <span className="font-semibold text-slate-900 text-sm">
                                                {note.user?.firstName ? `${note.user.firstName} ${note.user.lastName}` : (note.user?.username || 'Utente')}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-500 font-medium">
                                            {new Date(note.date || note.createdAt).toLocaleString('it-IT', {
                                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <p className="text-slate-600 text-sm whitespace-pre-wrap">{note.content}</p>
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

            {/* Content - Foto */}
            {activeSection === 'photos' && (
                <div className="space-y-4">
                    {photos.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {photos.map((photo) => (
                                <div
                                    key={photo.id}
                                    className="group relative aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer"
                                    onClick={() => window.open(photo.photoUrl || photo.url, '_blank')}
                                >
                                    <img
                                        src={photo.photoUrl || photo.url}
                                        alt="Foto cantiere"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-end p-3">
                                        <div className="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="font-medium">
                                                {photo.uploadedBy?.firstName} {photo.uploadedBy?.lastName}
                                            </p>
                                            <p className="text-xs">
                                                {new Date(photo.date || photo.createdAt).toLocaleDateString('it-IT', {
                                                    day: '2-digit', month: '2-digit', year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl p-12 text-center shadow-sm animate-in fade-in duration-200">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Camera className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Foto</h3>
                            <p className="text-slate-500">Nessuna foto caricata per questo cantiere.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function WorkerSites() {
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState(null);
    const [loading, setLoading] = useState(true);
    const { showError } = useToast();

    useEffect(() => {
        loadSites();
    }, []);

    const loadSites = async () => {
        try {
            const response = await siteAPI.getAll();
            setSites(response.data || []);
        } catch (error) {
            console.error('Error loading sites:', error);
            showError('Errore nel caricamento dei cantieri');
        } finally {
            setLoading(false);
        }
    };

    if (selectedSite) {
        return (
            <Layout title="Dettagli Cantiere">
                <SiteDetails
                    site={selectedSite}
                    onBack={() => setSelectedSite(null)}
                />
            </Layout>
        );
    }

    if (loading) {
        return (
            <Layout title="Cantieri">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-12 h-12 text-slate-400 animate-spin" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Cantieri">
            {/* Sites List - Same UI as Owner */}
            <div className="grid gap-4">
                {sites.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building2 className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Cantieri</h3>
                        <p className="text-slate-500">Nessun cantiere disponibile.</p>
                    </div>
                ) : (
                    sites.map(site => (
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
                                            {site.address}, {site.city}
                                        </div>
                                        {site.startDate && (
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(site.startDate).toLocaleDateString('it-IT')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${site.status === 'active' ? 'bg-green-100 text-green-700' :
                                    site.status === 'planned' ? 'bg-blue-100 text-blue-700' :
                                        'bg-slate-100 text-slate-700'
                                    }`}>
                                    {site.status === 'active' ? 'In Corso' : site.status === 'planned' ? 'Pianificato' : 'Archiviato'}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Layout>
    );
}
