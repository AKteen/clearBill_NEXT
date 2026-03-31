import "./globals.css";

export const metadata = {
  title: "ClearBill — AI Invoice Auditor",
  description: "Agentic AI-powered invoice processing",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <body style={{ height: "100%" }}>{children}</body>
    </html>
  );
}


