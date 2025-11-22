import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase/client.tsx';
import { projectId } from '../../utils/supabase/info.tsx';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { LogIn, LogOut, Camera, PackageOpen, FileText, HardHat, MapPin } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface OperaioFeaturesProps {
  user: any;
}

export function OperaioFeatures({ user }: OperaioFeaturesProps) {
  const [activeTab, setActiveTab] = useState('timbratura');
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl mb-2">Funzioni Operaio</h2>
        <p className="text-slate-600">
          Come titolare, puoi utilizzare tutte le funzioni disponibili per gli operai
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timbratura">
            <LogIn className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Timbratura</span>
          </TabsTrigger>
          <TabsTrigger value="materiali">
            <PackageOpen className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Materiali</span>
          </TabsTrigger>
          <TabsTrigger value="note">
            <FileText className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Note</span>
          </TabsTrigger>
          <TabsTrigger value="foto">
            <Camera className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Foto</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timbratura">
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
                <Label htmlFor="cantiere-select-op">Seleziona Cantiere *</Label>
                <Select value={selectedCantiere} onValueChange={setSelectedCantiere}>
                  <SelectTrigger id="cantiere-select-op">
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
        </TabsContent>

        <TabsContent value="materiali">
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
                <Label htmlFor="cantiere-materiali-op">Cantiere *</Label>
                <Select value={selectedCantiere} onValueChange={setSelectedCantiere}>
                  <SelectTrigger id="cantiere-materiali-op">
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
                <Label htmlFor="materiali-op">Materiali (uno per riga)</Label>
                <Textarea
                  id="materiali-op"
                  value={materiali}
                  onChange={(e) => setMateriali(e.target.value)}
                  placeholder="Es: Cemento 25kg&#10;Sabbia 50kg&#10;Mattoni rossi x100"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attrezzature-op">Attrezzature (uno per riga)</Label>
                <Textarea
                  id="attrezzature-op"
                  value={attrezzature}
                  onChange={(e) => setAttrezzature(e.target.value)}
                  placeholder="Es: Betoniera&#10;Trapano&#10;Scala"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="materiali-note-op">Note</Label>
                <Textarea
                  id="materiali-note-op"
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
        </TabsContent>

        <TabsContent value="note">
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
                <Label htmlFor="cantiere-note-op">Cantiere *</Label>
                <Select value={selectedCantiere} onValueChange={setSelectedCantiere}>
                  <SelectTrigger id="cantiere-note-op">
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
                <Label htmlFor="note-text-op">Nota</Label>
                <Textarea
                  id="note-text-op"
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
        </TabsContent>

        <TabsContent value="foto">
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
                <Label htmlFor="cantiere-foto-op">Cantiere *</Label>
                <Select value={selectedCantiere} onValueChange={setSelectedCantiere}>
                  <SelectTrigger id="cantiere-foto-op">
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
                <Label htmlFor="photo-upload-op" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700">Clicca per caricare</span>
                  <span className="text-slate-600"> o trascina le foto qui</span>
                </Label>
                <Input
                  id="photo-upload-op"
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
