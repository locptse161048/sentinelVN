export const metadata = {
    title: 'SENTINEL VN — Hỗ trợ',
    description: 'Sentinel VN — Plugin bảo mật cho VS Code, phát hiện sớm lỗ hổng và hướng dẫn khắc phục bằng AI.',
};

export default function Contact() {
    return (
        <>
            {/* SUPPORT */}
            <section id="support" className="py-20">
                <div className="mx-auto max-w-6xl px-6">
                    <h2 className="font-orbitron text-3xl text-center">Hỗ trợ & Liên hệ</h2>
                    <div className="grid md:grid-cols-3 gap-6 mt-10">
                        <div className="card p-6 text-white/80 text-sm">
                            <h4 className="font-semibold text-white">FAQ nhanh</h4>
                            <ul className="mt-3 space-y-2">
                                <li>• Mã kích hoạt áp dụng cho VS Code plugin Sentinel VN.</li>
                                <li>• PREMIUM: kích hoạt theo tài khoản email.</li>
                                <li>• PRO: quản lý theo đội nhóm/SSO.</li>
                            </ul>
                        </div>
                        <div className="card p-6 text-white/80 text-sm">
                            <h4 className="font-semibold text-white">Kênh hỗ trợ</h4>
                            <p className="mt-3">Email: <span className="link">contact@sentinelvn.io.vn</span></p>
                            <p>Website: <span className="link">https://sentinelvn.io.vn</span></p>
                        </div>
                        <div className="card p-6 text-white/80 text-sm">
                            <h4 className="font-semibold text-white">Cổng thanh toán</h4>
                            <p className="mt-3">
                                Demo tích hợp <span className="badge">VNPay</span> /
                                <span className="badge">MoMo</span>. Thực tế sẽ dùng webhook xác thực & phát hành license
                                server-side.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CONTACT */}
            <section id="contact" className="py-20">
                <div className="mx-auto max-w-3xl px-6 text-center">
                    <h2 className="font-orbitron text-3xl">Liên hệ dùng thử</h2>
                    <form action="#" method="POST" className="mt-8 grid gap-4 text-left">
                        <input name="name" required placeholder="Họ và tên" className="input" />
                        <input name="email" type="email" required placeholder="Email" className="input" />
                        <textarea name="message" rows="4" required placeholder="Nhu cầu của bạn" className="input"></textarea>
                        <button
                            className="px-5 py-3 rounded-xl bg-brand-400/25 border border-brand-400/60 hover:bg-brand-400/35 w-fit mx-auto text-white">
                            Gửi yêu cầu
                        </button>
                    </form>
                </div>
            </section>
        </>
    );
}
