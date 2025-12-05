import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, FileText, Camera, User, Clock, Loader2, ArrowLeft, Calendar } from 'lucide-react';
import { siteAPI, noteAPI, photoAPI } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import Layout from '../../components/Layout';

const WorkerSites = () => {
    const navigate = useNavigate();
    const { showError } = useToast();

    // State
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState(null);
    const [notes, setNotes] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [dateFilter, setDateFilter] = useState('today');
    const [customDate, setCustomDate] = useState('');

    useEffect(() => {
        loadSites();
    }, []);

    useEffect(() => {
        if (selectedSite) {
            loadSiteDetails();
        }
    }, [selectedSite, dateFilter, customDate]);

    const loadSites = async () => {
        try {
            setLoading(true);
            const response = await siteAPI.getAll();
            setSites(response.data);
        } catch (error) {
            console.error('Error loading sites:', error);
            showError('Errore nel caricamento dei cantieri');
        } finally {
            setLoading(false);
        }
    };

    const loadSiteDetails = async () => {
        try {
            setLoadingDetails(true);
            const date = getFilterDate();

            const [notesRes, photosRes] = await Promise.all([
                noteAPI.getNotes(selectedSite._id, date),
                photoAPI.getPhotos(selectedSite._id, date)
            ]);

            setNotes(notesRes.data);
            setPhotos(photosRes.data);
        } catch (error) {
            console.error('Error loading site details:', error);
            showError('Errore nel caricamento dei dettagli');
        } finally {
            setLoadingDetails(false);
        }
    };

    const getFilterDate = () => {
        if (dateFilter === 'today') {
            return new Date().toISOString().split('T')[0];
        } else if (dateFilter === 'custom' && customDate) {
            return customDate;
        }
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

    // Site List View
    if (!selectedSite) {
        return (
            <Layout title="Cantieri" hideHeader={false}>
                <div className="max-w-7xl mx-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                    ) : sites.length === 0 ? (
                        <div className="text-center py-20">
                            <Building2 className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">Nessun cantiere disponibile</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sites.map((site) => (
                                <div
                                    key={site._id}
                                    onClick={() => setSelectedSite(site)}
                                    className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer group border border-transparent hover:border-blue-200"
                                >
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                                                    <Building2 className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                                                        {site.name}
                                                    </h3>
                                                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${site.status === 'active'
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {site.status === 'active' ? 'Attivo' : site.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-sm text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-gray-400" />
                                                <span>{site.address}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-gray-400" />
                                                <span>{site.city}</span>
                                            </div>
                                            {site.description && (
                                                <p className="text-gray-500 text-xs mt-2 line-clamp-2">
                                                    {site.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <button className="text-blue-600 text-sm font-semibold group-hover:gap-2 flex items-center gap-1 transition-all">
                                                Visualizza rapporti
                                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Layout>
        );
    }

    // Site Detail View
    return (
        <Layout title={selectedSite.name} hideHeader={false}>
            <div className="max-w-7xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => setSelectedSite(null)}
                    className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Torna ai cantieri
                </button>

                {/* Site Info Card */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
                            <Building2 className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{selectedSite.name}</h2>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                <MapPin className="w-4 h-4" />
                                {selectedSite.address}, {selectedSite.city}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Date Filter */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5 text-gray-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Filtra per data</h3>
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

                {loadingDetails ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Notes Section */}
                        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                            <div className="flex items-center gap-2 mb-6">
                                <FileText className="w-6 h-6 text-blue-600" />
                                <h3 className="text-xl font-bold text-gray-900">Note Giornaliere</h3>
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
                                <h3 className="text-xl font-bold text-gray-900">Foto</h3>
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
            </div>
        </Layout>
    );
};

export default WorkerSites;
