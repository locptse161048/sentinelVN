'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthProvider';

export default function Dashboard() {
    const { user, logout, openAuthModal } = useAuth();
    const [licenses, setLicenses] = useState([]);
    const [activateMsg, setActivateMsg] = useState('');

    // Load licenses from localStorage on mount or when user changes
    useEffect(() => {
        if (user && typeof window !== 'undefined') {
            const LS_LICENSES = 'sentinel_licenses';
            const allLicenses = JSON.parse(localStorage.getItem(LS_LICENSES) || '{}');
            const userLicenses = allLicenses[user.email] || [];
            // Sort by createdAt desc
            userLicenses.sort((a, b) => b.createdAt - a.createdAt);
            setLicenses(userLicenses);
        } else {
            setLicenses([]);
        }
    }, [user]);

    const updateLicensesInStorage = (newLicenses) => {
        if (!user) return;
        const LS_LICENSES = 'sentinel_licenses';
        const allLicenses = JSON.parse(localStorage.getItem(LS_LICENSES) || '{}');
        allLicenses[user.email] = newLicenses;
        localStorage.setItem(LS_LICENSES, JSON.stringify(allLicenses));
        setLicenses(newLicenses);
    };

    const handleCopy = (key, btnId) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(key);
            // Simple visual feedback could be improved but keeping it simple for now
            const btn = document.getElementById(btnId);
            if (btn) {
                const originalText = btn.textContent;
                btn.textContent = 'Đã copy';
                setTimeout(() => btn.textContent = originalText, 800);
            }
        }
    };

    const handleExtend = (key) => {
        const newLicenses = licenses.map(lic => {
            if (lic.key === key) {
                // Add 30 days
                return { ...lic, expiresAt: lic.expiresAt + (30 * 24 * 3600 * 1000) };
            }
            return lic;
        });
        updateLicensesInStorage(newLicenses);
    };

    const handleToggle = (key) => {
        const newLicenses = licenses.map(lic => {
            if (lic.key === key) {
                return { ...lic, status: lic.status === 'active' ? 'paused' : 'active' };
            }
            return lic;
        });
        updateLicensesInStorage(newLicenses);
    };

    const handleActivate = (e) => {
        e.preventDefault();
        setActivateMsg('');
        const rawKey = e.target.key.value.trim().toUpperCase();

        if (!rawKey || rawKey.length < 10) {
            setActivateMsg('Key không hợp lệ.');
            return;
        }

        let found = false;
        const newLicenses = licenses.map(lic => {
            if (lic.key === rawKey) {
                found = true;
                // Activate and extend
                return {
                    ...lic,
                    status: 'active',
                    expiresAt: Date.now() + (30 * 24 * 3600 * 1000)
                };
            }
            return lic;
        });

        if (!found) {
            setActivateMsg('Key không thuộc tài khoản này hoặc không hợp lệ.');
        } else {
            updateLicensesInStorage(newLicenses);
            setActivateMsg('Đã gia hạn license.');
            e.target.reset();
        }
    };

    const fmtDate = (ts) => {
        if (!ts) return '-';
        return new Date(ts).toLocaleDateString('vi-VN');
    };

    return (
        <section id="dashboard" className="py-20 bg-gradient-to-b from-black/60 to-black/20 border-t border-white/10">
            <div className="mx-auto max-w-7xl px-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <h2 className="font-orbitron text-3xl">Quản lý License</h2>
                    {user && (
                        <div className="text-sm text-right">
                            <span className="text-white/70">{user.email}</span>
                            <button
                                onClick={logout}
                                className="ml-2 px-3 py-1 rounded-lg border border-white/20 hover:border-brand-400/60 text-sm">
                                Đăng xuất
                            </button>
                        </div>
                    )}
                </div>

                {!user ? (
                    <div className="card p-6 mt-6">
                        <p>Bạn cần <button className="link" onClick={openAuthModal}>đăng nhập</button> để xem license.</p>
                        {/* Note: Ideally we open the modal via context or prop, but clicking the hidden button in header is a quick hack if context isn't fully exposed for modal control here. 
                    Actually, checking Header.jsx, it uses local state for modal. 
                    So we might need to tell user to click login in header or show a message. 
                    Let's just show standard message. */}
                    </div>
                ) : (
                    <div className="mt-6">
                        <div className="overflow-x-auto border border-white/10 rounded-xl">
                            <table className="min-w-full text-sm">
                                <thead className="bg-white/5 text-white">
                                    <tr>
                                        <th className="px-4 py-3 text-left">License Key</th>
                                        <th className="px-4 py-3 text-left">Gói</th>
                                        <th className="px-4 py-3 text-left">Trạng thái</th>
                                        <th className="px-4 py-3 text-left">Ngày tạo</th>
                                        <th className="px-4 py-3 text-left">Hết hạn</th>
                                        <th className="px-4 py-3 text-left">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10 text-white/90 bg-black/40">
                                    {licenses.length === 0 ? (
                                        <tr><td colSpan="6" className="px-4 py-4 text-white/60">Chưa có license.</td></tr>
                                    ) : (
                                        licenses.map((lic, idx) => (
                                            <tr key={lic.key}>
                                                <td className="px-4 py-3 font-mono">{lic.key}</td>
                                                <td className="px-4 py-3">{lic.plan}</td>
                                                <td className={`px-4 py-3 ${lic.status === 'active' ? 'text-emerald-400' : 'text-white/60'}`}>
                                                    {lic.status}
                                                </td>
                                                <td className="px-4 py-3">{fmtDate(lic.createdAt)}</td>
                                                <td className="px-4 py-3">{fmtDate(lic.expiresAt)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            onClick={() => handleExtend(lic.key)}
                                                            className="px-3 py-1 rounded border border-white/20 hover:border-brand-400/60 text-xs">
                                                            Gia hạn +30d
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggle(lic.key)}
                                                            className="px-3 py-1 rounded border border-white/20 hover:border-brand-400/60 text-xs">
                                                            {lic.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'}
                                                        </button>
                                                        <button
                                                            id={`btn-copy-${lic.key}`}
                                                            onClick={() => handleCopy(lic.key, `btn-copy-${lic.key}`)}
                                                            className="px-3 py-1 rounded border border-white/20 hover:border-brand-400/60 text-xs">
                                                            Copy Key
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 grid md:grid-cols-2 gap-4">
                            <div className="card p-4">
                                <h4 className="font-semibold text-white">Kích hoạt bằng khóa</h4>
                                <form onSubmit={handleActivate} className="mt-3 grid gap-2 text-sm">
                                    <input className="input" name="key" placeholder="Dán License Key" required />
                                    <button className="btn w-fit">Kích hoạt</button>
                                    {activateMsg && <div className="text-sm text-white/70">{activateMsg}</div>}
                                </form>
                            </div>
                            <div className="card p-4 text-sm text-white/80">
                                <h4 className="font-semibold text-white">Gia hạn / Nâng cấp</h4>
                                <p className="text-white/70 mt-2">
                                    Chọn license trong bảng và bấm “Gia hạn +30d” để gia hạn 30 ngày (demo),
                                    hoặc “Tạm dừng / Kích hoạt” để bật / tắt license.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
