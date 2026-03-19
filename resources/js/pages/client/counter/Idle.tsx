/**
 * CounterIdle.tsx
 *
 * The idle screen shown on the counter device when no servicer is active.
 *
 * ── What changed from the previous version ────────────────────────────────────
 * The idle screen now shows the COUNTER's own QR code.
 * The QR encodes the URL: /counter/activate?counter_token=<device_token>
 *
 * Flow:
 *   1. Counter idle screen shows its QR code
 *   2. Servicer scans the QR with their phone
 *   3. Their phone opens /counter/activate?counter_token=<device_token>
 *   4. ServicerActivation.tsx shows a login form on their phone
 *   5. Servicer enters email + password → session created
 *   6. This idle screen detects the new session (polling) → goes live
 *
 * ── QR code rendering ─────────────────────────────────────────────────────────
 * Uses the `qrcode` npm package to generate a canvas-based QR code.
 * Install: npm install qrcode @types/qrcode
 *
 * ── Laravel side needed ───────────────────────────────────────────────────────
 * routes/web.php:
 *   Route::get('/counter/idle',   [CounterSetupController::class, 'idle'])->name('counter.idle');
 *   Route::get('/counter/activate', [ServicerActivationController::class, 'show'])->name('counter.activate');
 *
 * routes/api.php (device.token middleware):
 *   Route::get('/counter/session/status', [CounterSessionController::class, 'status']);
 *
 * File: resources/js/Pages/Counter/Idle.tsx
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { router }                                    from "@inertiajs/react";
import { motion, AnimatePresence }                   from "framer-motion";
import axios                                         from "axios";
import QRCode                                        from "qrcode";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveSession {
  id: number;
  servicer_name: string;
  started_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS  = 4_000;
const WELCOME_DELAY_MS  = 2_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readDeviceInfo(): {
  deviceToken: string;
  counterName: string;
  branchName:  string;
} | null {
  const deviceToken = localStorage.getItem("counter_device_token");
  const counterName = localStorage.getItem("counter_name");
  const branchName  = localStorage.getItem("branch_name");
  if (!deviceToken || !counterName || !branchName) return null;
  return { deviceToken, counterName, branchName };
}

function clearDeviceState(): void {
  ["counter_device_token", "counter_id", "counter_name", "branch_name"]
    .forEach(k => localStorage.removeItem(k));
}

/**
 * Build the URL that gets encoded into the counter's QR code.
 * When a servicer scans this, their phone opens the activation page
 * with the counter's device_token pre-filled in the query string.
 *
 * Format: https://app.domain.com/counter/activate?counter_token=<device_token>
 */
function buildActivationUrl(deviceToken: string): string {
  return `${window.location.origin}/counter/activate?counter_token=${deviceToken}`;
}

// ─── Live Clock ───────────────────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// ─── QR Code Canvas ───────────────────────────────────────────────────────────

/**
 * Renders the counter's activation QR code onto a <canvas> element.
 *
 * The QR encodes the URL /counter/activate?counter_token=<device_token>
 * Servicers scan this with their phone to open the login form.
 *
 * We use a warm amber color (#b48c64) to match the idle screen palette
 * instead of the default black — keeps it visually cohesive.
 */
