import React, { useState } from 'react';
import { supabase } from '../utils/supabase/client.tsx';
import { projectId, publicAnonKey } from '../utils/supabase/info.tsx';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { HardHat, Building2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface LoginPageProps {
  onLogin: (user: any) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupRole, setSignupRole] = useState<'operaio' | 'titolare'>('operaio');
  const [signupCompany, setSignupCompany] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        console.error('Login error:', error.message);
        toast.error('Errore durante il login: ' + error.message);
        return;
      }

      if (data.user) {
        onLogin(data.user);
        toast.success('Login effettuato con successo!');
      }
    } catch (error) {
      console.error('Unexpected login error:', error);
      toast.error('Errore imprevisto durante il login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-39b96de2/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          name: signupName,
          role: signupRole,
          companyName: signupCompany,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Signup error:', result.error);
        toast.error('Errore durante la registrazione: ' + result.error);
        return;
      }

      toast.success('Registrazione completata! Ora puoi effettuare il login.');
      setIsSignup(false);
      setLoginEmail(signupEmail);
    } catch (error) {
      console.error('Unexpected signup error:', error);
      toast.error('Errore imprevisto durante la registrazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-2">
            <HardHat className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl">WORK360</CardTitle>
          <CardDescription>
            Gestione intelligente dei cantieri
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={isSignup ? 'signup' : 'login'} onValueChange={(v) => setIsSignup(v === 'signup')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Registrati</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="nome.cognome@azienda.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Operaio: nomeoperaio@nomeazienda.com<br />
                    Titolare: admin.nometitolare@nomeazienda.com
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Accesso in corso...' : 'Accedi'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label>Ruolo</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSignupRole('operaio')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        signupRole === 'operaio'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <HardHat className="w-6 h-6 mx-auto mb-2" />
                      <span className="block text-sm">Operaio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignupRole('titolare')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        signupRole === 'titolare'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Building2 className="w-6 h-6 mx-auto mb-2" />
                      <span className="block text-sm">Titolare</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome Completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Mario Rossi"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-company">Nome Azienda</Label>
                  <Input
                    id="signup-company"
                    type="text"
                    placeholder="Edil Costruzioni S.r.l."
                    value={signupCompany}
                    onChange={(e) => setSignupCompany(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder={
                      signupRole === 'titolare'
                        ? 'admin.nome@azienda.com'
                        : 'nome@azienda.com'
                    }
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Registrazione in corso...' : 'Crea Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}