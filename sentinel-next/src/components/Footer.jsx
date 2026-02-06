'use client';

export default function Footer() {
    return (
        <footer className="border-t border-white/10">
            <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-white/60 text-center">
                © {new Date().getFullYear()} Sentinel VN — Security-as-a-Plugin • Website: https://sentinelvn.io.vn • Email: contact@sentinelvn.io.vn
            </div>
        </footer>
    );
}
