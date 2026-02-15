import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
    TrendingUp,
    TrendingDown,
    Clock,
    ArrowUpRight,
    ArrowRight,
    Calendar,
    Users,
    Award,
    AlertTriangle,
    Building2,
    RefreshCw
} from 'lucide-react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
// Niente fetch diretti qui: usiamo DataContext per dedupe + rate limit handling.

// ─── CSS for card transitions ────────────────────────────────────────
const FLIP_STYLES = `
    .hyphens-auto { hyphens: auto; -webkit-hyphens: auto; }
    .card-face {
        transition: opacity 0.5s ease, visibility 0.5s ease;
    }
    .card-face-hidden {
        opacity: 0;
        visibility: hidden;
    }
    .card-face-visible {
        opacity: 1;
        visibility: visible;
    }
`;

// ─── Status Info (mirrors backend thresholds) ────────────────────────
const getStatusInfo = (val) => {
    if (val >= 2.5) return { label: 'ALTA EFFICIENZA', color: 'text-indigo-400', bg: 'bg-indigo-400', shadow: 'shadow-[0_0_20px_rgba(129,140,248,0.4)]' };
    if (val >= 1.5) return { label: 'AZIENDA SANA', color: 'text-green-500', bg: 'bg-green-500', shadow: 'shadow-[0_0_20px_rgba(34,197,94,0.4)]' };
    if (val >= 0.5) return { label: 'STABILE', color: 'text-yellow-500', bg: 'bg-yellow-500', shadow: 'shadow-[0_0_20px_rgba(234,179,8,0.4)]' };
    return { label: 'CRITICITÀ', color: 'text-red-500', bg: 'bg-red-500', shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.4)]' };
};

// ─── N.B. Disclaimer for flip card backs ─────────────────────────────
const FLIP_DISCLAIMER = 'N.B.: Se utilizzi l\'app da poco o sei all\'inizio, probabilmente il feed sarà di alta efficienza, ma non sarà realistico, poiché si basa su pochi dati disponibili. Col tempo l\'app raccoglierà maggiori dati, dando un risultato sempre più vero.';

