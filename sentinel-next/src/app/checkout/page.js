'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function CheckoutContent() {
    const searchParams = useSearchParams();
    const plan = searchParams.get('plan') || 'PREMIUM';
    const [successMsg, setSuccessMsg] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Demo implementation
        // In a real app, this would redirect to payment gateway
        // Here we will simulate generating license
        // But since this is frontend, we'll just show a success message or redirect to dashboard

        // For now, simpler demo:
        const formData = new FormData(e.target);
        const fullName = formData.get('fullName');
        const email = formData.get('email');

        // Check local storage for licenses (mocking backend)
        // Actually interacting with localStorage in Next.js needs care due to SSR
        if (typeof window !== 'undefined') {
            const LS_LICENSES = 'sentinel_licenses';
            const licenses = JSON.parse(localStorage.getItem(LS_LICENSES) || '{}');
            const userLicenses = licenses[email] || [];

            // Generate mock key
            const key = 'SK-' + Math.random().toString(36).substr(2, 9).toUpperCase();
            const newLicense = {
                key,
                plan: plan,
                status: 'active',
                createdAt: Date.now(),
                expiresAt: Date.now() + 30 * 24 * 3600 * 1000 // 30 days
            };

            userLicenses.push(newLicense);
            licenses[email] = userLicenses;
            localStorage.setItem(LS_LICENSES, JSON.stringify(licenses));

            // Also update session if not logged in? 
            // For demo simplicity, just show message
            setSuccessMsg(`Thanh toán thành công (Demo)! License Key: ${key}. Vui lòng kiểm tra Dashboard.`);
        }
    };

    return (
        <section id="checkout" className="py-20">
            <div className="mx-auto max-w-3xl px-6 text-center">
                <h2 className="font-orbitron text-3xl">Thanh toán</h2>
                <p className="text-white/70 mt-2 max-w-2xl mx-auto">
                    Demo: tạo license tự động sau khi “thanh toán”. Gói FREE không yêu cầu thanh toán hoặc license.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 grid gap-4 text-left">
                    <div className="grid md:grid-cols-2 gap-4">
                        <input className="input" name="fullName" required placeholder="Họ và tên" />
                        <input className="input" name="email" type="email" required placeholder="Email" />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <select name="plan" className="input" required defaultValue={plan}>
                            {/* FREE intentionally missing */}
                            <option value="PREMIUM">PREMIUM — 75.000đ/tháng</option>
                        </select>

                        <select name="cycle" className="input" required>
                            <option value="monthly">Thanh toán theo tháng</option>
                            <option value="yearly">Theo năm (tiết kiệm 20%)</option>
                        </select>

                        <select name="gateway" className="input" required>
                            <option value="VNPay">VNPay (demo)</option>
                            <option value="MoMo">MoMo (demo)</option>
                            <option value="BankTransfer">Chuyển khoản (manual)</option>
                        </select>
                    </div>

                    <div className="text-white/70 text-sm">
                        * Đây là môi trường demo: nhấn “Thanh toán” sẽ sinh license key (chỉ cho PREMIUM hoặc PRO)
                        và đưa vào License Dashboard.
                    </div>

                    <button className="btn w-fit">Thanh toán</button>

                    {successMsg && (
                        <div className="mt-4 p-4 rounded bg-green-500/20 border border-green-500/50 text-green-300">
                            {successMsg}
                        </div>
                    )}
                </form>
            </div>
        </section>
    );
}

export default function Checkout() {
    return (
        <Suspense fallback={<div className="text-center py-20">Loading...</div>}>
            <CheckoutContent />
        </Suspense>
    );
}
