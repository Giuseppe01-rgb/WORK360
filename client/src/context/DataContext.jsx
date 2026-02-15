import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { analyticsAPI, siteAPI } from '../utils/api';
import { useAuth } from './AuthContext';

// ─── RETRY ON 429 (Rate Limit) ──────────────────────────────────────────
const retryOn429 = async (fn, maxRetries = 3) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (error?.response?.status === 429 && attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
                console.log(`[DataContext] 429 received, retrying in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
            } else {
                throw error;
            }
        }
    }
};

const DataContext = createContext();

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

export const DataProvider = ({ children }) => {
    const { user, loading: authLoading } = useAuth(); // Importa anche authLoading

    // ─── HELPERS FOR SESSIONSTORAGE (survives page refresh, not browser close) ───
    const loadFromSession = (key, defaultValue) => {
        try {
            const stored = sessionStorage.getItem(key);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Check if data is fresh (less than 5 minutes old)
                if (parsed.savedAt && (Date.now() - parsed.savedAt < 5 * 60 * 1000)) {
                    return parsed.value;
                }
            }
            return defaultValue;
        } catch (error) {
            console.error(`[DataContext] Error loading ${key} from sessionStorage:`, error);
            return defaultValue;
        }
    };

    const saveToSession = (key, value) => {
        try {
            sessionStorage.setItem(key, JSON.stringify({
                value,
                savedAt: Date.now()
            }));
        } catch (error) {
            console.error(`[DataContext] Error saving ${key} to sessionStorage:`, error);
        }
    };

    // ─── STATE MANAGEMENT ────────────────────────────────────────────────
    // Structure: { data: any, status: 'idle' | 'loading' | 'refreshing' | 'ready' | 'error', error: null, updatedAt: null }

    const [dashboard, setDashboard] = useState(() => {
        const cached = loadFromSession('work360_dashboard', null);
        if (cached && cached.data) {
            // Show cached data immediately; background refresh will update
            return {
                ...cached,
                status: 'refreshing' // Components show cached data while we refresh in background
            };
        }
        return {
            data: null,
            status: 'idle',
            error: null,
            updatedAt: null
        };
    });

    const [sites, setSites] = useState(() => {
        const cached = loadFromSession('work360_sites', null);
        if (cached && cached.data) {
            return {
                ...cached,
                status: 'refreshing' // Components show cached data while we refresh in background
            };
        }
        return {
            data: [],
            status: 'idle',
            error: null,
            updatedAt: null
        };
    });

    // Cache for individual site reports: { [siteId]: { data, status, ... } }
    const [siteReports, setSiteReports] = useState(() => {
        const cached = loadFromSession('work360_siteReports', null);
        return cached || {};
    });

    // ─── HELPERS ─────────────────────────────────────────────────────────

    const setStatus = (setter, status, error = null) => {
        setter(prev => ({ ...prev, status, error }));
    };

    const updateData = (setter, data) => {
        setter(prev => ({
            ...prev,
            data,
            status: 'ready',
            error: null,
            updatedAt: new Date()
        }));
    };

    // ─── ACTIONS ─────────────────────────────────────────────────────────

    const lastRefreshTime = useRef(0);

    const refreshDashboard = useCallback(async (force = false) => {
        // Throttle: at least 5 seconds between refreshes unless forced
        const now = Date.now();
        if (!force && now - lastRefreshTime.current < 5000) {
            console.log('[DataContext] Throttled refreshDashboard (too soon)');
            return;
        }
        lastRefreshTime.current = now;

        setDashboard(prev => ({
            ...prev,
            status: prev.data ? 'refreshing' : 'loading'
        }));

        setSites(prev => ({
            ...prev,
            status: prev.data?.length > 0 ? 'refreshing' : 'loading'
        }));

        try {
            console.log('[DataContext] Refreshing Dashboard & Sites...');
            const [dashRes, sitesRes] = await Promise.all([
                retryOn429(() => analyticsAPI.getDashboard()),
                retryOn429(() => siteAPI.getAll())
            ]);

            // Atomic updates
            updateData(setDashboard, dashRes.data);
            updateData(setSites, Array.isArray(sitesRes.data) ? sitesRes.data : []);

            console.log('[DataContext] Dashboard refreshed successfully.');
        } catch (error) {
            console.error('[DataContext] Error refreshing dashboard:', error);
            const err = error.message || 'Errore di connessione';
            // Only set error if we don't have cached data to fall back on
            setDashboard(prev => prev.data ? { ...prev, status: 'ready' } : { ...prev, status: 'error', error: err });
            setSites(prev => prev.data?.length > 0 ? { ...prev, status: 'ready' } : { ...prev, status: 'error', error: err });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Track in-flight requests to prevent duplicates
    const fetchingSites = useRef(new Set());

    const getSiteReport = useCallback(async (siteId, force = false) => {
        // Allow UUID strings or numbers
        if (!siteId) {
            console.error('[DataContext] Invalid siteId (empty):', siteId);
            return;
        }

        // Normalize ID to string for object keys
        const validId = String(siteId);

        // Prevent duplicate fetches for the same ID
        if (fetchingSites.current.has(validId)) {
            console.log(`[DataContext] Request for site ${validId} already in progress. Skipping.`);
            return;
        }

        fetchingSites.current.add(validId);

        setSiteReports(prev => {
            const current = prev[validId] || { data: null, status: 'idle' };
            // Optimistic update: unique request guaranteed by ref
            const nextStatus = current.data ? 'refreshing' : 'loading';
            return { ...prev, [validId]: { ...current, status: nextStatus } };
        });

        try {
            console.log(`[DataContext] Fetching report for site ${validId} (type: ${typeof validId})...`);
            const res = await retryOn429(() => analyticsAPI.getSiteReport(validId));
            console.log(`[DataContext] Received report for site ${validId}:`, res.data ? 'Data present' : 'No data');
            if (res.data) {
                console.log(`[DataContext] Site ${validId} ContractValue:`, res.data.contractValue);
                console.log(`[DataContext] Site ${validId} TotalCost:`, res.data.siteCost?.total);
            }

            setSiteReports(prev => ({
                ...prev,
                [validId]: {
                    data: res.data,
                    status: 'ready',
                    error: null,
                    updatedAt: new Date()
                }
            }));
        } catch (error) {
            console.error(`[DataContext] Error fetching site ${validId}:`, error);
            setSiteReports(prev => ({
                ...prev,
                [validId]: {
                    ...prev[validId],
                    status: 'error',
                    error: error.message
                }
            }));
        } finally {
            fetchingSites.current.delete(validId);
        }
    }, []);

    // ─── INITIALIZATION ──────────────────────────────────────────────────

    // Track whether we've ever had a fully authenticated user (not just from token)
    const hadFullUser = useRef(false);
    useEffect(() => {
        if (user && !user._fromToken) {
            hadFullUser.current = true;
        }
    }, [user]);

    // Auto-load dashboard on mount if user is owner
    // Wait for auth to stabilize before loading
    useEffect(() => {
        if (!authLoading && user?.role === 'owner' && (dashboard.status === 'idle' || dashboard.status === 'refreshing')) {
            refreshDashboard();
        }
    }, [user, authLoading, dashboard.status]); // eslint-disable-line react-hooks/exhaustive-deps

    // RESET STATE ON LOGOUT
    // Only clear if user explicitly logged out (hadFullUser was true, now user is null)
    // This prevents accidental clearing during page refresh auth re-verification
    useEffect(() => {
        if (!user && !authLoading && hadFullUser.current) {
            console.log('[DataContext] User logged out. Clearing data...');
            setDashboard({ data: null, status: 'idle', error: null, updatedAt: null });
            setSites({ data: [], status: 'idle', error: null, updatedAt: null });
            setSiteReports({});
            // Clear sessionStorage
            sessionStorage.removeItem('work360_dashboard');
            sessionStorage.removeItem('work360_sites');
            sessionStorage.removeItem('work360_siteReports');
            hadFullUser.current = false;
        }
    }, [user, authLoading]);

    // ─── PERSISTENCE TO SESSIONSTORAGE ───────────────────────────────────
    // SessionStorage: survives page refresh but clears when browser closes
    useEffect(() => {
        if (dashboard.status === 'ready' && dashboard.data) {
            saveToSession('work360_dashboard', dashboard);
        }
    }, [dashboard]);

    useEffect(() => {
        if (sites.status === 'ready' && sites.data?.length > 0) {
            saveToSession('work360_sites', sites);
        }
    }, [sites]);

    useEffect(() => {
        if (Object.keys(siteReports).length > 0) {
            // Only save site reports that are ready
            const readyReports = Object.entries(siteReports)
                .filter(([_, report]) => report.status === 'ready' && report.data)
                .reduce((acc, [id, report]) => ({ ...acc, [id]: report }), {});

            if (Object.keys(readyReports).length > 0) {
                saveToSession('work360_siteReports', readyReports);
            }
        }
    }, [siteReports]);


    const value = {
        // State
        dashboard,
        sites,
        siteReports,

        // Actions
        refreshDashboard,
        getSiteReport
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
