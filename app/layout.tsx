// app/layout.tsx

import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Dashboard - Drivers e KPIs',
  description: 'Visualize os drivers e KPIs em um dashboard dinâmico.',
};

const plusJakartaSans = Plus_Jakarta_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--plus-jakarta-sans',
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={plusJakartaSans.variable}>
      <head>
        <title>Dashboard</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.25, minimum-scale=0.8, user-scalable=yes"
        />
      </head>
      <body>
        <main>{children}</main>
        <footer style={{ marginTop: '20px', textAlign: 'center' }}>
          <p>&copy; 2024 - Dashboard</p>
        </footer>
      </body>
    </html>
  );
}
