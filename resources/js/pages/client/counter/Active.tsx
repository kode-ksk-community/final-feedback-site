/**
 * Active.tsx — Counter Active Screen
 *
 * Combined idle + feedback screen shown on counter display.
 * - When idle: Shows QR code for servicers to scan
 * - When servicer logged in: Shows feedback form for customers
 *
 * This replaces the need to redirect between pages when sessions change.
 * Seamless transition from idle to active feedback collection.
 *
 * URL: /counter/idle (same endpoint, enhanced functionality)
 *
 * Polling flow:
 *   1. Mounts → checks localStorage for device_token
 *   2. Every 4 seconds: polls /api/counter/session/status
 *   3. No session → show QR code + waiting message
 *   4. Session detected → show feedback form
 *   5. Feedback submitted → brief thanks + auto-reset back to idle
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { router } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import QRCode from "qrcode";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveSession {
    id: number;
    servicer_name: string;
    started_at: string;
}

interface Tag {
    id: number;
    name: string;
    color: string;
    sentiment: "positive" | "negative" | "neutral";
}

interface RatingLevel {
    value: number;
    emoji: string;
    label: string;
    labelKh: string;
    bg: string;
    accent: string;
    text: string;
}

interface ApiError {
    message: string;
    code?: string;
    details?: unknown;
}

interface ServicerInfo {
    id: number;
    name: string;
    avatar_url?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 4_000;
const THANK_YOU_DURATION = 4;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

// // ─── Constants ────────────────────────────────────────────────────────────────

// const POLL_INTERVAL_MS = 4_000;
// const WELCOME_DELAY_MS = 800;
// const THANK_YOU_DURATION = 4;

const RATINGS: RatingLevel[] = [
    { value: 1, emoji: "😡", label: "Very Bad", labelKh: "អន់ខ្លាំង", bg: "#fff1f0", accent: "#ef4444", text: "#7f1d1d" },
    { value: 2, emoji: "😞", label: "Bad", labelKh: "អន់", bg: "#fff7ed", accent: "#f97316", text: "#7c2d12" },
    { value: 3, emoji: "😐", label: "Neutral", labelKh: "មធ្យម", bg: "#fefce8", accent: "#eab308", text: "#713f12" },
    { value: 4, emoji: "😊", label: "Good", labelKh: "ល្អ", bg: "#f0fdf4", accent: "#22c55e", text: "#14532d" },
    { value: 5, emoji: "😍", label: "Excellent", labelKh: "ល្អណាស់", bg: "#eff6ff", accent: "#3b82f6", text: "#1e3a8a" },
];

// Fallback tags are no longer required because /api/counter/feedback-data returns an up-to-date list from DB.
// If the API fails we show an empty tag list and prompt users to continue with rating/comment only.

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readDeviceInfo() {
    const deviceToken = localStorage.getItem("counter_device_token");
    const counterName = localStorage.getItem("counter_name");
    const branchName = localStorage.getItem("branch_name");
    if (!deviceToken || !counterName || !branchName) return null;
    return { deviceToken, counterName, branchName };
}

function clearDeviceState() {
    ["counter_device_token", "counter_id", "counter_name", "branch_name"].forEach((k) =>
        localStorage.removeItem(k)
    );
}

function buildActivationUrl(deviceToken: string) {
    return `${window.location.origin}/counter/activate?counter_token=${deviceToken}`;
}

function useClock() {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    return now;
}

/**
 * Enhanced API error handler with retry logic
 */
