import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { jwtDecode } from 'jwt-decode';
import { authAPI } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

/**
 * Decodifica il JWT e verifica se è scaduto.
 * @param {string} token - Il token JWT
 * @returns {{ isExpired: boolean, payload: object|null }} - Stato di scadenza e payload decodificato
 */
const decodeAndCheckToken = (token) => {
    try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000; // exp è in secondi
        const isExpired = decoded.exp < currentTime;

        console.log('[Auth] Token decoded:', {
            userId: decoded.id,
            exp: new Date(decoded.exp * 1000).toISOString(),
            isExpired
        });

        return { isExpired, payload: decoded };
    } catch (error) {
        console.error('[Auth] Errore decodifica token:', error);
        return { isExpired: true, payload: null };
    }
};

/**
 * Verifica se l'errore è un 401/403 (token invalido) o un errore di rete/5xx.
 * @param {Error} error - L'errore da axios
 * @returns {boolean} - true se è un errore di autenticazione (401/403)
 */
const isAuthError = (error) => {
    const status = error?.response?.status;
    // 401 = Unauthorized (token invalido/scaduto)
    // 403 = Forbidden (token valido ma permessi insufficienti)
    return status === 401 || status === 403;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Stato per indicare problemi di connessione (non rimuoviamo il token)
    const [connectionError, setConnectionError] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    /**
     * Verifica l'autenticazione all'avvio dell'app.
     * 
     * LOGICA:
     * 1. Legge il token da localStorage
     * 2. Se non c'è token → utente non loggato
     * 3. Se c'è token:
     *    - Decodifica il JWT per controllare exp (scadenza)
     *    - Se scaduto → rimuove token e logout
     *    - Se NON scaduto → imposta user iniziale dal token, poi chiama /auth/me
     * 4. La chiamata /auth/me:
     *    - 200 OK → aggiorna user con dati freschi dal server
     *    - 401/403 → token invalido sul server, rimuove e logout
     *    - Errore rete/5xx → MANTIENE il token e user iniziale, mostra avviso connessione
     */
    const checkAuth = async () => {
        const token = localStorage.getItem('token');

        if (!token) {
            console.log('[Auth] Nessun token trovato in localStorage');
            setLoading(false);
            return;
        }

        // Step 1: Decodifica JWT e controlla scadenza
        const { isExpired, payload } = decodeAndCheckToken(token);

        if (isExpired) {
            console.log('[Auth] Token scaduto (exp superato), rimuovo e logout');
            localStorage.removeItem('token');
            setUser(null);
            setLoading(false);
            return;
        }

        // Step 2: Token non scaduto, imposta user iniziale dal token
        // Questo permette di mostrare subito i dati base mentre verifichiamo col server
        // Nota: se il backend non mette ancora `role` nel JWT, usiamo un fallback
        // salvato dalla sessione precedente (utile per evitare “buchi” al refresh).
        const lastRole = localStorage.getItem('work360_lastRole');
        const initialUser = {
            _id: payload.id,
            role: payload.role || lastRole || undefined,
            _fromToken: true
        };
        setUser(initialUser);
        console.log('[Auth] User iniziale impostato da token:', initialUser);

        // Step 3: Verifica col backend tramite /auth/me
        try {
            const response = await authAPI.getMe();
            console.log('[Auth] /auth/me OK, aggiorno user con dati server');
            setUser(response.data);
            if (response.data?.role) {
                localStorage.setItem('work360_lastRole', response.data.role);
            }
            setConnectionError(false);
        } catch (err) {
            console.error('[Auth] Errore in /auth/me:', err);

            if (isAuthError(err)) {
                // 401/403: Token invalido o scaduto lato server
                // In questo caso DOBBIAMO rimuovere il token e fare logout
                console.log('[Auth] Errore 401/403: token invalido, rimuovo e logout');
                localStorage.removeItem('token');
                setUser(null);
                setConnectionError(false);
            } else {
                // Errore di rete, timeout, o 5xx del server
                // NON rimuoviamo il token, manteniamo user iniziale
                console.log('[Auth] Errore rete/5xx: mantengo token e user iniziale');
                setConnectionError(true);
                // user rimane quello iniziale impostato dal token
            }
        }

        setLoading(false);
    };

    const login = async (credentials) => {
        try {
            setError(null);
            setConnectionError(false);
            const response = await authAPI.login(credentials);
            const { token, ...userData } = response.data;

            localStorage.setItem('token', token);
            setUser(userData);
            if (userData?.role) {
                localStorage.setItem('work360_lastRole', userData.role);
            }

            return userData;
        } catch (err) {
            const message = err.response?.data?.message || 'Errore nel login';
            setError(message);
            throw new Error(message);
        }
    };

    const register = async (userData) => {
        try {
            setError(null);
            setConnectionError(false);
            const response = await authAPI.register(userData);
            const { token, ...user } = response.data;

            localStorage.setItem('token', token);
            setUser(user);
            if (user?.role) {
                localStorage.setItem('work360_lastRole', user.role);
            }

            return user;
        } catch (err) {
            const message = err.response?.data?.message || 'Errore nella registrazione';
            setError(message);
            throw new Error(message);
        }
    };

    const logout = () => {
        console.log('[Auth] Logout eseguito');
        localStorage.removeItem('token');
        localStorage.removeItem('work360_lastRole');
        setUser(null);
        setConnectionError(false);
    };

    /**
     * Riprova la verifica dell'autenticazione.
     * Utile quando l'utente riprende connettività dopo un errore di rete.
     */
    const retryAuth = () => {
        console.log('[Auth] Retry auth richiesto');
        setLoading(true);
        setConnectionError(false);
        checkAuth();
    };

    const value = {
        user,
        loading,
        error,
        connectionError, // Esposto per mostrare eventuali messaggi "Problema di connessione"
        login,
        register,
        logout,
        checkAuth,
        retryAuth, // Nuovo: permette di riprovare la connessione
        isOwner: user?.role === 'owner',
        isWorker: user?.role === 'worker',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired
};
