'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const LS_USERS = 'sentinel_users';
const LS_SESSION = 'sentinel_session';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load session on mount
    useEffect(() => {
        const sessionStr = localStorage.getItem(LS_SESSION);
        if (sessionStr) {
            const session = JSON.parse(sessionStr);
            const usersStr = localStorage.getItem(LS_USERS);
            const users = usersStr ? JSON.parse(usersStr) : {};

            if (session && session.email && users[session.email]) {
                setUser(users[session.email]);
            }
        }
        setLoading(false);
    }, []);

    const login = (email, password) => {
        const usersStr = localStorage.getItem(LS_USERS);
        const users = usersStr ? JSON.parse(usersStr) : {};

        if (users[email] && users[email].password === password) {
            localStorage.setItem(LS_SESSION, JSON.stringify({ email }));
            setUser(users[email]);
            return { success: true };
        }
        return { success: false, message: 'Sai email hoặc mật khẩu.' };
    };

    const register = (fullname, email, password) => {
        const usersStr = localStorage.getItem(LS_USERS);
        const users = usersStr ? JSON.parse(usersStr) : {};

        if (users[email]) {
            return { success: false, message: 'Email đã tồn tại.' };
        }

        const newUser = { fullname, password, email };
        users[email] = newUser;
        localStorage.setItem(LS_USERS, JSON.stringify(users));

        // Auto login after register? Original logic redirected to login form.
        // But here we can just return success and let UI handle it.
        return { success: true };
    };

    const logout = () => {
        localStorage.removeItem(LS_SESSION);
        setUser(null);
    };

    const [isAuthOpen, setIsAuthOpen] = useState(false);

    const openAuthModal = () => setIsAuthOpen(true);
    const closeAuthModal = () => setIsAuthOpen(false);

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, isAuthOpen, openAuthModal, closeAuthModal }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
