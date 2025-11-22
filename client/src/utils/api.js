import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

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
};

// Materials
export const materialAPI = {
    create: (data) => api.post('/materials', data),
    getAll: (params) => api.get('/materials', { params }),
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
};

// Photos
export const photoAPI = {
    upload: (formData) => api.post('/photos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getAll: (params) => api.get('/photos', { params }),
};

// Construction Sites
export const siteAPI = {
    create: (data) => api.post('/sites', data),
    getAll: () => api.get('/sites'),
    getOne: (id) => api.get(`/sites/${id}`),
    update: (id, data) => api.put(`/sites/${id}`, data),
    delete: (id) => api.delete(`/sites/${id}`),
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
    recommend: (data) => api.post('/suppliers/recommend', data),
};

// Quotes
export const quoteAPI = {
    create: (data) => api.post('/quotes', data),
    getAll: () => api.get('/quotes'),
    getOne: (id) => api.get(`/quotes/${id}`),
    update: (id, data) => api.put(`/quotes/${id}`, data),
    delete: (id) => api.delete(`/quotes/${id}`),
    downloadPDF: (id) => api.get(`/quotes/${id}/pdf`, { responseType: 'blob' }),
};

// SALs
export const salAPI = {
    create: (data) => api.post('/sals', data),
    getAll: (params) => api.get('/sals', { params }),
    downloadPDF: (id) => api.get(`/sals/${id}/pdf`, { responseType: 'blob' }),
};

// User
export const userAPI = {
    getProfile: () => api.get('/auth/me'),
    updateSignature: (signatureDataURL) => api.post('/users/signature', { signature: signatureDataURL }),
};

// Communication (Email & WhatsApp)
export const communicationAPI = {
    sendEmailQuote: (quoteId, data) => api.post(`/communication/send-email/quote/${quoteId}`, data),
    sendEmailSAL: (salId, data) => api.post(`/communication/send-email/sal/${salId}`, data),
    sendWhatsAppQuote: (quoteId, data) => api.post(`/communication/send-whatsapp/quote/${quoteId}`, data),
    sendWhatsAppSAL: (salId, data) => api.post(`/communication/send-whatsapp/sal/${salId}`, data),
};

// Company
export const companyAPI = {
    get: () => api.get('/company'),
    update: (data) => api.put('/company', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

export default api;
