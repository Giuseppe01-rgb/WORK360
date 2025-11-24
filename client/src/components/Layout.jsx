import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Users,
    Building2,
    FileText,
    LogOut,
    Menu,
    X,
    BarChart3,
    Package,
    PenTool,
    HardHat,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Settings,
    Bell,
    Clock,
    Zap,
    StickyNote,
    Camera,
    FileCheck
} from 'lucide-react';

export default function Layout({ children, title }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isWorkerFunctionsOpen, setIsWorkerFunctionsOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Owner menu with collapsible submenu
    const ownerLinks = [
        { path: '/owner', label: 'Cantieri', icon: Building2 },
        { path: '/owner/employees', label: 'Lista Operai', icon: Users },
        {
            path: '/owner/worker-functions',
            label: 'Funzioni Operaio',
            icon: HardHat,
            submenu: [
                { path: '/owner/worker-functions?tab=attendance', label: 'Timbratura', icon: Clock },
                { path: '/owner/worker-functions?tab=materials', label: 'Materiali', icon: Package },
                { path: '/owner/worker-functions?tab=daily-report', label: 'Rapporto Giornaliero', icon: FileCheck },
                { path: '/owner/worker-functions?tab=economies', label: 'Economie', icon: Zap },
                { path: '/owner/worker-functions?tab=notes', label: 'Note', icon: StickyNote },
                { path: '/owner/worker-functions?tab=photos', label: 'Foto', icon: Camera },
            ]
        },
        { path: '/owner/attendance', label: 'Presenze', icon: Users },
        { path: '/owner/suppliers', label: 'Magazzino', icon: Package },
        { path: '/owner/quotes', label: 'Preventivi e SAL', icon: FileText },
        { path: '/owner/signature', label: 'Firma Digitale', icon: PenTool },
        { path: '/owner/analytics', label: 'Analytics', icon: BarChart3 },
        { path: '/owner/settings', label: 'Dati Azienda', icon: Settings },
    ];

    // Worker menu with all tabs as individual items
    const workerLinks = [
        { path: '/worker?tab=attendance', label: 'Timbratura', icon: Clock },
        { path: '/worker?tab=materials', label: 'Materiali', icon: Package },
        { path: '/worker?tab=daily-report', label: 'Rapporto Giornaliero', icon: FileCheck },
        { path: '/worker?tab=economies', label: 'Economie', icon: Zap },
        { path: '/worker?tab=notes', label: 'Note', icon: StickyNote },
        { path: '/worker?tab=photos', label: 'Foto', icon: Camera },
    ];

    const links = user?.role === 'owner' ? ownerLinks : workerLinks;

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 fixed h-full z-30 transition-all duration-300 shadow-sm">
                {/* Brand */}
                <div className="h-20 flex items-center px-8 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <img
                            src="/assets/app-logo.png?v=2"
                            alt="WORK360"
                            className="w-12 h-12 object-contain"
                        />
                        <div className="flex flex-col leading-none">
                            <span className="text-xl font-black tracking-tight text-slate-900">WORK360</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enterprise</span>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-1.5">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = location.pathname === link.path ||
                            (link.submenu && link.submenu.some(sub => location.pathname + location.search === sub.path));

                        // If it has submenu (Funzioni Operaio)
                        if (link.submenu) {
                            return (
                                <div key={link.path}>
                                    <button
                                        onClick={() => setIsWorkerFunctionsOpen(!isWorkerFunctionsOpen)}
                                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 group ${isActive
                                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 translate-x-1'
                                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`} />
                                        {link.label}
                                        {isWorkerFunctionsOpen ?
                                            <ChevronUp className="w-4 h-4 ml-auto" /> :
                                            <ChevronDown className="w-4 h-4 ml-auto" />
                                        }
                                    </button>
                                    {isWorkerFunctionsOpen && (
                                        <div className="ml-4 mt-1.5 space-y-1">
                                            {link.submenu.map((sublink) => {
                                                const SubIcon = sublink.icon;
                                                const isSubActive = location.pathname + location.search === sublink.path;
                                                return (
                                                    <Link
                                                        key={sublink.path}
                                                        to={sublink.path}
                                                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isSubActive
                                                            ? 'bg-slate-100 text-slate-900'
                                                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        <SubIcon className="w-4 h-4" />
                                                        {sublink.label}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // Regular menu item
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 group ${isActive
                                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 translate-x-1'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`} />
                                {link.label}
                                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-slate-400" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile (Bottom Sidebar) */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3 mb-4 p-2 rounded-xl hover:bg-white transition-colors border border-transparent hover:border-slate-200 cursor-pointer group">
                        <div className="w-10 h-10 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center text-slate-700 font-bold shadow-sm group-hover:border-slate-900 transition-colors">
                            {user?.firstName?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                {user?.firstName} {user?.lastName}
                            </p>
                            <p className="text-xs text-slate-500 truncate capitalize">
                                {user?.role === 'owner' ? 'Amministratore' : 'Collaboratore'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-slate-200 hover:border-red-100"
                    >
                        <LogOut className="w-4 h-4" />
                        Disconnetti
                    </button>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col md:pl-72 min-h-screen transition-all duration-300">
                {/* Mobile Header */}
                <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-40 px-4 h-16 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <img
                            src="/assets/app-logo.png?v=2"
                            alt="WORK360"
                            className="w-8 h-8 object-contain"
                        />
                        <span className="text-lg font-bold text-slate-900">WORK360</span>
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </header>

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 z-50 bg-white animate-in fade-in duration-200">
                        <div className="flex flex-col h-full p-4">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                                        <Building2 className="w-6 h-6 text-white" />
                                    </div>
                                    <span className="text-xl font-black text-slate-900">WORK360</span>
                                </div>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2 text-slate-400 hover:text-slate-900 bg-slate-100 rounded-full"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <nav className="flex-1 space-y-2 overflow-y-auto">
                                {links.map((link) => {
                                    const Icon = link.icon;
                                    const isActive = location.pathname === link.path ||
                                        (link.submenu && link.submenu.some(sub => location.pathname + location.search === sub.path));

                                    // If it has submenu (Funzioni Operaio)
                                    if (link.submenu) {
                                        return (
                                            <div key={link.path}>
                                                <button
                                                    onClick={() => setIsWorkerFunctionsOpen(!isWorkerFunctionsOpen)}
                                                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-base font-bold transition-all ${isActive
                                                        ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20'
                                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                                    {link.label}
                                                    {isWorkerFunctionsOpen ?
                                                        <ChevronUp className="w-5 h-5 ml-auto" /> :
                                                        <ChevronDown className="w-5 h-5 ml-auto" />
                                                    }
                                                </button>
                                                {isWorkerFunctionsOpen && (
                                                    <div className="ml-6 mt-2 space-y-1">
                                                        {link.submenu.map((sublink) => {
                                                            const SubIcon = sublink.icon;
                                                            const isSubActive = location.pathname + location.search === sublink.path;
                                                            return (
                                                                <Link
                                                                    key={sublink.path}
                                                                    to={sublink.path}
                                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isSubActive
                                                                        ? 'bg-slate-100 text-slate-900'
                                                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                                                        }`}
                                                                >
                                                                    <SubIcon className="w-5 h-5" />
                                                                    {sublink.label}
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    // Regular menu item
                                    return (
                                        <Link
                                            key={link.path}
                                            to={link.path}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={`flex items-center gap-4 px-4 py-4 rounded-2xl text-base font-bold transition-all ${isActive
                                                ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20'
                                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                                }`}
                                        >
                                            <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                            {link.label}
                                            {isActive && <ChevronRight className="w-5 h-5 ml-auto text-slate-500" />}
                                        </Link>
                                    );
                                })}
                            </nav>
                            <div className="mt-auto pt-6 border-t border-slate-100">
                                <div className="flex items-center gap-3 mb-6 px-2">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-900 font-bold border-2 border-white shadow-sm">
                                        {user?.firstName?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-lg">{user?.firstName} {user?.lastName}</p>
                                        <p className="text-sm text-slate-500 capitalize">{user?.role}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center justify-center gap-2 w-full py-4 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-600/20 transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Esci dall'applicazione
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <main className="flex-1 p-4 sm:p-8 lg:p-10 overflow-x-hidden bg-slate-50">
                    {/* Top Bar (Desktop only - Contextual) */}
                    <div className="hidden md:flex items-center justify-between mb-10">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
                            <p className="text-sm text-slate-500 mt-1 font-medium">Benvenuto in WORK360</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Cerca..."
                                    className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 w-64 transition-all"
                                />
                                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                            <button className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 rounded-full transition-all relative shadow-sm">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                            </button>
                            <button className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 rounded-full transition-all shadow-sm">
                                <Settings className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Mobile Title */}
                    <div className="md:hidden mb-6 flex items-center justify-between">
                        <h1 className="text-2xl font-black text-slate-900">{title}</h1>
                        <button className="p-2 text-slate-400 hover:text-slate-900 bg-white rounded-full shadow-sm border border-slate-100">
                            <Bell className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
