import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { LogIn, LogOut, MapPin, Calendar, User, Search } from 'lucide-react';

interface PresenzeMonitorProps {
  user: any;
}

export function PresenzeMonitor({ user }: PresenzeMonitorProps) {
  const [timbrature, setTimbrature] = useState<any[]>([]);
  const [filteredTimbrature, setFilteredTimbrature] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimbrature();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = timbrature.filter(t =>
        t.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        new Date(t.timestamp).toLocaleDateString('it-IT').includes(searchTerm)
      );
      setFilteredTimbrature(filtered);
    } else {
      setFilteredTimbrature(timbrature);
    }
  }, [searchTerm, timbrature]);

  const fetchTimbrature = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-39b96de2/timbrature`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      const result = await response.json();
      if (response.ok) {
        setTimbrature(result.timbrature || []);
        setFilteredTimbrature(result.timbrature || []);
      }
    } catch (error) {
      console.error('Error fetching timbrature:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupByDate = (timbrature: any[]) => {
    const grouped: Record<string, any[]> = {};
    timbrature.forEach(t => {
      const date = new Date(t.timestamp).toLocaleDateString('it-IT');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(t);
    });
    return grouped;
  };

  const groupedTimbrature = groupByDate(filteredTimbrature);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Caricamento presenze...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl mb-2">Controllo Presenze</h2>
        <p className="text-slate-600">
          Monitora le timbrature dei dipendenti in ordine cronologico
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Cerca per nome dipendente o data..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-1">Totale Timbrature</p>
              <p className="text-3xl">{timbrature.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-1">Entrate</p>
              <p className="text-3xl text-green-600">
                {timbrature.filter(t => t.type === 'entrata').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-1">Uscite</p>
              <p className="text-3xl text-red-600">
                {timbrature.filter(t => t.type === 'uscita').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timbrature grouped by date */}
      <div className="space-y-6">
        {Object.keys(groupedTimbrature).length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-600">Nessuna timbratura trovata</p>
            </CardContent>
          </Card>
        )}

        {Object.entries(groupedTimbrature).map(([date, timbraturesForDate]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-slate-600" />
              <h3 className="text-lg">{date}</h3>
              <Badge variant="secondary">{timbraturesForDate.length}</Badge>
            </div>

            <div className="space-y-3">
              {timbraturesForDate.map((timbratura, index) => (
                <Card key={index} className={
                  timbratura.type === 'entrata' 
                    ? 'border-l-4 border-l-green-500' 
                    : 'border-l-4 border-l-red-500'
                }>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          timbratura.type === 'entrata' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {timbratura.type === 'entrata' ? (
                            <LogIn className="w-5 h-5 text-green-600" />
                          ) : (
                            <LogOut className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Tipo</p>
                          <p className="capitalize">
                            {timbratura.type === 'entrata' ? 'Entrata' : 'Uscita'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-sm text-slate-600">Dipendente</p>
                          <p>{timbratura.userName}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-sm text-slate-600">Orario</p>
                          <p className="text-lg">
                            {new Date(timbratura.timestamp).toLocaleTimeString('it-IT', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-sm text-slate-600">Posizione GPS</p>
                          <a
                            href={`https://www.google.com/maps?q=${timbratura.latitude},${timbratura.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            {timbratura.latitude.toFixed(4)}, {timbratura.longitude.toFixed(4)}
                          </a>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}