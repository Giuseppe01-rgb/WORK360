import axios from 'axios';

// Determine API URL based on environment
const API_URL = import.meta.env.MODE === 'production'
    ? 'https://work360-production-d4f3.up.railway.app/api'
    : 'http://localhost:5001/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Auth
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    getMe: () => api.get('/auth/me'),
};

// Attendance
export const attendanceAPI = {
    clockIn: (data) => api.post('/attendance/clock-in', data),
    clockOut: (data) => api.post('/attendance/clock-out', data),
    getMyRecords: (params) => api.get('/attendance/my-records', { params }),
    getActive: () => api.get('/attendance/active'),
    getAll: (params) => api.get('/attendance/all', { params }),
    createManual: (data) => api.post('/attendance/manual', data),
    bulkCreate: (data) => api.post('/attendance/bulk', data),
    importExcel: (file, preview = false) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/attendance/import-excel?preview=${preview}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    update: (id, data) => api.put(`/attendance/${id}`, data),
    delete: (id) => api.delete(`/attendance/${id}`),
};

// Materials
export const materialAPI = {
    create: (data) => api.post('/materials', data),
    getAll: (params) => api.get('/materials', { params }),
};

// Material Master (Catalog)
export const materialMasterAPI = {
    getAll: () => api.get('/material-master'),
    getByBarcode: (barcode) => api.get(`/material-master/barcode/${barcode}`),
    create: (data) => api.post('/material-master', data),
    update: (id, data) => api.put(`/material-master/${id}`, data),
    delete: (id) => api.delete(`/material-master/${id}`),
    uploadInvoice: (file) => {
        const formData = new FormData();
        formData.append('invoice', file);
        return api.post('/material-master/upload-invoice', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
};

// Coloura Material (OCR-based catalog)
export const colouraMaterialAPI = {
    search: (query, params) => api.get(`/coloura-materials/search?q=${encodeURIComponent(query)}`, { params }),
    create: (data) => api.post('/coloura-materials', data),
    getAll: () => api.get('/coloura-materials'),
    update: (id, data) => api.put(`/coloura-materials/${id}`, data),
    delete: (id) => api.delete(`/coloura-materials/${id}`),
    importExcel: (file, preview = false) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('preview', preview);
        return api.post(`/coloura-materials/import?preview=${preview}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
};

// Material Usage (Worker tracking)
export const materialUsageAPI = {
    recordUsage: (data) => api.post('/material-usage', data),
    getTodayUsage: (siteId) => api.get('/material-usage/today', { params: siteId ? { siteId } : {} }),
    getMostUsedBySite: (siteId) => api.get(`/material-usage/most-used/${siteId}`),
    getHistory: (params) => api.get('/material-usage', { params }),
    getBySite: (siteId) => api.get('/material-usage', { params: { siteId } }),
    update: (id, data) => api.put(`/material-usage/${id}`, data),
    delete: (id) => api.delete(`/material-usage/${id}`)
};

// Reported Materials (Segnalazioni)
export const reportedMaterialAPI = {
    report: (data) => api.post('/reported-materials', data),
    getAll: (params) => api.get('/reported-materials', { params }),
    approveAndCreateNew: (id, data) => api.patch(`/reported-materials/${id}/approve-new`, data),
    approveAndAssociate: (id, data) => api.patch(`/reported-materials/${id}/approve-associate`, data),
    reject: (id, data) => api.patch(`/reported-materials/${id}/reject`, data)
};

// Equipment
export const equipmentAPI = {
    create: (data) => api.post('/equipment', data),
    getAll: (params) => api.get('/equipment', { params }),
};

// Notes
export const noteAPI = {
    create: (data) => api.post('/notes', data),
    getAll: (params) => api.get('/notes', { params }),
    delete: (id) => api.delete(`/notes/${id}`),
};

// Photos
export const photoAPI = {
    upload: (formData) => api.post('/photos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getAll: (params) => api.get('/photos', { params }),
    delete: (id) => api.delete(`/photos/${id}`),
};

// Construction Sites
export const siteAPI = {
    create: (data) => api.post('/sites', data),
    getAll: () => api.get('/sites'),
    getOne: (id) => api.get(`/sites/${id}`),
    update: (id, data) => api.put(`/sites/${id}`, data),
    delete: (id) => api.delete(`/sites/${id}`),
    recalculateCosts: (id) => api.post(`/sites/${id}/recalculate-costs`),
};

// Analytics
export const analyticsAPI = {
    getHoursPerEmployee: (params) => api.get('/analytics/hours-per-employee', { params }),
    getSiteReport: (siteId) => api.get(`/analytics/site-report/${siteId}`),
    getEmployeeMaterials: (employeeId) => api.get(`/analytics/employee-materials/${employeeId}`),
    getDashboard: () => api.get('/analytics/dashboard'),
};

// Suppliers
export const supplierAPI = {
    create: (data) => api.post('/suppliers', data),
    getAll: () => api.get('/suppliers'),
    update: (id, data) => api.put(`/suppliers/${id}`, data),
    delete: (id) => api.delete(`/suppliers/${id}`),
    getRecommendations: () => api.get('/suppliers/recommendations'),
};

// Work Activities
export const workActivityAPI = {
    create: (data) => api.post('/work-activities', data),
    getAll: (params) => api.get('/work-activities', { params }),
    update: (id, data) => api.put(`/work-activities/${id}`, data),
    distributeTime: (data) => api.put('/work-activities/distribute-time', data),
    getAnalytics: (params) => api.get('/work-activities/analytics', { params }),
    delete: (id) => api.delete(`/work-activities/${id}`),
};

// Quotes
export const quoteAPI = {
    create: (data) => api.post('/quotes', data),
    getAll: () => api.get('/quotes'),
    getOne: (id) => api.get(`/quotes/${id}`),
    update: (id, data) => api.put(`/quotes/${id}`, data),
    delete: (id) => api.delete(`/quotes/${id}`),
    downloadPDF: (id) => api.get(`/quotes/${id}/pdf`, { responseType: 'blob' }),
}

// SALs
export const salAPI = {
    create: (data) => api.post('/sals', data),
    getAll: () => api.get('/sals'),
    getOne: (id) => api.get(`/sals/${id}`),
    update: (id, data) => api.put(`/sals/${id}`, data),
    delete: (id) => api.delete(`/sals/${id}`),
    downloadPDF: (id) => api.get(`/sals/${id}/pdf`, { responseType: 'blob' }),
};

// Site Accounting (Contabilità Cantiere)
export const siteAccountingAPI = {
    create: (data) => api.post('/site-accounting', data),
    getAll: () => api.get('/site-accounting'),
    getOne: (id) => api.get(`/site-accounting/${id}`),
    update: (id, data) => api.put(`/site-accounting/${id}`, data),
    delete: (id) => api.delete(`/site-accounting/${id}`),
    downloadPDF: (id) => api.get(`/site-accounting/${id}/pdf`, { responseType: 'blob' }),
};

// User
export const userAPI = {
    getProfile: () => api.get('/auth/me'),
    updateSignature: (signatureDataURL) => api.post('/users/signature', { signature: signatureDataURL }),
    getAll: () => api.get('/users'),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
    updateEmailConfig: (data) => api.put('/users/email-config', data),
    testEmailConfig: () => api.post('/users/email-config/test'),
    changePassword: (data) => api.post('/users/change-password', data),
    resetPassword: (id) => api.post(`/users/${id}/reset-password`),
    sendWelcomeEmail: (id) => api.post(`/users/${id}/send-welcome`)
};

// Communication (Email & WhatsApp)
export const communicationAPI = {
    sendEmailQuote: (quoteId, data) => api.post(`/communication/send-email/quote/${quoteId}`, data),
    sendEmailSAL: (salId, data) => api.post(`/communication/send-email/sal/${salId}`, data),
    sendWhatsAppQuote: (quoteId, data) => api.post(`/communication/send-whatsapp/quote/${quoteId}`, data),
    sendWhatsAppSAL: (salId, data) => api.post(`/communication/send-whatsapp/sal/${salId}`, data),
};

// Economia (Overtime Hours)
export const economiaAPI = {
    create: (data) => api.post('/economia', data),
    createBulk: (data) => api.post('/economia/bulk', data), // Quick bulk entry
    getBySite: (siteId) => api.get(`/economia/site/${siteId}`),
    getMyEconomie: (params) => api.get('/economia/my', { params }),
    update: (id, data) => api.put(`/economia/${id}`, data),
    delete: (id) => api.delete(`/economia/${id}`),
    deleteMyEconomia: (id) => api.delete(`/economia/my/${id}`),
};

// Company
export const companyAPI = {
    get: () => api.get('/company'),
    update: (data) => api.put('/company', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

// Audit Logs
export const auditLogAPI = {
    getAll: (params) => api.get('/audit-logs', { params }),
    getActions: () => api.get('/audit-logs/actions'),
};

// Backup / Export
export const backupAPI = {
    getStats: () => api.get('/backup/stats'),
    exportAll: async () => {
        const response = await api.get('/backup/export-all', {
            responseType: 'blob'
        });
        // Create download link
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `work360_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return response;
    },
    exportAttendances: async () => {
        const response = await api.get('/backup/export-attendances', {
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `work360_attendances_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return response;
    }
};

export const absenceRequestAPI = {
    create: (data) => api.post('/absence-requests', data),
    getMine: (params) => api.get('/absence-requests/mine', { params }),
    getAll: (params) => api.get('/absence-requests/all', { params }),
    getById: (id) => api.get(`/absence-requests/${id}`),
    approve: (id, data) => api.post(`/absence-requests/${id}/approve`, data),
    reject: (id, data) => api.post(`/absence-requests/${id}/reject`, data),
    requestChanges: (id, data) => api.post(`/absence-requests/${id}/request-changes`, data),
    cancel: (id) => api.post(`/absence-requests/${id}/cancel`),
    resubmit: (id, data) => api.post(`/absence-requests/${id}/resubmit`, data),
};

export default api;
