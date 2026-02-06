import './globals.css';
import { Inter, Orbitron } from 'next/font/google';
import { AuthProvider } from '@/context/AuthProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron' });

export const metadata = {
  title: 'SENTINEL VN — Security-as-a-Plugin',
  description: 'Sentinel VN — Plugin bảo mật cho VS Code, phát hiện sớm lỗ hổng và hướng dẫn khắc phục bằng AI.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className={`${inter.className} ${orbitron.variable} text-white h-full`}>
        <AuthProvider>
          <Header />
          <main className="min-h-screen">
            {children}
          </main>
          {/* Footer will go here */}
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
