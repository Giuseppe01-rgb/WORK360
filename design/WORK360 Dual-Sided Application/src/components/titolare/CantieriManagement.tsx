import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase/client.tsx';
import { projectId, publicAnonKey } from '../../utils/supabase/info.tsx';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Building2, Plus, Calendar, MapPin, CheckCircle2, Clock, Edit, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface CantieriManagementProps {
  user: any;
}

export function CantieriManagement({ user }: CantieriManagementProps) {
  const [cantieri, setCantieri] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCantiere, setSelectedCantiere] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'inCorso' | 'completati'>('all');

  // Form state
  const [nome, setNome] = useState('');
  const [indirizzo, setIndirizzo] = useState('');
  const [dataInizio, setDataInizio] = useState('');
  const [dataFinePrevista, setDataFinePrevista] = useState('');
  const [descrizione, setDescrizione] = useState('');

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
        setCantieri(result.cantieri || []);
      }
    } catch (error) {
      console.error('Error fetching cantieri:', error);
    }
  };

  const handleCreateCantiere = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-39b96de2/cantieri`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          nome,
          indirizzo,
          dataInizio,
          dataFinePrevista,
          descrizione,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error('Errore: ' + result.error);
        return;
      }

      toast.success('Cantiere creato con successo!');
      setIsDialogOpen(false);
      resetForm();
      fetchCantieri();
    } catch (error) {
      console.error('Error creating cantiere:', error);
      toast.error('Errore durante la creazione');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCantiere = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCantiere) return;
    
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-39b96de2/cantieri/${selectedCantiere.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            nome,
            indirizzo,
            dataInizio,
            dataFinePrevista,
            descrizione,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error('Errore: ' + result.error);
        return;
      }

      toast.success('Cantiere aggiornato!');
      setIsEditDialogOpen(false);
      setSelectedCantiere(null);
      resetForm();
      fetchCantieri();
    } catch (error) {
      console.error('Error updating cantiere:', error);
      toast.error('Errore durante l\'aggiornamento');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteCantiere = async (cantiereId: string) => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-39b96de2/cantieri/${cantiereId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            dataFineDefinitiva: new Date().toISOString(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error('Errore: ' + result.error);
        return;
      }

      toast.success('Cantiere archiviato!');
      fetchCantieri();
    } catch (error) {
      console.error('Error completing cantiere:', error);
      toast.error('Errore durante il completamento');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (cantiere: any) => {
    setSelectedCantiere(cantiere);
    setNome(cantiere.nome);
    setIndirizzo(cantiere.indirizzo);
    setDataInizio(cantiere.dataInizio);
    setDataFinePrevista(cantiere.dataFinePrevista);
    setDescrizione(cantiere.descrizione || '');
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setNome('');
    setIndirizzo('');
    setDataInizio('');
    setDataFinePrevista('');
    setDescrizione('');
  };

  const cantieriInCorso = cantieri.filter(c => c && !c.dataFineDefinitiva);
  const cantieriCompletati = cantieri.filter(c => c && c.dataFineDefinitiva);

  const filteredCantieri = filter === 'inCorso' ? cantieriInCorso : 
                           filter === 'completati' ? cantieriCompletati : 
                           cantieri;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl">Gestione Cantieri</h2>
          <p className="text-slate-600">Registra e monitora i tuoi cantieri</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Cantiere
        </Button>
      </div>

      {/* Stats + Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            filter === 'all' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Tutti i Cantieri</p>
              <p className="text-3xl mt-1">{cantieri.length}</p>
            </div>
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
        </button>

        <button
          onClick={() => setFilter('inCorso')}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            filter === 'inCorso' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">In Corso</p>
              <p className="text-3xl mt-1 text-orange-600">{cantieriInCorso.length}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </button>

        <button
          onClick={() => setFilter('completati')}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            filter === 'completati' ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Archiviati</p>
              <p className="text-3xl mt-1 text-green-600">{cantieriCompletati.length}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
        </button>
      </div>

      {/* Cantieri List */}
      {filteredCantieri.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-600 mb-4">
              {filter === 'all' ? 'Nessun cantiere registrato' :
               filter === 'inCorso' ? 'Nessun cantiere in corso' :
               'Nessun cantiere archiviato'}
            </p>
            {filter === 'all' && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crea il primo cantiere
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCantieri.filter(cantiere => cantiere && cantiere.id).map(cantiere => {
            const isCompleted = !!cantiere.dataFineDefinitiva;
            return (
              <Card 
                key={cantiere.id}
                className={`border-l-4 ${
                  isCompleted 
                    ? 'border-l-green-400 bg-green-50/30' 
                    : 'border-l-orange-400 bg-orange-50/30'
                }`}
              >
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle>{cantiere.nome}</CardTitle>
                        <Badge variant={isCompleted ? 'default' : 'secondary'} className={
                          isCompleted ? 'bg-green-600' : 'bg-orange-600'
                        }>
                          {isCompleted ? 'Archiviato' : 'In Corso'}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <MapPin className="w-4 h-4" />
                        {cantiere.indirizzo}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(cantiere)}
                      >
                        <Edit className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Modifica</span>
                      </Button>
                      {!isCompleted && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteCantiere(cantiere.id)}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Archivia</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600 mb-1">Inizio</p>
                      <p className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(cantiere.dataInizio).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600 mb-1">Fine Prevista</p>
                      <p className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(cantiere.dataFinePrevista).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    {isCompleted && (
                      <div>
                        <p className="text-slate-600 mb-1">Completato</p>
                        <p className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          {new Date(cantiere.dataFineDefinitiva).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    )}
                  </div>
                  {cantiere.descrizione && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-slate-600 text-sm mb-1">Descrizione</p>
                      <p className="text-sm">{cantiere.descrizione}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crea Nuovo Cantiere</DialogTitle>
            <DialogDescription>
              Inserisci i dettagli del nuovo cantiere
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCantiere} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nome">Nome Cantiere *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Es: Ristrutturazione Via Roma 15"
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="indirizzo">Indirizzo *</Label>
                <Input
                  id="indirizzo"
                  value={indirizzo}
                  onChange={(e) => setIndirizzo(e.target.value)}
                  placeholder="Es: Via Roma 15, Milano"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataInizio">Data Inizio *</Label>
                <Input
                  id="dataInizio"
                  type="date"
                  value={dataInizio}
                  onChange={(e) => setDataInizio(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataFinePrevista">Data Fine Prevista *</Label>
                <Input
                  id="dataFinePrevista"
                  type="date"
                  value={dataFinePrevista}
                  onChange={(e) => setDataFinePrevista(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="descrizione">Descrizione</Label>
                <Input
                  id="descrizione"
                  value={descrizione}
                  onChange={(e) => setDescrizione(e.target.value)}
                  placeholder="Breve descrizione del progetto..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creazione...' : 'Crea Cantiere'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifica Cantiere</DialogTitle>
            <DialogDescription>
              Aggiorna i dettagli del cantiere
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateCantiere} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-nome">Nome Cantiere *</Label>
                <Input
                  id="edit-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-indirizzo">Indirizzo *</Label>
                <Input
                  id="edit-indirizzo"
                  value={indirizzo}
                  onChange={(e) => setIndirizzo(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-dataInizio">Data Inizio *</Label>
                <Input
                  id="edit-dataInizio"
                  type="date"
                  value={dataInizio}
                  onChange={(e) => setDataInizio(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-dataFinePrevista">Data Fine Prevista *</Label>
                <Input
                  id="edit-dataFinePrevista"
                  type="date"
                  value={dataFinePrevista}
                  onChange={(e) => setDataFinePrevista(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-descrizione">Descrizione</Label>
                <Input
                  id="edit-descrizione"
                  value={descrizione}
                  onChange={(e) => setDescrizione(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
                setSelectedCantiere(null);
              }}>
                Annulla
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvataggio...' : 'Salva Modifiche'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}