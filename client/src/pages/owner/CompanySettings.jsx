import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { companyAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Building2, Mail, Phone, MapPin, FileText, Upload, Save } from 'lucide-react';

export default function CompanySettings() {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logoPreview, setLogoPreview] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        ownerName: '',
        piva: '',
        email: '',
        pec: '',
        phone: '',
        address: {
            street: '',
            city: '',
            province: '',
            cap: ''
        },
        logo: null
    });

    useEffect(() => {
        loadCompany();
    }, []);

    const loadCompany = async () => {
        try {
            const response = await companyAPI.get();
            const data = response.data;
            setFormData({
                name: data.name || '',
                ownerName: data.ownerName || '',
                piva: data.piva || '',
                email: data.email || '',
                pec: data.pec || '',
                phone: data.phone || '',
                address: {
                    street: data.address?.street || '',
                    city: data.address?.city || '',
                    province: data.address?.province || '',
                    cap: data.address?.cap || ''
                },
                logo: null
            });
            if (data.logo) {
                setLogoPreview(`${import.meta.env.VITE_API_URL}${data.logo}`);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error loading company:', error);
            showError('Errore nel caricamento dati azienda');
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, logo: file }));
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const data = new FormData();
        data.append('name', formData.name);
        data.append('ownerName', formData.ownerName);
        data.append('piva', formData.piva);
        data.append('email', formData.email);
        data.append('pec', formData.pec);
        data.append('phone', formData.phone);
        data.append('address', JSON.stringify(formData.address));
        if (formData.logo) {
            data.append('logo', formData.logo);
        }

        try {
            await companyAPI.update(data);
            // Reload page to show saved data and avoid DOM issues
            window.location.reload();
        } catch (error) {
            console.error('Error updating company:', error);
            alert('Errore nell\'aggiornamento dati');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Layout title="Impostazioni Azienda">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 md:p-8 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-900">Dati Aziendali e Carta Intestata</h2>
                        <p className="text-slate-500 mt-1">Questi dati verranno utilizzati automaticamente nei preventivi e documenti.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
                        {/* Logo Upload */}
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <div className="w-full md:w-1/3">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Logo Aziendale</label>
                                <div className="relative group cursor-pointer">
                                    <div className={`w-40 h-40 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-slate-50 transition-colors ${logoPreview ? 'border-slate-200' : 'border-slate-300 hover:border-[#5D5FEF]'}`}>
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <div className="text-center p-4">
                                                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                                <span className="text-xs text-slate-500">Clicca per caricare</span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Formati supportati: PNG, JPG. Max 5MB.</p>
                                </div>
                            </div>

                            <div className="w-full md:w-2/3 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Ragione Sociale</label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#5D5FEF]"
                                                placeholder="Es. Edilizia Rossi SRL"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Titolare / Legale Rappresentante</label>
                                        <div className="relative">
                                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="text"
                                                name="ownerName"
                                                value={formData.ownerName}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#5D5FEF]"
                                                placeholder="Es. Mario Rossi"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Partita IVA</label>
                                        <div className="relative">
                                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="text"
                                                name="piva"
                                                value={formData.piva}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#5D5FEF]"
                                                placeholder="IT00000000000"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Email Aziendale</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#5D5FEF]"
                                                placeholder="info@azienda.it"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">PEC (Posta Elettronica Certificata)</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="email"
                                                name="pec"
                                                value={formData.pec}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#5D5FEF]"
                                                placeholder="pec@azienda.it"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Telefono</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#5D5FEF]"
                                                placeholder="+39 333 0000000"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Address */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-[#5D5FEF]" />
                                Sede Legale
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Indirizzo</label>
                                    <input
                                        type="text"
                                        name="address.street"
                                        value={formData.address.street}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#5D5FEF]"
                                        placeholder="Via Roma, 1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Città</label>
                                    <input
                                        type="text"
                                        name="address.city"
                                        value={formData.address.city}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#5D5FEF]"
                                        placeholder="Roma"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Provincia</label>
                                        <input
                                            type="text"
                                            name="address.province"
                                            value={formData.address.province}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#5D5FEF]"
                                            placeholder="RM"
                                            maxLength={2}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">CAP</label>
                                        <input
                                            type="text"
                                            name="address.cap"
                                            value={formData.address.cap}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#5D5FEF]"
                                            placeholder="00100"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-6">
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-8 py-4 bg-[#5D5FEF] text-white font-bold rounded-xl hover:bg-[#4B4DDB] transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Salvataggio...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Salva Impostazioni
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
}

function Users({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    );
}
