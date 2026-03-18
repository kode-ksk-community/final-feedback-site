/**
 * AdminBranches.tsx
 *
 * Admin page to manage branches (Create, Read, Update, Delete).
 *
 * Route:    GET  /admin/branches
 * File:     resources/js/Pages/Admin/Branches.tsx
 *
 * Features:
 *   - Table with search + active/inactive filter
 *   - Slide-in drawer for Create and Edit forms
 *   - Inline toggle for is_active
 *   - Delete confirmation modal
 *   - Counter count badge per branch
 *
 * 🔧 STATIC MODE: All data hardcoded. Search "TODO: REPLACE" for swap points.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import AdminLayout from "../Layouts/AdminLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Branch {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  counters_count: number;
  feedback_count: number;
  created_at: string;
}

// ─── 🔧 Mock Data ─────────────────────────────────────────────────────────────

const INITIAL: Branch[] = [
  { id: 1, name: "Main Branch",  address: "123 Main Street, Phnom Penh",    phone: "+855 23 000 001", is_active: true,  counters_count: 3, feedback_count: 1284, created_at: "2024-01-15" },
  { id: 2, name: "North Branch", address: "456 North Avenue, Phnom Penh",   phone: "+855 23 000 002", is_active: true,  counters_count: 2, feedback_count: 892,  created_at: "2024-02-20" },
  { id: 3, name: "East Branch",  address: "789 East Road, Siem Reap",       phone: "+855 63 000 001", is_active: true,  counters_count: 1, feedback_count: 445,  created_at: "2024-03-10" },
  { id: 4, name: "South Branch", address: "321 South Blvd, Sihanoukville",  phone: "+855 34 000 001", is_active: false, counters_count: 2, feedback_count: 210,  created_at: "2024-04-05" },
];

// ─── Drawer form ──────────────────────────────────────────────────────────────

interface DrawerProps {
  branch: Partial<Branch> | null;
  onClose: () => void;
  onSave: (data: Partial<Branch>) => void;
}

function BranchDrawer({ branch, onClose, onSave }: DrawerProps) {
  const isEdit = !!branch?.id;
  const [form, setForm] = useState({
    name:      branch?.name      ?? "",
    address:   branch?.address   ?? "",
    phone:     branch?.phone     ?? "",
    is_active: branch?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Branch name is required"); return; }
    setSaving(true);
    // TODO: REPLACE with:
    // isEdit
    //   ? router.put(route('admin.branches.update', branch.id), form, { onSuccess: onClose })
    //   : router.post(route('admin.branches.store'), form, { onSuccess: onClose });
    await new Promise(r => setTimeout(r, 700));
    onSave({ ...branch, ...form });
    setSaving(false);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-30"
        style={{ background: "rgba(15,23,42,0.4)", backdropFilter: "blur(2px)" }} />

      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="fixed right-0 top-0 bottom-0 z-40 flex flex-col"
        style={{ width: 420, background: "#ffffff",
          boxShadow: "-8px 0 40px rgba(15,23,42,0.12)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5"
          style={{ borderBottom: "1px solid #f1f5f9" }}>
          <div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "17px",
              fontWeight: 800, color: "#0f172a", marginBottom: "2px" }}>
              {isEdit ? "Edit Branch" : "New Branch"}
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#94a3b8" }}>
              {isEdit ? `Editing: ${branch?.name}` : "Add a new branch location"}
            </p>
          </div>
          <button onClick={onClose}
            style={{ background: "#f8fafc", border: "1px solid #e2e8f0",
              borderRadius: 10, width: 32, height: 32, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#64748b", fontSize: "16px" }}>
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-5">
          {[
            { key: "name",    label: "Branch Name *", placeholder: "e.g. Main Branch",          type: "text" },
            { key: "address", label: "Address",        placeholder: "Full address",              type: "text" },
            { key: "phone",   label: "Phone",          placeholder: "+855 23 000 000",           type: "text" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
                fontWeight: 600, color: "#374151", display: "block", marginBottom: "7px" }}>
                {f.label}
              </label>
              <input type={f.type}
                value={(form as any)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={{ width: "100%", padding: "11px 14px", borderRadius: 12,
                  border: "1.5px solid #e2e8f0", background: "#fafbfc",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
                  color: "#0f172a", outline: "none", transition: "border-color .2s" }}
                onFocus={e => (e.target.style.borderColor = "#0f172a")}
                onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>
          ))}

          {/* Active toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl"
            style={{ background: "#f8fafc", border: "1px solid #f1f5f9" }}>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
                fontWeight: 600, color: "#374151", marginBottom: "2px" }}>Active</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#94a3b8" }}>
                Inactive branches are hidden from device setup
              </p>
            </div>
            <button onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
              className="relative transition-colors"
              style={{ width: 44, height: 24, borderRadius: 12, border: "none",
                background: form.is_active ? "#22c55e" : "#d1d5db", cursor: "pointer" }}>
              <motion.div animate={{ left: form.is_active ? 22 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                style={{ position: "absolute", top: 2, width: 20, height: 20,
                  borderRadius: "50%", background: "#ffffff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-5 flex gap-3"
          style={{ borderTop: "1px solid #f1f5f9" }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "11px", borderRadius: 12,
              border: "1.5px solid #e2e8f0", background: "transparent",
              fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
              fontWeight: 600, color: "#64748b", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: "11px", borderRadius: 12,
              border: "none", background: saving ? "#d1d5db" : "#0f172a",
              fontFamily: "'Syne', sans-serif", fontSize: "13px",
              fontWeight: 700, color: "#ffffff", cursor: saving ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {saving
              ? <><div style={{ width: 14, height: 14, borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff",
                  animation: "spin .7s linear infinite" }}/> Saving...</>
              : isEdit ? "Save Changes" : "Create Branch"}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Delete modal ─────────────────────────────────────────────────────────────

function DeleteModal({ branch, onClose, onConfirm }: {
  branch: Branch; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-30"
        style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(2px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="fixed z-40 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: 380, background: "#ffffff", borderRadius: 20,
          padding: "28px", boxShadow: "0 20px 60px rgba(15,23,42,0.2)" }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
          style={{ background: "#fff1f0" }}>🗑️</div>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "16px",
          fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>
          Delete "{branch.name}"?
        </h3>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
          color: "#64748b", lineHeight: 1.6, marginBottom: "20px" }}>
          This will soft-delete the branch. Historical feedback data will be preserved.
          This action can be undone by a Super Admin.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            style={{ flex: 1, padding: "10px", borderRadius: 10,
              border: "1.5px solid #e2e8f0", background: "transparent",
              fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
              fontWeight: 600, color: "#64748b", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            style={{ flex: 1, padding: "10px", borderRadius: 10,
              border: "none", background: "#ef4444",
              fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
              fontWeight: 700, color: "#ffffff", cursor: "pointer" }}>
            Delete Branch
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminBranches() {
  const [branches,     setBranches]     = useState<Branch[]>(INITIAL);
  const [search,       setSearch]       = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [drawer,       setDrawer]       = useState<Partial<Branch> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);

  // Filtered rows
  const filtered = useMemo(() => branches
    .filter(b => b.name.toLowerCase().includes(search.toLowerCase()) ||
                 (b.address ?? "").toLowerCase().includes(search.toLowerCase()))
    .filter(b => filterActive === "all" ? true
               : filterActive === "active" ? b.is_active : !b.is_active),
    [branches, search, filterActive]);

  const handleSave = (data: Partial<Branch>) => {
    if (data.id) {
      setBranches(p => p.map(b => b.id === data.id ? { ...b, ...data } : b));
      toast.success("Branch updated!");
    } else {
      setBranches(p => [...p, { ...data, id: Date.now(), counters_count: 0,
        feedback_count: 0, created_at: new Date().toISOString().slice(0,10) } as Branch]);
      toast.success("Branch created!");
    }
  };

  const handleToggleActive = (branch: Branch) => {
    // TODO: REPLACE with: router.patch(route('admin.branches.toggle', branch.id))
    setBranches(p => p.map(b => b.id === branch.id ? { ...b, is_active: !b.is_active } : b));
    toast.success(`${branch.name} ${!branch.is_active ? "activated" : "deactivated"}`);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    // TODO: REPLACE with: router.delete(route('admin.branches.destroy', deleteTarget.id))
    setBranches(p => p.filter(b => b.id !== deleteTarget.id));
    toast.success(`${deleteTarget.name} deleted`);
    setDeleteTarget(null);
  };

  return (
    <AdminLayout title="Branches" active="branches">
      <Toaster position="top-right" toastOptions={{
        style: { fontFamily: "'DM Sans', sans-serif", borderRadius: "12px", fontSize: "13px" },
      }}/>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#94a3b8" }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search branches..."
              style={{ paddingLeft: 34, paddingRight: 14, paddingTop: 9, paddingBottom: 9,
                borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#ffffff",
                fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#0f172a",
                outline: "none", width: 220 }}
              onFocus={e => (e.target.style.borderColor = "#0f172a")}
              onBlur={e  => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
            {(["all","active","inactive"] as const).map(f => (
              <button key={f} onClick={() => setFilterActive(f)}
                style={{ padding: "6px 14px", borderRadius: 9, border: "none",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 500,
                  background: filterActive === f ? "#0f172a" : "transparent",
                  color: filterActive === f ? "#fff" : "#64748b", cursor: "pointer",
                  textTransform: "capitalize" }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Add button */}
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => setDrawer({})}
          style={{ padding: "9px 20px", borderRadius: 12, border: "none",
            background: "#0f172a", color: "#ffffff",
            fontFamily: "'Syne', sans-serif", fontSize: "13px", fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          + New Branch
        </motion.button>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "#ffffff", border: "1px solid #e2e8f0",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Branch","Address","Counters","Feedback","Status","Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left",
                  fontFamily: "'DM Mono', monospace", fontSize: "10px",
                  color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase",
                  fontWeight: 500 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px", textAlign: "center",
                    fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#94a3b8" }}>
                    No branches found
                  </td>
                </tr>
              ) : filtered.map((branch, i) => (
                <motion.tr key={branch.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: i * 0.04 }}
                  style={{ borderBottom: "1px solid #f1f5f9" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fafbfc")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Branch name */}
                  <td style={{ padding: "14px 16px" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                        style={{ background: "#f0f9ff", flexShrink: 0 }}>🏢</div>
                      <div>
                        <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "13px",
                          fontWeight: 700, color: "#0f172a" }}>{branch.name}</p>
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px",
                          color: "#94a3b8" }}>Since {branch.created_at}</p>
                      </div>
                    </div>
                  </td>

                  {/* Address */}
                  <td style={{ padding: "14px 16px" }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
                      color: "#64748b", maxWidth: 180 }}>
                      {branch.address ?? "—"}
                    </p>
                  </td>

                  {/* Counters count */}
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "13px",
                      fontWeight: 700, color: "#0f172a" }}>
                      {branch.counters_count}
                    </span>
                  </td>

                  {/* Feedback count */}
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "13px",
                      color: "#3b82f6" }}>
                      {branch.feedback_count.toLocaleString()}
                    </span>
                  </td>

                  {/* Status toggle */}
                  <td style={{ padding: "14px 16px" }}>
                    <button onClick={() => handleToggleActive(branch)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all"
                      style={{
                        background: branch.is_active ? "#f0fdf4" : "#fef2f2",
                        border: `1px solid ${branch.is_active ? "#bbf7d0" : "#fecaca"}`,
                        cursor: "pointer",
                      }}>
                      <div className="w-1.5 h-1.5 rounded-full"
                        style={{ background: branch.is_active ? "#22c55e" : "#ef4444" }} />
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px",
                        fontWeight: 600,
                        color: branch.is_active ? "#16a34a" : "#dc2626" }}>
                        {branch.is_active ? "Active" : "Inactive"}
                      </span>
                    </button>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "14px 16px" }}>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setDrawer(branch)}
                        style={{ padding: "6px 12px", borderRadius: 8,
                          border: "1px solid #e2e8f0", background: "transparent",
                          fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
                          color: "#374151", cursor: "pointer" }}>
                        Edit
                      </button>
                      <button onClick={() => setDeleteTarget(branch)}
                        style={{ padding: "6px 10px", borderRadius: 8,
                          border: "1px solid #fecaca", background: "#fff1f0",
                          fontSize: "12px", color: "#ef4444", cursor: "pointer" }}>
                        🗑
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {/* Footer count */}
        <div className="px-6 py-3 flex items-center justify-between"
          style={{ borderTop: "1px solid #f1f5f9", background: "#fafbfc" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#94a3b8" }}>
            Showing {filtered.length} of {branches.length} branches
          </span>
        </div>
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {drawer !== null && (
          <BranchDrawer branch={drawer} onClose={() => setDrawer(null)} onSave={handleSave} />
        )}
      </AnimatePresence>

      {/* Delete modal */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal branch={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
        )}
      </AnimatePresence>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AdminLayout>
  );
}