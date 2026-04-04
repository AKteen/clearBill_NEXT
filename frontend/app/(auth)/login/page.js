"use client";
import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Check your email to confirm your account.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        localStorage.setItem("user_id", data.user.id);
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg-secondary)", padding: "1rem"
    }}>
      <div style={{
        width: "100%", maxWidth: "400px", background: "var(--bg)",
        borderRadius: "16px", border: "1px solid var(--border)", padding: "2rem"
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.5rem" }}>
          
          <span style={{ fontWeight: 600, fontSize: "18px" }}>ClearBill</span>
        </div>

        <h1 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "4px" }}>
          {isSignup ? "Create account" : "Welcome back"}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "1.5rem" }}>
          {isSignup ? "Start auditing invoices with AI" : "Sign in to your workspace"}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: "10px",
              border: "1px solid var(--border)", background: "var(--bg-secondary)",
              fontSize: "14px", color: "var(--text-primary)"
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: "10px",
              border: "1px solid var(--border)", background: "var(--bg-secondary)",
              fontSize: "14px", color: "var(--text-primary)"
            }}
          />

          {error && (
            <p style={{ fontSize: "13px", color: "var(--danger)", padding: "8px 12px", background: "var(--danger-light)", borderRadius: "8px" }}>
              {error}
            </p>
          )}
          {message && (
            <p style={{ fontSize: "13px", color: "var(--success)", padding: "8px 12px", background: "var(--success-light)", borderRadius: "8px" }}>
              {message}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%", padding: "10px", borderRadius: "10px",
              background: loading ? "var(--border)" : "var(--accent)",
              color: "white", fontWeight: 600, fontSize: "14px",
              border: "none", cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
            }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Please wait..." : isSignup ? "Create account" : "Sign in"}
          </button>

          <button
            onClick={() => { setIsSignup(!isSignup); setError(null); setMessage(null); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "13px", color: "var(--text-secondary)", textAlign: "center", padding: "4px"
            }}
          >
            {isSignup ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
