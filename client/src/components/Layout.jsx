import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { siteAPI, reportedMaterialAPI } from '../utils/api';
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

    Clock,
    Zap,
    StickyNote,
    Camera,
    FileCheck,
    User,
    Activity,
    CalendarDays
} from 'lucide-react';
import Tutorial from './Tutorial';

export default function Layout({ children, title, hideHeader = false }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isWorkerFunctionsOpen, setIsWorkerFunctionsOpen] = useState(false);

    // Dynamic counters state
    const [activeSitesCount, setActiveSitesCount] = useState(0);
    const [pendingMaterialsCount, setPendingMaterialsCount] = useState(0);

    useEffect(() => {
        const fetchCounts = async () => {
            if (user?.role === 'owner') {
                try {
                    // Fetch sites count
                    const sitesRes = await siteAPI.getAll();
                    const active = sitesRes.data.filter(s => s.status === 'active').length;
                    setActiveSitesCount(active);

                    // Fetch pending materials count
                    const materialsRes = await reportedMaterialAPI.getAll({ stato: 'da_approvare' });
                    // Assuming the API returns an array or an object with data array
                    const pending = Array.isArray(materialsRes.data) ? materialsRes.data.length : 0;
                    setPendingMaterialsCount(pending);
                } catch (error) {
                    console.error('Error fetching sidebar counts:', error);
                }
            }
        };

        fetchCounts();

        // Optional: Set up an interval to refresh counts periodically
        const interval = setInterval(fetchCounts, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Owner menu with categories
    const ownerLinks = [
        {
            category: 'GESTIONE CANTIERI',
            items: [
                {
                    path: '/owner',
                    label: 'Cantieri',
                    icon: Building2,
                    subtitle: activeSitesCount > 0 ? `${activeSitesCount} attivi` : 'Nessun cantiere attivo'
                },
                { path: '/owner/employees', label: 'Lista Operai', icon: Users },
                {
                    path: '/owner/worker-functions',
                    label: 'Funzioni Operaio',
                    icon: HardHat,
                    submenu: [
                        { path: '/owner/worker-functions?tab=attendance', label: 'Timbratura', icon: Clock },
                        { path: '/owner/worker-functions?tab=materials', label: 'Materiali', icon: Package },
                        { path: '/owner/worker-functions?tab=daily-report', label: 'Rapporto Giornaliero', icon: FileCheck },
                        { path: '/worker/economies', label: 'Economie', icon: Zap },
                        { path: '/owner/worker-functions?tab=notes', label: 'Note', icon: StickyNote },
                        { path: '/owner/worker-functions?tab=photos', label: 'Foto', icon: Camera },
                        { path: '/owner/worker-functions?tab=absences', label: 'Permessi e Ferie', icon: CalendarDays },
                    ]
                },
                { path: '/owner/attendance', label: 'Presenze', icon: Users },
            ]
        },
        {
            category: 'LOGISTICA & MATERIALI',
            items: [
                { path: '/owner/materials', label: 'Catalogo Materiali', icon: Package },
                {
                    path: '/owner/material-approval',
                    label: 'Materiali da Approvare',
                    icon: Package,
                    badge: pendingMaterialsCount > 0 ? pendingMaterialsCount : null
                },
                { path: '/owner/suppliers', label: 'Magazzino', icon: Package },
            ]
        },
        {
            category: 'AMMINISTRAZIONE',
            items: [
                { path: '/owner/quotes', label: 'Preventivi & SAL', icon: FileText },
                { path: '/owner/signature', label: 'Firma Digitale', icon: PenTool },
                { path: '/owner/analytics', label: 'Analytics', icon: BarChart3 },
                { path: '/owner/absence-requests', label: 'Ferie e Permessi', icon: CalendarDays },
                { path: '/owner/activity-log', label: 'Riepilogo Attività', icon: Activity },
                { path: '/owner/settings', label: 'Dati Azienda', icon: Settings },
            ]
        },
        {
            category: 'ACCOUNT',
            items: [
                { path: '/profile', label: 'Profilo', icon: User },
            ]
        }
    ];

    // Worker menu (kept simple for now, but wrapped in structure for consistency)
    const workerLinks = [
        {
            category: 'MENU OPERAIO',
            items: [
                { path: '/worker?tab=attendance', label: 'Timbratura', icon: Clock },
                { path: '/worker/sites', label: 'Cantieri', icon: Building2 },
                { path: '/worker?tab=materials', label: 'Materiali', icon: Package },
                { path: '/worker?tab=daily-report', label: 'Rapporto Giornaliero', icon: FileCheck },
                { path: '/worker/economies', label: 'Economie', icon: Zap },
                { path: '/worker?tab=notes', label: 'Note', icon: StickyNote },
                { path: '/worker?tab=photos', label: 'Foto', icon: Camera },
                { path: '/worker?tab=absences', label: 'Permessi e Ferie', icon: CalendarDays },
            ]
        },
        {
            category: 'ACCOUNT',
            items: [
                { path: '/profile', label: 'Profilo', icon: User },
            ]
        }
    ];

    const menuGroups = user?.role === 'owner' ? ownerLinks : workerLinks;

    // Helper to get active state classes
    const getNavItemClasses = (isActive) => isActive
        ? 'bg-[#8B5CF6] text-white shadow-lg shadow-purple-500/30'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50';

    // Component for expandable submenu items
    const NavItemWithSubmenu = ({ link, isMobile }) => {
        const Icon = link.icon;
        const isActive = link.submenu.some(sub => location.pathname + location.search === sub.path);

        return (
            <div className="mb-2">
                <button
                    onClick={() => setIsWorkerFunctionsOpen(!isWorkerFunctionsOpen)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 group ${getNavItemClasses(isActive)}`}
                >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className={`flex-1 text-left ${isActive ? 'font-bold' : 'font-medium'}`}>{link.label}</span>
                    {isWorkerFunctionsOpen
                        ? <ChevronUp className={`w-4 h-4 ${isActive ? 'text-white/70' : 'text-slate-400'}`} />
                        : <ChevronDown className={`w-4 h-4 ${isActive ? 'text-white/70' : 'text-slate-400'}`} />
                    }
                </button>
                {isWorkerFunctionsOpen && (
                    <div className="ml-4 mt-1 pl-4 border-l border-slate-100 space-y-1">
                        {link.submenu.map((sublink) => {
                            const isSubActive = location.pathname + location.search === sublink.path;
                            return (
                                <Link
                                    key={sublink.path}
                                    to={sublink.path}
                                    onClick={() => isMobile && setIsMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${isSubActive
                                        ? 'text-[#8B5CF6] font-bold bg-purple-50'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium'
                                        }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-[#8B5CF6]' : 'bg-slate-300'}`}></span>
                                    {sublink.label}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    NavItemWithSubmenu.propTypes = {
        link: PropTypes.shape({
            icon: PropTypes.elementType.isRequired,
            label: PropTypes.string.isRequired,
            submenu: PropTypes.arrayOf(PropTypes.shape({
                path: PropTypes.string.isRequired,
                label: PropTypes.string.isRequired
            })).isRequired
        }).isRequired,
        isMobile: PropTypes.bool
    };

    // Component for regular nav links
    const NavItemLink = ({ link, isMobile }) => {
        const Icon = link.icon;
        const isActive = location.pathname === link.path;

        return (
            <Link
                to={link.path}
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 group mb-1 ${getNavItemClasses(isActive)}`}
            >
                <div className={`p-1 rounded-lg ${isActive ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-slate-200'}`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <div className="flex-1">
                    <div className={`flex items-center justify-between ${isActive ? 'font-bold' : 'font-medium'}`}>
                        {link.label}
                        {link.badge && (
                            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                {link.badge}
                            </span>
                        )}
                    </div>
                    {link.subtitle && (
                        <p className={`text-xs ${isActive ? 'text-purple-100' : 'text-slate-400'}`}>
                            {link.subtitle}
                        </p>
                    )}
                </div>
                {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm"></div>}
            </Link>
        );
    };

    NavItemLink.propTypes = {
        link: PropTypes.shape({
            icon: PropTypes.elementType.isRequired,
            label: PropTypes.string.isRequired,
            path: PropTypes.string.isRequired,
            badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            subtitle: PropTypes.string
        }).isRequired,
        isMobile: PropTypes.bool
    };

    // Simplified NavItem that delegates to the appropriate component
    const NavItem = ({ link, isMobile = false }) => {
        return link.submenu
            ? <NavItemWithSubmenu link={link} isMobile={isMobile} />
            : <NavItemLink link={link} isMobile={isMobile} />;
    };

    NavItem.propTypes = {
        link: PropTypes.shape({
            icon: PropTypes.elementType.isRequired,
            label: PropTypes.string.isRequired,
            path: PropTypes.string.isRequired,
            badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            subtitle: PropTypes.string,
            submenu: PropTypes.arrayOf(PropTypes.shape({
                path: PropTypes.string.isRequired,
                label: PropTypes.string.isRequired
            }))
        }).isRequired,
        isMobile: PropTypes.bool
    };


    return (
        <div className="min-h-screen bg-[#f1f5f9] flex font-sans">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-[280px] bg-white fixed h-full z-30 transition-all duration-300 shadow-xl shadow-slate-200/50 rounded-r-3xl my-4 ml-4 h-[calc(100vh-32px)]">
                {/* Brand */}
                <div className="h-24 flex items-center px-8">
                    <div className="flex items-center gap-3">
                        <img
                            src="/assets/logo-new.png"
                            alt="WORK360"
                            className="h-12 w-auto object-contain"
                        />
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-4 pb-20 scrollbar-hide">
                    {menuGroups.map((group, index) => (
                        <div key={index} className="mb-8">
                            {group.category && (
                                <h3 className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 mt-2">
                                    {group.category}
                                </h3>
                            )}
                            <div className="space-y-1">
                                {group.items.map((link) => (
                                    <NavItem key={link.path} link={link} />
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Scroll Indicator */}
                <div className="absolute bottom-[88px] left-0 right-0 h-24 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none flex items-end justify-center pb-4 z-10">
                    <div className="flex flex-col items-center gap-1 animate-bounce">
                        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase bg-white/50 px-3 py-1 rounded-full backdrop-blur-sm border border-slate-100">
                            SCORRI PER ALTRO
                        </span>
                        <ChevronDown className="w-4 h-4 text-slate-300" />
                    </div>
                </div>

                {/* User Profile (Bottom Sidebar) */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white rounded-b-3xl z-20">
                    <div className="bg-[#f1f5f9] p-4 rounded-2xl flex items-center gap-3 border border-slate-100 hover:border-purple-100 transition-colors group cursor-pointer">
                        <div className="w-10 h-10 bg-[#F3E8FF] rounded-full flex items-center justify-center text-[#8B5CF6] font-bold text-sm border-2 border-white shadow-sm">
                            {user?.firstName?.charAt(0) || 'U'}
                            {user?.lastName?.charAt(0) || 'D'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate group-hover:text-[#8B5CF6] transition-colors">
                                {user?.firstName} {user?.lastName}
                            </p>
                            <p className="text-xs text-slate-500 truncate capitalize">
                                {user?.role === 'owner' ? 'Amministratore' : 'Collaboratore'}
                            </p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Disconnetti"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col md:pl-[312px] min-h-screen transition-all duration-300">
                <Tutorial />
                {/* Mobile Header - Fixed at top */}
                <header className="md:hidden bg-white border-b border-slate-200 fixed top-0 left-0 right-0 z-40 px-4 h-16 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <img
                            src="/assets/logo-new.png"
                            alt="WORK360"
                            className="h-10 w-auto object-contain"
                        />
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
                    <div className="md:hidden fixed inset-0 z-50 flex">
                        {/* Backdrop */}
                        <div
                            role="button"
                            tabIndex={0}
                            aria-label="Close menu"
                            className="fixed inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
                            onClick={() => setIsMobileMenuOpen(false)}
                            onKeyDown={(e) => e.key === 'Escape' && setIsMobileMenuOpen(false)}
                        ></div>

                        {/* Slide-over Panel */}
                        <div className="relative w-[85%] max-w-[300px] bg-white h-full shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
                            <div className="p-6 flex flex-col h-full">
                                <div className="flex justify-between items-center mb-8">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src="/assets/logo-new.png"
                                            alt="WORK360"
                                            className="h-10 w-auto object-contain"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-full border border-slate-100"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <nav className="flex-1 space-y-6 overflow-y-auto pr-2 pb-20">
                                    {menuGroups.map((group, index) => (
                                        <div key={index}>
                                            {group.category && (
                                                <h3 className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                                    {group.category}
                                                </h3>
                                            )}
                                            <div className="space-y-1">
                                                {group.items.map((link) => (
                                                    <NavItem key={link.path} link={link} isMobile={true} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </nav>

                                <div className="mt-auto pt-6 border-t border-slate-100">
                                    <div className="flex items-center gap-3 mb-6 px-2">
                                        <div className="w-10 h-10 bg-[#F3E8FF] rounded-full flex items-center justify-center text-[#8B5CF6] font-bold border-2 border-white shadow-sm">
                                            {user?.firstName?.charAt(0) || 'U'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 text-sm truncate">{user?.firstName} {user?.lastName}</p>
                                            <p className="text-xs text-slate-500 capitalize truncate">{user?.role === 'owner' ? 'Amministratore' : 'Collaboratore'}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-slate-200 hover:border-red-100"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Disconnetti
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <main className="flex-1 p-4 pt-20 md:pt-4 sm:p-8 lg:p-10 w-full max-w-[100vw] overflow-x-hidden bg-[#f1f5f9]">
                    {/* Top Bar (Desktop only - Contextual) */}
                    {!hideHeader && (
                        <div className="hidden md:flex items-center justify-between mb-10 sticky top-0 z-30 bg-[#f1f5f9] py-4 -mt-4 -mx-10 px-10">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
                                <p className="text-sm text-slate-500 mt-1 font-medium">Benvenuto in WORK360</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Cerca..."
                                        className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6] w-64 transition-all shadow-sm"
                                    />
                                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </div>

                                <button className="p-2.5 text-slate-400 hover:text-[#8B5CF6] hover:bg-white border border-transparent hover:border-slate-100 rounded-full transition-all shadow-sm bg-white">
                                    <Settings className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Mobile Title */}
                    {!hideHeader && (
                        <div className="md:hidden mb-6">
                            <h1 className="text-2xl font-black text-slate-900">{title}</h1>
                        </div>
                    )}

                    {/* Content */}
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div >
    );
}

Layout.propTypes = {
    children: PropTypes.node.isRequired,
    title: PropTypes.string,
    hideHeader: PropTypes.bool
};
