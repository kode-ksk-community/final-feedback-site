/**
 * CounterSetup.tsx
 *
 * Counter device setup page — shown on first visit or when the device
 * has no active device_token in localStorage.
 *
 * Flow:
 *   Step 1 → Select Branch
 *   Step 2 → Select Counter (filtered by selected branch)
 *   Step 3 → Enter Counter PIN
 *   ✅ Done → device_token stored in localStorage → redirect to /counter/idle
 *
 * Route:    GET /counter/setup
 * File:     resources/js/Pages/Counter/Setup.tsx
 *
 * 🔧 STATIC MODE:
 *   All data is hardcoded in MOCK_DATA below.
 *   When controllers are ready, replace with Inertia props + axios calls.
 *   Search "TODO: REPLACE" to find every swap point.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Branch {
  id: number;
  name: string;
  address: string | null;
}

interface Counter {
  id: number;
  branch_id: number;
  name: string;
  description: string | null;
}

interface Props {
  // TODO: REPLACE — remove default when Inertia controller passes real props
  // Controller: return Inertia::render('Counter/Setup', ['branches' => Branch::active()->get()])
  branches?: Branch[];
}

// ─── 🔧 Static Mock Data ──────────────────────────────────────────────────────
// Replace this entire block once the backend is ready.
// Branches come from Inertia props; counters come from GET /api/branches/{id}/counters

const MOCK_BRANCHES: Branch[] = [
  { id: 1, name: "Main Branch",  address: "123 Main Street, Phnom Penh" },
  { id: 2, name: "North Branch", address: "456 North Avenue, Phnom Penh" },
  { id: 3, name: "East Branch",  address: "789 East Road, Siem Reap" },
];

const MOCK_COUNTERS: Counter[] = [
  { id: 1, branch_id: 1, name: "Counter 1", description: "Ground floor, main entrance" },
  { id: 2, branch_id: 1, name: "Counter 2", description: "Ground floor, left side" },
  { id: 3, branch_id: 1, name: "Counter 3", description: "First floor, right wing" },
  { id: 4, branch_id: 2, name: "Counter 1", description: "Main service desk" },
  { id: 5, branch_id: 2, name: "Counter 2", description: "Near the entrance" },
  { id: 6, branch_id: 3, name: "Counter 1", description: "Ground floor" },
];

// Demo PINs per counter — only used in static mode
// In production, PIN is verified server-side ONLY, never client-side
const MOCK_PINS: Record<number, string> = {
  1: "1234", 2: "5678", 3: "1111",
  4: "2222", 5: "3333", 6: "4444",
};

// ─── Animation Variants ───────────────────────────────────────────────────────

const stepVariants = {
  enter:  { opacity: 0, x: 48,  filter: "blur(4px)" },
  center: { opacity: 1, x: 0,   filter: "blur(0px)",
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit:   { opacity: 0, x: -48, filter: "blur(4px)",
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } },
};

const cardVariants = {
  hidden:   { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const steps = ["Branch", "Counter", "PIN"];
  return (
    <div className="flex items-center gap-3 mb-10 justify-center">
      {steps.map((label, i) => {
        const step     = i + 1;
        const isActive = step === current;
        const isDone   = step < current;
        return (
          <div key={label} className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <motion.div
                animate={{
                  backgroundColor: isDone ? "#10b981" : isActive ? "#f8fafc" : "transparent",
                  borderColor:     isDone ? "#10b981" : isActive ? "#f8fafc" : "rgba(248,250,252,0.2)",
                  scale: isActive ? 1.12 : 1,
                }}
                transition={{ duration: 0.3 }}
                className="w-9 h-9 rounded-full border-2 flex items-center justify-center"
              >
                {isDone ? (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="text-white text-sm font-bold">✓</motion.span>
                ) : (
                  <span className="text-sm font-bold"
                    style={{ color: isActive ? "#0f172a" : "rgba(248,250,252,0.3)",
                             fontFamily: "'DM Mono', monospace" }}>
                    {step}
                  </span>
                )}
              </motion.div>
              <span className="text-xs tracking-widest uppercase"
                style={{ color: isActive ? "#f8fafc" : isDone ? "#10b981" : "rgba(248,250,252,0.3)",
                         fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <motion.div className="w-14 h-px mb-5"
                animate={{ backgroundColor: isDone ? "#10b981" : "rgba(248,250,252,0.12)" }}
                transition={{ duration: 0.4 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Selectable Card ──────────────────────────────────────────────────────────

function SelectCard({ label, sublabel, selected, onClick, index }: {
  label: string; sublabel?: string | null;
  selected: boolean; onClick: () => void; index: number;
}) {
  return (
    <motion.button
      custom={index} variants={cardVariants} initial="hidden" animate="visible"
      whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="w-full text-left px-5 py-4 rounded-2xl border-2 transition-colors"
      style={{
        borderColor:     selected ? "#f8fafc" : "rgba(248,250,252,0.1)",
        backgroundColor: selected ? "rgba(248,250,252,0.1)" : "rgba(248,250,252,0.03)",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-base font-semibold"
            style={{ color: selected ? "#f8fafc" : "rgba(248,250,252,0.65)",
                     fontFamily: "'Syne', sans-serif" }}>
            {label}
          </p>
          {sublabel && (
            <p className="text-xs mt-0.5" style={{ color: "rgba(248,250,252,0.35)" }}>
              {sublabel}
            </p>
          )}
        </div>
        <motion.div
          animate={{ scale: selected ? 1 : 0.4, opacity: selected ? 1 : 0 }}
          className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
        </motion.div>
      </div>
    </motion.button>
  );
}

// ─── PIN Keypad ───────────────────────────────────────────────────────────────

function PinKeypad({ pin, onChange }: { pin: string; onChange: (pin: string) => void }) {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","del"];

  const handleKey = (key: string) => {
    if (key === "del") onChange(pin.slice(0, -1));
    else if (pin.length < 6) onChange(pin + key);
  };

  return (
    <div className="flex flex-col items-center gap-7">
      {/* Dots */}
      <div className="flex gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div key={i}
            animate={{
              scale: i === pin.length - 1 ? [1, 1.35, 1] : 1,
              backgroundColor: i < pin.length ? "#f8fafc" : "rgba(248,250,252,0.15)",
            }}
            transition={{ duration: 0.15 }}
            className="w-3.5 h-3.5 rounded-full"
          />
        ))}
      </div>
      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
        {keys.map((key, i) => {
          if (key === "") return <div key={i} />;
          return (
            <motion.button key={i}
              whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.91 }}
              onClick={() => handleKey(key)}
              className="h-14 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: key === "del" ? "rgba(248,250,252,0.05)" : "rgba(248,250,252,0.08)",
                border: "1px solid rgba(248,250,252,0.1)",
                color: "rgba(248,250,252,0.9)",
                fontSize: key === "del" ? "15px" : "20px",
                fontFamily: key === "del" ? "inherit" : "'DM Mono', monospace",
                cursor: "pointer",
              }}
            >
              {key === "del" ? "⌫" : key}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CounterSetup({ branches: propBranches }: Props) {
  // TODO: REPLACE → const branches = propBranches!;
  const branches = MOCK_BRANCHES;

  const [step,            setStep]            = useState(1);
  const [selectedBranch,  setSelectedBranch]  = useState<Branch | null>(null);
  const [counters,        setCounters]        = useState<Counter[]>([]);
  const [selectedCounter, setSelectedCounter] = useState<Counter | null>(null);
  const [pin,             setPin]             = useState("");
  const [loading,         setLoading]         = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [success,         setSuccess]         = useState(false);

  // ── Step 1 → 2 ────────────────────────────────────────────────────────────

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch);
    setLoading(true);

    // TODO: REPLACE with:
    // const res = await axios.get(`/api/branches/${branch.id}/counters`);
    // setCounters(res.data.data); setStep(2);
    setTimeout(() => {
      setCounters(MOCK_COUNTERS.filter(c => c.branch_id === branch.id));
      setLoading(false);
      setStep(2);
    }, 400);
  };

  // ── Step 2 → 3 ────────────────────────────────────────────────────────────

  const handleCounterSelect = (counter: Counter) => {
    setSelectedCounter(counter);
    setPin("");
    setStep(3);
  };

  // ── Step 3: Submit PIN ────────────────────────────────────────────────────

  const handlePinSubmit = () => {
    if (pin.length < 4) { toast.error("Please enter your PIN"); return; }
    setSubmitting(true);

    // TODO: REPLACE with:
    // const res = await axios.post('/api/counter/activate-device', { counter_id: selectedCounter!.id, pin });
    // localStorage.setItem('counter_device_token', res.data.device_token);
    // router.visit('/counter/idle');
    setTimeout(() => {
      const correct = MOCK_PINS[selectedCounter!.id];
      if (pin === correct) {
        localStorage.setItem("counter_device_token", `mock_token_${selectedCounter!.id}`);
        localStorage.setItem("counter_id",   String(selectedCounter!.id));
        localStorage.setItem("counter_name", selectedCounter!.name);
        localStorage.setItem("branch_name",  selectedBranch!.name);
        setSuccess(true);
        toast.success("Counter activated!");
        // TODO: REPLACE with → router.visit('/counter/idle')
        setTimeout(() => {
          setSuccess(false); setStep(1); setPin("");
          setSelectedBranch(null); setSelectedCounter(null);
        }, 2200);
      } else {
        toast.error(`Incorrect PIN — hint: try "${correct}"`);
        setPin("");
      }
      setSubmitting(false);
    }, 700);
  };

  const handlePinChange = (newPin: string) => {
    setPin(newPin);
    if (newPin.length === 6) setTimeout(handlePinSubmit, 300);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <Toaster position="top-center" toastOptions={{
        style: { background: "#1e293b", color: "#f8fafc",
          border: "1px solid rgba(248,250,252,0.1)", borderRadius: "12px",
          fontFamily: "'Syne', sans-serif" },
      }} />

      <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
        style={{ backgroundColor: "#0a0f1e" }}>

        {/* Ambient blobs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle,#3b82f6,transparent 70%)", filter: "blur(70px)" }} />
          <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle,#8b5cf6,transparent 70%)", filter: "blur(70px)" }} />
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: `linear-gradient(rgba(248,250,252,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(248,250,252,.5) 1px,transparent 1px)`,
                     backgroundSize: "60px 60px" }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
              style={{ background: "rgba(248,250,252,0.06)", border: "1px solid rgba(248,250,252,0.1)" }}>
              <div className="w-2 h-2 rounded-full bg-emerald-400"
                style={{ boxShadow: "0 0 8px #34d399", animation: "pulse 2s infinite" }} />
              <span style={{ color: "rgba(248,250,252,0.5)", fontFamily: "'DM Mono', monospace",
                fontSize: "11px", letterSpacing: ".1em", textTransform: "uppercase" }}>
                Counter Setup
              </span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              style={{ color: "#f8fafc", fontFamily: "'Syne', sans-serif",
                fontSize: "30px", fontWeight: 800, letterSpacing: "-.02em", marginBottom: "6px" }}>
              Activate This Device
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              style={{ color: "rgba(248,250,252,0.4)", fontSize: "14px" }}>
              Set up this counter to start collecting feedback
            </motion.p>
          </div>

          <StepIndicator current={step} />

          {/* Panel */}
          <div className="rounded-3xl p-7"
            style={{ background: "rgba(248,250,252,0.04)", border: "1px solid rgba(248,250,252,0.08)", backdropFilter: "blur(20px)" }}>
            <AnimatePresence mode="wait">

              {/* Step 1: Branch */}
              {step === 1 && !success && (
                <motion.div key="s1" variants={stepVariants} initial="enter" animate="center" exit="exit">
                  <p style={{ color: "#f8fafc", fontFamily: "'Syne', sans-serif", fontSize: "17px", fontWeight: 700, marginBottom: "4px" }}>
                    Select your branch
                  </p>
                  <p style={{ color: "rgba(248,250,252,0.4)", fontSize: "13px", marginBottom: "18px" }}>
                    Which location is this device at?
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {branches.map((b, i) => (
                      <SelectCard key={b.id} index={i} label={b.name} sublabel={b.address}
                        selected={selectedBranch?.id === b.id} onClick={() => handleBranchSelect(b)} />
                    ))}
                  </div>
                  {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-center justify-center gap-2 mt-5">
                      <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: "rgba(248,250,252,0.4)" }} />
                      <span style={{ color: "rgba(248,250,252,0.4)", fontSize: "13px" }}>Loading counters...</span>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Step 2: Counter */}
              {step === 2 && !success && (
                <motion.div key="s2" variants={stepVariants} initial="enter" animate="center" exit="exit">
                  <div className="flex items-center gap-3 mb-5">
                    <button onClick={() => setStep(1)}
                      style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(248,250,252,0.07)",
                        color: "rgba(248,250,252,0.6)", border: "none", cursor: "pointer", fontSize: "16px",
                        display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
                    <div>
                      <p style={{ color: "#f8fafc", fontFamily: "'Syne', sans-serif", fontSize: "17px", fontWeight: 700 }}>Select counter</p>
                      <p style={{ color: "rgba(248,250,252,0.4)", fontSize: "12px" }}>{selectedBranch?.name}</p>
                    </div>
                  </div>
                  {counters.length === 0 ? (
                    <div className="text-center py-8" style={{ color: "rgba(248,250,252,0.35)" }}>
                      <p style={{ fontSize: "36px", marginBottom: "10px" }}>🖥️</p>
                      <p style={{ fontSize: "14px" }}>No counters found for this branch.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {counters.map((c, i) => (
                        <SelectCard key={c.id} index={i} label={c.name} sublabel={c.description}
                          selected={selectedCounter?.id === c.id} onClick={() => handleCounterSelect(c)} />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 3: PIN */}
              {step === 3 && !success && (
                <motion.div key="s3" variants={stepVariants} initial="enter" animate="center" exit="exit">
                  <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => { setStep(2); setPin(""); }}
                      style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(248,250,252,0.07)",
                        color: "rgba(248,250,252,0.6)", border: "none", cursor: "pointer", fontSize: "16px",
                        display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
                    <div>
                      <p style={{ color: "#f8fafc", fontFamily: "'Syne', sans-serif", fontSize: "17px", fontWeight: 700 }}>Enter counter PIN</p>
                      <p style={{ color: "rgba(248,250,252,0.4)", fontSize: "12px" }}>{selectedBranch?.name} — {selectedCounter?.name}</p>
                    </div>
                  </div>
                  <PinKeypad pin={pin} onChange={handlePinChange} />
                  <AnimatePresence>
                    {pin.length >= 4 && pin.length < 6 && (
                      <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        onClick={handlePinSubmit} disabled={submitting}
                        className="w-full mt-7 py-4 rounded-2xl font-semibold"
                        style={{ background: submitting ? "rgba(248,250,252,0.1)" : "#f8fafc",
                          color: submitting ? "rgba(248,250,252,0.4)" : "#0a0f1e",
                          fontFamily: "'Syne', sans-serif", fontSize: "14px",
                          border: "none", cursor: submitting ? "not-allowed" : "pointer" }}>
                        {submitting ? "Verifying..." : "Activate Counter →"}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Success */}
              {success && (
                <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4 py-8 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                    style={{ background: "rgba(16,185,129,0.15)", border: "2px solid #10b981" }}>✓</motion.div>
                  <div>
                    <p style={{ color: "#f8fafc", fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: 700, marginBottom: "6px" }}>
                      Counter Activated!
                    </p>
                    <p style={{ color: "rgba(248,250,252,0.45)", fontSize: "13px" }}>Redirecting to idle screen...</p>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          <p className="text-center mt-4"
            style={{ color: "rgba(248,250,252,0.2)", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>
            This device will remember its counter after setup.
          </p>
        </motion.div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </>
  );
}