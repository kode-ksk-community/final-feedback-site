import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { router } from "@inertiajs/react";
import AdminLayout from "../Layouts/Adminlayout";

interface Feedback {
  id: number;
  rating: number;
  sentiment_label: string | null;
  sentiment_score: number | null;
  comment: string | null;
  counter_name: string;
  branch_name: string;
  servicer_name: string;
  tags: string[];
  submitted_at: string;
}

interface Props {
  feedbacks: {
    data: Feedback[];
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

const ratingEmojis: Record<number, string> = {
  1: "😡",
  2: "😞",
  3: "😐",
  4: "😊",
  5: "😍",
};

const sentimentColors: Record<string, string> = {
  very_positive: "bg-green-100 text-green-700",
  positive: "bg-emerald-100 text-emerald-700",
  neutral: "bg-gray-100 text-gray-700",
  negative: "bg-orange-100 text-orange-700",
  very_negative: "bg-red-100 text-red-700",
};

export default function AdminFeedback({ feedbacks }: Props) {
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [sentimentFilter, setSentimentFilter] = useState<string | "all">("all");
  const [deleteTarget, setDeleteTarget] = useState<Feedback | null>(null);

  // Filter feedback
  const filtered = useMemo(() => {
    return feedbacks.data.filter((f) => {
      const matchesSearch =
        f.comment?.toLowerCase().includes(search.toLowerCase()) ||
        f.servicer_name.toLowerCase().includes(search.toLowerCase()) ||
        f.counter_name.toLowerCase().includes(search.toLowerCase());

      const matchesRating = ratingFilter === "all" ? true : f.rating === ratingFilter;
      const matchesSentiment =
        sentimentFilter === "all" ? true : f.sentiment_label === sentimentFilter;

      return matchesSearch && matchesRating && matchesSentiment;
    });
  }, [feedbacks.data, search, ratingFilter, sentimentFilter]);

  const handleDelete = (feedback: Feedback) => {
    setDeleteTarget(feedback);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    router.delete(route("feedback.destroy", deleteTarget.id), {
      onSuccess: () => {
        toast.success("Feedback deleted successfully");
        setDeleteTarget(null);
      },
      onError: () => {
        toast.error("Failed to delete feedback");
      },
    });
  };

  // Statistics
  const stats = useMemo(() => {
    const data = filtered.length > 0 ? filtered : feedbacks.data;
    const totalRating = data.reduce((sum, f) => sum + f.rating, 0);
    const avgRating = data.length > 0 ? (totalRating / data.length).toFixed(1) : "0.0";

    return {
      total: data.length,
      avgRating,
      byRating: {
        5: data.filter((f) => f.rating === 5).length,
        4: data.filter((f) => f.rating === 4).length,
        3: data.filter((f) => f.rating === 3).length,
        2: data.filter((f) => f.rating === 2).length,
        1: data.filter((f) => f.rating === 1).length,
      },
    };
  }, [filtered, feedbacks.data]);

  return (
    <AdminLayout>
      <Toaster position="top-right" />

      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Feedback</h1>
          <p className="mt-1 text-gray-500">View and manage all customer feedback submissions</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">Total Feedback</div>
            <div className="mt-1 text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">Avg Rating</div>
            <div className="mt-1 text-2xl font-bold">{stats.avgRating} ⭐</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">😍 Excellent</div>
            <div className="mt-1 text-2xl font-bold text-green-600">{stats.byRating[5]}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">😐 Neutral</div>
            <div className="mt-1 text-2xl font-bold text-gray-600">{stats.byRating[3]}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">😡 Poor</div>
            <div className="mt-1 text-2xl font-bold text-red-600">{stats.byRating[1]}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 md:flex-row md:items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by comment, servicer, or counter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value === "all" ? "all" : parseInt(e.target.value))}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 - Excellent</option>
            <option value="4">4 - Good</option>
            <option value="3">3 - Neutral</option>
            <option value="2">2 - Bad</option>
            <option value="1">1 - Very Bad</option>
          </select>
          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Sentiments</option>
            <option value="very_positive">Very Positive</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
            <option value="very_negative">Very Negative</option>
          </select>
        </div>

        {/* Feedback List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
              <p className="text-gray-500">No feedback found matching your filters</p>
            </div>
          ) : (
            filtered.map((feedback) => (
              <motion.div
                key={feedback.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{ratingEmojis[feedback.rating]}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{feedback.servicer_name}</span>
                          <span className="text-xs text-gray-500">at {feedback.counter_name}</span>
                          <span className="text-xs text-gray-500">({feedback.branch_name})</span>
                        </div>
                        <div className="text-xs text-gray-400">{feedback.submitted_at}</div>
                      </div>
                    </div>

                    {feedback.comment && (
                      <p className="mt-3 text-gray-700 italic">"{feedback.comment}"</p>
                    )}

                    {feedback.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {feedback.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {feedback.sentiment_label && (
                      <div className="mt-2">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                            sentimentColors[feedback.sentiment_label]
                          }`}
                        >
                          {feedback.sentiment_label}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(feedback)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteTarget(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg bg-white p-6 shadow-lg"
            >
              <h3 className="text-lg font-bold text-gray-900">Delete Feedback?</h3>
              <p className="mt-2 text-gray-600">
                Are you sure you want to delete this feedback? This action cannot be undone.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
