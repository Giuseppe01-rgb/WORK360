import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client.tsx';
import { projectId, publicAnonKey } from '../utils/supabase/info.tsx';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { LogIn, LogOut, Camera, PackageOpen, FileText, HardHat, MapPin, Menu } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface OperaioDashboardProps {
  user: any;
  onLogout: () => void;
}

export function OperaioDashboard({ user, onLogout }: OperaioDashboardProps) {
  const [activeTab, setActiveTab] = useState('timbratura');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cantieri, setCantieri] = useState<any[]>([]);
  const [selectedCantiere, setSelectedCantiere] = useState('');
  const [loading, setLoading] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [currentTimbratura, setCurrentTimbratura] = useState<any>(null);

  // Materiali form
  const [materiali, setMateriali] = useState('');
  const [attrezzature, setAttrezzature] = useState('');
  const [materialiNote, setMaterialiNote] = useState('');

  // Note form
  const [noteText, setNoteText] = useState('');

  // Photos
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    fetchCantieri();
  }, []);

  const fetchCantieri = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-39b96de2/cantieri`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      const result = await response.json();
      if (response.ok) {
        // Filtra solo i cantieri attivi (non completati)
        const cantieriAttivi = (result.cantieri || []).filter((c: any) => c && !c.dataFineDefinitiva);
        setCantieri(cantieriAttivi);
      }
    } catch (error) {
      console.error('Error fetching cantieri:', error);
    }
  };

  const getLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalizzazione non supportata'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleTimbratura = async (type: 'entrata' | 'uscita') => {
    if (!selectedCantiere) {
      toast.error('Seleziona un cantiere prima di timbrare');
      return;
    }

    setLoading(true);

    try {
      const location = await getLocation();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-39b96de2/timbratura`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          type,
          latitude: location.latitude,
          longitude: location.longitude,
          cantiereId: selectedCantiere,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error('Errore durante la timbratura: ' + result.error);
        return;
      }

      if (type === 'entrata') {
        setIsWorking(true);
        setCurrentTimbratura(result.timbratura);
        toast.success('✅ Timbratura in entrata registrata!');
      } else {
        setIsWorking(false);
        setCurrentTimbratura(null);
        toast.success('✅ Timbratura in uscita registrata!');
      }
    } catch (error: any) {
      console.error('Timbratura error:', error);
      toast.error('Errore: ' + (error.message || 'Impossibile ottenere la posizione GPS'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMateriali = async () => {
    if (!selectedCantiere) {
      toast.error('Seleziona un cantiere');
      return;
    }

    setLoading(true);

    try {
      // Get location
      const location = await getLocation().catch(() => ({ latitude: null, longitude: null }));
      
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-39b96de2/materiali`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          materiali: materiali.split('\n').filter(m => m.trim()),
          attrezzature: attrezzature.split('\n').filter(a => a.trim()),
          cantiereId: selectedCantiere,
          note: materialiNote,
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error('Errore: ' + result.error);
        return;
      }

      toast.success('✅ Materiali e attrezzature registrati!');
      setMateriali('');
      setAttrezzature('');
      setMaterialiNote('');
    } catch (error) {
      console.error('Error saving materiali:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedCantiere || !noteText.trim()) {
      toast.error('Seleziona un cantiere e scrivi una nota');
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-39b96de2/note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          text: noteText,
          cantiereId: selectedCantiere,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error('Errore: ' + result.error);
        return;
      }

      toast.success('✅ Nota salvata!');
      setNoteText('');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    toast.success('Foto caricate!');
  };

  const menuItems = [
    { id: 'timbratura', label: 'Timbratura', icon: LogIn },
    { id: 'materiali', label: 'Materiali', icon: PackageOpen },
    { id: 'note', label: 'Note', icon: FileText },
    { id: 'foto', label: 'Foto', icon: Camera },
  ];

  const handleMenuClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'timbratura':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="w-5 h-5" />
                Timbratura
              </CardTitle>
              <CardDescription>Registra entrata e uscita dal cantiere</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cantiere-select">Seleziona Cantiere *</Label>
                <Select value={selectedCantiere} onValueChange={setSelectedCantiere}>
                  <SelectTrigger id="cantiere-select">
                    <SelectValue placeholder="Scegli un cantiere..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cantieri.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">
                        Nessun cantiere attivo disponibile
                      </div>
                    ) : (
                      cantieri.map((cantiere) => (
                        <SelectItem key={cantiere.id} value={cantiere.id}>
                          {cantiere.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {currentTimbratura && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm">
                    ✓ Sei in servizio dal {new Date(currentTimbratura.timestamp).toLocaleTimeString('it-IT')}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  onClick={() => handleTimbratura('entrata')}
                  disabled={loading || isWorking || !selectedCantiere}
                  className="h-24 bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <div className="flex flex-col items-center gap-2">
                    <LogIn className="w-8 h-8" />
                    <span>Timbra Entrata</span>
                  </div>
                </Button>
                <Button
                  onClick={() => handleTimbratura('uscita')}
                  disabled={loading || !isWorking || !selectedCantiere}
                  className="h-24 bg-red-600 hover:bg-red-700"
                  size="lg"
                >
                  <div className="flex flex-col items-center gap-2">
                    <LogOut className="w-8 h-8" />
                    <span>Timbra Uscita</span>
                  </div>
                </Button>
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-1 justify-center">
                <MapPin className="w-3 h-3" />
                La tua posizione GPS verrà registrata
              </div>
            </CardContent>
          </Card>
        );

      case 'materiali':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageOpen className="w-5 h-5" />
                Materiali e Attrezzature
              </CardTitle>
              <CardDescription>Registra i materiali utilizzati</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cantiere-materiali">Cantiere *</Label>
                <Select value={selectedCantiere} onValueChange={setSelectedCantiere}>
                  <SelectTrigger id="cantiere-materiali">
                    <SelectValue placeholder="Scegli un cantiere..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cantieri.map((cantiere) => (
                      <SelectItem key={cantiere.id} value={cantiere.id}>
                        {cantiere.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="materiali">Materiali (uno per riga)</Label>
                <Textarea
                  id="materiali"
                  value={materiali}
                  onChange={(e) => setMateriali(e.target.value)}
                  placeholder="Es: Cemento 25kg&#10;Sabbia 50kg&#10;Mattoni rossi x100"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attrezzature">Attrezzature (uno per riga)</Label>
                <Textarea
                  id="attrezzature"
                  value={attrezzature}
                  onChange={(e) => setAttrezzature(e.target.value)}
                  placeholder="Es: Betoniera&#10;Trapano&#10;Scala"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="materiali-note">Note</Label>
                <Textarea
                  id="materiali-note"
                  value={materialiNote}
                  onChange={(e) => setMaterialiNote(e.target.value)}
                  placeholder="Note aggiuntive..."
                  rows={2}
                />
              </div>

              <Button onClick={handleSaveMateriali} disabled={loading} className="w-full">
                Salva Materiali
              </Button>
            </CardContent>
          </Card>
        );

      case 'note':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Note Cantiere
              </CardTitle>
              <CardDescription>Aggiungi note e osservazioni</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cantiere-note">Cantiere *</Label>
                <Select value={selectedCantiere} onValueChange={setSelectedCantiere}>
                  <SelectTrigger id="cantiere-note">
                    <SelectValue placeholder="Scegli un cantiere..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cantieri.map((cantiere) => (
                      <SelectItem key={cantiere.id} value={cantiere.id}>
                        {cantiere.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note-text">Nota</Label>
                <Textarea
                  id="note-text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Scrivi qui le tue osservazioni..."
                  rows={6}
                />
              </div>

              <Button onClick={handleSaveNote} disabled={loading} className="w-full">
                Salva Nota
              </Button>
            </CardContent>
          </Card>
        );

      case 'foto':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Foto Cantiere
              </CardTitle>
              <CardDescription>Carica foto dei lavori</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cantiere-foto">Cantiere *</Label>
                <Select value={selectedCantiere} onValueChange={setSelectedCantiere}>
                  <SelectTrigger id="cantiere-foto">
                    <SelectValue placeholder="Scegli un cantiere..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cantieri.map((cantiere) => (
                      <SelectItem key={cantiere.id} value={cantiere.id}>
                        {cantiere.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                <Camera className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700">Clicca per caricare</span>
                  <span className="text-slate-600"> o trascina le foto qui</span>
                </Label>
                <Input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                      <ImageWithFallback
                        src={photo}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
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
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl">WORK360 Operaio</h1>
              <p className="text-xs sm:text-sm text-slate-600">{user.user_metadata.name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={onLogout} className="hidden lg:flex">
            Esci
          </Button>
        </div>
      </header>

      {/* Desktop Navigation */}
      <div className="hidden lg:block bg-white border-b border-slate-200 sticky top-[73px] z-40">
        <div className="max-w-4xl mx-auto px-4">
          <nav className="flex gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
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
      <div className="max-w-4xl mx-auto p-4">
        {renderContent()}
      </div>
    </div>
  );
}
