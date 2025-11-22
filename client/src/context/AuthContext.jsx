import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const response = await authAPI.getMe();
                setUser(response.data);
            } catch (err) {
                console.error('Auth check failed:', err);
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    };

    const login = async (credentials) => {
        try {
            setError(null);
            const response = await authAPI.login(credentials);
            const { token, ...userData } = response.data;

            localStorage.setItem('token', token);
            setUser(userData);

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
            const response = await authAPI.register(userData);
            const { token, ...user } = response.data;

            localStorage.setItem('token', token);
            setUser(user);

            return user;
        } catch (err) {
            const message = err.response?.data?.message || 'Errore nella registrazione';
            setError(message);
            throw new Error(message);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const value = {
        user,
        loading,
        error,
        login,
        register,
        logout,
        checkAuth,
        isOwner: user?.role === 'owner',
        isWorker: user?.role === 'worker',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
