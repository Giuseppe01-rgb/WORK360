import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Clock, Package, Lightbulb, Target } from 'lucide-react';
import { Badge } from '../ui/badge';

interface AnalyticsProps {
  user: any;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function Analytics({ user }: AnalyticsProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const [presenzeRes, materialiRes, cantieriRes, noteRes] = await Promise.all([
        supabase.from('presenze').select('*'),
        supabase.from('materiali').select('*'),
        supabase.from('cantieri').select('*'),
        supabase.from('note').select('*'),
      ]);

      const presenzeData = presenzeRes.data || [];
      const materialiData = materialiRes.data || [];
      const cantieriData = cantieriRes.data || [];
      const noteData = noteRes.data || [];

      const oreDipendente: { [key: string]: number } = {};
      const materialiDipendente: { [key: string]: number } = {};
      const oreCantiere: { [key: string]: { ore: number, dipendenti: { [key: string]: number } } } = {};

      presenzeData.forEach((presenza: any) => {
        const dipendente = presenza.dipendente;
        const ore = presenza.ore;
        if (!oreDipendente[dipendente]) {
          oreDipendente[dipendente] = 0;
        }
        oreDipendente[dipendente] += ore;

        const cantiere = presenza.cantiere;
        if (!oreCantiere[cantiere]) {
          oreCantiere[cantiere] = { ore: 0, dipendenti: {} };
        }
        oreCantiere[cantiere].ore += ore;
        if (!oreCantiere[cantiere].dipendenti[dipendente]) {
          oreCantiere[cantiere].dipendenti[dipendente] = 0;
        }
        oreCantiere[cantiere].dipendenti[dipendente] += ore;
      });

      materialiData.forEach((materiale: any) => {
        const dipendente = materiale.dipendente;
        if (!materialiDipendente[dipendente]) {
          materialiDipendente[dipendente] = 0;
        }
        materialiDipendente[dipendente] += 1;
      });

      const insights: string[] = [];
      const recommendations: string[] = [];

      // Add insights and recommendations based on the data
      if (Object.keys(oreDipendente).length > 0) {
        insights.push('Ci sono dipendenti che lavorano più di altri.');
        recommendations.push('Considera di bilanciare il carico di lavoro tra i dipendenti.');
      }

      if (Object.keys(materialiDipendente).length > 0) {
        insights.push('Ci sono dipendenti che utilizzano più materiali di altri.');
        recommendations.push('Verifica se i dipendenti stanno utilizzando i materiali in modo efficiente.');
      }

      setAnalytics({
        oreDipendente,
        materialiDipendente,
        oreCantiere,
        insights,
        recommendations,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Analisi dati in corso...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <BarChart className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-600">Nessun dato disponibile per l'analisi</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts
  const oreDipendenteData = Object.entries(analytics.oreDipendente || {}).map(([name, ore]) => ({
    name,
    ore: parseFloat((ore as number).toFixed(1)),
  }));

  const materialiDipendenteData = Object.entries(analytics.materialiDipendente || {}).map(([name, count]) => ({
    name,
    materiali: count,
  }));

  const oreCantiereData = Object.entries(analytics.oreCantiere || {}).map(([id, data]: [string, any]) => ({
    id: id.split(':').pop(),
    ore: parseFloat(data.ore.toFixed(1)),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl mb-2">Analisi Dati & Insights AI</h2>
        <p className="text-slate-600">
          Dashboard intelligente per monitorare performance ed efficienza
        </p>
      </div>

      {/* AI Insights */}
      {analytics.insights && analytics.insights.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              Insights AI
            </CardTitle>
            <CardDescription>
              Analisi automatica dei pattern e tendenze
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {analytics.insights.map((insight: string, index: number) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-white rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{insight}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {analytics.recommendations && analytics.recommendations.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              Raccomandazioni
            </CardTitle>
            <CardDescription>
              Suggerimenti per migliorare efficienza e risparmi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {analytics.recommendations.map((rec: string, index: number) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-white rounded-lg">
                <div className="w-5 h-5 flex items-center justify-center bg-green-600 text-white rounded-full flex-shrink-0 text-xs">
                  {index + 1}
                </div>
                <p className="text-sm">{rec}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="dipendenti" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dipendenti">
            <Users className="w-4 h-4 mr-2" />
            Dipendenti
          </TabsTrigger>
          <TabsTrigger value="cantieri">
            <Clock className="w-4 h-4 mr-2" />
            Cantieri
          </TabsTrigger>
          <TabsTrigger value="materiali">
            <Package className="w-4 h-4 mr-2" />
            Materiali
          </TabsTrigger>
          <TabsTrigger value="riepilogo">
            <BarChart className="w-4 h-4 mr-2" />
            Riepilogo
          </TabsTrigger>
        </TabsList>

        {/* Dipendenti Tab */}
        <TabsContent value="dipendenti" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ore Lavorate per Dipendente</CardTitle>
              <CardDescription>
                Visualizzazione delle ore totali lavorate da ogni dipendente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {oreDipendenteData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={oreDipendenteData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="ore" fill="#3b82f6" name="Ore Lavorate" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-slate-600 py-8">Nessun dato disponibile</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuzione Ore</CardTitle>
            </CardHeader>
            <CardContent>
              {oreDipendenteData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={oreDipendenteData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="ore"
                    >
                      {oreDipendenteData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-slate-600 py-8">Nessun dato disponibile</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cantieri Tab */}
        <TabsContent value="cantieri" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ore per Cantiere</CardTitle>
              <CardDescription>
                Ore totali lavorate in ogni cantiere
              </CardDescription>
            </CardHeader>
            <CardContent>
              {oreCantiereData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={oreCantiereData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="id" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="ore" fill="#10b981" name="Ore Totali" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-slate-600 py-8">Nessun dato disponibile</p>
              )}
            </CardContent>
          </Card>

          {/* Cantiere Details */}
          <div className="grid gap-4">
            {Object.entries(analytics.oreCantiere || {}).map(([cantiereId, data]: [string, any]) => (
              <Card key={cantiereId}>
                <CardHeader>
                  <CardTitle className="text-lg">Cantiere: {cantiereId.split(':').pop()}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-600">Ore Totali</p>
                      <p className="text-2xl">{data.ore.toFixed(1)} ore</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-2">Dipendenti più attivi</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(data.dipendenti || {})
                          .sort((a: any, b: any) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([name, ore]: [string, any]) => (
                            <Badge key={name} variant="secondary">
                              {name}: {ore.toFixed(1)}h
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Materiali Tab */}
        <TabsContent value="materiali" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Materiali Utilizzati per Dipendente</CardTitle>
              <CardDescription>
                Numero di materiali e attrezzature registrati
              </CardDescription>
            </CardHeader>
            <CardContent>
              {materialiDipendenteData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={materialiDipendenteData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="materiali" fill="#f59e0b" name="Materiali/Attrezzature" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-slate-600 py-8">Nessun dato disponibile</p>
              )}
            </CardContent>
          </Card>

          {/* Materiali per Cantiere */}
          <Card>
            <CardHeader>
              <CardTitle>Materiali per Cantiere</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(analytics.materialiCantiere || {}).map(([cantiereId, materiali]: [string, any]) => (
                  <div key={cantiereId} className="border-l-4 border-l-orange-500 pl-4">
                    <h4 className="mb-2">Cantiere: {cantiereId.split(':').pop()}</h4>
                    <div className="flex flex-wrap gap-2">
                      {materiali.slice(0, 10).map((materiale: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {materiale}
                        </Badge>
                      ))}
                      {materiali.length > 10 && (
                        <Badge variant="secondary">+{materiali.length - 10} altri</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Riepilogo Tab */}
        <TabsContent value="riepilogo" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm text-slate-600">Dipendenti Attivi</p>
                  <p className="text-3xl">{Object.keys(analytics.oreDipendente || {}).length}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="text-sm text-slate-600">Ore Totali</p>
                  <p className="text-3xl">
                    {Object.values(analytics.oreDipendente || {})
                      .reduce((a: number, b: any) => a + b, 0)
                      .toFixed(0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Package className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                  <p className="text-sm text-slate-600">Materiali Utilizzati</p>
                  <p className="text-3xl">
                    {Object.values(analytics.materialiDipendente || {})
                      .reduce((a: number, b: any) => a + b, 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <p className="text-sm text-slate-600">Media Ore/Dipendente</p>
                  <p className="text-3xl">
                    {(Object.values(analytics.oreDipendente || {})
                      .reduce((a: number, b: any) => a + b, 0) /
                      Math.max(Object.keys(analytics.oreDipendente || {}).length, 1))
                      .toFixed(1)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}