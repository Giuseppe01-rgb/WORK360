import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, FileText, Camera, User, Clock, Loader2 } from 'lucide-react';
import { siteAPI, noteAPI, photoAPI } from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const WorkerSites = () => {
    const navigate = useNavigate();
    const { showError } = useToast();

    // State
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState(null);
    const [dateFilter, setDateFilter] = useState('today'); // 'today', 'week', 'custom'
    const [customDate, setCustomDate] = useState('');
    const [notes, setNotes] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingContent, setLoadingContent] = useState(false);

    // Load sites on mount
    useEffect(() => {
        loadSites();
    }, []);

    // Load notes and photos when site or date changes
    useEffect(() => {
        if (selectedSite) {
            loadDailyReports();
        }
    }, [selectedSite, dateFilter, customDate]);

    const loadSites = async () => {
        try {
            setLoading(true);
            const response = await siteAPI.getSites();
            setSites(response.data);

            // Auto-select first site
            if (response.data.length > 0) {
                setSelectedSite(response.data[0]._id);
            }
        } catch (error) {
            console.error('Error loading sites:', error);
            showError('Errore nel caricamento dei cantieri');
        } finally {
            setLoading(false);
        }
    };

    const loadDailyReports = async () => {
        if (!selectedSite) return;

        try {
            setLoadingContent(true);
            const date = getFilterDate();

            // Load notes and photos in parallel
            const [notesRes, photosRes] = await Promise.all([
                noteAPI.getNotes(selectedSite, date),
                photoAPI.getPhotos(selectedSite, date)
            ]);

            setNotes(notesRes.data);
            setPhotos(photosRes.data);
        } catch (error) {
            console.error('Error loading daily reports:', error);
            showError('Errore nel caricamento dei rapporti');
        } finally {
            setLoadingContent(false);
        }
    };

    const getFilterDate = () => {
        if (dateFilter === 'today') {
            return new Date().toISOString().split('T')[0];
        } else if (dateFilter === 'custom' && customDate) {
            return customDate;
        }
        // For 'week', backend will handle it or we can pass null
        return null;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    const selectedSiteData = sites.find(s => s._id === selectedSite);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <div className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate('/worker')}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="font-medium">Indietro</span>
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Building2 className="w-7 h-7 text-blue-600" />
                            Cantieri
                        </h1>
                        <div className="w-20"></div> {/* Spacer for centering */}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Site Selector */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seleziona Cantiere
                    </label>
                    <select
                        value={selectedSite || ''}
                        onChange={(e) => setSelectedSite(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                        <option value="">-- Seleziona un cantiere --</option>
                        {sites.map(site => (
                            <option key={site._id} value={site._id}>
                                {site.name} - {site.city}
                            </option>
                        ))}
                    </select>

                    {selectedSiteData && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">Indirizzo:</span> {selectedSiteData.address}, {selectedSiteData.city}
                            </p>
                        </div>
                    )}
                </div>

                {/* Date Filter */}
                {selectedSite && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="w-5 h-5 text-gray-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Periodo</h2>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => setDateFilter('today')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all ${dateFilter === 'today'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Oggi
                            </button>
                            <button
                                onClick={() => setDateFilter('week')}
                                className={`px-6 py-2 rounded-lg font-medium transition-all ${dateFilter === 'week'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Ultimi 7 giorni
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setDateFilter('custom')}
                                    className={`px-6 py-2 rounded-lg font-medium transition-all ${dateFilter === 'custom'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Data specifica
                                </button>
                                {dateFilter === 'custom' && (
                                    <input
                                        type="date"
                                        value={customDate}
                                        onChange={(e) => setCustomDate(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                {selectedSite && (
                    <>
                        {loadingContent ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                            </div>
                        ) : (
                            <>
                                {/* Notes Section */}
                                <div className="bg-white rounded-xl shadow-sm p-6">
                                    <div className="flex items-center gap-2 mb-6">
                                        <FileText className="w-6 h-6 text-blue-600" />
                                        <h2 className="text-xl font-bold text-gray-900">Note Giornaliere</h2>
                                    </div>

                                    {notes.length === 0 ? (
                                        <div className="text-center py-12">
                                            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                            <p className="text-gray-500">Nessuna nota per questo periodo</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {notes.map(note => (
                                                <div
                                                    key={note._id}
                                                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                                <User className="w-5 h-5 text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-gray-900">
                                                                    {note.employee?.firstName} {note.employee?.lastName}
                                                                </p>
                                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                    <Clock className="w-4 h-4" />
                                                                    {formatDate(note.createdAt)} - {formatTime(note.createdAt)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-700 mt-3 whitespace-pre-wrap">{note.content}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Photos Section */}
                                <div className="bg-white rounded-xl shadow-sm p-6">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Camera className="w-6 h-6 text-blue-600" />
                                        <h2 className="text-xl font-bold text-gray-900">Foto</h2>
                                    </div>

                                    {photos.length === 0 ? (
                                        <div className="text-center py-12">
                                            <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                            <p className="text-gray-500">Nessuna foto per questo periodo</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {photos.map(photo => (
                                                <div
                                                    key={photo._id}
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
                                                            <p className="text-xs">{formatDate(photo.createdAt)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* Empty state when no site selected */}
                {!selectedSite && (
                    <div className="text-center py-16">
                        <Building2 className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">Seleziona un cantiere per visualizzare i rapporti</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkerSites;
