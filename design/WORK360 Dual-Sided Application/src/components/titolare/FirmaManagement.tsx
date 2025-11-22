import React, { useState, useRef, useEffect } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info.tsx';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { PenTool, Trash2, Save, Upload } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface FirmaManagementProps {
  user: any;
}

export function FirmaManagement({ user }: FirmaManagementProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [firma, setFirma] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFirma();
  }, []);

  const fetchFirma = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-39b96de2/firma`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      const result = await response.json();
      if (response.ok && result.firma) {
        setFirma(result.firma);
      }
    } catch (error) {
      console.error('Error fetching firma:', error);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveFirma = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const firmaData = canvas.toDataURL('image/png');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-39b96de2/firma`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ firmaData }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error('Errore: ' + result.error);
        return;
      }

      toast.success('Firma salvata con successo!');
      fetchFirma();
    } catch (error) {
      console.error('Error saving firma:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Scale image to fit canvas
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        toast.success('Immagine caricata! Ora salva la firma.');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl mb-2">Gestione Firma</h2>
        <p className="text-slate-600">
          Crea o carica la tua firma digitale per preventivi e SAL
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Firma Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="w-5 h-5" />
              Crea Firma
            </CardTitle>
            <CardDescription>
              Disegna la tua firma con il mouse o carica un'immagine
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-slate-300 rounded-lg overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                width={500}
                height={200}
                className="w-full cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={clearCanvas}>
                <Trash2 className="w-4 h-4 mr-2" />
                Cancella
              </Button>

              <Button variant="outline" asChild>
                <label className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Carica Immagine
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              </Button>

              <Button onClick={saveFirma} disabled={loading} className="ml-auto">
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Salvataggio...' : 'Salva Firma'}
              </Button>
            </div>

            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
              <p><strong>Suggerimento:</strong> Disegna la tua firma con il mouse o carica un'immagine PNG/JPG della tua firma scannerizzata.</p>
            </div>
          </CardContent>
        </Card>

        {/* Firma Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Firma Salvata</CardTitle>
            <CardDescription>
              Anteprima della tua firma attuale
            </CardDescription>
          </CardHeader>
          <CardContent>
            {firma ? (
              <div className="space-y-4">
                <div className="border-2 border-slate-200 rounded-lg p-6 bg-white">
                  <img
                    src={firma.firmaData}
                    alt="Firma"
                    className="max-w-full h-auto mx-auto"
                  />
                </div>
                <div className="text-sm text-slate-600">
                  <p>Ultima modifica: {new Date(firma.updatedAt).toLocaleString('it-IT')}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 text-sm">
                    ✓ La tua firma verrà automaticamente inserita nei preventivi e SAL che generi.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <PenTool className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-600">Nessuna firma salvata</p>
                <p className="text-sm text-slate-500 mt-2">
                  Crea la tua firma usando il pannello a sinistra
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <h3 className="mb-2">📌 Come funziona</h3>
          <ul className="space-y-1 text-sm text-blue-900">
            <li>• Disegna la tua firma nell'area dedicata usando il mouse</li>
            <li>• Oppure carica un'immagine della tua firma scannerizzata</li>
            <li>• Clicca "Salva Firma" per memorizzare la firma</li>
            <li>• La firma verrà automaticamente aggiunta ai documenti PDF generati</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}