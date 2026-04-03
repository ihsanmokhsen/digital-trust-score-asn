import "./globals.css";

export const metadata = {
  title: "Digital Trust Score ASN",
  description: "Platform Pengukuran dan Monitoring Kesadaran Keamanan Data Pemerintah",
  icons: {
    icon: "/logoaplikasi.png",
    shortcut: "/logoaplikasi.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
