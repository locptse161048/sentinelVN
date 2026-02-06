'use client';

import Link from 'next/link';

export default function HeroSection() {
    return (
        <section id="home" className="relative overflow-hidden text-center px-6 py-24 md:py-28">
            <h1 className="font-orbitron text-5xl md:text-7xl tracking-widest mb-6">
                SENTINEL <span className="text-brand-400">VN</span>
            </h1>

            <p className="mx-auto text-lg md:text-xl text-white/85 tracking-tight max-w-5xl">
                Trong kỷ nguyên số, <strong>bảo mật không chỉ là rào chắn — mà là nền tảng của đổi mới.</strong>
            </p>

            <div className="max-w-3xl mx-auto text-lg md:text-xl text-white/85 leading-relaxed space-y-4 mt-4">
                <p>
                    <strong>Sentinel VN</strong> ra đời với sứ mệnh giúp lập trình viên Việt phát hiện sớm, hiểu sâu và xử lý triệt
                    để các rủi ro bảo mật ngay trong quá trình viết code.
                </p>
                <p>
                    Ứng dụng <strong>AI phân tích thông minh</strong> và khả năng <strong>tích hợp liền mạch trong VS
                        Code</strong>, Sentinel VN mang đến trải nghiệm bảo mật chủ động, trực quan và dễ tiếp cận cho mọi developer.
                </p>
                <p className="text-brand-400 font-semibold">
                    Chỉ từ 75.000 đồng mỗi tháng — Viết code an toàn hơn, thông minh hơn và tự
                    tin hơn mỗi ngày.
                </p>
            </div>

            <Link href="/contact" className="mt-8 inline-block px-7 py-3 rounded-xl border border-brand-400 hover:bg-brand-400/30 text-base shadow-lg transition">
                📞 Liên hệ ngay với chúng tôi
            </Link>

            <div className="mt-10 w-full max-w-4xl mx-auto shadow-xl border border-brand-400/40 rounded-xl overflow-hidden">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video controls autoPlay muted loop playsInline className="w-full h-auto rounded-xl">
                    <source src="/assets/videos/SourceFinal.mp4" type="video/mp4" />
                    Trình duyệt của bạn không hỗ trợ video HTML5.
                </video>
            </div>

            <div className="mx-auto max-w-7xl px-6 mt-8">
                <div className="rounded-xl border border-brand-400/50 bg-black/60 backdrop-blur-sm overflow-hidden">
                    <div className="w-full px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between text-sm font-semibold tracking-widest">
                        <div className="uppercase">EXE201 — GROUP 78</div>
                        <div className="uppercase">Lecture: Ms Phan Hà</div>
                    </div>
                </div>
            </div>
        </section>
    );
}
