import './globals.css';
import React from 'react';

export const metadata = {
  title: 'CarRent SaaS — Multi-Tenant Car Rental System',
  description: 'Enterprise Multi-Tenant Car Rental Management System',
  icons: {
    icon: '/images/logo.png?v=2',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
