'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthProvider';

export default function AuthModal({ onClose }) {
    const { login, register } = useAuth();
    const [mode, setMode] = useState('login'); // 'login' | 'signup'

    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullname, setFullname] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        const res = login(email, password);
        if (res.success) {
            onClose();
            // Reset form?
        } else {
            setError(res.message);
        }
    };

    const handleRegister = (e) => {
        e.preventDefault();
        if (!fullname) {
            setError('Vui lòng nhập họ tên.');
            return;
        }
        const res = register(fullname, email, password);
        if (res.success) {
            setSuccess('Đăng ký thành công! Hãy đăng nhập.');
            setMode('login');
            setError('');
            // Keep email filled
        } else {
            setError(res.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full p-6 relative bg-[#0A1015]"> {/* Added bg color explicitly just in case */}
                <button onClick={onClose} className="absolute right-3 top-3 text-white/60 hover:text-white">✕</button>

                <div className="text-xl font-semibold mb-4 text-center">
                    {mode === 'login' ? 'Đăng nhập từ Sentinel VN' : 'Đăng ký tài khoản mới'}
                </div>

                {mode === 'login' && (
                    <form onSubmit={handleLogin} className="grid gap-4">
                        <input
                            className="input"
                            type="email"
                            placeholder="Email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                        <input
                            className="input"
                            type="password"
                            placeholder="Mật khẩu"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                        <button className="btn w-full">Đăng nhập</button>
                        <div className={`text-sm text-center min-h-[20px] ${success ? 'text-green-400' : 'text-red-400'}`}>
                            {error || success}
                        </div>
                        <div className="text-sm text-center text-white/60">
                            Chưa có tài khoản? <button type="button" onClick={() => { setMode('signup'); setError(''); setSuccess(''); }} className="text-brand-400 hover:underline">Đăng ký ngay</button>
                        </div>
                    </form>
                )}

                {mode === 'signup' && (
                    <form onSubmit={handleRegister} className="grid gap-4">
                        <input
                            className="input"
                            type="text"
                            placeholder="Họ và Tên"
                            required
                            value={fullname}
                            onChange={e => setFullname(e.target.value)}
                        />
                        <input
                            className="input"
                            type="email"
                            placeholder="Email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                        <input
                            className="input"
                            type="password"
                            placeholder="Mật khẩu (≥6 ký tự)"
                            minLength={6}
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                        <button className="btn w-full">Đăng ký</button>
                        <div className="text-sm text-red-400 text-center min-h-[20px]">{error}</div>
                        <div className="text-sm text-center text-white/60">
                            Đã có tài khoản? <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="text-brand-400 hover:underline">Đăng nhập</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
