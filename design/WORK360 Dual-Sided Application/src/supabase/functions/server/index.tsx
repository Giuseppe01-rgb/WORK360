import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Helper function to get user from token
async function getUser(request: Request) {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  if (!accessToken) return null;
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  return user;
}

// ==================== AUTH ROUTES ====================

// Sign up route
app.post('/make-server-39b96de2/signup', async (c) => {
  try {
    const { email, password, name, role, companyName } = await c.req.json();
    
    if (!email || !password || !name || !role || !companyName) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role, companyName },
      email_confirm: true // Auto-confirm since email server not configured
    });

    if (error) {
      console.log(`Error creating user during signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Unexpected error during signup: ${error}`);
    return c.json({ error: 'Signup failed' }, 500);
  }
});

// ==================== TIMBRATURE ROUTES ====================

// Clock in/out
app.post('/make-server-39b96de2/timbratura', async (c) => {
  try {
    const user = await getUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { type, latitude, longitude, cantiereId } = await c.req.json();
    
    const timbratura = {
      userId: user.id,
      userName: user.user_metadata.name,
      companyName: user.user_metadata.companyName,
      type, // 'entrata' or 'uscita'
      latitude,
      longitude,
      cantiereId,
      timestamp: new Date().toISOString(),
    };

    const key = `timbratura:${user.user_metadata.companyName}:${Date.now()}`;
    await kv.set(key, timbratura);

    return c.json({ success: true, timbratura });
  } catch (error) {
    console.log(`Error during timbratura: ${error}`);
    return c.json({ error: 'Timbratura failed' }, 500);
  }
});

// Get timbrature (for titolare)
app.get('/make-server-39b96de2/timbrature', async (c) => {
  try {
    const user = await getUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const companyName = user.user_metadata.companyName;
    const timbrature = await kv.getByPrefix(`timbratura:${companyName}`);
    
    // Sort by timestamp descending
    timbrature.sort((a, b) => new Date(b.value.timestamp).getTime() - new Date(a.value.timestamp).getTime());

    return c.json({ timbrature: timbrature.map(t => t.value) });
  } catch (error) {
    console.log(`Error fetching timbrature: ${error}`);
    return c.json({ error: 'Failed to fetch timbrature' }, 500);
  }
});

// ==================== CANTIERI ROUTES ====================

// Create cantiere
app.post('/make-server-39b96de2/cantieri', async (c) => {
  try {
    const user = await getUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    if (user.user_metadata.role !== 'titolare') {
      return c.json({ error: 'Only titolare can create cantieri' }, 403);
    }

    const cantiere = await c.req.json();
    const key = `cantiere:${user.user_metadata.companyName}:${Date.now()}`;
    
    await kv.set(key, {
      ...cantiere,
      id: key,
      companyName: user.user_metadata.companyName,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    });

    return c.json({ success: true, cantiereId: key });
  } catch (error) {
    console.log(`Error creating cantiere: ${error}`);
    return c.json({ error: 'Failed to create cantiere' }, 500);
  }
});

// Get all cantieri
app.get('/make-server-39b96de2/cantieri', async (c) => {
  try {
    const user = await getUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const cantieri = await kv.getByPrefix(`cantiere:${user.user_metadata.companyName}`);
    
    return c.json({ cantieri: cantieri.map(c => c.value) });
  } catch (error) {
    console.log(`Error fetching cantieri: ${error}`);
    return c.json({ error: 'Failed to fetch cantieri' }, 500);
  }
});

// Update cantiere
app.put('/make-server-39b96de2/cantieri/:id', async (c) => {
  try {
    const user = await getUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    if (user.user_metadata.role !== 'titolare') {
      return c.json({ error: 'Only titolare can update cantieri' }, 403);
    }

    const cantiereId = c.req.param('id');
    const updates = await c.req.json();
    
    const cantieri = await kv.getByPrefix(cantiereId);
    if (cantieri.length === 0) {
      return c.json({ error: 'Cantiere not found' }, 404);
    }

    const updated = { ...cantieri[0].value, ...updates, updatedAt: new Date().toISOString() };
    await kv.set(cantiereId, updated);

    return c.json({ success: true, cantiere: updated });
  } catch (error) {
    console.log(`Error updating cantiere: ${error}`);
    return c.json({ error: 'Failed to update cantiere' }, 500);
  }
});

// ==================== MATERIALI & ATTREZZATURE ====================

