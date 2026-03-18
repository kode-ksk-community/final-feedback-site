/**
 * Login.tsx
 *
 * Authentication page for all staff roles:
 *   - Super Admin
 *   - Admin
 *   - Branch Manager
 *   - Servicer (Staff)
 *
 * Single login form — role is determined server-side from the user record.
 * After login, each role is redirected to their own dashboard:
 *   super_admin    → /admin/settings
 *   admin          → /admin/dashboard
 *   branch_manager → /manager/dashboard
 *   servicer       → /servicer/dashboard  (or counter setup if no device)
 *
 * Route:    GET  /login
 * POST:     POST /login  (Laravel Fortify / custom AuthController)
 * File:     resources/js/Pages/Auth/Login.tsx
 *
 * 🔧 STATIC MODE:
 *   Form submission is simulated.
 *   Search "TODO: REPLACE" for every backend swap point.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  // TODO: REPLACE — passed by Laravel controller on failed login
  errors?: { email?: string; password?: string };
  // Flashed success message (e.g. "Password reset successful")
  status?: string;
}

// ─── 🔧 Mock Credentials ─────────────────────────────────────────────────────
// These match the DatabaseSeeder accounts.
// In production, validation is 100% server-side.

const MOCK_USERS: Record<string, { password: string; role: string; redirect: string }> = {
  "superadmin@feedbackpro.com": { password: "password", role: "Super Admin",    redirect: "/admin/settings" },
  "admin@feedbackpro.com":      { password: "password", role: "Admin",           redirect: "/admin/dashboard" },
  "manager@feedbackpro.com":    { password: "password", role: "Branch Manager",  redirect: "/manager/dashboard" },
  "sophea@feedbackpro.com":     { password: "password", role: "Servicer",        redirect: "/servicer/dashboard" },
};

// ─── Animated stat ticker (left panel) ───────────────────────────────────────

function StatTicker({ label, value, suffix = "" }: {
  label: string; value: string; suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ fontFamily: "'Syne', sans-serif", fontSize: "32px",
          fontWeight: 800, color: "#ffffff", lineHeight: 1, letterSpacing: "-0.03em" }}
      >
        {value}
        <span style={{ fontSize: "18px", color: "rgba(255,255,255,0.5)" }}>{suffix}</span>
      </motion.span>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px",
        color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

// ─── Password strength indicator ─────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const strength = password.length >= 12 ? 3 : password.length >= 8 ? 2 : 1;
  const labels   = ["Weak", "Good", "Strong"];
  const colors   = ["#ef4444", "#f59e0b", "#22c55e"];
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
      className="flex items-center gap-3 mt-1.5">
      <div className="flex gap-1 flex-1">
        {[1,2,3].map(i => (
          <motion.div key={i}
            animate={{ backgroundColor: i <= strength ? colors[strength-1] : "#e5e7eb" }}
            transition={{ duration: 0.3 }}
            className="h-1 flex-1 rounded-full" />
        ))}
      </div>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px",
        color: colors[strength-1], letterSpacing: "0.06em" }}>
        {labels[strength-1]}
      </span>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Login({ errors: propErrors, status }: Props) {
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [remember,   setRemember]   = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>(
    propErrors ?? {}
  );

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Basic client-side validation
    if (!email) {
      setFieldErrors({ email: "Email is required." }); return;
    }
    if (!password) {
      setFieldErrors({ password: "Password is required." }); return;
    }

    setSubmitting(true);

    /**
     * TODO: REPLACE with Inertia form submission:
     *
     * router.post('/login', { email, password, remember }, {
     *   onError: (errors) => setFieldErrors(errors),
     *   onFinish: () => setSubmitting(false),
     * });
     *
     * Laravel redirects to role-based dashboard automatically.
     * No need to handle redirect here — Inertia handles it.
     */

    // 🔧 Mock: check against MOCK_USERS
    await new Promise(r => setTimeout(r, 900));
    const user = MOCK_USERS[email.toLowerCase()];

    if (!user) {
      setFieldErrors({ email: "No account found with this email." });
      setSubmitting(false); return;
    }
    if (user.password !== password) {
      setFieldErrors({ password: "Incorrect password." });
      setSubmitting(false); return;
    }

    toast.success(`Welcome back! Redirecting to ${user.role} dashboard...`);
    setTimeout(() => {
      alert(`✅ Login successful!\n\nRole: ${user.role}\nWould redirect to: ${user.redirect}\n\n🔧 Hint: try any seeded account:\n• admin@feedbackpro.com\n• manager@feedbackpro.com\n• sophea@feedbackpro.com\nAll use password: "password"`);
      setSubmitting(false);
    }, 1000);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <Toaster position="top-center" toastOptions={{
        style: { fontFamily: "'DM Sans', sans-serif", borderRadius: "12px" },
      }}/>

      <div className="min-h-screen flex" style={{ background: "#f8f9fa" }}>

        {/* ── Left panel (desktop) ── */}
        <motion.div
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
          style={{ width: "420px", minWidth: "420px", background: "#0f0f0f" }}
        >
          {/* Subtle noise texture */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
              backgroundSize: "200px" }}/>

          {/* Accent line */}
          <div className="absolute top-0 left-0 bottom-0 w-px"
            style={{ background: "linear-gradient(to bottom, transparent, #ffffff30, transparent)" }}/>

          {/* Top: logo */}
          <div>
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px",
                fontWeight: 800, color: "#ffffff", letterSpacing: "0.04em",
                marginBottom: "48px" }}>
              FEEDBACKPRO
            </motion.div>

            <motion.h2 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ fontFamily: "'Syne', sans-serif", fontSize: "36px",
                fontWeight: 800, color: "#ffffff", lineHeight: 1.15,
                letterSpacing: "-0.03em", marginBottom: "16px" }}>
              Your customers<br/>
              are talking.<br/>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>Are you listening?</span>
            </motion.h2>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
                color: "rgba(255,255,255,0.4)", lineHeight: 1.7, fontWeight: 300 }}>
              Real-time feedback from every counter,<br/>
              every branch, every shift.
            </motion.p>
          </div>

          {/* Middle: live stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col gap-8 py-8 border-y"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <StatTicker label="Feedback collected today"  value="1,284" />
            <StatTicker label="Average rating this week"  value="4.3" suffix=" / 5" />
            <StatTicker label="Active counters right now" value="12" />
          </motion.div>

          {/* Bottom: role hint */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col gap-2">
            {[
              { role: "Super Admin",    color: "#818cf8" },
              { role: "Admin",          color: "#34d399" },
              { role: "Branch Manager", color: "#f59e0b" },
              { role: "Servicer",       color: "#60a5fa" },
            ].map((r, i) => (
              <div key={r.role} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: r.color }}/>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px",
                  color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>
                  {r.role}
                </span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* ── Right panel: form ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="w-full max-w-sm"
          >
            {/* Mobile logo */}
            <div className="lg:hidden mb-8 text-center">
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: "18px",
                fontWeight: 800, color: "#0f0f0f", letterSpacing: "0.04em" }}>
                FEEDBACKPRO
              </span>
            </div>

            {/* Heading */}
            <div className="mb-8">
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "28px",
                fontWeight: 800, color: "#0f0f0f", letterSpacing: "-0.02em",
                marginBottom: "6px" }}>
                Welcome back
              </h1>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
                color: "#9ca3af", fontWeight: 300 }}>
                Sign in to your staff account
              </p>
            </div>

            {/* Status flash (e.g. password reset success) */}
            <AnimatePresence>
              {status && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 px-4 py-3 rounded-xl text-sm"
                  style={{ background: "#f0fdf4", border: "1px solid #bbf7d0",
                    color: "#15803d", fontFamily: "'DM Sans', sans-serif" }}>
                  {status}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hint banner (static mode only) */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-6 px-4 py-3 rounded-xl text-xs"
              style={{ background: "#fafafa", border: "1px solid #e5e7eb",
                fontFamily: "'DM Mono', monospace", color: "#9ca3af", lineHeight: 1.8 }}>
              🔧 <strong style={{ color: "#374151" }}>Static mode</strong> — try:<br/>
              admin@feedbackpro.com · password<br/>
              manager@feedbackpro.com · password<br/>
              sophea@feedbackpro.com · password
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>

              {/* Email */}
              <div>
                <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
                  fontWeight: 500, color: "#374151", display: "block", marginBottom: "7px" }}>
                  Email address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({...p, email: undefined})); }}
                    placeholder="you@company.com"
                    autoComplete="email"
                    style={{
                      width: "100%", padding: "13px 16px",
                      borderRadius: "14px",
                      border: `1.5px solid ${fieldErrors.email ? "#fca5a5" : email ? "#0f0f0f" : "#e5e7eb"}`,
                      background: fieldErrors.email ? "#fff1f0" : "#ffffff",
                      fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
                      color: "#0f0f0f", outline: "none",
                      transition: "border-color 0.2s, background 0.2s",
                    }}
                  />
                </div>
                <AnimatePresence>
                  {fieldErrors.email && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
                        color: "#ef4444", marginTop: "5px" }}>
                      {fieldErrors.email}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
                    fontWeight: 500, color: "#374151" }}>
                    Password
                  </label>
                  {/* TODO: REPLACE href with route('password.request') */}
                  <a href="#" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
                    color: "#6b7280", textDecoration: "none" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#0f0f0f")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}>
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({...p, password: undefined})); }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{
                      width: "100%", padding: "13px 48px 13px 16px",
                      borderRadius: "14px",
                      border: `1.5px solid ${fieldErrors.password ? "#fca5a5" : password ? "#0f0f0f" : "#e5e7eb"}`,
                      background: fieldErrors.password ? "#fff1f0" : "#ffffff",
                      fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
                      color: "#0f0f0f", outline: "none",
                      transition: "border-color 0.2s",
                    }}
                  />
                  {/* Show/hide toggle */}
                  <button type="button"
                    onClick={() => setShowPass(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    style={{ background: "none", border: "none", cursor: "pointer",
                      color: "#9ca3af", fontSize: "16px", padding: 0, lineHeight: 1 }}>
                    {showPass ? "🙈" : "👁"}
                  </button>
                </div>
                <AnimatePresence>
                  {fieldErrors.password && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
                        color: "#ef4444", marginTop: "5px" }}>
                      {fieldErrors.password}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setRemember(r => !r)}
                  className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    borderColor: remember ? "#0f0f0f" : "#d1d5db",
                    background:  remember ? "#0f0f0f" : "transparent",
                  }}
                >
                  {remember && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                      style={{ color: "#ffffff", fontSize: "11px", fontWeight: 700 }}>
                      ✓
                    </motion.span>
                  )}
                </div>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
                  color: "#6b7280" }}>
                  Remember me for 30 days
                </span>
              </label>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={!submitting ? { scale: 1.01 } : {}}
                whileTap={!submitting ? { scale: 0.98 } : {}}
                className="w-full py-4 rounded-2xl font-bold text-base relative overflow-hidden"
                style={{
                  background: submitting ? "#d1d5db" : "#0f0f0f",
                  color: "#ffffff",
                  fontFamily: "'Syne', sans-serif", fontSize: "15px",
                  fontWeight: 700, border: "none",
                  cursor: submitting ? "not-allowed" : "pointer",
                  letterSpacing: "-0.01em",
                  transition: "background 0.2s",
                }}
              >
                <AnimatePresence mode="wait">
                  {submitting ? (
                    <motion.span key="loading"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center justify-center gap-3">
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>
                      Signing in...
                    </motion.span>
                  ) : (
                    <motion.span key="idle"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      Sign in →
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

            </form>

            {/* Footer */}
            <p className="text-center mt-8"
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#d1d5db" }}>
              Staff access only. Customers don't need an account.
            </p>
          </motion.div>
        </div>

      </div>
    </>
  );
}