function useApiWithRetry() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const apiCall = useCallback(async <T,>(
        apiFunction: () => Promise<T>,
        options: {
            maxRetries?: number;
            retryDelay?: number;
            onRetry?: (attempt: number, error: unknown) => void;
        } = {}
    ): Promise<T> => {
        const { maxRetries = MAX_RETRY_ATTEMPTS, retryDelay = RETRY_DELAY_MS, onRetry } = options;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (!isOnline && attempt === 1) {
                    throw new Error('No internet connection');
                }

                return await apiFunction();
            } catch (error: unknown) {
                const isLastAttempt = attempt === maxRetries;
                const networkError = (err: unknown): boolean => {
                    if (!err || typeof err !== 'object') return true;
                    const e = err as { response?: unknown; code?: string };
                    if (!e.response || typeof e.response !== 'object') {
                        return true;
                    }
                    const response = e.response as { status?: number };
                    return !response || e.code === 'NETWORK_ERROR';
                };
                const statusCode = (err: unknown): number | null => {
                    if (!err || typeof err !== 'object') return null;
                    const e = err as { response?: { status?: number } };
                    return e.response?.status ?? null;
                };

                const isNetworkError = networkError(error);
                const shouldRetry = !isLastAttempt && (isNetworkError || (statusCode(error) ?? 0) >= 500);

                if (shouldRetry) {
                    onRetry?.(attempt, error);
                    await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                    continue;
                }

                // Transform error for consistent handling
                const e = (error as { response?: { data?: unknown; status?: number }; message?: string });
                const apiError: ApiError = {
                    message: e.response?.data && typeof e.response.data === 'object' && 'message' in e.response.data
                        ? (e.response.data as { message?: string }).message ?? e.message ?? 'An unexpected error occurred'
                        : e.message ?? 'An unexpected error occurred',
                    code: e.response?.status?.toString() ?? 'UNKNOWN',
                    details: e.response?.data ?? null,
                };

                throw apiError;
            }
        }

        throw new Error('Max retries exceeded');
    }, [isOnline]);

    return { apiCall, isOnline };
}

// ─── QR Code Component ────────────────────────────────────────────────────────

function CounterQrCode({ deviceToken }: { deviceToken: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!canvasRef.current || !deviceToken) return;
        const url = buildActivationUrl(deviceToken);
        QRCode.toCanvas(
            canvasRef.current,
            url,
            {
                width: 200,
                margin: 2,
                color: { dark: "#3d2c1e", light: "#faf5ee" },
                errorCorrectionLevel: "M",
            },
            (err) => {
                if (err) setError(true);
            }
        );
    }, [deviceToken]);

    if (error) {
        return (
            <div
                className="flex flex-col items-center gap-2"
                style={{
                    width: 200,
                    height: 200,
                    background: "#f5e6d0",
                    borderRadius: 16,
                    border: "1px solid rgba(180,140,100,0.3)",
                    justifyContent: "center",
                }}
            >
                <span style={{ fontSize: 32 }}>⚠️</span>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#a07850" }}>
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
            style={{
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "0 8px 40px rgba(180,140,100,0.2), 0 0 0 1px rgba(180,140,100,0.2)",
            }}
        >
            <canvas ref={canvasRef} style={{ display: "block" }} />
        </motion.div>
    );
}

// ─── Idle Screen Component ─────────────────────────────────────────────────────

interface IdleScreenProps {
    deviceInfo: {
        deviceToken: string;
        counterName: string;
        branchName: string;
    } | null;
    now: Date;
    lastChecked: Date;
    connectionError: boolean;
    onReset: () => void;
    showResetConfirm: boolean;
    onResetConfirmChange: (show: boolean) => void;
    isOnline: boolean;
    retryCount: number;
    isInitialLoad: boolean;
}

