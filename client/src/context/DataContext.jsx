import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { analyticsAPI, siteAPI } from '../utils/api';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

export const DataProvider = ({ children }) => {
    const { user } = useAuth();

    // ─── STATE MANAGEMENT ────────────────────────────────────────────────
    // Structure: { data: any, status: 'idle' | 'loading' | 'refreshing' | 'ready' | 'error', error: null, updatedAt: null }

    const [dashboard, setDashboard] = useState({
        data: null,
        status: 'idle',
        error: null,
        updatedAt: null
    });

    const [sites, setSites] = useState({
        data: [],
        status: 'idle',
        error: null,
        updatedAt: null
    });

    // Cache for individual site reports: { [siteId]: { data, status, ... } }
    const [siteReports, setSiteReports] = useState({});

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

    const refreshDashboard = useCallback(async (force = false) => {
        // Prevent redundant fetches if recently updated (e.g., < 30 seconds) unless forced
        // const isRecent = dashboard.updatedAt && (new Date() - dashboard.updatedAt < 30000);
        // if (!force && isRecent && dashboard.status === 'ready') return;

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
                analyticsAPI.getDashboard(),
                siteAPI.getAll()
            ]);

            // Atomic updates
            updateData(setDashboard, dashRes.data);
            updateData(setSites, Array.isArray(sitesRes.data) ? sitesRes.data : []);

            console.log('[DataContext] Dashboard refreshed successfully.');
        } catch (error) {
            console.error('[DataContext] Error refreshing dashboard:', error);
            const err = error.message || 'Errore di connessione';
            setStatus(setDashboard, 'error', err);
            setStatus(setSites, 'error', err);
        }
    }, [dashboard.updatedAt, dashboard.status]); // Depend on status to allow retries? Actually simpler to just allow calls.

    // Track in-flight requests to prevent duplicates
    const fetchingSites = useRef(new Set());

    const getSiteReport = useCallback(async (siteId, force = false) => {
        const id = Number(siteId);
        if (!id || isNaN(id)) {
            console.error('[DataContext] Invalid siteId:', siteId);
            return;
        }

        // Prevent duplicate fetches for the same ID
        if (fetchingSites.current.has(id)) {
            console.log(`[DataContext] Request for site ${id} already in progress. Skipping.`);
            return;
        }

        fetchingSites.current.add(id);

        setSiteReports(prev => {
            const current = prev[id] || { data: null, status: 'idle' };
            // Optimistic update: unique request guaranteed by ref
            const nextStatus = current.data ? 'refreshing' : 'loading';
            return { ...prev, [id]: { ...current, status: nextStatus } };
        });

        try {
            console.log(`[DataContext] Fetching report for site ${id}...`);
            const res = await analyticsAPI.getSiteReport(id);

            setSiteReports(prev => ({
                ...prev,
                [id]: {
                    data: res.data,
                    status: 'ready',
                    error: null,
                    updatedAt: new Date()
                }
            }));
        } catch (error) {
            console.error(`[DataContext] Error fetching site ${id}:`, error);
            setSiteReports(prev => ({
                ...prev,
                [id]: {
                    ...prev[id],
                    status: 'error',
                    error: error.message
                }
            }));
        } finally {
            fetchingSites.current.delete(id);
        }
    }, []);

    // ─── INITIALIZATION ──────────────────────────────────────────────────

    // Optional: Auto-load dashboard on mount if user is owner
    useEffect(() => {
        if (user?.role === 'owner' && dashboard.status === 'idle') {
            refreshDashboard();
        }
    }, [user, dashboard.status, refreshDashboard]);


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
