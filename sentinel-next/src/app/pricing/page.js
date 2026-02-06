import Link from 'next/link';

export const metadata = {
    title: 'SENTINEL VN — Bảng giá',
    description: 'Sentinel VN — Plugin bảo mật cho VS Code, phát hiện sớm lỗ hổng và hướng dẫn khắc phục bằng AI. Chỉ từ 75.000đ/tháng.',
};

export default function Pricing() {
    return (
        <section id="pricing" className="py-20 bg-gradient-to-b from-black/60 to-black/20 border-t border-white/10">
            <div className="mx-auto max-w-7xl px-6">
                <h2 className="font-orbitron text-3xl text-center">Bảng giá</h2>
                <p className="text-center text-white/70 mt-2">Chọn gói phù hợp, có thể nâng cấp bất cứ lúc nào.</p>

                <div className="grid md:grid-cols-3 gap-6 mt-10">
                    {/* FREE */}
                    <div className="card p-6 flex flex-col">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold">FREE</h3>
                            <span className="badge">Cá nhân</span>
                        </div>
                        <p className="mt-2 text-white/70">Quét cơ bản, rule giới hạn.</p>
                        <div className="mt-4 text-4xl font-orbitron">0đ<span className="text-base font-normal text-white/60">/tháng</span></div>
                        <ul className="mt-4 space-y-2 text-sm text-white/80">
                            <li>• 100 lần quét/tháng</li>
                            <li>• Rule OWASP cơ bản</li>
                            <li>• Báo cáo HTML</li>
                        </ul>
                        {/* FREE không tạo license qua checkout */}
                        <Link href="/contact" className="mt-auto btn text-center">Dùng miễn phí</Link>
                    </div>

                    {/* PREMIUM (75k/tháng) */}
                    <div className="card p-6 flex flex-col border-brand-400/50">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold">PREMIUM</h3>
                            <span className="badge">Developer</span>
                        </div>
                        <p className="mt-2 text-white/70">Toàn bộ rule + gợi ý bản vá, phù hợp developer cá nhân và đội nhỏ.</p>
                        <div className="mt-4 text-4xl font-orbitron">75.000đ<span className="text-base font-normal text-white/60">/tháng</span></div>
                        <ul className="mt-4 space-y-2 text-sm text-white/80">
                            <li>• Không giới hạn dự án</li>
                            <li>• Gợi ý PR/bản vá</li>
                            <li>• Xuất SARIF/HTML</li>
                        </ul>
                        <Link href="/checkout?plan=PREMIUM" className="mt-auto btn text-center">Mua PREMIUM</Link>
                    </div>

                    {/* PRO (Doanh nghiệp / Liên hệ) */}
                    <div className="card p-6 flex flex-col">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold">PRO</h3>
                            <span className="badge">Doanh nghiệp</span>
                        </div>
                        <p className="mt-2 text-white/70">CI/CD Gatekeeper + On-prem + Quản lý license theo đội.</p>
                        <div className="mt-4 text-4xl font-orbitron">Liên hệ</div>
                        <ul className="mt-4 space-y-2 text-sm text-white/80">
                            <li>• Quản lý license theo đội nhóm</li>
                            <li>• SSO / SCIM / On-prem</li>
                            <li>• Hỗ trợ kỹ thuật ưu tiên</li>
                        </ul>
                        <Link href="/contact" className="mt-auto btn text-center">Liên hệ báo giá</Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
