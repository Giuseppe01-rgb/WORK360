import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
    TrendingUp,
    TrendingDown,
    Clock,
    ArrowUpRight,
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
    .main-card-box-border {
        position: relative;
        border-radius: 1.25rem;
        padding: 1.5px;
        background: #383857;
    }
    .main-card-box-inner {
        border-radius: calc(1.25rem - 1.5px);
        background: #202042;
        padding: 1.25rem 1.25rem;
    }
    @media (min-width: 640px) {
        .main-card-box-border {
            border-radius: 1.5rem;
        }
        .main-card-box-inner {
            border-radius: calc(1.5rem - 1.5px);
            padding: 1.75rem 1.75rem;
        }
    }
    .main-card-progress-track {
        width: 100%;
        height: 8px;
        border-radius: 4px;
        background: rgba(255,255,255,0.08);
        overflow: hidden;
    }
    @media (min-width: 640px) {
        .main-card-progress-track {
            height: 10px;
            border-radius: 5px;
        }
    }
    .main-card-progress-fill {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #35316C, #12D2EB);
        transition: width 1s ease-out;
    }
    .metric-box-green {
        border: 2px solid #B7FCB0;
        border-radius: 1.25rem;
        padding: 0.8rem 1rem;
        background: #202042;
        flex: 1;
        min-width: 0;
    }
    .metric-box-red {
        border: 2px solid #F68A8C;
        border-radius: 1.25rem;
        padding: 0.8rem 1rem;
        background: #202042;
        flex: 1;
        min-width: 0;
    }
    @media (min-width: 640px) {
        .metric-box-green, .metric-box-red {
            border-width: 2.5px;
            border-radius: 1.5rem;
            padding: 1.25rem 1.5rem;
        }
    }
    @media (min-width: 640px) {
        .metric-box-green, .metric-box-red {
            border-width: 2px;
            border-radius: 1rem;
            padding: 1rem 1.2rem;
        }
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

            <div className="max-w-md mx-auto pb-12 w-full font-['TASA_Orbiter',sans-serif]">

                {/* Header for Mobile (if needed, otherwise relying on Layout) */}
                <div className="md:hidden flex items-center justify-between mb-8 px-2">
                    {/* The burger is managed by Layout in mobile view, but you asked to include an icon if needed. However Layout handles opening the menu. Let's just add padding. */}
                </div>

                {/* Welcome Section */}
                <div className="mb-8 px-5">
                    <h1 className="text-[32px] font-extrabold leading-[40px] tracking-tight text-[#15161E]">
                        Benvenuto, <span className="text-[#5762FF]">{user?.firstName || 'Boss'}</span>.
                    </h1>
                    <p className="text-[#555777] text-[18px] leading-[24px] mt-2 font-normal">
                        Ecco la panoramica in tempo reale<br />della tua azienda.
                    </p>
                    <p className="text-[#888AAA] text-[12px] font-semibold leading-[16px] mt-4 max-w-[90%]">
                        Ricorda, più sarai preciso nell'inserimento dei dati,<br />più il dato sarà realistico.
                    </p>
                </div>

                {/* Main Action Area */}
                <div className="flex flex-col gap-6 px-5 mb-10">
                    {/* High Efficiency Card */}
                    <FlipCard
                        className="w-full"
                        backContent={insights.status || 'Dati in caricamento...'}
                        showDisclaimer
                    >
                        <div className="w-full bg-[#2A2B3C] rounded-[32px] p-6 flex flex-col items-center gap-6 outline outline-2 outline-[#9EA5FF] -outline-offset-2 overflow-hidden shadow-lg relative">
                            {/* Header: Label + LIVE badge */}
                            <div className="w-full flex justify-between items-center">
                                <h3 className="text-[#E5E7FF] text-[20px] font-extrabold uppercase leading-[28px] tracking-tight">
                                    {qStatus.label || 'ALTA EFFICIENZA'}
                                </h3>
                                <div className="bg-[#CEFDDA] px-3 py-1 rounded-[16px] outline outline-2 outline-[#6DF881] -outline-offset-2 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-[#6DF881] rounded-full flex items-center justify-center p-[1px]">
                                        <div className="w-full h-full bg-[#138624] rounded-full animate-pulse" />
                                    </div>
                                    <span className="text-[#138624] text-[12px] font-semibold uppercase leading-[16px]">LIVE</span>
                                </div>
                            </div>

                            {/* Margine Aziendale section */}
                            <div className="w-full bg-[#3F415A] rounded-[32px] py-5 flex flex-col items-center gap-2 outline outline-2 outline-[#555777] -outline-offset-2">
                                <p className="text-white text-[16px] font-normal uppercase leading-[20px]">MARGINE AZIENDALE</p>
                                <p className="text-[#CEFDDA] text-[40px] font-bold leading-[44px]">
                                    {growthPercent > 0 ? '+' : ''}{growthPercent.toFixed(1)}%
                                </p>
                                <p className="text-[#E5E7FF] text-[9px] font-semibold uppercase leading-[16px]">VS TRIMESTRE SCORSO</p>
                            </div>

                            {/* Progress bar info */}
                            <div className="w-full flex flex-col gap-2">
                                <div className="flex justify-between w-full px-2">
                                    <span className="text-[#9EA5FF] text-[12px] font-semibold uppercase leading-[16px]">Rischio</span>
                                    <span className="text-[#9EA5FF] text-[12px] font-semibold uppercase leading-[16px]">Salute</span>
                                    <span className="text-[#9EA5FF] text-[12px] font-semibold uppercase leading-[16px]">Crescita</span>
                                </div>
                                <div className="w-full h-[11px] bg-[#3F415A] rounded-[16px] overflow-hidden">
                                    <div
                                        className="h-full bg-[#6DF881] rounded-[16px] transition-all duration-1000"
                                        style={{ width: `${Math.min(Math.max(growthPercent, 10), 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Stats Split: Margine and Costi */}
                            <div className="w-full flex gap-2">
                                <div className="flex-1 bg-[#3F415A] rounded-[32px] py-5 px-2 flex flex-col items-center justify-center gap-2 outline outline-2 outline-[#CEFDDA] -outline-offset-2 text-center">
                                    <p className="text-[#E5E7FF] text-[12px] font-semibold uppercase leading-[16px]">MARGINE TOTALE</p>
                                    <p className="text-[#CEFDDA] text-[24px] tracking-tight font-bold leading-[30px] whitespace-nowrap">
                                        € {marginValue.toLocaleString('it-IT')}
                                    </p>
                                    <p className="text-[#E5E7FF] text-[9px] font-semibold uppercase leading-[16px]">SU FATTURATO</p>
                                </div>
                                <div className="flex-1 bg-[#3F415A] rounded-[32px] py-5 px-2 flex flex-col items-center justify-center gap-2 outline outline-2 outline-[#FDCECE] -outline-offset-2 text-center">
                                    <p className="text-[#E5E7FF] text-[12px] font-semibold uppercase leading-[16px]">COSTI TOTALI</p>
                                    <p className="text-[#FDCECE] text-[24px] tracking-tight font-bold leading-[30px] whitespace-nowrap">
                                        € {(dashData?.companyCosts?.total || 0).toLocaleString('it-IT')}
                                    </p>
                                    <p className="text-[#E5E7FF] text-[9px] font-semibold uppercase leading-[16px]">SU FATTURATO</p>
                                </div>
                            </div>

                            {/* Footer text */}
                            <p className="text-center text-[12px] leading-[16px] mt-2">
                                <span className="text-[#F0F0F4] font-semibold">{activeSitesCount} Cantieri attivi </span>
                                <span className="text-[#888AAA] font-semibold">contribuiscono a questo dato<br />in tempo reale</span>
                            </p>
                        </div>
                    </FlipCard>

                    {/* Secondary Row: Ore/Operai */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-[32px] p-4 py-6 flex flex-col items-center justify-center gap-2 outline outline-2 outline-[#E5E7FF] -outline-offset-2">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[#888AAA] text-[12px] font-semibold uppercase leading-[16px]">ORE MENSILI</span>
                                <div className="w-5 h-5 border-2 border-[#5762FF] rounded-full flex items-center justify-center relative">
                                    <div className="w-1 h-2 border-r-2 border-b-2 border-[#5762FF] absolute -mt-1 -ml-1"></div>
                                </div>
                            </div>
                            <p className="text-[#15161E] text-[28px] font-bold leading-[36px]">
                                {Math.round(monthlyHours)}
                            </p>
                        </div>
                        <div className="bg-white rounded-[32px] p-4 py-6 flex flex-col items-center justify-center gap-2 outline outline-2 outline-[#E5E7FF] -outline-offset-2">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[#888AAA] text-[12px] font-semibold uppercase leading-[16px]">OPERAI ATTIVI</span>
                                <Users className="w-5 h-5 text-[#5762FF]" />
                            </div>
                            <p className="text-[#15161E] text-[28px] font-bold leading-[36px]">
                                {totalWorkers}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Focus Performance Cantieri */}
                {(sitePerformance.top || sitePerformance.worst) && (
                    <div className="px-5 mb-10 w-full flex flex-col gap-6">
                        <h3 className="text-center text-black text-[20px] font-extrabold uppercase leading-[28px]">
                            FOCUS PERFORMANCE CANTIERI
                        </h3>
                        <div className="flex flex-col gap-4">
                            {sitePerformance.top && (
                                <FlipCard backContent={insights.sites}>
                                    <div className="bg-white rounded-[32px] p-5 flex flex-col gap-4 outline outline-2 outline-[#CEFDDA] -outline-offset-2 pr-6">
                                        <div className="self-start bg-[#CEFDDA] px-3 py-1.5 rounded-[32px] flex items-center gap-2">
                                            <span className="text-[#138624] text-[9px] font-semibold uppercase leading-[16px]">PIÙ REDDITIZIO</span>
                                            <div className="flex gap-[2px]">
                                                <div className="w-1.5 h-1.5 border border-[#138624]"></div>
                                                <div className="w-1.5 h-1.5 border border-[#138624]"></div>
                                            </div>
                                        </div>
                                        <h4 className="text-[#15161E] text-[20px] font-extrabold uppercase leading-[28px] tracking-tight">
                                            {sitePerformance.top.name}
                                        </h4>
                                        <div className="flex gap-10 mt-2">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[#888AAA] text-[9px] font-semibold uppercase leading-[16px]">MARGINE</span>
                                                <span className="text-black text-[14px] font-semibold leading-[18px]">
                                                    € {sitePerformance.top.margin.toLocaleString('it-IT')}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[#888AAA] text-[9px] font-semibold uppercase leading-[16px]">COSTO/RICAVO</span>
                                                <span className="text-black text-[14px] font-semibold leading-[18px]">
                                                    {sitePerformance.top.costVsRevenue}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </FlipCard>
                            )}

                            {sitePerformance.worst && (
                                <FlipCard backContent={insights.labor}>
                                    <div className="bg-white rounded-[32px] p-5 flex flex-col gap-4 outline outline-2 outline-[#FDCECE] -outline-offset-2 pr-6">
                                        <div className="self-start bg-[#FDCECE] px-3 py-1.5 rounded-[32px] flex items-center gap-2">
                                            <span className="text-[#861313] text-[9px] font-semibold uppercase leading-[16px]">MENO REDDITIZIO</span>
                                            <div className="flex gap-[2px]">
                                                <div className="w-1.5 h-1.5 border border-[#861313]"></div>
                                                <div className="w-1.5 h-1.5 border border-[#861313]"></div>
                                            </div>
                                        </div>
                                        <h4 className="text-[#15161E] text-[20px] font-extrabold uppercase leading-[28px] tracking-tight">
                                            {sitePerformance.worst.name}
                                        </h4>
                                        <div className="flex gap-10 mt-2">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[#888AAA] text-[9px] font-semibold uppercase leading-[16px]">MARGINE</span>
                                                <span className="text-black text-[14px] font-semibold leading-[18px]">
                                                    € {sitePerformance.worst.margin.toLocaleString('it-IT')}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[#888AAA] text-[9px] font-semibold uppercase leading-[16px]">COSTO/RICAVO</span>
                                                <span className="text-black text-[14px] font-semibold leading-[18px]">
                                                    {sitePerformance.worst.costVsRevenue}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </FlipCard>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </Layout>
    );
}
