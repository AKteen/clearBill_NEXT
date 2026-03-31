import Link from "next/link";
import { redirect } from "next/navigation";


export default function Home() {

  redirect("/login");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-3">
          Clear<span style={{ color: "var(--accent)" }}>Bill</span>
        </h1>
        <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
          Agentic AI invoice auditor — upload, extract, validate, approve.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/upload"
          className="px-6 py-3 rounded-xl font-semibold text-white transition"
          style={{ background: "var(--accent)" }}
        >
          Upload Invoice
        </Link>
        <Link
          href="/dashboard"
          className="px-6 py-3 rounded-xl font-semibold transition"
          style={{ background: "var(--surface-2)", color: "var(--text-primary)" }}
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}