/**
 * CounterSetup.tsx
 *
 * The counter device setup page — shown on first visit or when the device
 * has no active device_token in localStorage.
 *
 * Flow:
 *   Step 1 → Select Branch
 *   Step 2 → Select Counter (filtered by selected branch)
 *   Step 3 → Enter Counter PIN
 *   ✅ Done → device_token stored in localStorage → redirect to /counter/idle
 *
 * Route:     GET /counter/setup
 * Inertia:   pages/Counter/Setup.tsx
 * Props:     { branches: Branch[] }
 */

import { useState } from "react";
import { router } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Branch {
  id: number;
  name: string;
  address: string | null;
}

interface Counter {
  id: number;
  name: string;
  description: string | null;
}

interface Props {
  branches: Branch[];
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const stepVariants = {
  enter: { opacity: 0, x: 48, filter: "blur(4px)" },
  center: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    x: -48,
    filter: "blur(4px)",
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Step indicator dots at the top of the page.
 * Shows current progress through the 3-step setup flow.
 */
function StepIndicator({ current }: { current: number }) {
  const steps = ["Branch", "Counter", "PIN"];
  return (
    <div className="flex items-center gap-3 mb-12">
      {steps.map((label, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={label} className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <motion.div
                animate={{
                  backgroundColor: isDone
                    ? "#10b981"
                    : isActive
                    ? "#f8fafc"
                    : "transparent",
                  borderColor: isDone
                    ? "#10b981"
                    : isActive
                    ? "#f8fafc"
                    : "rgba(248,250,252,0.2)",
                  scale: isActive ? 1.15 : 1,
                }}
                transition={{ duration: 0.3 }}
                className="w-9 h-9 rounded-full border-2 flex items-center justify-center"
              >
                {isDone ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-white text-sm font-bold"
                  >
                    ✓
                  </motion.span>
                ) : (
                  <span
                    className="text-sm font-bold"
                    style={{
                      color: isActive
                        ? "#0f172a"
                        : "rgba(248,250,252,0.4)",
                    }}
                  >
                    {step}
                  </span>
                )}
              </motion.div>
              <span
                className="text-xs font-medium tracking-widest uppercase"
                style={{
                  color: isActive
                    ? "#f8fafc"
                    : isDone
                    ? "#10b981"
                    : "rgba(248,250,252,0.3)",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {label}
              </span>
            </div>

            {/* Connector line between steps */}
            {i < steps.length - 1 && (
              <motion.div
                className="w-16 h-px mb-5"
                animate={{
                  backgroundColor: isDone
                    ? "#10b981"
                    : "rgba(248,250,252,0.15)",
                }}
                transition={{ duration: 0.4 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * A selectable card used for Branch and Counter selection.
 * Animates in with a stagger delay based on index.
 */
function SelectCard({
  label,
  sublabel,
  selected,
  onClick,
  index,
}: {
  label: string;
  sublabel?: string | null;
  selected: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <motion.button
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full text-left px-6 py-5 rounded-2xl border-2 transition-colors relative overflow-hidden"
      style={{
        borderColor: selected
          ? "#f8fafc"
          : "rgba(248,250,252,0.12)",
        backgroundColor: selected
          ? "rgba(248,250,252,0.12)"
          : "rgba(248,250,252,0.04)",
      }}
    >
      {/* Selected glow */}
      {selected && (
        <motion.div
          layoutId="selected-glow"
          className="absolute inset-0 rounded-2xl"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(248,250,252,0.08) 0%, transparent 70%)",
          }}
        />
      )}

      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p
            className="text-lg font-semibold"
            style={{
              color: selected ? "#f8fafc" : "rgba(248,250,252,0.7)",
              fontFamily: "'Syne', sans-serif",
            }}
          >
            {label}
          </p>
          {sublabel && (
            <p
              className="text-sm mt-0.5"
              style={{ color: "rgba(248,250,252,0.4)" }}
            >
              {sublabel}
            </p>
          )}
        </div>

        {/* Selection indicator */}
        <motion.div
          animate={{
            scale: selected ? 1 : 0.5,
            opacity: selected ? 1 : 0,
          }}
          className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
        </motion.div>
      </div>
    </motion.button>
  );
}

/**
 * PIN input — 4-digit large tap-friendly keypad.
 * Designed for tablet touch interaction.
 */
function PinInput({
  pin,
  onChange,
}: {
  pin: string;
  onChange: (pin: string) => void;
}) {
  const maxLength = 6;

  const handleKey = (key: string) => {
    if (key === "del") {
      onChange(pin.slice(0, -1));
    } else if (pin.length < maxLength) {
      onChange(pin + key);
    }
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div className="flex flex-col items-center gap-8">
      {/* PIN display dots */}
      <div className="flex gap-4">
        {Array.from({ length: maxLength }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              scale: i === pin.length - 1 ? [1, 1.3, 1] : 1,
              backgroundColor:
                i < pin.length
                  ? "#f8fafc"
                  : "rgba(248,250,252,0.15)",
            }}
            transition={{ duration: 0.15 }}
            className="w-4 h-4 rounded-full"
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {keys.map((key, i) => {
          if (key === "") return <div key={i} />;

          return (
            <motion.button
              key={i}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleKey(key)}
              className="h-16 rounded-2xl flex items-center justify-center text-xl font-semibold transition-colors"
              style={{
                backgroundColor:
                  key === "del"
                    ? "rgba(248,250,252,0.06)"
                    : "rgba(248,250,252,0.08)",
                color: "rgba(248,250,252,0.9)",
                border: "1px solid rgba(248,250,252,0.1)",
                fontFamily:
                  key === "del" ? "inherit" : "'DM Mono', monospace",
                fontSize: key === "del" ? "14px" : "20px",
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

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function CounterSetup({ branches }: Props) {
  const [step, setStep] = useState(1);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [selectedCounter, setSelectedCounter] = useState<Counter | null>(null);
  const [pin, setPin] = useState("");
  const [loadingCounters, setLoadingCounters] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Step 1 → Step 2: Load counters for selected branch ──────────────────

  /**
   * When a branch is selected, fetch its counters from the API,
   * then advance to step 2.
   */
  const handleBranchSelect = async (branch: Branch) => {
    setSelectedBranch(branch);
    setLoadingCounters(true);
    setSelectedCounter(null);

    try {
      // GET /api/branches/{id}/counters → returns active counters for this branch
      const res = await axios.get(`/api/branches/${branch.id}/counters`);
      setCounters(res.data.data);
      setStep(2);
    } catch {
      toast.error("Failed to load counters. Please try again.");
    } finally {
      setLoadingCounters(false);
    }
  };

  // ── Step 2 → Step 3: Counter selected ───────────────────────────────────

  const handleCounterSelect = (counter: Counter) => {
    setSelectedCounter(counter);
    setStep(3);
  };

  // ── Step 3: Submit PIN → get device token ────────────────────────────────

  /**
   * Submit the counter PIN to the backend.
   * On success: store device_token in localStorage, redirect to /counter/idle.
   * On failure: show error toast, clear PIN.
   *
   * POST /api/counter/activate-device
   * Body: { counter_id, pin }
   * Response: { device_token: string }
   */
  const handlePinSubmit = async () => {
    if (pin.length < 4) {
      toast.error("Please enter your PIN");
      return;
    }

    setSubmitting(true);

    try {
      const res = await axios.post("/api/counter/activate-device", {
        counter_id: selectedCounter!.id,
        pin,
      });

      // Store device token in localStorage so this device remembers
      // which counter it is on future visits
      localStorage.setItem("counter_device_token", res.data.device_token);
      localStorage.setItem("counter_id", String(selectedCounter!.id));
      localStorage.setItem("counter_name", selectedCounter!.name);
      localStorage.setItem("branch_name", selectedBranch!.name);

      toast.success("Counter activated!");

      // Small delay to show success state before redirect
      setTimeout(() => {
        // Redirect to idle screen — Inertia visit
        router.visit("/counter/idle");
      }, 800);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ?? "Incorrect PIN. Please try again.";
      toast.error(msg);
      setPin(""); // Clear PIN on failure
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-submit when PIN reaches max length
  const handlePinChange = (newPin: string) => {
    setPin(newPin);
    if (newPin.length === 6) {
      // Small delay so user sees all dots filled before submit
      setTimeout(() => handlePinSubmit(), 300);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#1e293b",
            color: "#f8fafc",
            border: "1px solid rgba(248,250,252,0.1)",
            borderRadius: "12px",
            fontFamily: "'Syne', sans-serif",
          },
        }}
      />

      {/* Full-screen background */}
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
        style={{ backgroundColor: "#0a0f1e" }}
      >
        {/* Ambient background blobs */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20"
            style={{
              background:
                "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15"
            style={{
              background:
                "radial-gradient(circle, #8b5cf6 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(248,250,252,0.5) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(248,250,252,0.5) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-lg"
        >
          {/* Header */}
          <div className="mb-10 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{
                background: "rgba(248,250,252,0.06)",
                border: "1px solid rgba(248,250,252,0.1)",
              }}
            >
              <div
                className="w-2 h-2 rounded-full bg-emerald-400"
                style={{
                  boxShadow: "0 0 8px #34d399",
                  animation: "pulse 2s infinite",
                }}
              />
              <span
                className="text-xs tracking-widest uppercase"
                style={{
                  color: "rgba(248,250,252,0.5)",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                Counter Setup
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="text-4xl font-bold mb-2"
              style={{
                color: "#f8fafc",
                fontFamily: "'Syne', sans-serif",
                letterSpacing: "-0.02em",
              }}
            >
              Activate This Device
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-base"
              style={{ color: "rgba(248,250,252,0.45)" }}
            >
              Set up this counter to start collecting feedback
            </motion.p>
          </div>

          {/* Step indicator */}
          <div className="flex justify-center">
            <StepIndicator current={step} />
          </div>

          {/* Step content */}
          <div
            className="rounded-3xl p-8 relative overflow-hidden"
            style={{
              background: "rgba(248,250,252,0.04)",
              border: "1px solid rgba(248,250,252,0.08)",
              backdropFilter: "blur(20px)",
            }}
          >
            <AnimatePresence mode="wait">
              {/* ── Step 1: Select Branch ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <h2
                    className="text-xl font-semibold mb-1"
                    style={{
                      color: "#f8fafc",
                      fontFamily: "'Syne', sans-serif",
                    }}
                  >
                    Select your branch
                  </h2>
                  <p
                    className="text-sm mb-6"
                    style={{ color: "rgba(248,250,252,0.4)" }}
                  >
                    Which location is this device at?
                  </p>

                  <div className="flex flex-col gap-3">
                    {branches.map((branch, i) => (
                      <SelectCard
                        key={branch.id}
                        index={i}
                        label={branch.name}
                        sublabel={branch.address}
                        selected={selectedBranch?.id === branch.id}
                        onClick={() => handleBranchSelect(branch)}
                      />
                    ))}
                  </div>

                  {loadingCounters && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center gap-3 mt-6"
                    >
                      <div
                        className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: "rgba(248,250,252,0.4)" }}
                      />
                      <span
                        className="text-sm"
                        style={{ color: "rgba(248,250,252,0.4)" }}
                      >
                        Loading counters...
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* ── Step 2: Select Counter ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setStep(1)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                      style={{
                        background: "rgba(248,250,252,0.06)",
                        color: "rgba(248,250,252,0.6)",
                      }}
                    >
                      ←
                    </button>
                    <div>
                      <h2
                        className="text-xl font-semibold"
                        style={{
                          color: "#f8fafc",
                          fontFamily: "'Syne', sans-serif",
                        }}
                      >
                        Select counter
                      </h2>
                      <p
                        className="text-sm"
                        style={{ color: "rgba(248,250,252,0.4)" }}
                      >
                        {selectedBranch?.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {counters.length === 0 ? (
                      <div
                        className="text-center py-10"
                        style={{ color: "rgba(248,250,252,0.35)" }}
                      >
                        <p className="text-4xl mb-3">🖥️</p>
                        <p>No counters found for this branch.</p>
                        <p className="text-sm mt-1">
                          Ask your admin to create counters first.
                        </p>
                      </div>
                    ) : (
                      counters.map((counter, i) => (
                        <SelectCard
                          key={counter.id}
                          index={i}
                          label={counter.name}
                          sublabel={counter.description}
                          selected={selectedCounter?.id === counter.id}
                          onClick={() => handleCounterSelect(counter)}
                        />
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Enter PIN ── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <div className="flex items-center gap-3 mb-8">
                    <button
                      onClick={() => { setStep(2); setPin(""); }}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                      style={{
                        background: "rgba(248,250,252,0.06)",
                        color: "rgba(248,250,252,0.6)",
                      }}
                    >
                      ←
                    </button>
                    <div>
                      <h2
                        className="text-xl font-semibold"
                        style={{
                          color: "#f8fafc",
                          fontFamily: "'Syne', sans-serif",
                        }}
                      >
                        Enter counter PIN
                      </h2>
                      <p
                        className="text-sm"
                        style={{ color: "rgba(248,250,252,0.4)" }}
                      >
                        {selectedBranch?.name} — {selectedCounter?.name}
                      </p>
                    </div>
                  </div>

                  <PinInput pin={pin} onChange={handlePinChange} />

                  {/* Manual submit button (backup for 4-digit PINs) */}
                  {pin.length >= 4 && pin.length < 6 && (
                    <motion.button
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={handlePinSubmit}
                      disabled={submitting}
                      className="w-full mt-8 py-4 rounded-2xl font-semibold text-base transition-all"
                      style={{
                        background: submitting
                          ? "rgba(248,250,252,0.1)"
                          : "#f8fafc",
                        color: submitting ? "rgba(248,250,252,0.4)" : "#0a0f1e",
                        fontFamily: "'Syne', sans-serif",
                      }}
                    >
                      {submitting ? "Activating..." : "Activate Counter →"}
                    </motion.button>
                  )}

                  {submitting && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center gap-3 mt-6"
                    >
                      <div
                        className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: "rgba(248,250,252,0.4)" }}
                      />
                      <span
                        className="text-sm"
                        style={{ color: "rgba(248,250,252,0.4)" }}
                      >
                        Verifying PIN...
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-xs mt-6"
            style={{
              color: "rgba(248,250,252,0.2)",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            This device will remember its counter after setup.
          </motion.p>
        </motion.div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}