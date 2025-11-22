import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info.tsx';
import { supabase } from '../../utils/supabase/client.tsx';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Package, Plus, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import { Badge } from '../ui/badge';
import { toast } from 'sonner@2.0.3';

interface MagazzinoProps {
  user: any;
}

export function Magazzino({ user }: MagazzinoProps) {
  const [fornitori, setFornitori] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRecommendDialogOpen, setIsRecommendDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);

  // Form state
  const [nome, setNome] = useState('');
  const [contatto, setContatto] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [qualita, setQualita] = useState(5);
  const [prezzoMedio, setPrezzoMedio] = useState(5);
  const [tempiConsegna, setTempiConsegna] = useState(5);
  const [affidabilita, setAffidabilita] = useState(5);

  // AI Preference
  const [qualitaWeight, setQualitaWeight] = useState(50);
  const [prezzoPreference, setPrezzoPreference] = useState<'minimo' | 'massimo'>('minimo');

  useEffect(() => {
    fetchFornitori();
  }, []);

  const fetchFornitori = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-39b96de2/fornitori`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      const result = await response.json();
      if (response.ok) {
        setFornitori(result.fornitori || []);
      }
    } catch (error) {
      console.error('Error fetching fornitori:', error);
    }
  };

  const handleAddFornitore = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-39b96de2/fornitori`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            nome,
            contatto,
            email,
            telefono,
            qualita,
            prezzoMedio,
            tempiConsegna,
            affidabilita,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error('Errore: ' + result.error);
        return;
      }

      toast.success('Fornitore aggiunto!');
      setIsDialogOpen(false);
      resetForm();
      fetchFornitori();
    } catch (error) {
      console.error('Error adding fornitore:', error);
      toast.error('Errore durante l\'aggiunta');
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecommendation = async () => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-39b96de2/fornitori/recommend`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            preferences: {
              qualita: qualitaWeight,
              prezzo: prezzoPreference,
            },
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error('Errore: ' + result.error);
        return;
      }

      if (result.recommendation) {
        setRecommendation(result);
        toast.success('Raccomandazione generata!');
      } else {
        toast.info(result.message || 'Nessuna raccomandazione disponibile');
      }
    } catch (error) {
      console.error('Error getting recommendation:', error);
      toast.error('Errore durante l\'analisi');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNome('');
    setContatto('');
    setEmail('');
    setTelefono('');
    setQualita(5);
    setPrezzoMedio(5);
    setTempiConsegna(5);
    setAffidabilita(5);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl">Magazzino & Fornitori</h2>
          <p className="text-slate-600">
            Gestisci i fornitori e ricevi raccomandazioni AI personalizzate
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isRecommendDialogOpen} onOpenChange={setIsRecommendDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <TrendingUp className="w-4 h-4 mr-2" />
                AI Raccomandazione
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Raccomandazione AI Fornitore</DialogTitle>
                <DialogDescription>
                  Personalizza i parametri per ottenere il fornitore migliore
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>Importanza Qualità: {qualitaWeight}%</Label>
                  <Slider
                    value={[qualitaWeight]}
                    onValueChange={(val) => setQualitaWeight(val[0])}
                    max={100}
                    step={10}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Preferenza Prezzo</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPrezzoPreference('minimo')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        prezzoPreference === 'minimo'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <DollarSign className="w-6 h-6 mx-auto mb-2" />
                      <span className="block text-sm">Prezzo Minimo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrezzoPreference('massimo')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        prezzoPreference === 'massimo'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Award className="w-6 h-6 mx-auto mb-2" />
                      <span className="block text-sm">Prezzo Massimo</span>
                    </button>
                  </div>
                </div>

                <Button onClick={handleGetRecommendation} disabled={loading} className="w-full">
                  {loading ? 'Analisi in corso...' : 'Ottieni Raccomandazione'}
                </Button>

                {recommendation && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-800">
                        <Award className="w-5 h-5" />
                        Fornitore Raccomandato
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-lg">{recommendation.recommendation.nome}</p>
                        <p className="text-sm text-green-700">
                          Score: {recommendation.recommendation.score.toFixed(2)}/10
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                          <div>
                            <p className="text-slate-600">Qualità</p>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span>{recommendation.recommendation.qualita}/10</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-slate-600">Prezzo Medio</p>
                            <span>{recommendation.recommendation.prezzoMedio}/10</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi Fornitore
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Aggiungi Nuovo Fornitore</DialogTitle>
                <DialogDescription>
                  Inserisci i dettagli del fornitore e valuta i parametri
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddFornitore} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="nome">Nome Fornitore *</Label>
                    <Input
                      id="nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Es: Edil Materiali S.r.l."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contatto">Persona di Contatto</Label>
                    <Input
                      id="contatto"
                      value={contatto}
                      onChange={(e) => setContatto(e.target.value)}
                      placeholder="Mario Rossi"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="info@fornitore.com"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="telefono">Telefono</Label>
                    <Input
                      id="telefono"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="+39 02 1234567"
                    />
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h3 className="text-sm">Valutazioni (1-10)</h3>

                  <div className="space-y-3">
                    <Label>Qualità Prodotti: {qualita}/10</Label>
                    <Slider
                      value={[qualita]}
                      onValueChange={(val) => setQualita(val[0])}
                      max={10}
                      min={1}
                      step={1}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Livello Prezzo: {prezzoMedio}/10</Label>
                    <Slider
                      value={[prezzoMedio]}
                      onValueChange={(val) => setPrezzoMedio(val[0])}
                      max={10}
                      min={1}
                      step={1}
                    />
                    <p className="text-xs text-slate-500">1 = Economico, 10 = Costoso</p>
                  </div>

                  <div className="space-y-3">
                    <Label>Tempi di Consegna: {tempiConsegna}/10</Label>
                    <Slider
                      value={[tempiConsegna]}
                      onValueChange={(val) => setTempiConsegna(val[0])}
                      max={10}
                      min={1}
                      step={1}
                    />
                    <p className="text-xs text-slate-500">1 = Lenti, 10 = Rapidi</p>
                  </div>

                  <div className="space-y-3">
                    <Label>Affidabilità: {affidabilita}/10</Label>
                    <Slider
                      value={[affidabilita]}
                      onValueChange={(val) => setAffidabilita(val[0])}
                      max={10}
                      min={1}
                      step={1}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Salvataggio...' : 'Aggiungi Fornitore'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Fornitori List */}
      {fornitori.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Plus className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-600 mb-4">Nessun fornitore registrato</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi il primo fornitore
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {fornitori.map((fornitore) => (
            <Card key={fornitore.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{fornitore.nome}</CardTitle>
                    {fornitore.contatto && (
                      <CardDescription className="mt-1">
                        Contatto: {fornitore.contatto}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-lg">
                      {((fornitore.qualita + fornitore.affidabilita) / 2).toFixed(1)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600 mb-1">Qualità</p>
                    <Badge variant="secondary">{fornitore.qualita}/10</Badge>
                  </div>
                  <div>
                    <p className="text-slate-600 mb-1">Prezzo</p>
                    <Badge variant="secondary">{fornitore.prezzoMedio}/10</Badge>
                  </div>
                  <div>
                    <p className="text-slate-600 mb-1">Consegna</p>
                    <Badge variant="secondary">{fornitore.tempiConsegna}/10</Badge>
                  </div>
                  <div>
                    <p className="text-slate-600 mb-1">Affidabilità</p>
                    <Badge variant="secondary">{fornitore.affidabilita}/10</Badge>
                  </div>
                </div>

                {(fornitore.email || fornitore.telefono) && (
                  <div className="mt-4 pt-4 border-t text-sm space-y-1">
                    {fornitore.email && (
                      <p className="text-slate-600">📧 {fornitore.email}</p>
                    )}
                    {fornitore.telefono && (
                      <p className="text-slate-600">📞 {fornitore.telefono}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}