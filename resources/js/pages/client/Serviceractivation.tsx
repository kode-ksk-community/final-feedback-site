/**
 * ServicerActivation.tsx
 *
 * Opens on the servicer's PHONE when they scan their personal QR code.
 * This is a mobile-first page — designed for small screens.
 *
 * URL format:
 *   https://app.domain.com/counter/activate?token=<qr_token>
 *
 * States this page handles:
 *   loading      → validating token + fetching counter info
 *   confirm      → show counter info, servicer taps "Activate"
 *   activating   → POST in progress
 *   success      → session created, counter is now live
 *   busy         → counter is occupied, show idle counters in same branch
 *   error        → token invalid / expired / other error
 *
 * Route:    GET /counter/activate (reads ?token= from URL)
 * File:     resources/js/Pages/Counter/Activate.tsx
 *
 * 🔧 STATIC MODE:
 *   All states are simulated with buttons.
 *   Search "TODO: REPLACE" for every backend swap point.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CounterInfo {
  id: number;
  name: string;
  branch_name: string;
  branch_id: number;
}

interface IdleCounter {
  id: number;
  name: string;
  description: string | null;
}

interface ServicerInfo {
  id: number;
  name: string;
  role: string;
}

type PageState =
  | "loading"
  | "confirm"
  | "activating"
  | "success"
  | "busy"
  | "error";

// ─── 🔧 Static Mock Data ──────────────────────────────────────────────────────

const MOCK_SERVICER: ServicerInfo = {
  id: 1,
  name: "Sophea Chan",
  role: "servicer",
};

const MOCK_COUNTER: CounterInfo = {
  id: 1,
  name: "Counter 1",
  branch_name: "Main Branch",
  branch_id: 1,
};

// Counters that are idle (shown when selected counter is busy)
const MOCK_IDLE_COUNTERS: IdleCounter[] = [
  { id: 2, name: "Counter 2", description: "Ground floor, left side" },
  { id: 3, name: "Counter 3", description: "First floor, right wing" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated scanning lines that play during loading */
