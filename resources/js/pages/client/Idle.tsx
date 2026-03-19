/**
 * CounterIdle.tsx
 *
 * The idle screen shown on the counter device when no servicer is active.
 * Displayed after device setup and after a servicer logs out.
 *
 * What this screen does:
 *   1. On mount — validates device_token from localStorage
 *      → if missing or invalid → redirects to /counter/setup
 *   2. Polls GET /api/counter/session/status every 4 seconds
 *      → if active session found → shows welcome overlay → redirects to /counter/feedback
 *   3. Shows live clock, counter name, branch name
 *   4. "Reset device" button clears localStorage → redirects to /counter/setup
 *
 * Route:    GET /counter/idle
 * File:     resources/js/Pages/Counter/Idle.tsx
 *
 * ─── Laravel side needed ──────────────────────────────────────────────────────
 *
 * routes/web.php:
 *   Route::get('/counter/idle', [CounterSetupController::class, 'idle'])->name('counter.idle');
 *
 * routes/api.php (device.token middleware):
 *   Route::get('/counter/session/status', [CounterSessionController::class, 'status']);
 *
 * CounterSessionController@status response:
 *   { active: false }
 *   OR
 *   { active: true, session: { id, servicer_name, started_at } }
 *
 * DeviceTokenMiddleware:
 *   Reads X-Counter-Token header → finds counter → attaches to request
 *   On failure → returns { message, redirect: '/counter/setup' }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { router }                                    from "@inertiajs/react";
import { motion, AnimatePresence }                   from "framer-motion";
import axios                                         from "axios";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveSession {
  id: number;
  servicer_name: string;
  started_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** How often to poll for a new session (milliseconds) */
const POLL_INTERVAL_MS = 4_000;

/** How long to show the welcome overlay before redirecting (milliseconds) */
const WELCOME_DELAY_MS = 2_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Read counter identity from localStorage.
 * These values were written by CounterSetup.tsx after successful PIN verification.
 *
 * Returns null if any required key is missing (device needs re-setup).
 */
function readDeviceInfo(): {
  deviceToken: string;
  counterName: string;
  branchName: string;
} | null {
  const deviceToken = localStorage.getItem("counter_device_token");
  const counterName = localStorage.getItem("counter_name");
  const branchName  = localStorage.getItem("branch_name");

  if (!deviceToken || !counterName || !branchName) return null;

  return { deviceToken, counterName, branchName };
}

/**
 * Clear all counter device state from localStorage.
 * Called by "Reset device" button to force re-setup.
 */
