export const metadata = {
    title: 'SENTINEL VN — Về chúng tôi',
    description: 'Sentinel VN — Plugin bảo mật cho VS Code, phát hiện sớm lỗ hổng và hướng dẫn khắc phục bằng AI.',
};

export default function About() {
    return (
        <section id="about" className="py-20 bg-gradient-to-b from-black/20 to-black/5 border-t border-white/10">
            <div className="mx-auto max-w-5xl px-6 text-center">
                <h2 className="font-orbitron text-3xl">Về Sentinel VN</h2>

                <p className="text-white/85 text-lg leading-relaxed max-w-3xl mx-auto mt-6">
                    Sentinel VN được xây dựng bởi một nhóm kỹ sư bảo mật và sinh viên kỹ thuật ở Việt Nam
                    với mục tiêu rất rõ ràng: đưa tiêu chuẩn bảo mật đẳng cấp doanh nghiệp vào ngay trong
                    quá trình soạn thảo code — thay vì đợi pentest cuối kỳ.
                </p>

                <p className="text-white/70 text-base leading-relaxed max-w-3xl mx-auto mt-4">
                    Chúng tôi tin rằng bảo mật không nên là một cuộc điều tra "hậu kỳ", mà phải là công cụ
                    hỗ trợ lập trình viên mỗi ngày — dễ hiểu, dễ dùng, và mang tính giáo dục. Sentinel VN
                    giúp bạn phát hiện rủi ro, hiểu nguyên nhân, và khắc phục triệt để.
                </p>

                <div className="grid md:grid-cols-3 gap-6 text-left text-sm text-white/80 max-w-4xl mx-auto mt-10">
                    <div className="card p-5">
                        <h4 className="font-semibold text-white">Tư duy dành cho Developer</h4>
                        <p className="mt-2">Không phải checklist khô cứng. Chúng tôi đưa giải thích, bối cảnh tấn công
                            và gợi ý bản vá dưới dạng bạn có thể copy & áp dụng ngay.</p>
                    </div>
                    <div className="card p-5">
                        <h4 className="font-semibold text-white">Tương thích quy trình doanh nghiệp</h4>
                        <p className="mt-2">Xuất SARIF/HTML, CI/CD Gatekeeper, hỗ trợ tuân thủ như ISO 27001 / SOC2,
                            phù hợp cho đội ngũ cần audit trail.</p>
                    </div>
                    <div className="card p-5">
                        <h4 className="font-semibold text-white">Sẵn sàng mở rộng</h4>
                        <p className="mt-2">PREMIUM cho cá nhân và đội nhỏ. PRO cho doanh nghiệp cần quản lý license tập trung,
                            SSO/SCIM và triển khai on-prem.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
