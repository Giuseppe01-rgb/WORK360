import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabase/client.tsx';
import { LoginPage } from './components/LoginPage';
import { OperaioDashboard } from './components/OperaioDashboard';
import { TitolareDashboard } from './components/TitolareDashboard';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  const userRole = user.user_metadata?.role;

  if (userRole === 'titolare') {
    return <TitolareDashboard user={user} onLogout={handleLogout} />;
  } else {
    return <OperaioDashboard user={user} onLogout={handleLogout} />;
  }
}