function clearDeviceState(): void {
  localStorage.removeItem("counter_device_token");
  localStorage.removeItem("counter_id");
  localStorage.removeItem("counter_name");
  localStorage.removeItem("branch_name");
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

// ─── Breathing Ring ───────────────────────────────────────────────────────────

function BreathingRing() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="absolute rounded-full"
          style={{ width: 240, height: 240, border: "1px solid rgba(180,140,100,0.25)" }}
          animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 3.5, delay: i * 1.15, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <motion.div className="absolute rounded-full"
        style={{ width: 180, height: 180, border: "1.5px solid rgba(180,140,100,0.3)" }}
        animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div className="absolute rounded-full"
        style={{ width: 130, height: 130, border: "1.5px solid rgba(180,140,100,0.5)" }}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
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
            Session active — loading feedback screen...
          </p>
        </motion.div>

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

  // ── Device info from localStorage ─────────────────────────────────────────
  const [deviceInfo, setDeviceInfo] = useState<ReturnType<typeof readDeviceInfo>>(null);

  // ── Polling state ──────────────────────────────────────────────────────────
  const [activeSession,    setActiveSession]    = useState<ActiveSession | null>(null);
  const [lastChecked,      setLastChecked]      = useState<Date>(new Date());
  const [pollingPaused,    setPollingPaused]    = useState(false);
  const [connectionError,  setConnectionError]  = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Use ref to track latest deviceToken without re-creating the poll callback
  const deviceTokenRef = useRef<string | null>(null);

  // ── On mount: read localStorage → validate device is set up ───────────────
  useEffect(() => {
    const info = readDeviceInfo();

    if (!info) {
      // No device token → device was never set up or was reset
      // Redirect to setup immediately
      router.visit(route("counter.setup"));
      return;
    }

    setDeviceInfo(info);
    deviceTokenRef.current = info.deviceToken;
  }, []);

  // ── Core poll function ────────────────────────────────────────────────────
  /**
   * Calls GET /api/counter/session/status every POLL_INTERVAL_MS.
   * Sends device_token as X-Counter-Token header.
   *
   * Possible API responses:
   *   200 { active: false }
   *       → no session yet, keep polling
   *
   *   200 { active: true, session: { id, servicer_name, started_at } }
   *       → servicer has activated! show overlay then redirect
   *
   *   401 { redirect: '/counter/setup' }
   *       → device_token is invalid (counter re-setup or token changed)
   *       → clear localStorage and redirect to setup
   *
   *   Network error
   *       → show connection error indicator, keep polling
   */
  const pollSession = useCallback(async () => {
    const token = deviceTokenRef.current;
    if (!token || pollingPaused) return;

    try {
      const res = await axios.get<{
        active: boolean;
        session?: ActiveSession;
      }>("/api/counter/session/status", {
        headers: { "X-Counter-Token": token },
        // Short timeout so a slow network doesn't block the next poll
        timeout: 8_000,
      });

      setLastChecked(new Date());
      setConnectionError(false);

      if (res.data.active && res.data.session) {
        // Session detected! Stop polling, show overlay, then navigate
        setPollingPaused(true);
        setActiveSession(res.data.session);

        setTimeout(() => {
          router.visit(route("counter.feedback"));
        }, WELCOME_DELAY_MS);
      }

    } catch (err: any) {
      const status   = err.response?.status;
      const redirect = err.response?.data?.redirect;

      if (status === 401) {
        // Device token is no longer valid (counter was reset or PIN changed)
        // Clear localStorage and redirect to setup so device can re-authenticate
        clearDeviceState();
        router.visit(route("counter.setup"));
        return;
      }

      if (status === 403) {
        // Branch or counter was deactivated by admin
        // Show error and keep trying — admin may re-activate it
        setConnectionError(true);
        return;
      }

      // Network error / server down — show indicator, keep trying
      setConnectionError(true);
    }
  }, [pollingPaused]);

  // ── Start polling loop ────────────────────────────────────────────────────
  useEffect(() => {
    if (!deviceInfo) return; // wait until device info is loaded

    // Run immediately on mount, then on interval
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

  // ── Format time strings ───────────────────────────────────────────────────
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  const lastCheckedStr = lastChecked.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      <div
        className="min-h-screen w-full relative overflow-hidden flex flex-col"
        style={{ background: "#faf5ee" }}
      >
        {/* Background warm texture */}
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
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex items-center justify-between px-10 pt-8"
        >
          {/* Branch · Counter */}
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ opacity: connectionError ? [1, 0.2, 1] : 1 }}
              transition={{ duration: 1.5, repeat: connectionError ? Infinity : 0 }}
              className="w-2 h-2 rounded-full"
              style={{
                background: connectionError ? "#ef4444" : "#fbbf24",
                boxShadow: connectionError ? "0 0 8px #ef4444" : "0 0 8px #fbbf24",
              }}
            />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px",
              color: "#b48c64", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {deviceInfo?.branchName ?? "—"}
            </span>
            <span style={{ color: "#d4b896", fontSize: "12px" }}>·</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px",
              color: "#b48c64", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {deviceInfo?.counterName ?? "—"}
            </span>

            {/* Connection error badge */}
            <AnimatePresence>
              {connectionError && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{ background: "#fff1f0", color: "#ef4444",
                    border: "1px solid #fecaca",
                    fontFamily: "'DM Mono', monospace", fontSize: "10px" }}
                >
                  reconnecting...
                </motion.span>
              )}
            </AnimatePresence>
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

          {/* Heading */}
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
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full"
              style={{ background: connectionError ? "#ef4444" : "#b48c64" }}
            />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px",
              color: "#b48c64", letterSpacing: "0.06em" }}>
              {connectionError
                ? "Connection issue — retrying..."
                : `Checking every 4s · last ${lastCheckedStr}`
              }
            </span>
          </motion.div>
        </div>

        {/* ── Bottom bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex items-center justify-between px-10 pb-8"
        >
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "16px",
            color: "#c4a882", fontStyle: "italic", letterSpacing: "0.02em" }}>
            FeedbackPro
          </span>

          {/* Reset device */}
          <AnimatePresence mode="wait">
            {!showResetConfirm ? (
              <motion.button key="reset-btn"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowResetConfirm(true)}
                style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px",
                  color: "#d4b896", background: "none", border: "none",
                  cursor: "pointer", letterSpacing: "0.04em" }}>
                Reset device
              </motion.button>
            ) : (
              <motion.div key="reset-confirm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#a07850" }}>
                  This will clear setup. Sure?
                </span>
                <button onClick={handleReset}
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
                    color: "#ef4444", background: "none", border: "none",
                    cursor: "pointer", fontWeight: 500 }}>
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
    </>
  );
}