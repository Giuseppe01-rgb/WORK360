import { useState } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Award,
    AlertTriangle,
    Clock,
    ArrowUpRight,
    CheckCircle2,
    Calendar,
    Users,
    ArrowRight,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import Layout from '../../components/Layout';

// Mock Data for Demo
const MOCK_DATA = {
    ownerName: "Giuseppe",
    status: "yellow", // "green", "yellow", "red"
    marginTotal: 125000,
    marginTrendMonth: +5.2,
    marginTrendQuarter: +2.1,
    topSite: {
        name: "Cantiere Milano Centrale",
        margin: 45000,
        costVsRevenue: 22,
        daysRemaining: 15
    },
    worstSite: {
        name: "Ristrutturazione Villa Roma",
        margin: -5000,
        costVsRevenue: 88,
        daysRemaining: 30
    },
    prediction: {
        margin: { current: 75000, predicted: 185000, previous: 170000, status: 'green' },
        laborIncidence: { current: 32, predicted: 35, previous: 30, status: 'red' },
        hours: { current: 520, predicted: 1250, previous: 1200, status: 'green' }
    }
};

const FlipCard = ({ children, backContent, className = "", disabled = false }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    if (disabled || !backContent) return <div className={className}>{children}</div>;

    return (
        <div
            className={`perspective-1000 cursor-pointer ${className}`}
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <div className={`relative w-full h-full transition-transform duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                {/* Front */}
                <div className="w-full h-full backface-hidden">
                    {children}
                </div>
                {/* Back */}
                <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-slate-800 rounded-[2.5rem] p-8 text-white flex flex-col justify-start overflow-hidden">
                    <div className="text-justify text-xs leading-relaxed text-slate-200 hyphens-auto" style={{ textAlignLast: 'left' }}>
                        {backContent}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, unit, trend, icon: Icon, colorClass, backContent, noFlip = false }) => (
    <FlipCard backContent={backContent} className="h-full" disabled={noFlip}>
        <div className="bg-white/80 backdrop-blur-md p-5 rounded-[2rem] shadow-sm border border-slate-100 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start mb-3">
                <div className={`p-2 rounded-xl bg-slate-50 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                </div>
                {trend && (
                    <span className={`text-xs font-bold flex items-center gap-0.5 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trend > 0 ? '+' : ''}{trend}%
                        {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
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
    </FlipCard>
);

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
                            style={{ width: `${site.costVsRevenue}%` }}
                        />
                    </div>
                    <span className="text-xs font-bold text-slate-500 italic">
                        {site.daysRemaining} gg alla fine
                    </span>
                </div>
            </div>
        </FlipCard>
    );
};

export default function HomeDemo() {
    const [data] = useState(MOCK_DATA);

    // Calculate status based on user thresholds (Quarterly Growth)
    // Red: < 0.5% (Criticità), Yellow: 0.5% - 1.5% (Stabile), Green: 1.5% - 2.5% (Sana), Indigo: > 2.5% (Efficienza)
    const getStatusInfo = (val) => {
        if (val >= 2.5) return { label: 'ALTA EFFICIENZA', color: 'text-indigo-400', bg: 'bg-indigo-400', shadow: 'shadow-[0_0_20px_rgba(129,140,248,0.4)]' };
        if (val >= 1.5) return { label: 'AZIENDA SANA', color: 'text-green-500', bg: 'bg-green-500', shadow: 'shadow-[0_0_20px_rgba(34,197,94,0.4)]' };
        if (val >= 0.5) return { label: 'STABILE', color: 'text-yellow-500', bg: 'bg-yellow-500', shadow: 'shadow-[0_0_20px_rgba(234,179,8,0.4)]' };
        return { label: 'CRITICITÀ', color: 'text-red-500', bg: 'bg-red-500', shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.4)]' };
    };

    const qStatus = getStatusInfo(data.marginTrendQuarter);

    return (
        <Layout title="Dashboard Direzionale">
            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .rotate-y-0 { transform: rotateY(0deg); }
                .hyphens-auto { hyphens: auto; -webkit-hyphens: auto; }
            `}</style>

            <div className="max-w-5xl mx-auto pb-12">
                {/* Welcome Section */}
                <div className="mb-10 px-2 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                            Benvenuto, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{data.ownerName}</span>
                        </h1>
                        <p className="text-slate-500 mt-1 font-medium">Ecco la panoramica in tempo reale per la tua azienda.</p>
                    </div>
                    <span className="hidden md:block text-xs font-bold text-slate-400 bg-white border border-slate-100 px-4 py-2 rounded-full shadow-sm">
                        VENERDÌ 13 FEBBRAIO, 2026
                    </span>
                </div>

                {/* Main Action Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                    <div className="lg:col-span-2 h-full">
                        <FlipCard
                            className="h-full"
                            backContent={`L'azienda è in salute: il trend trimestrale (+2.1%) supera la soglia di stabilità e si consolida in area "Azienda Sana". Rispetto al mese scorso (+5.2%) manteniamo un'ottima efficienza operativa. Il lieve scostamento sulla velocità di crescita è fisiologico e legato al monitoraggio dei costi fissi nel Cantiere Milano, senza alcun impatto sulla solidità finanziaria compressiva.`}
                        >
                            <div className="bg-slate-900 rounded-[3rem] p-10 shadow-xl relative overflow-hidden h-full flex flex-col justify-between">
                                {/* Clean Linear Background pattern */}
                                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

                                <div className="relative z-10 flex justify-between items-start">
                                    <div className="flex flex-col gap-1">
                                        <h3 className="text-white/40 font-bold text-xs uppercase tracking-widest">Growth Performance</h3>
                                        <p className={`text-4xl font-black tracking-tighter ${qStatus.color}`}>
                                            {qStatus.label}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-3xl border border-white/10 text-right">
                                        <p className="text-[10px] text-white/40 font-bold uppercase mb-1">Target Trimestre</p>
                                        <p className="text-2xl font-black text-white">+{data.marginTrendQuarter}%</p>
                                    </div>
                                </div>

                                {/* Linear Status Graph Simplified */}
                                <div className="my-10 relative">
                                    <div className="flex justify-between text-[10px] font-bold text-white/20 uppercase tracking-widest mb-4">
                                        <span>Rischio</span>
                                        <span>Soglia Salute</span>
                                        <span>Crescita</span>
                                    </div>
                                    <div className="h-6 bg-white/5 rounded-full p-1 relative overflow-hidden border border-white/5">
                                        {/* Reference lines (Precise Scale 0-4%) */}
                                        <div className="absolute left-[12.5%] top-0 bottom-0 w-px bg-white/10 z-10" /> {/* 0.5% point */}
                                        <div className="absolute left-[37.5%] top-0 bottom-0 w-px bg-white/10 z-10" /> {/* 1.5% point */}
                                        <div className="absolute left-[62.5%] top-0 bottom-0 w-px bg-white/10 z-10" /> {/* 2.5% point */}

                                        {/* The Progress Fill */}
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${qStatus.bg} ${qStatus.shadow}`}
                                            style={{ width: `${Math.min((data.marginTrendQuarter / 4) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-start mt-4">
                                        <div className="text-white/40 max-w-[200px]">
                                            <p className="text-xs font-bold leading-tight">Analisi Trend Lineare</p>
                                            <p className="text-[10px] opacity-60 mt-1">Stabile rispetto alla proiezione annuale del 6.5%.</p>
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
                                            <p className="text-2xl font-black text-white">€{data.marginTotal.toLocaleString('it-IT')}</p>
                                        </div>
                                        <div>
                                            <p className="text-white/20 text-[10px] font-bold uppercase mb-1">Status Mese</p>
                                            <p className="text-2xl font-black text-green-400">+{data.marginTrendMonth}%</p>
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
                            value={data.prediction.hours.current}
                            unit="h"
                            trend={+12}
                            icon={Clock}
                            colorClass="text-blue-600 bg-blue-50"
                            noFlip={true}
                        />
                        <MetricCard
                            title="Operai in Cantiere"
                            value={18}
                            unit="tot"
                            icon={Users}
                            colorClass="text-purple-600 bg-purple-50"
                            noFlip={true}
                        />
                    </div>
                </div>

                {/* Top & Worst Sites */}
                <h3 className="text-xl font-bold text-slate-900 mb-6 px-2 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-slate-400" />
                    Focus Performance Cantieri
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <SiteCard
                        site={data.topSite}
                        type="top"
                        backContent="Milano Centrale sovraperforma grazie a gestione materiali precisa e squadre ottimizzate. Il margine del 25% è eccellente (target 18%), con risparmi su acquisti per 4.000€."
                    />
                    <SiteCard
                        site={data.worstSite}
                        type="worst"
                        backContent="Villa Roma soffre perdite per demolizioni extra non a budget. L'incidenza manodopera è al +40%. Necessaria rinegoziazione dei costi extra col cliente tramite variante."
                    />
                </div>

                {/* Prediction Section */}
                <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 mb-6 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Evoluzione Mensile</h3>
                            <p className="text-slate-500 text-sm mt-1 font-medium">
                                Proiezione statistica pro-rata basata sulla produttività attuale.
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100">
                            <Calendar className="w-6 h-6 text-slate-400" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {/* Margin Prediction */}
                        <FlipCard backContent="Margine in crescita del 5% sulla proiezione lineare. Prevediamo +15.000€ vs mese precedente grazie all'uso di attrezzature proprie che abbatte i costi di noleggio esterni a budget.">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Margine Netto</span>
                                    <div className={`w-2 h-2 rounded-full ${data.prediction.margin.status === 'green' ? 'bg-green-500' : 'bg-red-500'}`} />
                                </div>
                                <p className="text-4xl font-black text-slate-900 tracking-tight">
                                    {data.prediction.margin.current.toLocaleString('it-IT')}€
                                </p>
                                <div className="mt-6 p-6 rounded-[2rem] bg-slate-50 border border-slate-100 relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -mr-8 -mt-8" />
                                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 mb-3">
                                        <span>Proiezione</span>
                                        <span className={data.prediction.margin.predicted > data.prediction.margin.previous ? 'text-green-600' : 'text-red-600'}>
                                            OTTIMO
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-xl font-black text-slate-900">{data.prediction.margin.predicted.toLocaleString('it-IT')}€</span>
                                        <span className="text-[10px] text-slate-400 font-bold">TARGET: {data.prediction.margin.previous.toLocaleString('it-IT')}€</span>
                                    </div>
                                </div>
                            </div>
                        </FlipCard>

                        {/* Labor Incidence Prediction */}
                        <FlipCard backContent="Incidenza manodopera al 32% (target 30%). Dovuto a sovrapposizione maestranze a Roma. Per rientrare, si consiglia di spostare 2 operai su cantieri a maggior margine per assorbire meglio i costi fissi.">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Peso Manodopera</span>
                                    <div className={`w-2 h-2 rounded-full ${data.prediction.laborIncidence.status === 'green' ? 'bg-green-500' : 'bg-red-500'}`} />
                                </div>
                                <p className="text-4xl font-black text-slate-900 tracking-tight">
                                    {data.prediction.laborIncidence.current}%
                                </p>
                                <div className="mt-6 p-6 rounded-[2rem] bg-slate-50 border border-slate-100 relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full -mr-8 -mt-8" />
                                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 mb-3">
                                        <span>Proiezione</span>
                                        <span className={data.prediction.laborIncidence.predicted < data.prediction.laborIncidence.previous ? 'text-green-600' : 'text-red-600'}>
                                            {data.prediction.laborIncidence.predicted < data.prediction.laborIncidence.previous ? 'STABILE' : 'CRITICO'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-xl font-black text-slate-900">{data.prediction.laborIncidence.predicted}%</span>
                                        <span className="text-[10px] text-slate-400 font-bold">LIMITE: {data.prediction.laborIncidence.previous}%</span>
                                    </div>
                                </div>
                            </div>
                        </FlipCard>

                        {/* Hours Prediction */}
                        <FlipCard backContent="Ore in linea con l'organico. Non si segnalano straordinari eccessivi, il costo orario resta basso. Per Marzo valutare inserimento squadra extra per non rallentare i SAL delle nuove commesse.">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Energia (Ore)</span>
                                    <div className={`w-2 h-2 rounded-full ${data.prediction.hours.status === 'green' ? 'bg-green-500' : 'bg-slate-400'}`} />
                                </div>
                                <p className="text-4xl font-black text-slate-900 tracking-tight">
                                    {data.prediction.hours.current.toLocaleString('it-IT')}h
                                </p>
                                <div className="mt-6 p-6 rounded-[2rem] bg-slate-50 border border-slate-100 relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full -mr-8 -mt-8" />
                                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 mb-3">
                                        <span>Trend</span>
                                        <ArrowUp className="w-3 h-3 text-indigo-400" />
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-xl font-black text-slate-900">{data.prediction.hours.predicted.toLocaleString('it-IT')}h</span>
                                        <span className="text-[10px] text-slate-400 font-bold">PREC: {data.prediction.hours.previous.toLocaleString('it-IT')}h</span>
                                    </div>
                                </div>
                            </div>
                        </FlipCard>
                    </div>
                </div>

                <p className="text-center text-slate-400 text-xs mt-8">
                    Note: I dati presentati in questa pagina sono simulati per scopi dimostrativi.<br />
                    WORK360 Analytics Engine v2.0
                </p>
            </div>
        </Layout>
    );
}
