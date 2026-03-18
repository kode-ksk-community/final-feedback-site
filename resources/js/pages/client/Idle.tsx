/**
 * CounterIdle.tsx
 *
 * The idle screen shown on the counter device when no servicer is active.
 * Displayed after device setup and after a servicer logs out.
 *
 * What this screen does:
 *   - Shows the counter name, branch name, and live clock
 *   - Displays a visual "waiting" state with animated breathing ring
 *   - Polls the server every 4 seconds to detect when a servicer scans their QR
 *   - When a session is detected → redirects to /counter/feedback
 *   - Shows a "reset device" option if device needs to be re-setup
 *
 * Route:    GET /counter/idle
 * File:     resources/js/Pages/Counter/Idle.tsx
 *
 * 🔧 STATIC MODE:
 *   Polling is simulated — a "Simulate Scan" button triggers the transition.
 *   Search "TODO: REPLACE" to find every real-backend swap point.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveSession {
  id: number;
  servicer_name: string;
  started_at: string;
}

interface CounterInfo {
  id: number;
  name: string;
  branch_name: string;
}

// ─── 🔧 Static Mock Data ──────────────────────────────────────────────────────

const MOCK_COUNTER: CounterInfo = {
  id: 1,
  name: "Counter 1",
  branch_name: "Main Branch",
};

// Simulated session that appears when "Simulate Scan" is clicked
const MOCK_SESSION: ActiveSession = {
  id: 1,
  servicer_name: "Sophea Chan",
  started_at: new Date().toISOString(),
};

// ─── Live Clock ───────────────────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// ─── Breathing Ring ───────────────────────────────────────────────────────────
// The large animated ring that pulses while waiting

function BreathingRing() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
      {/* Outermost pulse — slow fade */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 240, height: 240,
            border: "1px solid rgba(180,140,100,0.25)",
          }}
          animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
          transition={{
            duration: 3.5,
            delay: i * 1.15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Middle ring */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 180, height: 180, border: "1.5px solid rgba(180,140,100,0.3)" }}
        animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Inner ring */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 130, height: 130, border: "1.5px solid rgba(180,140,100,0.5)" }}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />

      {/* Core circle */}
      <motion.div
        className="relative z-10 rounded-full flex items-center justify-center"
        style={{
          width: 90, height: 90,
          background: "radial-gradient(circle at 35% 35%, #fff8f0, #f5e6d0)",
          boxShadow: "0 8px 40px rgba(180,140,100,0.25), inset 0 1px 0 rgba(255,255,255,0.8)",
          border: "1px solid rgba(180,140,100,0.2)",
        }}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* QR icon */}
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="#b48c64" strokeWidth="1.5"/>
          <rect x="5" y="5" width="3" height="3" fill="#b48c64"/>
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="#b48c64" strokeWidth="1.5"/>
          <rect x="16" y="5" width="3" height="3" fill="#b48c64"/>
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="#b48c64" strokeWidth="1.5"/>
          <rect x="5" y="16" width="3" height="3" fill="#b48c64"/>
          <path d="M14 14h2v2h-2zM18 14h3v1h-3zM14 17h1v3h-1zM17 17h1v1h-1zM19 17h2v2h-2zM16 20h5v1h-5z" fill="#b48c64"/>
        </svg>
      </motion.div>
    </div>
  );
}

// ─── Session Detected Overlay ────────────────────────────────────────────────

