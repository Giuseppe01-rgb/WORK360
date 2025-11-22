import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { 
  Building2, 
  FileText, 
  Users, 
  BarChart3, 
  Package, 
  LogIn,
  Camera,
  PackageOpen,
  PenTool,
  HardHat,
  Menu,
  X
} from 'lucide-react';
import { CantieriManagement } from './titolare/CantieriManagement';
import { PreventiviSAL } from './titolare/PreventiviSAL';
import { PresenzeMonitor } from './titolare/PresenzeMonitor';
import { Analytics } from './titolare/Analytics';
import { Magazzino } from './titolare/Magazzino';
import { FirmaManagement } from './titolare/FirmaManagement';
import { OperaioFeatures } from './titolare/OperaioFeatures';

interface TitolareDashboardProps {
  user: any;
  onLogout: () => void;
}

export function TitolareDashboard({ user, onLogout }: TitolareDashboardProps) {
  const [activeTab, setActiveTab] = useState('cantieri');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'cantieri', label: 'Cantieri', icon: Building2 },
    { id: 'preventivi', label: 'Preventivi & SAL', icon: FileText },
    { id: 'presenze', label: 'Presenze', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'magazzino', label: 'Magazzino', icon: Package },
    { id: 'firma', label: 'Firma Digitale', icon: PenTool },
    { id: 'operaio', label: 'Funzioni Operaio', icon: HardHat },
  ];

  const handleMenuClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'cantieri':
        return <CantieriManagement user={user} />;
      case 'preventivi':
        return <PreventiviSAL user={user} />;
      case 'presenze':
        return <PresenzeMonitor user={user} />;
      case 'analytics':
        return <Analytics user={user} />;
      case 'magazzino':
        return <Magazzino user={user} />;
      case 'firma':
        return <FirmaManagement user={user} />;
      case 'operaio':
        return <OperaioFeatures user={user} />;
      default:
        return <CantieriManagement user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="sm">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 space-y-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleMenuClick(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          activeTab === item.id
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                  <div className="pt-4 border-t">
                    <Button variant="outline" onClick={onLogout} className="w-full">
                      Esci
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>

            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl">WORK360</h1>
              <p className="text-xs sm:text-sm text-slate-600">
                {user.user_metadata.name}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={onLogout} className="hidden lg:flex">
            Esci
          </Button>
        </div>
      </header>

      {/* Desktop Navigation */}
      <div className="hidden lg:block bg-white border-b border-slate-200 sticky top-[73px] z-40">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === item.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-4">
        {renderContent()}
      </div>
    </div>
  );
}