function CounterQrCode({ deviceToken }: { deviceToken: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !deviceToken) return;

    const url = buildActivationUrl(deviceToken);

    QRCode.toCanvas(canvasRef.current, url, {
      width:  200,
      margin: 2,
      color: {
        dark:  "#3d2c1e",  // warm dark brown dots
        light: "#faf5ee",  // warm cream background — matches idle screen
      },
      errorCorrectionLevel: "M",
    }, (err) => {
      if (err) {
        console.error("QR generation failed:", err);
        setError(true);
      }
    });
  }, [deviceToken]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2"
        style={{ width: 200, height: 200, background: "#f5e6d0",
          borderRadius: 16, border: "1px solid rgba(180,140,100,0.3)",
          justifyContent: "center" }}>
        <span style={{ fontSize: 32 }}>⚠️</span>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
          color: "#a07850", textAlign: "center", padding: "0 12px" }}>
          QR generation failed. Refresh page.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
      style={{
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(180,140,100,0.2), 0 0 0 1px rgba(180,140,100,0.2)",
      }}
    >
      {/* Subtle corner decorations */}
      {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-5 h-5 pointer-events-none z-10`}
          style={{ borderColor: "#b48c64", opacity: 0.4,
            borderTopWidth:    i < 2 ? 2 : 0,
            borderBottomWidth: i >= 2 ? 2 : 0,
            borderLeftWidth:   i % 2 === 0 ? 2 : 0,
            borderRightWidth:  i % 2 === 1 ? 2 : 0,
            borderStyle: "solid",
            borderTopLeftRadius:     i === 0 ? 4 : 0,
            borderTopRightRadius:    i === 1 ? 4 : 0,
            borderBottomLeftRadius:  i === 2 ? 4 : 0,
            borderBottomRightRadius: i === 3 ? 4 : 0,
          }} />
      ))}
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </motion.div>
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
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="flex flex-col items-center gap-5 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.12 }}
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ fontSize: 36, background: "radial-gradient(circle, #f0fdf4, #dcfce7)",
            border: "2px solid #86efac", boxShadow: "0 0 40px rgba(134,239,172,0.4)" }}
        >
          ✓
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "30px",
            fontWeight: 700, color: "#3d2c1e", marginBottom: "6px" }}>
            Welcome, {session.servicer_name}
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#a07850" }}>
            Session active — loading feedback screen...
          </p>
        </motion.div>

        <div className="flex gap-2 mt-2">
          {[0, 1, 2].map(i => (
            <motion.div key={i}
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
              transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
              className="w-2 h-2 rounded-full" style={{ background: "#b48c64" }} />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CounterIdle() {
  const now = useClock();

  const [deviceInfo,       setDeviceInfo]       = useState<ReturnType<typeof readDeviceInfo>>(null);
  const [activeSession,    setActiveSession]     = useState<ActiveSession | null>(null);
  const [lastChecked,      setLastChecked]       = useState<Date>(new Date());
  const [pollingPaused,    setPollingPaused]     = useState(false);
  const [connectionError,  setConnectionError]   = useState(false);
  const [showResetConfirm, setShowResetConfirm]  = useState(false);

  const deviceTokenRef = useRef<string | null>(null);

  // ── On mount: validate localStorage ──────────────────────────────────────
  useEffect(() => {
    const info = readDeviceInfo();
    if (!info) {
      router.visit(route("counter.setup"));
      return;
    }
    setDeviceInfo(info);
    deviceTokenRef.current = info.deviceToken;
  }, []);

  // ── Poll for active session ───────────────────────────────────────────────
  const pollSession = useCallback(async () => {
    const token = deviceTokenRef.current;
    if (!token || pollingPaused) return;

    try {
      const res = await axios.get<{ active: boolean; session?: ActiveSession }>(
        "/api/counter/session/status",
        { headers: { "X-Counter-Token": token }, timeout: 8_000 }
      );

      setLastChecked(new Date());
      setConnectionError(false);

      if (res.data.active && res.data.session) {
        setPollingPaused(true);
        setActiveSession(res.data.session);
        setTimeout(() => router.visit(route("counter.feedback")), WELCOME_DELAY_MS);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        clearDeviceState();
        router.visit(route("counter.setup"));
        return;
      }
      setConnectionError(true);
    }
  }, [pollingPaused]);

  useEffect(() => {
    if (!deviceInfo) return;
    pollSession();
    const interval = setInterval(pollSession, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [deviceInfo, pollSession]);

  // ── Reset device ──────────────────────────────────────────────────────────
  const handleReset = () => {
    setPollingPaused(true);
    clearDeviceState();
    router.visit(route("counter.setup"));
  };

  // ── Format times ──────────────────────────────────────────────────────────
  const timeStr        = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const dateStr        = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const lastCheckedStr = lastChecked.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,600&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div className="min-h-screen w-full relative overflow-hidden flex flex-col"
        style={{ background: "#faf5ee" }}>

        {/* Warm background */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-0 w-[600px] h-[600px] opacity-40"
            style={{ background: "radial-gradient(circle at 0% 0%, #f5dfc0, transparent 65%)" }} />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] opacity-30"
            style={{ background: "radial-gradient(circle at 100% 100%, #ead5b5, transparent 65%)" }} />
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "radial-gradient(circle, #b48c64 1px, transparent 1px)",
                     backgroundSize: "32px 32px" }} />
        </div>

        {/* ── Top bar ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex items-center justify-between px-10 pt-8"
        >
          <div className="flex items-center gap-3">
            {/* Status dot — amber=ok, red=connection error */}
            <motion.div
              animate={{ opacity: connectionError ? [1, 0.2, 1] : 1 }}
              transition={{ duration: 1.5, repeat: connectionError ? Infinity : 0 }}
              className="w-2 h-2 rounded-full"
              style={{ background: connectionError ? "#ef4444" : "#fbbf24",
                       boxShadow: `0 0 8px ${connectionError ? "#ef4444" : "#fbbf24"}` }}
            />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px",
              color: "#b48c64", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {deviceInfo?.branchName ?? "—"}
            </span>
            <span style={{ color: "#d4b896" }}>·</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px",
              color: "#b48c64", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {deviceInfo?.counterName ?? "—"}
            </span>
            <AnimatePresence>
              {connectionError && (
                <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ background: "#fff1f0", color: "#ef4444", border: "1px solid #fecaca",
                    fontFamily: "'DM Mono', monospace", fontSize: "10px",
                    padding: "2px 8px", borderRadius: 100 }}>
                  reconnecting...
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Live clock */}
          <div className="text-right">
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "26px",
              fontWeight: 600, color: "#3d2c1e", lineHeight: 1 }}>{timeStr}</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px",
              color: "#b48c64", marginTop: "2px" }}>{dateStr}</p>
          </div>
        </motion.div>

        {/* ── Main content — two column layout ── */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-8">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-16 w-full max-w-3xl">

            {/* Left: QR code */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-4"
            >
              {deviceInfo ? (
                <CounterQrCode deviceToken={deviceInfo.deviceToken} />
              ) : (
                /* Skeleton while loading device info */
                <div style={{ width: 200, height: 200, borderRadius: 20,
                  background: "rgba(180,140,100,0.08)",
                  border: "1px solid rgba(180,140,100,0.2)",
                  animation: "pulse 2s infinite" }} />
              )}

              {/* QR label */}
              <div className="text-center">
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px",
                  color: "#b48c64", letterSpacing: "0.08em", textTransform: "uppercase",
                  marginBottom: "3px" }}>
                  Scan to activate
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
                  color: "#c4a882", fontWeight: 300 }}>
                  Use your phone's camera
                </p>
              </div>
            </motion.div>

            {/* Divider */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="hidden lg:flex flex-col items-center gap-3"
            >
              <div style={{ width: 1, height: 60, background: "rgba(180,140,100,0.2)" }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px",
                color: "#d4b896", letterSpacing: "0.08em" }}>OR</span>
              <div style={{ width: 1, height: 60, background: "rgba(180,140,100,0.2)" }} />
            </motion.div>

            {/* Right: text + polling status */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center lg:items-start gap-6 text-center lg:text-left max-w-xs"
            >
              <div>
                <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "38px",
                  fontWeight: 600, color: "#3d2c1e", lineHeight: 1.15, marginBottom: "12px",
                  letterSpacing: "-0.01em" }}>
                  Waiting for<br />
                  <span style={{ fontStyle: "italic", color: "#b48c64" }}>Servicer</span>
                </h1>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
                  color: "#a07850", lineHeight: 1.7, fontWeight: 300 }}>
                  Scan the QR code with your phone
                  to log in and start your shift at
                  this counter.
                </p>
              </div>

              {/* Step hints */}
              <div className="flex flex-col gap-2.5">
                {[
                  { step: "1", text: "Open your phone camera" },
                  { step: "2", text: "Scan the QR code" },
                  { step: "3", text: "Enter your credentials" },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(180,140,100,0.15)",
                        border: "1px solid rgba(180,140,100,0.3)" }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px",
                        color: "#b48c64", fontWeight: 700 }}>{step}</span>
                    </div>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
                      color: "#a07850" }}>{text}</span>
                  </div>
                ))}
              </div>

              {/* Polling status pill */}
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-full"
                style={{ background: "rgba(180,140,100,0.08)",
                  border: "1px solid rgba(180,140,100,0.18)" }}>
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: connectionError ? "#ef4444" : "#b48c64" }}
                />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px",
                  color: "#b48c64", letterSpacing: "0.06em" }}>
                  {connectionError
                    ? "Connection issue — retrying..."
                    : `Checking every 4s · ${lastCheckedStr}`}
                </span>
              </div>
            </motion.div>

          </div>
        </div>

        {/* ── Bottom bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex items-center justify-between px-10 pb-8"
        >
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "16px",
            color: "#c4a882", fontStyle: "italic" }}>
            FeedbackPro
          </span>

          {/* Reset device */}
          <AnimatePresence mode="wait">
            {!showResetConfirm ? (
              <motion.button key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowResetConfirm(true)}
                style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px",
                  color: "#d4b896", background: "none", border: "none",
                  cursor: "pointer", letterSpacing: "0.04em" }}>
                Reset device
              </motion.button>
            ) : (
              <motion.div key="confirm" initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3">
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#a07850" }}>
                  This will clear setup. Sure?
                </span>
                <button onClick={handleReset}
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
          </AnimatePresence>
        </motion.div>

        {/* Session detected overlay */}
        <AnimatePresence>
          {activeSession && <SessionDetectedOverlay session={activeSession} />}
        </AnimatePresence>

      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </>
  );
}