function SessionDetectedOverlay({ session }: { session: ActiveSession }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "rgba(250,245,238,0.97)", backdropFilter: "blur(12px)" }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="flex flex-col items-center gap-5 text-center"
      >
        {/* Check mark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.15 }}
          className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
          style={{
            background: "radial-gradient(circle, #f0fdf4, #dcfce7)",
            border: "2px solid #86efac",
            boxShadow: "0 0 40px rgba(134,239,172,0.4)",
          }}
        >
          ✓
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px",
            fontWeight: 700, color: "#3d2c1e", marginBottom: "6px" }}>
            Welcome, {session.servicer_name}
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#a07850" }}>
            Your session is now active — loading feedback screen...
          </p>
        </motion.div>

        {/* Loading dots */}
        <div className="flex gap-2 mt-2">
          {[0, 1, 2].map(i => (
            <motion.div key={i}
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
              transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
              className="w-2 h-2 rounded-full"
              style={{ background: "#b48c64" }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CounterIdle() {
  const now = useClock();

  // TODO: REPLACE — read from Inertia props or derive from localStorage
  const counter = MOCK_COUNTER;
  const counterInfo = (() => {
    // In real app: these come from localStorage set during device setup
    const name        = localStorage.getItem("counter_name")  ?? counter.name;
    const branchName  = localStorage.getItem("branch_name")   ?? counter.branch_name;
    return { name, branchName };
  })();

  const [activeSession,   setActiveSession]   = useState<ActiveSession | null>(null);
  const [pollingActive,   setPollingActive]   = useState(true);
  const [lastChecked,     setLastChecked]     = useState<Date>(new Date());
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // ── Polling ───────────────────────────────────────────────────────────────
  /**
   * Every 4 seconds, check if a servicer has scanned their QR and
   * created an active session on this counter.
   *
   * TODO: REPLACE mock with real API call:
   *   GET /api/counter/session/status
   *   Headers: { 'X-Counter-Token': localStorage.getItem('counter_device_token') }
   *   Response: { active: bool, session?: { id, servicer_name, started_at } }
   */
  const checkSession = useCallback(async () => {
    setLastChecked(new Date());

    // TODO: REPLACE with:
    // const token = localStorage.getItem('counter_device_token');
    // const res = await axios.get('/api/counter/session/status', {
    //   headers: { 'X-Counter-Token': token }
    // });
    // if (res.data.active) {
    //   setActiveSession(res.data.session);
    //   setPollingActive(false);
    //   setTimeout(() => router.visit('/counter/feedback'), 2000);
    // }

    // 🔧 Mock: do nothing — session is triggered by "Simulate Scan" button below
  }, []);

  useEffect(() => {
    if (!pollingActive) return;
    const interval = setInterval(checkSession, 4000);
    return () => clearInterval(interval);
  }, [pollingActive, checkSession]);

  // ── Simulate scan (static mode only) ─────────────────────────────────────
  const simulateScan = () => {
    setActiveSession(MOCK_SESSION);
    setPollingActive(false);
    // TODO: REPLACE with → router.visit('/counter/feedback')
    setTimeout(() => {
      alert("✅ In production this redirects to /counter/feedback\n\nServicer: " + MOCK_SESSION.servicer_name);
      setActiveSession(null);
      setPollingActive(true);
    }, 2500);
  };

  // ── Reset device ──────────────────────────────────────────────────────────
  const resetDevice = () => {
    localStorage.removeItem("counter_device_token");
    localStorage.removeItem("counter_id");
    localStorage.removeItem("counter_name");
    localStorage.removeItem("branch_name");
    // TODO: REPLACE with → router.visit('/counter/setup')
    alert("Device reset — would redirect to /counter/setup");
    setShowResetConfirm(false);
  };

  // ── Format time ───────────────────────────────────────────────────────────
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div className="min-h-screen w-full relative overflow-hidden flex flex-col"
        style={{ background: "#faf5ee" }}>

        {/* ── Subtle warm texture background ── */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {/* Top-left warm glow */}
          <div className="absolute top-0 left-0 w-[600px] h-[600px] opacity-40"
            style={{ background: "radial-gradient(circle at 0% 0%, #f5dfc0, transparent 65%)" }} />
          {/* Bottom-right warm glow */}
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] opacity-30"
            style={{ background: "radial-gradient(circle at 100% 100%, #ead5b5, transparent 65%)" }} />
          {/* Subtle dot grid */}
          <div className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "radial-gradient(circle, #b48c64 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }} />
        </div>

        {/* ── Top bar: branch + counter info ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex items-center justify-between px-10 pt-8"
        >
          {/* Branch + counter */}
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-400"
              style={{ boxShadow: "0 0 8px #fbbf24" }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px",
              color: "#b48c64", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {counterInfo.branchName}
            </span>
            <span style={{ color: "#d4b896", fontSize: "12px" }}>·</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px",
              color: "#b48c64", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {counterInfo.name}
            </span>
          </div>

          {/* Live clock */}
          <div className="text-right">
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "26px",
              fontWeight: 600, color: "#3d2c1e", lineHeight: 1 }}>
              {timeStr}
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px",
              color: "#b48c64", marginTop: "2px" }}>
              {dateStr}
            </p>
          </div>
        </motion.div>

        {/* ── Main content ── */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-10 px-8">

          {/* Breathing ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          >
            <BreathingRing />
          </motion.div>

          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="text-center max-w-sm"
          >
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "42px",
              fontWeight: 600, color: "#3d2c1e", lineHeight: 1.1, marginBottom: "14px",
              letterSpacing: "-0.01em" }}>
              Waiting for<br />
              <span style={{ fontStyle: "italic", color: "#b48c64" }}>Servicer</span>
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px",
              color: "#a07850", lineHeight: 1.6, fontWeight: 300 }}>
              A servicer needs to scan their QR code<br />
              with their phone to activate this counter.
            </p>
          </motion.div>

          {/* Polling status pill */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-full"
            style={{ background: "rgba(180,140,100,0.1)", border: "1px solid rgba(180,140,100,0.2)" }}
          >
            {/* Pulsing dot */}
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full"
              style={{ background: "#b48c64" }}
            />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px",
              color: "#b48c64", letterSpacing: "0.06em" }}>
              Checking every 4s · last {lastChecked.toLocaleTimeString("en-US", {
                hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
              })}
            </span>
          </motion.div>

          {/* 🔧 STATIC MODE: Simulate scan button — REMOVE when backend is ready */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col items-center gap-3"
          >
            <button
              onClick={simulateScan}
              className="px-8 py-3 rounded-2xl font-medium transition-all"
              style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
                background: "#3d2c1e", color: "#faf5ee",
                border: "none", cursor: "pointer",
                boxShadow: "0 4px 24px rgba(61,44,30,0.2)",
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
            >
              📱 Simulate Servicer Scan
            </button>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px",
              color: "#c4a882", letterSpacing: "0.06em" }}>
              🔧 STATIC MODE — remove this button when backend is ready
            </p>
          </motion.div>

        </div>

        {/* ── Bottom bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex items-center justify-between px-10 pb-8"
        >
          {/* App name */}
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "16px",
            color: "#c4a882", fontStyle: "italic", letterSpacing: "0.02em" }}>
            FeedbackPro
          </span>

          {/* Reset device (hidden until tapped) */}
          <div className="relative">
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px",
                  color: "#d4b896", background: "none", border: "none",
                  cursor: "pointer", letterSpacing: "0.04em" }}
              >
                Reset device
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3"
              >
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#a07850" }}>
                  Are you sure?
                </span>
                <button onClick={resetDevice}
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
                    color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                  Yes, reset
                </button>
                <button onClick={() => setShowResetConfirm(false)}
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
                    color: "#a07850", background: "none", border: "none", cursor: "pointer" }}>
                  Cancel
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ── Session detected overlay ── */}
        <AnimatePresence>
          {activeSession && <SessionDetectedOverlay session={activeSession} />}
        </AnimatePresence>

      </div>
    </>
  );
}