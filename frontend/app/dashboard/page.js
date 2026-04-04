"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { requireAuth, signOut } from "../../lib/auth";
import { uploadInvoice, getDocuments, getAuditStats } from "../../lib/api";

import Image from 'nex/image'

const C = {
  bg: "#ffffff",
  bg2: "#f7f7f8",
  bg3: "#f0f0f2",
  border: "#e4e4e7",
  accent: "#6c63ff",
  accentLight: "#ede9ff",
  success: "#16a34a",
  successLight: "#dcfce7",
  danger: "#dc2626",
  dangerLight: "#fee2e2",
  warning: "#d97706",
  warningLight: "#fef3c7",
  text: "#09090b",
  text2: "#71717a",
  text3: "#a1a1aa",
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [docs, setDocs] = useState([]);
  const [stats, setStats] = useState(null);
  const [messages, setMessages] = useState([{
    id: 1, role: "ai", type: "greeting",
    content: "Hello! I'm ClearBill. Upload an invoice and I'll extract, validate and audit it instantly."
  }]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const fileInputRef = useRef();
  const chatEndRef = useRef();

  useEffect(() => {
    async function init() {
      const u = await requireAuth(router);
      if (!u) return;
      setUser(u);
      await loadData();
    }
    init();
  }, [router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadData() {
    try {
      const [docsRes, statsRes] = await Promise.all([getDocuments(), getAuditStats()]);
      setDocs(docsRes.data || []);
      setStats(statsRes.data || null);
    } catch (e) { console.error(e); }
  }

  async function handleFile(file) {
    if (!file || uploading) return;
    setUploading(true);
    setProgress(0);
    setMessages(prev => [...prev,
      { id: Date.now(), role: "user", type: "upload", filename: file.name },
      { id: Date.now() + 1, role: "ai", type: "loading" }
    ]);
    try {
      const res = await uploadInvoice(file, setProgress);
      setMessages(prev => [
        ...prev.filter(m => m.type !== "loading"),
        { id: Date.now() + 2, role: "ai", type: "result", result: res.data }
      ]);
      await loadData();
    } catch (err) {
      setMessages(prev => [
        ...prev.filter(m => m.type !== "loading"),
        { id: Date.now() + 2, role: "ai", type: "error", content: err.response?.data?.detail || "Failed to process invoice." }
      ]);
    } finally {
      setUploading(false);
    }
  }

  function handleSidebarClick(doc) {
    setSelectedDoc(doc);
    setMessages(prev => {
      const exists = prev.find(m => m.result?.document_id === doc.id);
      if (exists) return prev;
      return [...prev, {
        id: Date.now(), role: "ai", type: "result",
        result: {
          document_id: doc.id,
          is_compliant: doc.is_compliant,
          compliance_score: doc.compliance_score,
          extracted_data: doc.extracted_data,
          audit_result: doc.audit_result,
          cloudinary_url: doc.cloudinary_url,
          status: doc.status
        }
      }];
    });
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: C.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Sidebar */}
      <aside style={{ width: "260px", minWidth: "260px", height: "100vh", background: C.bg2, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>

        {/* Logo */}
        <div style={{ padding: "18px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "10px" }}>
           <Image src="/logofont.png" alt="Logo" width={120} height={40} priority />
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ padding: "12px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                ["Total", stats.total, C.text],
                ["Approved", stats.approved, C.success],
                ["Rejected", stats.rejected, C.danger],
                ["Avg", `${Math.round(stats.avg_compliance_score)}%`, C.accent],
              ].map(([label, value, color]) => (
                <div key={label} style={{ background: C.bg, borderRadius: "8px", padding: "8px 10px", border: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: "10px", color: C.text3, marginBottom: "2px" }}>{label}</p>
                  <p style={{ fontSize: "18px", fontWeight: 700, color }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: C.text3, padding: "0 8px 8px", letterSpacing: "0.08em" }}>HISTORY</p>
          {docs.length === 0 ? (
            <p style={{ fontSize: "12px", color: C.text3, textAlign: "center", padding: "20px 8px" }}>No invoices yet</p>
          ) : docs.map(doc => (
            <button key={doc.id} onClick={() => handleSidebarClick(doc)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 8px", borderRadius: "8px", border: "none", cursor: "pointer",
              background: selectedDoc?.id === doc.id ? C.accentLight : "transparent",
              textAlign: "left", marginBottom: "2px"
            }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
                background: doc.is_compliant ? C.successLight : C.dangerLight,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={doc.is_compliant ? C.success : C.danger} strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "12px", fontWeight: 500, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {doc.original_filename}
                </p>
                <p style={{ fontSize: "11px", color: C.text3 }}>
                  {doc.compliance_score}% · {doc.is_compliant ? "Approved" : "Rejected"}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* User */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "50%", background: C.accentLight,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "13px", fontWeight: 700, color: C.accent, flexShrink: 0
          }}>
            {user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <p style={{ fontSize: "12px", fontWeight: 500, color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.email || "User"}
          </p>
          <button onClick={async () => { await signOut(); router.push("/login"); }}
            title="Sign out"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: C.text3, display: "flex" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: "16px", fontWeight: 700, color: C.text }}>Invoice Auditor</h1>
            <p style={{ fontSize: "12px", color: C.text2 }}>Upload invoices for AI-powered compliance analysis</p>
          </div>
          <button onClick={() => fileInputRef.current?.click()} style={{
            display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px",
            borderRadius: "10px", background: C.accent, color: "white",
            border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
            Upload Invoice
          </button>
        </div>

        {/* Chat */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {messages.map(msg => <ChatMessage key={msg.id} msg={msg} C={C} />)}
          {uploading && (
            <div style={{ maxWidth: "300px" }}>
              <div style={{ height: "4px", background: C.border, borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: C.accent, transition: "width 0.3s" }} />
              </div>
              <p style={{ fontSize: "11px", color: C.text3, marginTop: "4px" }}>Processing... {progress}%</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Upload bar */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
          <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: "none" }}
            onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ""; }} />
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            style={{
              display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px",
              borderRadius: "12px", cursor: uploading ? "not-allowed" : "pointer",
              border: `1.5px dashed ${dragging ? C.accent : C.border}`,
              background: dragging ? C.accentLight : C.bg2, transition: "all 0.15s"
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            <span style={{ fontSize: "13px", color: C.text2, flex: 1 }}>
              {uploading ? `Processing... ${progress}%` : "Drop an invoice here or click to browse — PDF, PNG, JPG"}
            </span>
            <kbd style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "6px", background: C.bg3, border: `1px solid ${C.border}`, color: C.text3 }}>
              Upload
            </kbd>
          </div>
        </div>
      </main>
    </div>
  );
}

function ChatMessage({ msg, C }) {
  if (msg.type === "loading") {
    return (
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <AIAvatar C={C} />
        <div style={{ padding: "12px 16px", borderRadius: "12px 12px 12px 4px", background: C.bg2, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <span style={{ fontSize: "13px", color: C.text2 }}>Analyzing invoice...</span>
        </div>
      </div>
    );
  }

  if (msg.type === "upload") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "12px 12px 4px 12px", background: C.accent, color: "white", maxWidth: "320px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span style={{ fontSize: "13px", fontWeight: 500 }}>{msg.filename}</span>
        </div>
      </div>
    );
  }

  if (msg.type === "error") {
    return (
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <AIAvatar C={C} />
        <div style={{ padding: "12px 16px", borderRadius: "12px 12px 12px 4px", background: C.dangerLight, border: `1px solid #fca5a5`, display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <span style={{ fontSize: "13px", color: C.danger }}>{msg.content}</span>
        </div>
      </div>
    );
  }

  if (msg.type === "result") {
    return (
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <AIAvatar C={C} />
        <AuditCard result={msg.result} C={C} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
      <AIAvatar C={C} />
      <div style={{ padding: "12px 16px", borderRadius: "12px 12px 12px 4px", background: C.bg2, border: `1px solid ${C.border}`, maxWidth: "480px" }}>
        <span style={{ fontSize: "13px", color: C.text }}>{msg.content}</span>
      </div>
    </div>
  );
}

function AIAvatar({ C }) {
  return (
    <div style={{ width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    </div>
  );
}

function AuditCard({ result, C }) {
  const { is_compliant, compliance_score, extracted_data, audit_result, cloudinary_url } = result;
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "12px 12px 12px 4px", padding: "16px", maxWidth: "520px", width: "100%" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {is_compliant
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          }
          <span style={{ fontWeight: 700, fontSize: "14px", color: C.text }}>
            {is_compliant ? "Invoice Approved" : "Invoice Rejected"}
          </span>
        </div>
        <span style={{
          fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px",
          background: is_compliant ? C.successLight : C.dangerLight,
          color: is_compliant ? C.success : C.danger
        }}>
          {compliance_score}%
        </span>
      </div>

      {/* Score bar */}
      <div style={{ height: "6px", background: C.bg3, borderRadius: "3px", overflow: "hidden", marginBottom: "14px" }}>
        <div style={{ height: "100%", width: `${compliance_score}%`, background: compliance_score >= 70 ? C.success : C.danger, borderRadius: "3px", transition: "width 0.5s ease" }} />
      </div>

      {/* Fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", padding: "12px", background: C.bg2, borderRadius: "8px", marginBottom: "12px" }}>
        {[
          ["Invoice No", extracted_data?.invoice_number],
          ["Vendor", extracted_data?.vendor_name],
          ["Date", extracted_data?.date],
          ["Amount", `${extracted_data?.currency} ${extracted_data?.amount_total?.toLocaleString()}`],
        ].map(([label, value]) => (
          <div key={label}>
            <p style={{ fontSize: "11px", color: C.text3, marginBottom: "2px" }}>{label}</p>
            <p style={{ fontSize: "12px", fontWeight: 600, color: C.text }}>{value || "—"}</p>
          </div>
        ))}
      </div>

      {/* Violations */}
      {audit_result?.violations?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
          {audit_result.violations.slice(0, expanded ? undefined : 2).map((v, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: "8px", padding: "8px 10px", borderRadius: "8px",
              background: v.severity === "high" ? C.dangerLight : C.warningLight,
              borderLeft: `3px solid ${v.severity === "high" ? C.danger : C.warning}`,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={v.severity === "high" ? C.danger : C.warning} strokeWidth="2" style={{ marginTop: "1px", flexShrink: 0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span style={{ fontSize: "12px", color: v.severity === "high" ? C.danger : C.warning }}>{v.message}</span>
            </div>
          ))}
          {audit_result.violations.length > 2 && (
            <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: C.accent, textAlign: "left", padding: "2px 0" }}>
              {expanded ? "Show less" : `+${audit_result.violations.length - 2} more violations`}
            </button>
          )}
        </div>
      )}

      {/* Reasoning */}
      {audit_result?.reasoning && (
        <p style={{ fontSize: "12px", color: C.text2, lineHeight: 1.6, padding: "10px 12px", background: C.bg2, borderRadius: "8px", marginBottom: "12px" }}>
          <span style={{ fontWeight: 700, color: C.text }}>AI: </span>{audit_result.reasoning}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {cloudinary_url && (
          <a href={cloudinary_url} target="_blank" rel="noopener noreferrer" style={{
            display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px",
            borderRadius: "8px", fontSize: "12px", background: C.accentLight,
            color: C.accent, textDecoration: "none", fontWeight: 600
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            View Invoice
          </a>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", background: C.bg2, color: C.text2 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.text2} strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          {extracted_data?.line_items?.length || 0} line items
        </div>
      </div>
    </div>
  );
}