// ─── FlipCard Component (opacity-based, no 3D transforms) ───────────
const FlipCard = ({ children, backContent, className = '', disabled = false, showDisclaimer = false }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    if (disabled || !backContent) return <div className={className}>{children}</div>;

    return (
        <div
            className={`cursor-pointer ${className}`}
            onClick={() => setIsFlipped(!isFlipped)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsFlipped(!isFlipped); }}
            role="button"
            tabIndex={0}
            style={{ position: 'relative' }}
        >
            {/* Front Face — always in flow to maintain container height */}
            <div
                className="card-face"
                style={{ opacity: isFlipped ? 0 : 1, visibility: isFlipped ? 'hidden' : 'visible', transition: 'opacity 0.4s ease, visibility 0.4s ease' }}
            >
                {children}
            </div>

            {/* Back Face — always absolutely positioned on top */}
            <div
                className="card-face"
                style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 2,
                    opacity: isFlipped ? 1 : 0,
                    visibility: isFlipped ? 'visible' : 'hidden',
                    transition: 'opacity 0.4s ease, visibility 0.4s ease'
                }}
            >
                <div className="bg-slate-100 rounded-[2.5rem] p-8 h-full flex flex-col justify-start overflow-y-auto border border-slate-200">
                    <p className="text-sm leading-relaxed text-slate-700 hyphens-auto" style={{ textAlign: 'left' }}>
                        {backContent}
                    </p>
                    {showDisclaimer && (
                        <p className="text-[11px] leading-relaxed text-slate-500 mt-4 pt-4 border-t border-slate-200 italic">
                            {FLIP_DISCLAIMER}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

FlipCard.propTypes = {
    children: PropTypes.node.isRequired,
    backContent: PropTypes.string,
    className: PropTypes.string,
    disabled: PropTypes.bool,
    showDisclaimer: PropTypes.bool
};

// ─── MetricCard Component ────────────────────────────────────────────
const MetricCard = ({ title, value, unit, trend, icon: Icon, colorClass }) => (
    <div className="bg-white/80 backdrop-blur-md p-5 rounded-[2rem] shadow-sm border border-slate-100 h-full flex flex-col justify-between">
        <div className="flex justify-between items-start mb-3">
            <div className={`p-2 rounded-xl bg-slate-50 ${colorClass}`}>
                <Icon className="w-5 h-5" />
            </div>
            {trend !== undefined && trend !== null && (
                <span className={`text-xs font-bold flex items-center gap-0.5 ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    {trend > 0 ? '+' : ''}{trend}%
                    {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                </span>
            )}
        </div>
        <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
                {typeof value === 'number' ? value.toLocaleString('it-IT') : value}
                <span className="text-sm font-medium text-slate-400 ml-1">{unit}</span>
            </p>
        </div>
    </div>
);

MetricCard.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    unit: PropTypes.string,
    trend: PropTypes.number,
    icon: PropTypes.elementType.isRequired,
    colorClass: PropTypes.string
};

// ─── SiteCard Component ──────────────────────────────────────────────
const SiteCard = ({ site, type, backContent }) => {
    const isTop = type === 'top';
    return (
        <FlipCard backContent={backContent}>
            <div className={`p-6 rounded-[2.5rem] border ${isTop ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'} relative overflow-hidden h-full`}>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter ${isTop ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {isTop ? 'Più Redditizio' : 'Meno Redditizio'}
                        </span>
                        <h4 className="font-bold text-lg text-slate-900 mt-2">{site.name}</h4>
                    </div>
                    <div className={`p-3 rounded-2xl ${isTop ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {isTop ? <Award className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <p className="text-slate-500 text-xs font-semibold">Margine</p>
                        <p className={`text-xl font-bold ${site.margin >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                            {site.margin.toLocaleString('it-IT')}€
                        </p>
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs font-semibold">Costo/Ricavo</p>
                        <p className="text-xl font-bold text-slate-900">{site.costVsRevenue}%</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${isTop ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(site.costVsRevenue, 100)}%` }}
                        />
                    </div>
                </div>
            </div>
        </FlipCard>
    );
};

SiteCard.propTypes = {
    site: PropTypes.shape({
        name: PropTypes.string.isRequired,
        margin: PropTypes.number.isRequired,
        costVsRevenue: PropTypes.number.isRequired
    }).isRequired,
    type: PropTypes.oneOf(['top', 'worst']).isRequired,
    backContent: PropTypes.string
};

// ─── Main Home Component ─────────────────────────────────────────────

export default function Home() {
    const { user } = useAuth();
    const { dashboard, sites, siteReports, getSiteReport, refreshDashboard } = useData();

    // Precarica i report dei cantieri attivi per poter calcolare Top/Worst senza fare fetch diretti.
    useEffect(() => {
        if (sites.status !== 'ready' && sites.status !== 'refreshing') return;
        if (!sites.data || sites.data.length === 0) return;

        const activeSites = sites.data.filter(s => s.status === 'active' && Number.parseFloat(s.contractValue) > 0);
        for (const s of activeSites) {
            const id = String(s.id);
            const cached = siteReports?.[id];
            if (!cached || cached.status === 'idle') {
                getSiteReport(id);
            }
        }
    }, [sites.status, sites.data, siteReports, getSiteReport]);

    // Top/Worst calcolati da cache (se un report manca, lo skippo finché non arriva)
    const sitePerformance = useMemo(() => {
        if (!sites.data || sites.data.length === 0) return { top: null, worst: null };

        const activeSites = sites.data.filter(s => s.status === 'active' && Number.parseFloat(s.contractValue) > 0);
        const computed = [];

        for (const s of activeSites) {
            const id = String(s.id);
            const rep = siteReports?.[id]?.data;
            if (!rep) continue;
            const contractValue = Number.parseFloat(s.contractValue) || 0;
            const totalCost = rep?.siteCost?.total || 0;
            const margin = contractValue - totalCost;
            const costVsRevenue = contractValue > 0 ? Math.round((totalCost / contractValue) * 100) : 0;
            computed.push({ name: s.name, margin: Math.round(margin), costVsRevenue });
        }

        if (computed.length === 0) return { top: null, worst: null };
        const sorted = [...computed].sort((a, b) => b.margin - a.margin);
        return {
            top: sorted[0],
            worst: sorted.length > 1 ? sorted[sorted.length - 1] : null
        };
    }, [sites.data, siteReports]);


    // Loading State: Only show spinner if NO data at all (first load)
    // If we have cached data, show it even during refresh
    const hasData = dashboard.data || sites.data?.length > 0;
    const isLoading = dashboard.status === 'loading' && !hasData;
    const isRefreshing = dashboard.status === 'refreshing' || sites.status === 'refreshing';

    useEffect(() => {
        // Initial load if idle (though Context might trigger it automatically)
        if (dashboard.status === 'idle') {
            refreshDashboard();
        }

        // Auto-refresh every 5 minutes
        const interval = setInterval(() => refreshDashboard(), 300000);
        return () => clearInterval(interval);
    }, [refreshDashboard, dashboard.status]);

    // Only show loading spinner if there's NO data at all (first load)
    if (isLoading) {
        return (
            <Layout title="Home" hideHeader>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                </div>
            </Layout>
        );
    }

    // Safely access data - defaults are handled, but we expect data to be present if status is ready/refreshing
    const dashData = dashboard.data || {};

    // Derive values from real API data
    const growthPercent = dashData?.companyMargin?.marginGrowthPercent || 0;
    const qStatus = getStatusInfo(growthPercent);
    const marginValue = dashData?.companyMargin?.marginValue || 0;
    const monthlyHours = dashData?.monthlyHours || 0;
    const totalWorkers = dashData?.totalEmployees || 0;
    const activeSitesCount = dashData?.activeSites || 0;
    const laborPercent = dashData?.companyCostIncidence?.laborIncidencePercent || 0;
    const insights = dashData?.homeInsights?.insights || {};

    // Format date in Italian
    const today = new Date();
    const dateStr = today.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).toUpperCase();

    return (
        <Layout title="Home" hideHeader>
            <style>{FLIP_STYLES}</style>

            <div className="max-w-5xl mx-auto pb-12">
                {/* Welcome Section */}
                <div className="mb-10 px-2 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                            Benvenuto, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{user?.firstName || 'Boss'}</span>
                        </h1>
                        <p className="text-slate-500 mt-1 font-medium">Ecco la panoramica in tempo reale per la tua azienda.</p>
                        <p className="text-slate-400 text-xs mt-1 italic">Ricorda, più sarai preciso nell&apos;inserimento dei dati, più il dato sarà realistico.</p>
                        <p className="text-slate-400 text-xs mt-1 font-medium">👆 Tocca le card per maggiori dettagli.</p>
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                        <button
                            onClick={() => refreshDashboard(true)}
                            disabled={isRefreshing}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all disabled:opacity-50"
                            title="Aggiorna dati"
                            aria-label="Aggiorna dati"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <span className="text-xs font-bold text-slate-400 bg-white border border-slate-100 px-4 py-2 rounded-full shadow-sm">
                            {dateStr}
                        </span>
                    </div>
                </div>

                {/* Main Action Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                    <div className="lg:col-span-2 h-full">
                        <FlipCard
                            className="h-full"
                            backContent={insights.status || 'Dati in caricamento...'}
                            showDisclaimer
                        >
                            <div className="bg-slate-900 rounded-[3rem] p-10 shadow-xl relative overflow-hidden h-full flex flex-col justify-between">
                                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

                                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-4">
                                    <div className="flex flex-col gap-1 min-w-0 flex-shrink">
                                        <h3 className="text-white/40 font-bold text-xs uppercase tracking-widest">Growth Performance</h3>
                                        <p className={`text-3xl sm:text-4xl font-black tracking-tighter ${qStatus.color}`}>
                                            {qStatus.label}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-white/10 text-right flex-shrink-0">
                                        <p className="text-[10px] text-white/40 font-bold uppercase mb-1">Margine Azienda</p>
                                        <p className="text-xl sm:text-2xl font-black text-white">{growthPercent >= 0 ? '+' : ''}{growthPercent.toFixed(1)}%</p>
                                    </div>
                                </div>

                                {/* Linear Status Graph */}
                                <div className="my-10 relative">
                                    <div className="flex justify-between text-[10px] font-bold text-white/20 uppercase tracking-widest mb-4">
                                        <span>Rischio</span>
                                        <span>Soglia Salute</span>
                                        <span>Crescita</span>
                                    </div>
                                    <div className="h-6 bg-white/5 rounded-full p-1 relative overflow-hidden border border-white/5">
                                        {/* Reference lines (Scale 0-4%) */}
                                        <div className="absolute left-[12.5%] top-0 bottom-0 w-px bg-white/10 z-10" />
                                        <div className="absolute left-[37.5%] top-0 bottom-0 w-px bg-white/10 z-10" />
                                        <div className="absolute left-[62.5%] top-0 bottom-0 w-px bg-white/10 z-10" />

                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${qStatus.bg} ${qStatus.shadow}`}
                                            style={{ width: `${Math.min(Math.max((growthPercent / 4) * 100, 0), 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-start mt-4">
                                        <div className="text-white/40 max-w-[200px]">
                                            <p className="text-xs font-bold leading-tight">Analisi Trend Lineare</p>
                                            <p className="text-[10px] opacity-60 mt-1">{activeSitesCount} cantieri attivi contribuiscono al dato.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${qStatus.bg}`} />
                                            <span className="text-[10px] text-white font-bold tracking-widest">LIVE DATA FEED</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex gap-10">
                                        <div>
                                            <p className="text-white/20 text-[10px] font-bold uppercase mb-1">Margine Reale</p>
                                            <p className="text-2xl font-black text-white">€{marginValue.toLocaleString('it-IT')}</p>
                                        </div>
                                        <div>
                                            <p className="text-white/20 text-[10px] font-bold uppercase mb-1">Manodopera</p>
                                            <p className={`text-2xl font-black ${laborPercent > 70 ? 'text-red-400' : laborPercent > 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                                                {laborPercent.toFixed(0)}%
                                            </p>
                                        </div>
                                    </div>
                                    <div className="hidden md:flex flex-col items-end">
                                        <p className="text-white/20 text-[10px] font-bold uppercase">Info Dettagliate</p>
                                        <div className="flex items-center gap-1 text-white/60 text-[10px] font-bold mt-1">
                                            <span>CLICCA PER GIRARE</span>
                                            <ArrowRight className="w-3 h-3" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </FlipCard>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-6">
                        <MetricCard
                            title="Ore Mensili"
                            value={Math.round(monthlyHours)}
                            unit="h"
                            icon={Clock}
                            colorClass="text-blue-600 bg-blue-50"
                        />
                        <MetricCard
                            title="Operai Attivi"
                            value={totalWorkers}
                            unit="tot"
                            icon={Users}
                            colorClass="text-purple-600 bg-purple-50"
                        />
                    </div>
                </div>

                {/* Top & Worst Sites */}
                {(sitePerformance.top || sitePerformance.worst) && (
                    <>
                        <h3 className="text-xl font-bold text-slate-900 mb-6 px-2 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-slate-400" />
                            Focus Performance Cantieri
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                            {sitePerformance.top && (
                                <SiteCard
                                    site={sitePerformance.top}
                                    type="top"
                                    backContent={insights.sites}
                                />
                            )}
                            {sitePerformance.worst && (
                                <SiteCard
                                    site={sitePerformance.worst}
                                    type="worst"
                                    backContent={insights.labor}
                                />
                            )}
                        </div>
                    </>
                )}

                {/* Predictions Section */}
                <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Riepilogo Mensile</h3>
                            <p className="text-slate-500 text-sm mt-1 font-medium">
                                Dati aggiornati in tempo reale dal database aziendale.
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100">
                            <Calendar className="w-6 h-6 text-slate-400" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {/* Margin */}
                        <FlipCard backContent={insights.margin}>
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Margine Totale</span>
                                    <div className={`w-2 h-2 rounded-full ${marginValue >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                                </div>
                                <p className={`text-4xl font-black tracking-tight ${marginValue >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                                    {marginValue.toLocaleString('it-IT')}€
                                </p>
                                <div className="mt-6 p-6 rounded-[2rem] bg-slate-50 border border-slate-100 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -mr-8 -mt-8" />
                                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 mb-3">
                                        <span>Ricavo Totale</span>
                                    </div>
                                    <span className="text-xl font-black text-slate-900">
                                        {(dashData?.companyMargin?.totalContractValue || 0).toLocaleString('it-IT')}€
                                    </span>
                                </div>
                            </div>
                        </FlipCard>

                        {/* Labor Incidence */}
                        <FlipCard backContent={insights.labor}>
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Peso Manodopera</span>
                                    <div className={`w-2 h-2 rounded-full ${laborPercent <= 60 ? 'bg-green-500' : 'bg-red-500'}`} />
                                </div>
                                <p className="text-4xl font-black text-slate-900 tracking-tight">
                                    {laborPercent.toFixed(0)}%
                                </p>
                                <div className="mt-6 p-6 rounded-[2rem] bg-slate-50 border border-slate-100 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full -mr-8 -mt-8" />
                                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 mb-3">
                                        <span>Costo Totale</span>
                                    </div>
                                    <span className="text-xl font-black text-slate-900">
                                        {(dashData?.companyCosts?.total || 0).toLocaleString('it-IT')}€
                                    </span>
                                </div>
                            </div>
                        </FlipCard>

                        {/* Hours & Sites */}
                        <FlipCard backContent={insights.sites}>
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cantieri Attivi</span>
                                    <div className={`w-2 h-2 rounded-full ${activeSitesCount > 0 ? 'bg-green-500' : 'bg-slate-400'}`} />
                                </div>
                                <p className="text-4xl font-black text-slate-900 tracking-tight">
                                    {activeSitesCount}
                                </p>
                                <div className="mt-6 p-6 rounded-[2rem] bg-slate-50 border border-slate-100 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full -mr-8 -mt-8" />
                                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 mb-3">
                                        <span>Ore Questo Mese</span>
                                        <Building2 className="w-3 h-3 text-indigo-400" />
                                    </div>
                                    <span className="text-xl font-black text-slate-900">
                                        {monthlyHours.toFixed(0)}h
                                    </span>
                                </div>
                            </div>
                        </FlipCard>
                    </div>
                </div>

                <p className="text-center text-slate-400 text-xs mt-8">
                    WORK360 Analytics Engine v2.0 — Dati aggiornati automaticamente
                </p>
            </div>
        </Layout>
    );
}
