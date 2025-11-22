import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info.tsx';
import { supabase } from '../../utils/supabase/client.tsx';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { FileText, Download, Plus, Calendar, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface PreventiviSALProps {
  user: any;
}

interface DocumentItem {
  descrizione: string;
  quantita: number;
  prezzoUnitario: number;
}

export function PreventiviSAL({ user }: PreventiviSALProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [docType, setDocType] = useState<'preventivo' | 'sal'>('preventivo');
  const [firma, setFirma] = useState<any>(null);

  // Company data
  const [companyNome, setCompanyNome] = useState('');
  const [companyIndirizzo, setCompanyIndirizzo] = useState('');
  const [companyPIVA, setCompanyPIVA] = useState('');

  // Recipient data
  const [recipientNome, setRecipientNome] = useState('');
  const [recipientIndirizzo, setRecipientIndirizzo] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');

  // Items
  const [items, setItems] = useState<DocumentItem[]>([
    { descrizione: '', quantita: 1, prezzoUnitario: 0 }
  ]);

  useEffect(() => {
    fetchFirma();
  }, []);

  const fetchFirma = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-39b96de2/firma`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.firma) {
        setFirma(result.firma);
      }
    } catch (error) {
      console.error('Error fetching firma:', error);
    }
  };

  const addItem = () => {
    setItems([...items, { descrizione: '', quantita: 1, prezzoUnitario: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof DocumentItem, value: any) => {
    const newItems = [...items];
    if (field === 'quantita' || field === 'prezzoUnitario') {
      // Convert to number and default to 0 if NaN
      const numValue = parseFloat(value);
      newItems[index] = { ...newItems[index], [field]: isNaN(numValue) ? 0 : numValue };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantita * item.prezzoUnitario), 0);
  };

  const handleGeneratePDF = async () => {
    if (!recipientEmail) {
      toast.error('Inserisci l\'email del destinatario');
      return;
    }

    if (items.some(i => !i.descrizione)) {
      toast.error('Completa tutti i campi degli articoli');
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-39b96de2/${docType}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            type: docType,
            data: {
              companyData: {
                nome: companyNome,
                indirizzo: companyIndirizzo,
                piva: companyPIVA,
              },
              recipientData: {
                nome: recipientNome,
                indirizzo: recipientIndirizzo,
                email: recipientEmail,
              },
              items,
              totale: calculateTotal().toFixed(2),
              firma: firma?.firmaData,
            },
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error('Errore: ' + result.error);
        return;
      }

      toast.success(
        `${docType === 'preventivo' ? 'Preventivo' : 'SAL'} generato! ${result.message}`
      );
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Errore durante la generazione');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCompanyNome('');
    setCompanyIndirizzo('');
    setCompanyPIVA('');
    setRecipientNome('');
    setRecipientIndirizzo('');
    setRecipientEmail('');
    setItems([{ descrizione: '', quantita: 1, prezzoUnitario: 0 }]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl">Preventivi e SAL</h2>
          <p className="text-slate-600">Crea preventivi e stati avanzamento lavori con generazione PDF automatica</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
          setDocType('preventivo');
          setIsDialogOpen(true);
        }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Nuovo Preventivo
            </CardTitle>
            <CardDescription>
              Crea un preventivo professionale con logo e firma digitale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Crea Preventivo
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
          setDocType('sal');
          setIsDialogOpen(true);
        }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Nuovo SAL
            </CardTitle>
            <CardDescription>
              Genera uno stato avanzamento lavori per il cliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Crea SAL
            </Button>
          </CardContent>
        </Card>
      </div>

      {!firma && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <p className="text-orange-800">
              ⚠️ Non hai ancora caricato la tua firma. Vai alla sezione "Firma" per caricarla.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Crea {docType === 'preventivo' ? 'Preventivo' : 'SAL'}
            </DialogTitle>
            <DialogDescription>
              Compila i dati e genera il documento PDF
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Company Data */}
            <div>
              <h3 className="mb-3">Dati Azienda</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Nome Azienda</Label>
                  <Input
                    value={companyNome}
                    onChange={(e) => setCompanyNome(e.target.value)}
                    placeholder="Edil Costruzioni S.r.l."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Indirizzo</Label>
                  <Input
                    value={companyIndirizzo}
                    onChange={(e) => setCompanyIndirizzo(e.target.value)}
                    placeholder="Via Roma 15, Milano"
                  />
                </div>
                <div className="space-y-2">
                  <Label>P.IVA</Label>
                  <Input
                    value={companyPIVA}
                    onChange={(e) => setCompanyPIVA(e.target.value)}
                    placeholder="IT12345678901"
                  />
                </div>
              </div>
            </div>

            {/* Recipient Data */}
            <div>
              <h3 className="mb-3">Dati Cliente/Destinatario</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Nome Cliente</Label>
                  <Input
                    value={recipientNome}
                    onChange={(e) => setRecipientNome(e.target.value)}
                    placeholder="Mario Rossi"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Indirizzo</Label>
                  <Input
                    value={recipientIndirizzo}
                    onChange={(e) => setRecipientIndirizzo(e.target.value)}
                    placeholder="Via Verdi 20, Roma"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="mario.rossi@email.com"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3>Voci di {docType === 'preventivo' ? 'Preventivo' : 'Lavoro'}</h3>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi Voce
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-5 space-y-2">
                          <Label>Descrizione</Label>
                          <Input
                            value={item.descrizione}
                            onChange={(e) => updateItem(index, 'descrizione', e.target.value)}
                            placeholder="Es: Tinteggiatura interna"
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Quantità</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantita}
                            onChange={(e) => updateItem(index, 'quantita', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Prezzo €</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.prezzoUnitario}
                            onChange={(e) => updateItem(index, 'prezzoUnitario', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Totale</Label>
                          <div className="h-10 flex items-center px-3 bg-slate-100 rounded-md">
                            €{(item.quantita * item.prezzoUnitario).toFixed(2)}
                          </div>
                        </div>
                        <div className="col-span-1 flex items-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg">Totale Documento:</span>
                  <span className="text-2xl">€{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleGeneratePDF} disabled={loading}>
                <Send className="w-4 h-4 mr-2" />
                {loading ? 'Generazione...' : 'Genera e Invia PDF'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}