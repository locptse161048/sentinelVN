'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthProvider';
import AuthModal from './AuthModal';

export default function Header() {
    const { user, logout, openAuthModal, isAuthOpen, closeAuthModal } = useAuth();
    // const [isAuthOpen, setIsAuthOpen] = useState(false); // Removed local state
    // const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Not used currently but kept if needed

    return (
        <>
            <header className="sticky top-0 z-30 border-b border-white/10 blur-bg">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/assets/images/favicon.ico" alt="Sentinel VN" className="h-9 w-9 rounded border border-cyan-400/40" />
                        <span className="font-orbitron text-lg tracking-wider">SENTINEL <span className="text-brand-400">VN</span></span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-6 text-sm">
                        <Link href="/pricing" className="hover:text-brand-400">Bảng giá</Link>
                        <Link href="/checkout" className="hover:text-brand-400">Thanh toán</Link>
                        <Link href="/about" className="hover:text-brand-400">About</Link>
                        <Link href="/dashboard" className="hover:text-brand-400">License</Link>
                        <Link href="/contact" className="hover:text-brand-400">Hỗ trợ</Link>

                        {user ? (
                            <div className="relative group h-full flex items-center cursor-pointer">
                                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-brand-400/50 hover:bg-white/5 text-sm">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullname)}&background=1FE3FF&color=000&size=32`} className="w-6 h-6 rounded-full" alt="avatar" />
                                    <span className="max-w-[100px] truncate">Xin chào, {user.fullname}</span>
                                    <span className="text-xs">▼</span>
                                </button>
                                {/* Dropdown Menu */}
                                <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover:block z-50">
                                    <div className="bg-[#0F161C] border border-white/10 rounded-xl shadow-xl overflow-hidden">
                                        <div className="py-1">
                                            <button onClick={logout} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5">
                                                🚪 Đăng xuất
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button onClick={openAuthModal} className="ml-2 px-3 py-1.5 rounded-lg border border-white/20 hover:border-brand-400/60 text-sm">
                                <span>Đăng nhập / Đăng ký</span>
                            </button>
                        )}
                    </nav>

                    {/* Mobile Button / User Menu */}
                    <div className="md:hidden">
                        {user ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-brand-400/50 text-sm">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullname)}&background=1FE3FF&color=000&size=32`} className="w-6 h-6 rounded-full" alt="avatar" />
                                <span className="max-w-[80px] truncate">{user.fullname}</span>
                                <button onClick={logout} className="ml-2 text-red-400 text-xs border border-red-400/30 px-2 py-0.5 rounded">Exit</button>
                            </div>
                        ) : (
                            <button onClick={openAuthModal} className="px-3 py-1.5 rounded-lg border border-white/20 hover:border-brand-400/60 text-sm">
                                Đăng nhập / Đăng ký
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Auth Modal */}
            {isAuthOpen && <AuthModal onClose={closeAuthModal} />}
        </>
    );
}