function IdleScreen({
    deviceInfo,
    now,
    lastChecked,
    connectionError,
    onReset,
    showResetConfirm,
    onResetConfirmChange,
    isOnline,
    retryCount,
    isInitialLoad,
}: IdleScreenProps) {
    const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
    const dateStr = now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
    });
    const lastCheckedStr = lastChecked.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });

    return (
        <>
            <link
                href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,600&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap"
                rel="stylesheet"
            />

            <div className="min-h-screen w-full relative overflow-hidden flex flex-col" style={{ background: "#faf5ee" }}>
                {/* Background effects */}
                <div className="absolute inset-0 pointer-events-none" aria-hidden>
                    <div
                        className="absolute top-0 left-0 w-[600px] h-[600px] opacity-40"
                        style={{ background: "radial-gradient(circle at 0% 0%, #f5dfc0, transparent 65%)" }}
                    />
                    <div
                        className="absolute bottom-0 right-0 w-[500px] h-[500px] opacity-30"
                        style={{ background: "radial-gradient(circle at 100% 100%, #ead5b5, transparent 65%)" }}
                    />
                    <div
                        className="absolute inset-0 opacity-[0.06]"
                        style={{
                            backgroundImage: "radial-gradient(circle, #b48c64 1px, transparent 1px)",
                            backgroundSize: "32px 32px",
                        }}
                    />
                </div>

                {/* Top bar */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative z-10 flex items-center justify-between px-10 pt-8"
                >
                    <div className="flex items-center gap-3">
                        <motion.div
                            animate={{ opacity: connectionError ? [1, 0.2, 1] : 1 }}
                            transition={{ duration: 1.5, repeat: connectionError ? Infinity : 0 }}
                            className="w-2 h-2 rounded-full"
                            style={{ background: connectionError ? "#ef4444" : "#fbbf24" }}
                        />
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: "#b48c64" }}>
                            {deviceInfo?.branchName ?? "—"}
                        </span>
                        <span style={{ color: "#d4b896" }}>·</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: "#b48c64" }}>
                            {deviceInfo?.counterName ?? "—"}
                        </span>
                        <AnimatePresence>
                            {connectionError && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{
                                        background: "#fff1f0",
                                        color: "#ef4444",
                                        border: "1px solid #fecaca",
                                        fontFamily: "'DM Mono', monospace",
                                        fontSize: "10px",
                                        padding: "2px 8px",
                                        borderRadius: 100,
                                    }}
                                >
                                    reconnecting...
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="text-right">
                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "26px", fontWeight: 600, color: "#3d2c1e" }}>
                            {timeStr}
                        </p>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#b48c64", marginTop: "2px" }}>
                            {dateStr}
                        </p>
                    </div>
                </motion.div>

                {/* Main content */}
                <div className="relative z-10 flex-1 flex items-center justify-center px-8">
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-16 w-full max-w-3xl">
                        {/* Left: QR code */}
                        <motion.div
                            initial={{ opacity: 0, x: -24 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                            className="flex flex-col items-center gap-4"
                        >
                            {deviceInfo ? <CounterQrCode deviceToken={deviceInfo.deviceToken} /> : <div style={{ width: 200, height: 200, borderRadius: 20, background: "rgba(180,140,100,0.08)", border: "1px solid rgba(180,140,100,0.2)" }} />}
                            <div className="text-center">
                                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#b48c64" }}>
                                    Scan to activate
                                </p>
                            </div>
                        </motion.div>

                        {/* Divider */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="hidden lg:flex flex-col items-center gap-3"
                        >
                            <div style={{ width: 1, height: 60, background: "rgba(180,140,100,0.2)" }} />
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#d4b896" }}>OR</span>
                            <div style={{ width: 1, height: 60, background: "rgba(180,140,100,0.2)" }} />
                        </motion.div>

                        {/* Right: text */}
                        <motion.div
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.7, delay: 0.3 }}
                            className="flex flex-col items-center lg:items-start gap-6 text-center lg:text-left max-w-xs"
                        >
                            <div>
                                <h1
                                    style={{
                                        fontFamily: "'Cormorant Garamond', serif",
                                        fontSize: "38px",
                                        fontWeight: 600,
                                        color: "#3d2c1e",
                                        marginBottom: "12px",
                                    }}
                                >
                                    Waiting for<br />
                                    <span style={{ fontStyle: "italic", color: "#b48c64" }}>Servicer</span>
                                </h1>
                            </div>

                            {/* Step hints */}
                            <div className="flex flex-col gap-2.5">
                                {[
                                    { step: "1", text: "Open your phone camera" },
                                    { step: "2", text: "Scan the QR code" },
                                    { step: "3", text: "Enter your credentials" },
                                ].map(({ step, text }) => (
                                    <div key={step} className="flex items-center gap-3">
                                        <div
                                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                            style={{
                                                background: "rgba(180,140,100,0.15)",
                                                border: "1px solid rgba(180,140,100,0.3)",
                                            }}
                                        >
                                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#b48c64", fontWeight: 700 }}>
                                                {step}
                                            </span>
                                        </div>
                                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#a07850" }}>
                                            {text}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Polling status */}
                            <div
                                className="flex items-center gap-2.5 px-4 py-2 rounded-full"
                                style={{
                                    background: "rgba(180,140,100,0.08)",
                                    border: "1px solid rgba(180,140,100,0.18)",
                                }}
                            >
                                <motion.div
                                    animate={{
                                        opacity: connectionError ? [1, 0.3, 1] : 1,
                                        scale: retryCount > 0 ? [1, 1.2, 1] : 1
                                    }}
                                    transition={{
                                        duration: connectionError ? 1.5 : 0.3,
                                        repeat: connectionError ? Infinity : 0
                                    }}
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{
                                        background: !isOnline ? "#ef4444" :
                                            connectionError ? "#f97316" :
                                                retryCount > 0 ? "#eab308" : "#b48c64"
                                    }}
                                />
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#b48c64" }}>
                                    {!isOnline ? "Offline" :
                                        isInitialLoad ? "Connecting..." :
                                            connectionError ? `Retrying... (${retryCount})` :
                                                retryCount > 0 ? `Reconnected` :
                                                    `Last checked: ${lastCheckedStr}`}
                                </span>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Bottom bar */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="relative z-10 flex items-center justify-between px-10 pb-8"
                >
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "16px", color: "#c4a882", fontStyle: "italic" }}>
                        FeedbackPro
                    </span>

                    <AnimatePresence mode="wait">
                        {!showResetConfirm ? (
                            <motion.button
                                key="btn"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => onResetConfirmChange(true)}
                                style={{
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: "11px",
                                    color: "#d4b896",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                }}
                            >
                                Reset device
                            </motion.button>
                        ) : (
                            <motion.div
                                key="confirm"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-3"
                            >
                                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#a07850" }}>
                                    Sure?
                                </span>
                                <button
                                    onClick={onReset}
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: "12px",
                                        color: "#ef4444",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        fontWeight: 500,
                                    }}
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => onResetConfirmChange(false)}
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: "12px",
                                        color: "#a07850",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                    }}
                                >
                                    Cancel
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        </>
    );
}