// Add materiali/attrezzature
app.post('/make-server-39b96de2/materiali', async (c) => {
  try {
    const user = await getUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { materiali, attrezzature, cantiereId, note, latitude, longitude } = await c.req.json();
    
    const key = `materiali:${user.user_metadata.companyName}:${Date.now()}`;
    await kv.set(key, {
      userId: user.id,
      userName: user.user_metadata.name,
      companyName: user.user_metadata.companyName,
      materiali,
      attrezzature,
      cantiereId,
      note,
      latitude: latitude || null,
      longitude: longitude || null,
      timestamp: new Date().toISOString(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.log(`Error adding materiali: ${error}`);
    return c.json({ error: 'Failed to add materiali' }, 500);
  }
});

// Get materiali
app.get('/make-server-39b96de2/materiali', async (c) => {
  try {
    const user = await getUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const materiali = await kv.getByPrefix(`materiali:${user.user_metadata.companyName}`);
    
    return c.json({ materiali: materiali.map(m => m.value) });
  } catch (error) {
    console.log(`Error fetching materiali: ${error}`);
    return c.json({ error: 'Failed to fetch materiali' }, 500);
  }
});

// ==================== NOTE ====================

// Add note
app.post('/make-server-39b96de2/note', async (c) => {
  try {
    const user = await getUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { text, cantiereId } = await c.req.json();
    
    const key = `nota:${user.user_metadata.companyName}:${Date.now()}`;
    await kv.set(key, {
      userId: user.id,
      userName: user.user_metadata.name,
      companyName: user.user_metadata.companyName,
      text,
      cantiereId,
      timestamp: new Date().toISOString(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.log(`Error adding note: ${error}`);
    return c.json({ error: 'Failed to add note' }, 500);
  }
});

// Get note
app.get('/make-server-39b96de2/note', async (c) => {
  try {
    const user = await getUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const note = await kv.getByPrefix(`nota:${user.user_metadata.companyName}`);
    
    return c.json({ note: note.map(n => n.value) });
  } catch (error) {
    console.log(`Error fetching note: ${error}`);
    return c.json({ error: 'Failed to fetch note' }, 500);
  }
});

// ==================== FORNITORI ====================

// Add fornitore
app.post('/make-server-39b96de2/fornitori', async (c) => {
  try {
    const user = await getUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    if (user.user_metadata.role !== 'titolare') {
      return c.json({ error: 'Only titolare can add fornitori' }, 403);
    }

    const fornitore = await c.req.json();
    const key = `fornitore:${user.user_metadata.companyName}:${Date.now()}`;
    
    await kv.set(key, {
      ...fornitore,
      id: key,
      companyName: user.user_metadata.companyName,
      createdAt: new Date().toISOString(),
    });

    return c.json({ success: true, fornitoreId: key });
  } catch (error) {
    console.log(`Error adding fornitore: ${error}`);
    return c.json({ error: 'Failed to add fornitore' }, 500);
  }
});

// Get fornitori with AI recommendation
app.get('/make-server-39b96de2/fornitori', async (c) => {
  try {
    const user = await getUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const fornitori = await kv.getByPrefix(`fornitore:${user.user_metadata.companyName}`);
    
    return c.json({ fornitori: fornitori.map(f => f.value) });
  } catch (error) {
    console.log(`Error fetching fornitori: ${error}`);
    return c.json({ error: 'Failed to fetch fornitori' }, 500);
  }
});

// Get AI recommendation for best supplier
app.post('/make-server-39b96de2/fornitori/recommend', async (c) => {
  try {
    const user = await getUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { preferences } = await c.req.json(); // { qualita: weight, prezzo: weight }
    const fornitori = await kv.getByPrefix(`fornitore:${user.user_metadata.companyName}`);
    
    if (fornitori.length === 0) {
      return c.json({ recommendation: null, message: 'Nessun fornitore disponibile' });
    }

    // Simple AI recommendation based on weighted scores
    const scored = fornitori.map(f => {
      const forn = f.value;
      let score = 0;
      
      if (preferences.qualita) {
        score += (forn.qualita || 5) * (preferences.qualita / 100);
      }
      if (preferences.prezzo === 'minimo') {
        score += (10 - (forn.prezzoMedio || 5)) * 0.5;
      } else if (preferences.prezzo === 'massimo') {
        score += (forn.prezzoMedio || 5) * 0.5;
      }
      
      return { ...forn, score };
    });

    scored.sort((a, b) => b.score - a.score);
    
    return c.json({ 
      recommendation: scored[0],
      allScored: scored,
    });
  } catch (error) {
    console.log(`Error getting AI recommendation: ${error}`);
    return c.json({ error: 'Failed to get recommendation' }, 500);
  }
});

// ==================== ANALYTICS & AI INSIGHTS ====================

// Get analytics data
app.get('/make-server-39b96de2/analytics', async (c) => {
  try {
    const user = await getUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    if (user.user_metadata.role !== 'titolare') {
      return c.json({ error: 'Only titolare can view analytics' }, 403);
    }

    const companyName = user.user_metadata.companyName;
    
    // Get all data
    const timbrature = await kv.getByPrefix(`timbratura:${companyName}`);
    const materiali = await kv.getByPrefix(`materiali:${companyName}`);
    const cantieri = await kv.getByPrefix(`cantiere:${companyName}`);

    // Calculate ore per dipendente
    const oreDipendente: Record<string, number> = {};
    const entrateMap: Record<string, any> = {};

    timbrature.forEach(t => {
      const tim = t.value;
      if (tim.type === 'entrata') {
        entrateMap[`${tim.userId}-${tim.cantiereId}`] = tim;
      } else if (tim.type === 'uscita') {
        const entrata = entrateMap[`${tim.userId}-${tim.cantiereId}`];
        if (entrata) {
          const ore = (new Date(tim.timestamp).getTime() - new Date(entrata.timestamp).getTime()) / (1000 * 60 * 60);
          oreDipendente[tim.userName] = (oreDipendente[tim.userName] || 0) + ore;
        }
      }
    });

    // Calculate materiali per dipendente
    const materialiDipendente: Record<string, number> = {};
    materiali.forEach(m => {
      const mat = m.value;
      const count = (mat.materiali?.length || 0) + (mat.attrezzature?.length || 0);
      materialiDipendente[mat.userName] = (materialiDipendente[mat.userName] || 0) + count;
    });

    // Calculate ore per cantiere
    const oreCantiere: Record<string, { ore: number, dipendenti: Record<string, number> }> = {};
    timbrature.forEach(t => {
      const tim = t.value;
      if (tim.type === 'entrata') {
        entrateMap[`${tim.userId}-${tim.cantiereId}`] = tim;
      } else if (tim.type === 'uscita') {
        const entrata = entrateMap[`${tim.userId}-${tim.cantiereId}`];
        if (entrata && tim.cantiereId) {
          const ore = (new Date(tim.timestamp).getTime() - new Date(entrata.timestamp).getTime()) / (1000 * 60 * 60);
          if (!oreCantiere[tim.cantiereId]) {
            oreCantiere[tim.cantiereId] = { ore: 0, dipendenti: {} };
          }
          oreCantiere[tim.cantiereId].ore += ore;
          oreCantiere[tim.cantiereId].dipendenti[tim.userName] = 
            (oreCantiere[tim.cantiereId].dipendenti[tim.userName] || 0) + ore;
        }
      }
    });

    // Calculate materiali per cantiere
    const materialiCantiere: Record<string, any[]> = {};
    materiali.forEach(m => {
      const mat = m.value;
      if (mat.cantiereId) {
        if (!materialiCantiere[mat.cantiereId]) {
          materialiCantiere[mat.cantiereId] = [];
        }
        materialiCantiere[mat.cantiereId].push(...(mat.materiali || []), ...(mat.attrezzature || []));
      }
    });

    // AI Insights
    const insights: string[] = [];
    
    // Find most productive worker
    const topWorker = Object.entries(oreDipendente).sort((a, b) => b[1] - a[1])[0];
    if (topWorker) {
      insights.push(`${topWorker[0]} è il dipendente più produttivo con ${topWorker[1].toFixed(1)} ore lavorate.`);
    }

    // Find cantiere with most hours
    const topCantiere = Object.entries(oreCantiere).sort((a, b) => b[1].ore - a[1].ore)[0];
    if (topCantiere) {
      const cantiereData = cantieri.find(c => c.value.id === topCantiere[0])?.value;
      insights.push(`Il cantiere "${cantiereData?.nome || 'Sconosciuto'}" ha richiesto ${topCantiere[1].ore.toFixed(1)} ore totali.`);
    }

    // Average hours per worker
    const avgOre = Object.values(oreDipendente).reduce((a, b) => a + b, 0) / Object.keys(oreDipendente).length;
    if (avgOre) {
      insights.push(`La media di ore lavorate per dipendente è ${avgOre.toFixed(1)} ore.`);
    }

    // Recommendations
    const recommendations: string[] = [];
    
    if (Object.keys(oreDipendente).length > 0) {
      const maxOre = Math.max(...Object.values(oreDipendente));
      const minOre = Math.min(...Object.values(oreDipendente));
      if (maxOre > minOre * 2) {
        recommendations.push('Considera di bilanciare meglio il carico di lavoro tra i dipendenti.');
      }
    }

    if (cantieri.length > 0 && Object.keys(oreCantiere).length > 0) {
      const avgOreCantiere = Object.values(oreCantiere).reduce((a, b) => a + b.ore, 0) / Object.keys(oreCantiere).length;
      recommendations.push(`Per futuri cantieri, stima circa ${avgOreCantiere.toFixed(1)} ore di lavoro in base ai dati storici.`);
    }

    return c.json({
      oreDipendente,
      materialiDipendente,
      oreCantiere,
      materialiCantiere,
      insights,
      recommendations,
    });
  } catch (error) {
    console.log(`Error fetching analytics: ${error}`);
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

// Generate PDF for preventivo/SAL
app.post('/make-server-39b96de2/generate-pdf', async (c) => {
  try {
    const user = await getUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    if (user.user_metadata.role !== 'titolare') {
      return c.json({ error: 'Only titolare can generate PDFs' }, 403);
    }

    const { type, data } = await c.req.json(); // type: 'preventivo' or 'sal'
    
    // Simple HTML to PDF conversion (in production, use proper PDF library)
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { max-width: 200px; }
            .company-info { margin-bottom: 20px; }
            .recipient-info { margin-bottom: 30px; }
            .content { margin-top: 30px; }
            .footer { margin-top: 50px; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            ${data.logo ? `<img src="${data.logo}" class="logo" />` : ''}
            <h1>${type === 'preventivo' ? 'PREVENTIVO' : 'SAL - STATO AVANZAMENTO LAVORI'}</h1>
          </div>
          
          <div class="company-info">
            <h3>Dati Azienda</h3>
            <p>${data.companyData?.nome || ''}</p>
            <p>${data.companyData?.indirizzo || ''}</p>
            <p>P.IVA: ${data.companyData?.piva || ''}</p>
          </div>
          
          <div class="recipient-info">
            <h3>Cliente</h3>
            <p>${data.recipientData?.nome || ''}</p>
            <p>${data.recipientData?.indirizzo || ''}</p>
            <p>Email: ${data.recipientData?.email || ''}</p>
          </div>
          
          <div class="content">
            <table>
              <thead>
                <tr>
                  <th>Descrizione</th>
                  <th>Quantità</th>
                  <th>Prezzo Unitario</th>
                  <th>Totale</th>
                </tr>
              </thead>
              <tbody>
                ${data.items?.map((item: any) => `
                  <tr>
                    <td>${item.descrizione}</td>
                    <td>${item.quantita}</td>
                    <td>€${item.prezzoUnitario}</td>
                    <td>€${(item.quantita * item.prezzoUnitario).toFixed(2)}</td>
                  </tr>
                `).join('') || ''}
              </tbody>
            </table>
            
            <div style="text-align: right; font-size: 18px; margin-top: 20px;">
              <strong>Totale: €${data.totale || '0.00'}</strong>
            </div>
          </div>
          
          <div class="footer">
            ${data.firma ? `<img src="${data.firma}" style="max-width: 200px;" />` : ''}
            <p>Data: ${new Date().toLocaleDateString('it-IT')}</p>
          </div>
        </body>
      </html>
    `;

    // Store the PDF data
    const pdfKey = `pdf:${user.user_metadata.companyName}:${Date.now()}`;
    await kv.set(pdfKey, {
      type,
      html,
      data,
      createdAt: new Date().toISOString(),
      recipientEmail: data.recipientData?.email,
    });

    // In a real implementation, convert HTML to PDF and send email
    // For now, return the HTML
    return c.json({ 
      success: true, 
      pdfId: pdfKey,
      html,
      message: 'PDF generato. In produzione verrà convertito e inviato automaticamente via email.',
    });
  } catch (error) {
    console.log(`Error generating PDF: ${error}`);
    return c.json({ error: 'Failed to generate PDF' }, 500);
  }
});

// Save firma
app.post('/make-server-39b96de2/firma', async (c) => {
  try {
    const user = await getUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    if (user.user_metadata.role !== 'titolare') {
      return c.json({ error: 'Only titolare can save firma' }, 403);
    }

    const { firmaData } = await c.req.json(); // base64 image
    
    const key = `firma:${user.user_metadata.companyName}`;
    await kv.set(key, {
      firmaData,
      updatedAt: new Date().toISOString(),
    });

    return c.json({ success: true });
  } catch (error) {
    console.log(`Error saving firma: ${error}`);
    return c.json({ error: 'Failed to save firma' }, 500);
  }
});

// Get firma
app.get('/make-server-39b96de2/firma', async (c) => {
  try {
    const user = await getUser(c.req.raw);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const firma = await kv.getByPrefix(`firma:${user.user_metadata.companyName}`);
    
    if (firma.length === 0) {
      return c.json({ firma: null });
    }

    return c.json({ firma: firma[0].value });
  } catch (error) {
    console.log(`Error fetching firma: ${error}`);
    return c.json({ error: 'Failed to fetch firma' }, 500);
  }
});

// Initialize storage bucket for photos
const initStorage = async () => {
  try {
    const bucketName = 'make-39b96de2-photos';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: false });
      console.log(`Created bucket: ${bucketName}`);
    }
  } catch (error) {
    console.log(`Error initializing storage: ${error}`);
  }
};

initStorage();

Deno.serve(app.fetch);