function ScanLines() {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      {/* Outer frame corners */}
      {[
        "top-0 left-0 border-t-2 border-l-2 rounded-tl-lg",
        "top-0 right-0 border-t-2 border-r-2 rounded-tr-lg",
        "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg",
        "bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg",
      ].map((cls, i) => (
        <div key={i} className={`absolute w-6 h-6 ${cls}`}
          style={{ borderColor: "#00ff88" }} />
      ))}

      {/* Scan line animation */}
      <motion.div
        className="absolute left-2 right-2 h-px"
        style={{ background: "linear-gradient(90deg, transparent, #00ff88, transparent)" }}
        animate={{ top: ["12%", "88%", "12%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* QR icon in center */}
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="#00ff88" strokeWidth="1.5"/>
          <rect x="5" y="5" width="3" height="3" fill="#00ff88"/>
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="#00ff88" strokeWidth="1.5"/>
          <rect x="16" y="5" width="3" height="3" fill="#00ff88"/>
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="#00ff88" strokeWidth="1.5"/>
          <rect x="5" y="16" width="3" height="3" fill="#00ff88"/>
          <path d="M14 14h2v2h-2zM18 14h3v1h-3zM14 17h1v3h-1zM17 17h1v1h-1zM19 17h2v2h-2zM16 20h5v1h-5z"
            fill="#00ff88"/>
        </svg>
      </motion.div>
    </div>
  );
}

/** Success burst animation */
function SuccessBurst({ color = "#00ff88" }: { color?: string }) {
  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      {/* Burst rings */}
      {[0, 1, 2].map(i => (
        <motion.div key={i}
          className="absolute rounded-full"
          style={{ border: `2px solid ${color}` }}
          initial={{ width: 40, height: 40, opacity: 0.8 }}
          animate={{ width: 130, height: 130, opacity: 0 }}
          transition={{ duration: 1.2, delay: i * 0.3, repeat: Infinity }}
        />
      ))}
      {/* Check circle */}
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 18 }}
        className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: `${color}22`, border: `2px solid ${color}` }}
      >
        <motion.span
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          style={{ fontSize: "36px" }}
        >✓</motion.span>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ServicerActivation() {
  const [pageState,    setPageState]    = useState<PageState>("loading");
  const [counter,      setCounter]      = useState<CounterInfo | null>(null);
  const [servicer,     setServicer]     = useState<ServicerInfo | null>(null);
  const [idleCounters, setIdleCounters] = useState<IdleCounter[]>([]);
  const [errorMsg,     setErrorMsg]     = useState("");
  const [selectedIdle, setSelectedIdle] = useState<IdleCounter | null>(null);

  // ── On mount: validate token + load counter info ──────────────────────────
  useEffect(() => {
    /**
     * TODO: REPLACE with real token validation:
     *
     * const params = new URLSearchParams(window.location.search);
     * const token = params.get('token');
     * if (!token) { setErrorMsg("Invalid QR code."); setPageState("error"); return; }
     *
     * try {
     *   const res = await axios.get(`/api/counter/activate?token=${token}`);
     *   setServicer(res.data.servicer);
     *   setCounter(res.data.counter);
     *   setPageState("confirm");
     * } catch (err) {
     *   setErrorMsg(err.response?.data?.message ?? "This QR code is invalid or expired.");
     *   setPageState("error");
     * }
     */
    setTimeout(() => {
      setServicer(MOCK_SERVICER);
      setCounter(MOCK_COUNTER);
      setPageState("confirm");
    }, 1200);
  }, []);

  // ── Activate counter ──────────────────────────────────────────────────────
  const handleActivate = async (counterId?: number) => {
    const targetId = counterId ?? counter!.id;
    setPageState("activating");

    /**
     * TODO: REPLACE with real activation:
     *
     * const params = new URLSearchParams(window.location.search);
     * const token = params.get('token');
     *
     * try {
     *   await axios.post('/api/counter/activate', {
     *     token,
     *     counter_id: targetId,
     *   });
     *   setPageState("success");
     * } catch (err) {
     *   if (err.response?.status === 409) {
     *     // Counter is occupied — show idle alternatives
     *     setIdleCounters(err.response.data.idle_counters);
     *     setPageState("busy");
     *   } else {
     *     setErrorMsg(err.response?.data?.message ?? "Activation failed.");
     *     setPageState("error");
     *   }
     * }
     */

    // 🔧 Mock: simulate busy on first try, success on second
    await new Promise(r => setTimeout(r, 900));
    if (!counterId && counter?.id === 1) {
      setIdleCounters(MOCK_IDLE_COUNTERS);
      setPageState("busy");
    } else {
      setPageState("success");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* Full screen — deep navy */}
      <div className="min-h-screen w-full flex flex-col relative overflow-hidden"
        style={{ background: "#080e1a", maxWidth: "420px", margin: "0 auto" }}>

        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-[-10%] left-[10%] w-64 h-64 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle,#00ff88,transparent 70%)", filter: "blur(60px)" }}/>
          <div className="absolute bottom-[-10%] right-[10%] w-48 h-48 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle,#3b82f6,transparent 70%)", filter: "blur(50px)" }}/>
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: `linear-gradient(rgba(0,255,136,.4) 1px,transparent 1px),
                      linear-gradient(90deg,rgba(0,255,136,.4) 1px,transparent 1px)`,
              backgroundSize: "40px 40px" }}/>
        </div>

        {/* Top logo bar */}
        <div className="relative z-10 flex items-center justify-between px-7 pt-10 pb-2">
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: "16px",
            fontWeight: 800, color: "#00ff88", letterSpacing: "0.05em" }}>
            FEEDBACK<span style={{ color: "rgba(255,255,255,0.3)" }}>PRO</span>
          </span>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full"
            style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00ff88",
              boxShadow: "0 0 6px #00ff88", animation: "pulse 2s infinite" }}/>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px",
              color: "#00ff88", letterSpacing: "0.08em" }}>SECURE</span>
          </div>
        </div>

        {/* Main content area */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-7 py-8">
          <AnimatePresence mode="wait">

            {/* ── Loading ── */}
            {pageState === "loading" && (
              <motion.div key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-8 text-center">
                <ScanLines />
                <div>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px",
                    fontWeight: 700, color: "#f8fafc", marginBottom: "8px" }}>
                    Verifying QR Code
                  </p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
                    color: "rgba(248,250,252,0.4)", fontWeight: 300 }}>
                    Please wait a moment...
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Confirm ── */}
            {pageState === "confirm" && counter && servicer && (
              <motion.div key="confirm"
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-7 w-full">

                {/* Greeting */}
                <div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
                    color: "rgba(248,250,252,0.45)", marginBottom: "6px" }}>
                    Good day,
                  </p>
                  <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "28px",
                    fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em",
                    lineHeight: 1.15 }}>
                    {servicer.name}
                  </h1>
                </div>

                {/* Counter card */}
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="rounded-3xl p-6 relative overflow-hidden"
                  style={{ background: "rgba(0,255,136,0.06)",
                    border: "1px solid rgba(0,255,136,0.2)" }}
                >
                  {/* Glow top-right */}
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-20"
                    style={{ background: "radial-gradient(circle,#00ff88,transparent 70%)",
                      filter: "blur(20px)", pointerEvents: "none" }}/>

                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full"
                        style={{ background: "#00ff88", boxShadow: "0 0 8px #00ff88" }}/>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px",
                        color: "#00ff88", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        Activating
                      </span>
                    </div>

                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "32px",
                      fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em",
                      marginBottom: "4px" }}>
                      {counter.name}
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px",
                      color: "rgba(248,250,252,0.5)" }}>
                      {counter.branch_name}
                    </p>
                  </div>
                </motion.div>

                {/* Info note */}
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
                  color: "rgba(248,250,252,0.35)", lineHeight: 1.6, textAlign: "center" }}>
                  Tapping activate will start your session on this counter.
                  Customers will be able to submit feedback immediately.
                </p>

                {/* Activate button */}
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => handleActivate()}
                  className="w-full py-5 rounded-2xl font-bold text-base relative overflow-hidden"
                  style={{ background: "#00ff88", color: "#080e1a",
                    fontFamily: "'Syne', sans-serif", fontSize: "16px",
                    fontWeight: 800, border: "none", cursor: "pointer",
                    boxShadow: "0 8px 32px rgba(0,255,136,0.35)",
                    letterSpacing: "-0.01em" }}
                >
                  Activate Counter →
                </motion.button>
              </motion.div>
            )}

            {/* ── Activating ── */}
            {pageState === "activating" && (
              <motion.div key="activating"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-7 text-center">

                <div className="relative flex items-center justify-center w-24 h-24">
                  <motion.div
                    className="absolute w-24 h-24 rounded-full"
                    style={{ border: "2px solid rgba(0,255,136,0.3)" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.div
                    className="absolute w-24 h-24 rounded-full"
                    style={{ border: "2px solid transparent",
                      borderTopColor: "#00ff88", borderRightColor: "#00ff88" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <span style={{ fontSize: "32px" }}>⚡</span>
                </div>

                <div>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px",
                    fontWeight: 700, color: "#f8fafc", marginBottom: "8px" }}>
                    Activating...
                  </p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
                    color: "rgba(248,250,252,0.4)" }}>
                    Creating your session
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Success ── */}
            {pageState === "success" && counter && servicer && (
              <motion.div key="success"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center gap-7 text-center w-full">

                <SuccessBurst color="#00ff88" />

                <div>
                  <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{ fontFamily: "'Syne', sans-serif", fontSize: "28px",
                      fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em",
                      marginBottom: "8px" }}>
                    Session Active!
                  </motion.p>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
                      color: "rgba(248,250,252,0.5)", lineHeight: 1.6 }}>
                    {counter.name} · {counter.branch_name}<br/>
                    is now ready for customers.
                  </motion.p>
                </div>

                {/* Session info */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="w-full rounded-2xl p-5"
                  style={{ background: "rgba(0,255,136,0.06)",
                    border: "1px solid rgba(0,255,136,0.15)" }}>
                  <div className="flex justify-between mb-3">
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px",
                      color: "rgba(248,250,252,0.35)", letterSpacing: "0.06em" }}>SERVICER</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
                      color: "#f8fafc", fontWeight: 500 }}>{servicer.name}</span>
                  </div>
                  <div className="flex justify-between mb-3">
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px",
                      color: "rgba(248,250,252,0.35)", letterSpacing: "0.06em" }}>COUNTER</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
                      color: "#f8fafc", fontWeight: 500 }}>{counter.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px",
                      color: "rgba(248,250,252,0.35)", letterSpacing: "0.06em" }}>STARTED</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
                      color: "#00ff88", fontWeight: 500 }}>
                      {new Date().toLocaleTimeString("en-US", {
                        hour: "2-digit", minute: "2-digit", hour12: true })}
                    </span>
                  </div>
                </motion.div>

                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
                    color: "rgba(248,250,252,0.25)", textAlign: "center" }}>
                  You can close this page. The counter is now live.
                </motion.p>
              </motion.div>
            )}

            {/* ── Busy ── */}
            {pageState === "busy" && (
              <motion.div key="busy"
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-6 w-full">

                {/* Error badge */}
                <div className="flex flex-col items-center gap-4 text-center">
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 280, damping: 18 }}
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                    style={{ background: "rgba(249,115,22,0.12)",
                      border: "2px solid rgba(249,115,22,0.4)" }}>
                    🔒
                  </motion.div>
                  <div>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "22px",
                      fontWeight: 800, color: "#f8fafc", marginBottom: "6px" }}>
                      Counter Occupied
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
                      color: "rgba(248,250,252,0.4)", lineHeight: 1.6 }}>
                      {counter?.name} is currently in use.<br/>
                      Pick another counter below.
                    </p>
                  </div>
                </div>

                {/* Idle counters list */}
                {idleCounters.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px",
                      color: "rgba(248,250,252,0.35)", letterSpacing: "0.08em",
                      textTransform: "uppercase" }}>
                      Available counters
                    </p>
                    {idleCounters.map((ic, i) => (
                      <motion.button
                        key={ic.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setSelectedIdle(ic);
                          // Update counter display then activate
                          setCounter(prev => prev
                            ? { ...prev, id: ic.id, name: ic.name }
                            : prev);
                          handleActivate(ic.id);
                        }}
                        className="w-full p-4 rounded-2xl text-left flex items-center justify-between"
                        style={{ background: "rgba(0,255,136,0.05)",
                          border: "1px solid rgba(0,255,136,0.15)",
                          cursor: "pointer" }}
                      >
                        <div>
                          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "16px",
                            fontWeight: 700, color: "#f8fafc", marginBottom: "3px" }}>
                            {ic.name}
                          </p>
                          {ic.description && (
                            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
                              color: "rgba(248,250,252,0.4)" }}>
                              {ic.description}
                            </p>
                          )}
                        </div>
                        <span style={{ color: "#00ff88", fontSize: "18px" }}>→</span>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6"
                    style={{ color: "rgba(248,250,252,0.35)" }}>
                    <p style={{ fontSize: "32px", marginBottom: "8px" }}>😔</p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>
                      No other counters available right now.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Error ── */}
            {pageState === "error" && (
              <motion.div key="error"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-6 text-center">

                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 280, damping: 18 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl"
                  style={{ background: "rgba(239,68,68,0.12)",
                    border: "2px solid rgba(239,68,68,0.35)" }}>
                  ✕
                </motion.div>

                <div>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "22px",
                    fontWeight: 800, color: "#f8fafc", marginBottom: "8px" }}>
                    Invalid QR Code
                  </p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
                    color: "rgba(248,250,252,0.4)", lineHeight: 1.6 }}>
                    {errorMsg || "This QR code is invalid or has expired.\nPlease contact your manager."}
                  </p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Bottom: static mode switcher (remove in production) ── */}
        <div className="relative z-10 px-6 pb-8">
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px",
              color: "rgba(248,250,252,0.3)", marginBottom: "10px",
              letterSpacing: "0.06em", textTransform: "uppercase" }}>
              🔧 Static mode — simulate states
            </p>
            <div className="flex flex-wrap gap-2">
              {(["loading","confirm","activating","success","busy","error"] as PageState[]).map(s => (
                <button key={s} onClick={() => setPageState(s)}
                  style={{
                    padding: "4px 10px", borderRadius: "8px",
                    fontFamily: "'DM Mono', monospace", fontSize: "10px",
                    background: pageState === s ? "rgba(0,255,136,0.2)" : "rgba(255,255,255,0.06)",
                    color: pageState === s ? "#00ff88" : "rgba(248,250,252,0.4)",
                    border: pageState === s ? "1px solid rgba(0,255,136,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    cursor: "pointer",
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </>
  );
}