// ─── Feedback Form Component ───────────────────────────────────────────────────

interface FeedbackState {
    selectedRating: RatingLevel | null;
    selectedTagIds: number[];
    comment: string;
    step: "rate" | "detail" | "done";
    submitting: boolean;
}

interface FeedbackScreenProps {
    session: ActiveSession;
    onComplete: () => void;
}

function FeedbackScreen({ session, onComplete }: FeedbackScreenProps) {
    const [state, setState] = useState<FeedbackState>({
        selectedRating: null,
        selectedTagIds: [],
        comment: "",
        step: "rate",
        submitting: false,
    });

    const [tags, setTags] = useState<Tag[]>([]);
    const [servicer, setServicer] = useState<ServicerInfo | null>(null);
    const [loadingTags, setLoadingTags] = useState(true);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Load real tags and servicer data from backend on mount
    useEffect(() => {
        const fetchTags = async () => {
            try {
                const token = localStorage.getItem("counter_device_token");
                const response = await axios.get<{ servicer: ServicerInfo; tags: Tag[] }>(
                    "/api/counter/feedback-data",
                    { headers: { "X-Counter-Token": token } }
                );

                if (response.data.servicer) {
                    setServicer(response.data.servicer);
                }

                if (response.data.tags && response.data.tags.length > 0) {
                    setTags(response.data.tags);
                } else {
                    setTags([]);
                }
            } catch (err: unknown) {
                console.error("Failed to load tags from API:", err);
                setTags([]);
            } finally {
                setLoadingTags(false);
            }
        };

        fetchTags();
    }, []);

    const theme = state.selectedRating ?? RATINGS[3];

    const handleRatingSelect = (rating: RatingLevel) => {
        setState((s) => ({ ...s, selectedRating: rating }));
        setTimeout(() => setState((s) => ({ ...s, step: "detail" })), 420);
    };

    const toggleTag = (id: number) => {
        setState((s) => ({
            ...s,
            selectedTagIds: s.selectedTagIds.includes(id) ? s.selectedTagIds.filter((t) => t !== id) : [...s.selectedTagIds, id],
        }));
    };

    const handleSubmit = async () => {
        if (!state.selectedRating) return;
        setState((s) => ({ ...s, submitting: true }));
        setSubmitError(null);

        let submissionSuccess = false;

        try {
            const token = localStorage.getItem("counter_device_token");
            const response = await axios.post(
                "/api/counter/feedback",
                {
                    rating: state.selectedRating.value,
                    tag_ids: state.selectedTagIds,
                    comment: state.comment.trim() || null,
                },
                { headers: { "X-Counter-Token": token } }
            );

            if (response.status === 201 && response.data.success) {
                submissionSuccess = true;
            } else {
                console.error("Unexpected API response:", response);
                setSubmitError(response.data.message || "Unable to submit feedback right now.");
            }
        } catch (err: unknown) {
            console.error("Feedback submission error:", err);
            const e = err as { response?: { data?: { error?: string } }; message?: string };
            setSubmitError(e.response?.data?.error || e.message || "Failed to submit feedback.");
        }

        if (!submissionSuccess) {
            setState((s) => ({ ...s, submitting: false }));
            return;
        }

        setState((s) => ({ ...s, submitting: false, step: "done" }));

        // Auto-reset after thank you
        setTimeout(() => {
            setState({
                selectedRating: null,
                selectedTagIds: [],
                comment: "",
                step: "rate",
                submitting: false,
            });
            onComplete();
        }, THANK_YOU_DURATION * 1000);
    };

    const handleBack = () => {
        if (state.step === "detail") {
            setState((s) => ({ ...s, step: "rate", selectedRating: null }));
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen w-full relative overflow-hidden flex flex-col"
            style={{ backgroundColor: state.step === "done" ? theme.bg : "#ffffff" }}
        >
            <link
                href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap"
                rel="stylesheet"
            />

            {/* Top accent */}
            <motion.div
                className="absolute top-0 left-0 right-0 h-1"
                animate={{ backgroundColor: theme.accent }}
                transition={{ duration: 0.4 }}
            />

            {/* Header */}
            {state.step !== "done" && (
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 flex items-center justify-between px-8 pt-8 pb-4"
                >
                    <div>
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#999", letterSpacing: "0.06em" }}>
                            FEEDBACK FOR
                        </p>
                        <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "24px", fontWeight: 700, color: theme.text }}>
                            {servicer?.name ?? session.servicer_name}
                        </p>
                        {servicer?.avatar_url && (
                            <img
                                src={servicer.avatar_url}
                                alt={servicer.name}
                                style={{ width: 40, height: 40, borderRadius: '50%', marginTop: 8, objectFit: 'cover' }}
                            />
                        )}
                    </div>

                    {state.step === "detail" && (
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={handleBack}
                            style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: "14px",
                                color: theme.text,
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                            }}
                        >
                            ← Back
                        </motion.button>
                    )}
                </motion.div>
            )}

            {/* Main content */}
            <div className="flex-1 flex items-center justify-center px-8 py-12">
                <AnimatePresence mode="wait">
                    {state.step === "rate" && (
                        <motion.div
                            key="rate"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex flex-col items-center gap-12 max-w-2xl"
                        >
                            <div className="text-center">
                                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", color: "#666", marginBottom: "8px" }}>
                                    How was your experience?
                                </p>
                            </div>

                            <div className="grid grid-cols-5 gap-6">
                                {RATINGS.map((rating) => (
                                    <motion.button
                                        key={rating.value}
                                        onClick={() => handleRatingSelect(rating)}
                                        whileTap={{ scale: 0.88 }}
                                        style={{ background: "none", border: "none", cursor: "pointer" }}
                                    >
                                        <motion.div
                                            animate={
                                                state.selectedRating?.value === rating.value
                                                    ? { scale: 1.25, y: -8 }
                                                    : { scale: 1, y: 0 }
                                            }
                                            style={{
                                                width: 80,
                                                height: 80,
                                                borderRadius: "50%",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "38px",
                                                background:
                                                    state.selectedRating?.value === rating.value
                                                        ? `radial-gradient(circle at 35% 35%, white, ${rating.bg})`
                                                        : "radial-gradient(circle at 35% 35%, #ffffff, #f8f8f8)",
                                                border:
                                                    state.selectedRating?.value === rating.value
                                                        ? `3px solid ${rating.accent}`
                                                        : "3px solid rgba(0,0,0,0.06)",
                                            }}
                                        >
                                            {rating.emoji}
                                        </motion.div>
                                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#666", marginTop: "6px" }}>
                                            {rating.label}
                                        </p>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {state.step === "detail" && (
                        <motion.div
                            key="detail"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex flex-col gap-8 max-w-2xl w-full"
                        >
                            <div>
                                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#666", marginBottom: "12px" }}>
                                    Select tags (optional):
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {loadingTags ? (
                                        <p style={{ color: "#999", fontSize: "12px" }}>Loading tags...</p>
                                    ) : (
                                        tags.map((tag) => (
                                            <motion.button
                                                key={tag.id}
                                                onClick={() => toggleTag(tag.id)}
                                                whileTap={{ scale: 0.95 }}
                                                animate={{
                                                    background: state.selectedTagIds.includes(tag.id) ? tag.color + "20" : "transparent",
                                                    borderColor: state.selectedTagIds.includes(tag.id) ? tag.color : "#ddd",
                                                }}
                                                style={{
                                                    fontFamily: "'DM Sans', sans-serif",
                                                    fontSize: "13px",
                                                    color: state.selectedTagIds.includes(tag.id) ? tag.color : "#666",
                                                    border: `2px solid`,
                                                    borderRadius: "8px",
                                                    padding: "8px 12px",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                {tag.name}
                                            </motion.button>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div>
                                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#666", marginBottom: "8px" }}>
                                    Additional comments (optional):
                                </p>
                                <textarea
                                    value={state.comment}
                                    onChange={(e) => setState((s) => ({ ...s, comment: e.target.value }))}
                                    placeholder="Tell us more..."
                                    style={{
                                        width: "100%",
                                        height: "120px",
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: "14px",
                                        padding: "12px",
                                        border: "2px solid #ddd",
                                        borderRadius: "8px",
                                        borderColor: theme.accent,
                                        resize: "none",
                                    }}
                                />
                            </div>

                            {submitError && (
                                <div
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: "13px",
                                        color: "#ef4444",
                                        marginBottom: "6px",
                                    }}
                                >
                                    {submitError}
                                </div>
                            )}

                            <motion.button
                                onClick={handleSubmit}
                                disabled={state.submitting}
                                whileTap={{ scale: 0.96 }}
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: "16px",
                                    fontWeight: 600,
                                    color: "white",
                                    background: theme.accent,
                                    border: "none",
                                    borderRadius: "8px",
                                    padding: "14px 32px",
                                    cursor: state.submitting ? "not-allowed" : "pointer",
                                    opacity: state.submitting ? 0.6 : 1,
                                }}
                            >
                                {state.submitting ? "Submitting..." : "Submit Feedback"}
                            </motion.button>
                        </motion.div>
                    )}

                    {state.step === "done" && (
                        <motion.div
                            key="done"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center gap-6 text-center"
                        >
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "40px",
                                    background: `radial-gradient(circle, ${theme.accent}20, ${theme.bg})`,
                                    border: `3px solid ${theme.accent}`,
                                }}
                            >
                                ✓
                            </motion.div>
                            <div>
                                <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "28px", fontWeight: 700, color: theme.text }}>
                                    Thank You!
                                </p>
                                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#666", marginTop: "8px" }}>
                                    Your feedback has been recorded.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CounterActive() {
    const now = useClock();
    const { apiCall, isOnline } = useApiWithRetry();

    const [deviceInfo, setDeviceInfo] = useState<ReturnType<typeof readDeviceInfo>>(null);
    const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
    const [lastChecked, setLastChecked] = useState(new Date());
    const [pollingPaused, setPollingPaused] = useState(false);
    const [connectionError, setConnectionError] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const deviceTokenRef = useRef<string | null>(null);

    useEffect(() => {
        const info = readDeviceInfo();
        if (!info) {
            router.visit(route("counter.setup"));
            return;
        }
        setDeviceInfo(info);
        deviceTokenRef.current = info.deviceToken;
    }, []);

    const pollSession = useCallback(async () => {
        const token = deviceTokenRef.current;
        if (!token || pollingPaused) return;

        try {
            const res = await apiCall(
                () => axios.get<{ active: boolean; session?: ActiveSession }>(
                    "/api/counter/session/status",
                    {
                        headers: { "X-Counter-Token": token },
                        timeout: 8_000
                    }
                ),
                {
                    onRetry: (attempt, error) => {
                        const e = error as { message?: string };
                        console.warn(`Session poll retry ${attempt}:`, e.message ?? error);
                        setRetryCount(attempt);
                    }
                }
            );

            setLastChecked(new Date());
            setConnectionError(false);
            setRetryCount(0);
            setIsInitialLoad(false);

            if (res.data.active && res.data.session) {
                setPollingPaused(true);
                setActiveSession(res.data.session);
            } else if (activeSession) {
                // Session ended, reset to idle
                setActiveSession(null);
                setPollingPaused(false);
            }
        } catch (error: unknown) {
            console.error('Session polling failed:', error);
            const e = error as { code?: string };

            if (e.code === '401') {
                // Device token invalid/expired
                clearDeviceState();
                router.visit(route("counter.setup"));
                return;
            }

            setConnectionError(true);
            setIsInitialLoad(false);

            // Don't show error for network issues during normal polling
            if (!isOnline) {
                setConnectionError(true);
            }
        }
    }, [pollingPaused, apiCall, activeSession, isOnline]);

    useEffect(() => {
        if (!deviceInfo) return;
        pollSession();
        const interval = setInterval(pollSession, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [deviceInfo, pollSession]);

    const handleReset = () => {
        setPollingPaused(true);
        clearDeviceState();
        router.visit(route("counter.setup"));
    };

    const handleFeedbackComplete = () => {
        setActiveSession(null);
        setPollingPaused(false);
    };

    if (!deviceInfo) {
        return null;
    }

    return (
        <AnimatePresence mode="wait">
            {activeSession ? (
                <FeedbackScreen key="feedback" session={activeSession} onComplete={handleFeedbackComplete} />
            ) : (
                <IdleScreen
                    key="idle"
                    deviceInfo={deviceInfo}
                    now={now}
                    lastChecked={lastChecked}
                    connectionError={connectionError}
                    onReset={handleReset}
                    showResetConfirm={showResetConfirm}
                    onResetConfirmChange={setShowResetConfirm}
                    isOnline={isOnline}
                    retryCount={retryCount}
                    isInitialLoad={isInitialLoad}
                />
            )}
        </AnimatePresence>
    );
}