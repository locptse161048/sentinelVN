import Link from 'next/link';
import HeroSection from '@/components/HeroSection';

export default function Home() {
  return (
    <>
      <HeroSection />

      {/* FEATURES */}
      <section id="features" className="relative py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="font-orbitron text-3xl text-center">Tính năng chính</h2>
          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm text-white/85">
            <div className="card p-6">✅ Quét mã thời gian thực (LLM-assisted)</div>
            <div className="card p-6">✅ Rule Pack OWASP, SANS Top 25</div>
            <div className="card p-6">✅ Gợi ý bản vá / PR đề xuất tự động</div>
            <div className="card p-6">✅ Báo cáo tuân thủ ISO 27001, SOC2</div>
            <div className="card p-6">✅ CI/CD Gatekeeper, xuất SARIF/HTML</div>
            <div className="card p-6">✅ Tùy chọn on-prem / self-host</div>
          </div>
        </div>
      </section>
    </>
  );
}
