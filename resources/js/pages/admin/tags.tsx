/**
 * AdminTags.tsx
 *
 * Admin page to manage feedback tags.
 * Tags are shown to customers as large tap-friendly chips on the feedback page.
 *
 * Route:    GET /admin/tags
 * File:     resources/js/Pages/Admin/Tags.tsx
 *
 * Features:
 *   - Tag grid with live color/icon preview
 *   - Slide-in drawer with live preview chip
 *   - Color palette picker (preset + custom hex)
 *   - Sentiment selector (positive / neutral / negative)
 *   - Branch scope selector (global vs branch-specific)
 *   - Khmer name field (multi-language)
 *   - Sort order drag hint
 *   - Active / Inactive toggle
 *
 * 🔧 STATIC MODE: All data hardcoded. Search "TODO: REPLACE" for swap points.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import AdminLayout from "../Layouts/AdminLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tag {
  id: number;
  branch_id: number | null;
  branch_name: string | null;
  name: string;
  name_kh: string | null;
  color: string;
  icon: string | null;
  sentiment: "positive" | "negative" | "neutral";
  sort_order: number;
  is_active: boolean;
  usage_count: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#22c55e","#3b82f6","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#f97316","#ec4899","#10b981","#6366f1",
  "#84cc16","#0ea5e9","#d946ef","#64748b","#0f172a",
];

const SENTIMENT_CONFIG = {
  positive: { label: "Positive", color: "#22c55e", bg: "#f0fdf4", icon: "👍" },
  neutral:  { label: "Neutral",  color: "#94a3b8", bg: "#f8fafc", icon: "😐" },
  negative: { label: "Negative", color: "#ef4444", bg: "#fff1f0", icon: "👎" },
};

const MOCK_BRANCHES = [
  { id: 1, name: "Main Branch"  },
  { id: 2, name: "North Branch" },
  { id: 3, name: "East Branch"  },
];

// ─── 🔧 Mock Data ─────────────────────────────────────────────────────────────

const INITIAL: Tag[] = [
  { id:1,  branch_id:null, branch_name:null,          name:"Friendly Staff",      name_kh:"បុគ្គលិកស្នាក់",   color:"#22c55e", icon:"😊", sentiment:"positive", sort_order:1,  is_active:true,  usage_count:892  },
  { id:2,  branch_id:null, branch_name:null,          name:"Helpful",             name_kh:"មានប្រយោជន៍",     color:"#22c55e", icon:"🤝", sentiment:"positive", sort_order:2,  is_active:true,  usage_count:731  },
  { id:3,  branch_id:null, branch_name:null,          name:"Fast Service",        name_kh:"សេវារហ័ស",       color:"#3b82f6", icon:"⚡", sentiment:"positive", sort_order:3,  is_active:true,  usage_count:654  },
  { id:4,  branch_id:null, branch_name:null,          name:"Clean Environment",   name_kh:"បរិស្ថានស្អាត",  color:"#06b6d4", icon:"✨", sentiment:"positive", sort_order:4,  is_active:true,  usage_count:420  },
  { id:5,  branch_id:null, branch_name:null,          name:"Professional",        name_kh:"វិជ្ជាជីវៈ",     color:"#8b5cf6", icon:"🎯", sentiment:"positive", sort_order:5,  is_active:true,  usage_count:380  },
  { id:6,  branch_id:null, branch_name:null,          name:"Slow Service",        name_kh:"សេវាយឺត",        color:"#f97316", icon:"🐢", sentiment:"negative", sort_order:6,  is_active:true,  usage_count:210  },
  { id:7,  branch_id:null, branch_name:null,          name:"Long Wait",           name_kh:"រង់ចាំយូរ",      color:"#f97316", icon:"⏰", sentiment:"negative", sort_order:7,  is_active:true,  usage_count:188  },
  { id:8,  branch_id:null, branch_name:null,          name:"Rude Staff",          name_kh:"បុគ្គលិករាខ្វាន់", color:"#ef4444", icon:"😤", sentiment:"negative", sort_order:8,  is_active:true,  usage_count:44   },
  { id:9,  branch_id:null, branch_name:null,          name:"Need Improvement",    name_kh:"ត្រូវការកែលម្អ", color:"#64748b", icon:"📈", sentiment:"neutral",  sort_order:9,  is_active:true,  usage_count:120  },
  { id:10, branch_id:1,    branch_name:"Main Branch", name:"VIP Service",         name_kh:"សេវាVIP",         color:"#f59e0b", icon:"⭐", sentiment:"positive", sort_order:10, is_active:true,  usage_count:55   },
  { id:11, branch_id:1,    branch_name:"Main Branch", name:"Parking Issue",       name_kh:"បញ្ហាចតរថយន្ត",  color:"#ef4444", icon:"🚗", sentiment:"negative", sort_order:11, is_active:false, usage_count:12   },
];

// ─── Tag Chip Preview ─────────────────────────────────────────────────────────

function TagChipPreview({ name, color, icon, size = "md" }: {
  name: string; color: string; icon: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "text-xs px-2.5 py-1", md: "text-sm px-4 py-2", lg: "text-base px-5 py-2.5" };
  return (
    <span className={`inline-flex items-center gap-2 rounded-full font-medium ${sizes[size]}`}
      style={{ background: `${color}20`, color, border: `1.5px solid ${color}50` }}>
      {icon && <span style={{ fontSize: size === "lg" ? 18 : 14 }}>{icon}</span>}
      {name || "Tag preview"}
    </span>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

function TagDrawer({ tag, onClose, onSave }: {
  tag: Partial<Tag> | null;
  onClose: () => void;
  onSave: (data: Partial<Tag>) => void;
}) {
  const isEdit = !!tag?.id;
  const [form, setForm] = useState({
    name:       tag?.name       ?? "",
    name_kh:    tag?.name_kh    ?? "",
    color:      tag?.color      ?? "#22c55e",
    icon:       tag?.icon       ?? "",
    sentiment:  tag?.sentiment  ?? "positive" as "positive"|"negative"|"neutral",
    branch_id:  tag?.branch_id  ?? null as number | null,
    sort_order: tag?.sort_order ?? 0,
    is_active:  tag?.is_active  ?? true,
  });
  const [customColor, setCustomColor] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Tag name is required"); return; }
    setSaving(true);
    // TODO: REPLACE with:
    // isEdit
    //   ? router.put(route('admin.tags.update', tag.id), form, { onSuccess: onClose })
    //   : router.post(route('admin.tags.store'), form, { onSuccess: onClose });
    await new Promise(r => setTimeout(r, 600));
    const branch = MOCK_BRANCHES.find(b => b.id === form.branch_id);
    onSave({ ...tag, ...form, branch_name: branch?.name ?? null });
    setSaving(false);
    onClose();
  };

  return (
    <>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        onClick={onClose} className="fixed inset-0 z-30"
        style={{ background:"rgba(15,23,42,0.4)", backdropFilter:"blur(2px)" }}/>

      <motion.div initial={{ x:"100%" }} animate={{ x:0 }} exit={{ x:"100%" }}
        transition={{ type:"spring", stiffness:320, damping:32 }}
        className="fixed right-0 top-0 bottom-0 z-40 flex flex-col"
        style={{ width:460, background:"#ffffff",
          boxShadow:"-8px 0 40px rgba(15,23,42,0.12)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5"
          style={{ borderBottom:"1px solid #f1f5f9" }}>
          <div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"17px",
              fontWeight:800, color:"#0f172a", marginBottom:"2px" }}>
              {isEdit ? "Edit Tag" : "New Tag"}
            </h2>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px", color:"#94a3b8" }}>
              {isEdit ? `Editing: ${tag?.name}` : "Create a new feedback tag"}
            </p>
          </div>
          <button onClick={onClose}
            style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10,
              width:32, height:32, cursor:"pointer", display:"flex",
              alignItems:"center", justifyContent:"center", color:"#64748b", fontSize:"16px" }}>
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-5 flex flex-col gap-5">

          {/* Live preview */}
          <div className="p-4 rounded-2xl flex flex-col items-center gap-3"
            style={{ background:"#f8fafc", border:"1px solid #f1f5f9" }}>
            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px",
              color:"#94a3b8", letterSpacing:"0.06em", textTransform:"uppercase" }}>
              Live preview
            </p>
            <TagChipPreview name={form.name} color={form.color}
              icon={form.icon || null} size="lg" />
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"11px", color:"#94a3b8" }}>
              This is how customers will see this tag
            </p>
          </div>

          {/* Name (EN) */}
          <div>
            <label style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px",
              fontWeight:600, color:"#374151", display:"block", marginBottom:"7px" }}>
              Tag Name (English) *
            </label>
            <input value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Friendly Staff"
              style={{ width:"100%", padding:"11px 14px", borderRadius:12,
                border:"1.5px solid #e2e8f0", background:"#fafbfc",
                fontFamily:"'DM Sans',sans-serif", fontSize:"13px",
                color:"#0f172a", outline:"none", transition:"border-color .2s" }}
              onFocus={e=>(e.target.style.borderColor="#0f172a")}
              onBlur={e=>(e.target.style.borderColor="#e2e8f0")}
            />
          </div>

          {/* Name (KH) */}
          <div>
            <label style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px",
              fontWeight:600, color:"#374151", display:"block", marginBottom:"7px" }}>
              Tag Name (Khmer) <span style={{ color:"#94a3b8", fontWeight:400 }}>— optional</span>
            </label>
            <input value={form.name_kh}
              onChange={e => setForm(p => ({ ...p, name_kh: e.target.value }))}
              placeholder="ឧ. បុគ្គលិកស្នាក់"
              style={{ width:"100%", padding:"11px 14px", borderRadius:12,
                border:"1.5px solid #e2e8f0", background:"#fafbfc",
                fontFamily:"'DM Sans',sans-serif", fontSize:"13px",
                color:"#0f172a", outline:"none" }}
              onFocus={e=>(e.target.style.borderColor="#0f172a")}
              onBlur={e=>(e.target.style.borderColor="#e2e8f0")}
            />
          </div>

          {/* Emoji icon */}
          <div>
            <label style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px",
              fontWeight:600, color:"#374151", display:"block", marginBottom:"7px" }}>
              Icon Emoji <span style={{ color:"#94a3b8", fontWeight:400 }}>— optional</span>
            </label>
            <div className="flex gap-2">
              <input value={form.icon}
                onChange={e => setForm(p => ({ ...p, icon: e.target.value }))}
                placeholder="Paste an emoji e.g. 😊"
                maxLength={4}
                style={{ flex:1, padding:"11px 14px", borderRadius:12,
                  border:"1.5px solid #e2e8f0", background:"#fafbfc",
                  fontFamily:"'DM Sans',sans-serif", fontSize:"20px",
                  color:"#0f172a", outline:"none" }}
              />
              {/* Quick emoji picks */}
              {["😊","⚡","🤝","✨","🎯","⏰","🐢","😤","📈","⭐"].map(e => (
                <button key={e} onClick={() => setForm(p => ({ ...p, icon: e }))}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all flex-shrink-0"
                  style={{ background: form.icon === e ? `${form.color}20` : "#f8fafc",
                    border: `1.5px solid ${form.icon === e ? form.color : "#f1f5f9"}`,
                    cursor:"pointer" }}>
                  {e}
                </button>
              )).slice(0, 5)}
            </div>
          </div>

          {/* Color palette */}
          <div>
            <label style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px",
              fontWeight:600, color:"#374151", display:"block", marginBottom:"10px" }}>
              Color
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => { setForm(p => ({ ...p, color: c })); setCustomColor(false); }}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{ background:c, cursor:"pointer",
                    boxShadow: form.color === c ? `0 0 0 3px ${c}40, 0 0 0 2px white` : "none",
                    transform: form.color === c ? "scale(1.15)" : "scale(1)" }} />
              ))}
              {/* Custom color */}
              <button onClick={() => setCustomColor(p => !p)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                style={{ background: customColor ? "#f8fafc" : "#f1f5f9",
                  border:"1.5px dashed #d1d5db", cursor:"pointer", color:"#94a3b8" }}>
                +
              </button>
            </div>
            <AnimatePresence>
              {customColor && (
                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }}
                  exit={{ opacity:0, height:0 }}
                  className="flex items-center gap-3">
                  <input type="color" value={form.color}
                    onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                    style={{ width:40, height:40, border:"none", borderRadius:10,
                      cursor:"pointer", padding:2, background:"none" }} />
                  <input value={form.color}
                    onChange={e => { if(/^#[0-9a-f]{0,6}$/i.test(e.target.value))
                      setForm(p => ({ ...p, color: e.target.value })); }}
                    style={{ flex:1, padding:"9px 12px", borderRadius:10,
                      border:"1.5px solid #e2e8f0", fontFamily:"'DM Mono',monospace",
                      fontSize:"13px", color:"#0f172a", outline:"none" }} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sentiment */}
          <div>
            <label style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px",
              fontWeight:600, color:"#374151", display:"block", marginBottom:"10px" }}>
              Sentiment
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"11px",
                fontWeight:400, color:"#94a3b8", marginLeft:6 }}>
                — affects the sentiment analysis score
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(SENTIMENT_CONFIG) as [string, typeof SENTIMENT_CONFIG[keyof typeof SENTIMENT_CONFIG]][])
                .map(([key, cfg]) => (
                  <button key={key}
                    onClick={() => setForm(p => ({ ...p, sentiment: key as any }))}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all"
                    style={{ border:`1.5px solid ${form.sentiment === key ? cfg.color : "#e2e8f0"}`,
                      background: form.sentiment === key ? cfg.bg : "transparent",
                      cursor:"pointer" }}>
                    <span style={{ fontSize:20 }}>{cfg.icon}</span>
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px",
                      fontWeight: form.sentiment === key ? 600 : 400,
                      color: form.sentiment === key ? cfg.color : "#94a3b8" }}>
                      {cfg.label}
                    </span>
                  </button>
              ))}
            </div>
          </div>

          {/* Branch scope */}
          <div>
            <label style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px",
              fontWeight:600, color:"#374151", display:"block", marginBottom:"7px" }}>
              Scope
            </label>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setForm(p => ({ ...p, branch_id: null }))}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ border:`1.5px solid ${!form.branch_id ? "#0f172a" : "#e2e8f0"}`,
                  background: !form.branch_id ? "#0f172a" : "transparent",
                  color: !form.branch_id ? "#ffffff" : "#64748b",
                  fontFamily:"'DM Sans',sans-serif", fontSize:"12px",
                  fontWeight: !form.branch_id ? 600 : 400, cursor:"pointer" }}>
                🌐 Global (all branches)
              </button>
              <button onClick={() => setForm(p => ({ ...p, branch_id: p.branch_id ?? MOCK_BRANCHES[0].id }))}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ border:`1.5px solid ${form.branch_id ? "#0f172a" : "#e2e8f0"}`,
                  background: form.branch_id ? "#0f172a" : "transparent",
                  color: form.branch_id ? "#ffffff" : "#64748b",
                  fontFamily:"'DM Sans',sans-serif", fontSize:"12px",
                  fontWeight: form.branch_id ? 600 : 400, cursor:"pointer" }}>
                🏢 Branch-specific
              </button>
            </div>
            <AnimatePresence>
              {form.branch_id && (
                <motion.select initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }}
                  exit={{ opacity:0, height:0 }}
                  value={form.branch_id}
                  onChange={e => setForm(p => ({ ...p, branch_id: Number(e.target.value) }))}
                  style={{ width:"100%", padding:"10px 14px", borderRadius:12,
                    border:"1.5px solid #e2e8f0", background:"#fafbfc",
                    fontFamily:"'DM Sans',sans-serif", fontSize:"13px",
                    color:"#0f172a", outline:"none", cursor:"pointer" }}>
                  {MOCK_BRANCHES.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </motion.select>
              )}
            </AnimatePresence>
          </div>

          {/* Sort order + Active */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px",
                fontWeight:600, color:"#374151", display:"block", marginBottom:"7px" }}>
                Sort Order
              </label>
              <input type="number" value={form.sort_order} min={0} max={99}
                onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))}
                style={{ width:"100%", padding:"11px 14px", borderRadius:12,
                  border:"1.5px solid #e2e8f0", background:"#fafbfc",
                  fontFamily:"'DM Mono',monospace", fontSize:"14px",
                  color:"#0f172a", outline:"none" }}
              />
            </div>
            <div className="flex-1 flex flex-col justify-between p-4 rounded-2xl"
              style={{ background:"#f8fafc", border:"1px solid #f1f5f9" }}>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px",
                fontWeight:600, color:"#374151", marginBottom:6 }}>Active</p>
              <button onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                style={{ width:44, height:24, borderRadius:12, border:"none",
                  position:"relative", background:form.is_active ? "#22c55e" : "#d1d5db",
                  cursor:"pointer", flexShrink:0 }}>
                <motion.div animate={{ left: form.is_active ? 22 : 2 }}
                  transition={{ type:"spring", stiffness:500, damping:32 }}
                  style={{ position:"absolute", top:2, width:20, height:20,
                    borderRadius:"50%", background:"#ffffff",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.15)" }}/>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-5 flex gap-3" style={{ borderTop:"1px solid #f1f5f9" }}>
          <button onClick={onClose}
            style={{ flex:1, padding:"11px", borderRadius:12,
              border:"1.5px solid #e2e8f0", background:"transparent",
              fontFamily:"'DM Sans',sans-serif", fontSize:"13px",
              fontWeight:600, color:"#64748b", cursor:"pointer" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:2, padding:"11px", borderRadius:12, border:"none",
              background: saving ? "#d1d5db" : "#0f172a",
              fontFamily:"'Syne',sans-serif", fontSize:"13px", fontWeight:700,
              color:"#ffffff", cursor: saving ? "not-allowed" : "pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {saving
              ? <><div style={{ width:14, height:14, borderRadius:"50%",
                  border:"2px solid rgba(255,255,255,.4)", borderTopColor:"#fff",
                  animation:"spin .7s linear infinite" }}/> Saving...</>
              : isEdit ? "Save Changes" : "Create Tag"}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminTags() {
  const [tags,         setTags]         = useState<Tag[]>(INITIAL);
  const [search,       setSearch]       = useState("");
  const [filterSent,   setFilterSent]   = useState<string>("all");
  const [filterScope,  setFilterScope]  = useState<"all"|"global"|"branch">("all");
  const [viewMode,     setViewMode]     = useState<"grid"|"table">("grid");
  const [drawer,       setDrawer]       = useState<Partial<Tag> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);

  const filtered = useMemo(() => tags
    .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    .filter(t => filterSent  === "all" ? true : t.sentiment === filterSent)
    .filter(t => filterScope === "all" ? true
              : filterScope === "global" ? !t.branch_id : !!t.branch_id)
    .sort((a, b) => a.sort_order - b.sort_order),
    [tags, search, filterSent, filterScope]);

  const handleSave = (data: Partial<Tag>) => {
    if (data.id) {
      setTags(p => p.map(t => t.id === data.id ? { ...t, ...data } : t));
      toast.success("Tag updated!");
    } else {
      setTags(p => [...p, { ...data, id: Date.now(), usage_count: 0 } as Tag]);
      toast.success("Tag created!");
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    // TODO: REPLACE with: router.delete(route('admin.tags.destroy', deleteTarget.id))
    setTags(p => p.filter(t => t.id !== deleteTarget.id));
    toast.success(`"${deleteTarget.name}" deleted`);
    setDeleteTarget(null);
  };

  const handleToggle = (tag: Tag) => {
    // TODO: REPLACE with: router.patch(route('admin.tags.toggle', tag.id))
    setTags(p => p.map(t => t.id === tag.id ? { ...t, is_active: !t.is_active } : t));
    toast.success(`"${tag.name}" ${!tag.is_active ? "activated" : "deactivated"}`);
  };

  return (
    <AdminLayout title="Tags" active="tags">
      <Toaster position="top-right" toastOptions={{
        style: { fontFamily:"'DM Sans',sans-serif", borderRadius:"12px", fontSize:"13px" },
      }}/>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color:"#94a3b8" }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tags..."
              style={{ paddingLeft:34, paddingRight:14, paddingTop:9, paddingBottom:9,
                borderRadius:12, border:"1.5px solid #e2e8f0", background:"#ffffff",
                fontFamily:"'DM Sans',sans-serif", fontSize:"13px",
                color:"#0f172a", outline:"none", width:190 }}
              onFocus={e=>(e.target.style.borderColor="#0f172a")}
              onBlur={e=>(e.target.style.borderColor="#e2e8f0")}
            />
          </div>

          {/* Sentiment filter */}
          <div className="flex gap-1 p-1 rounded-xl"
            style={{ background:"#ffffff", border:"1px solid #e2e8f0" }}>
            {["all","positive","neutral","negative"].map(s => {
              const cfg = s !== "all" ? SENTIMENT_CONFIG[s as keyof typeof SENTIMENT_CONFIG] : null;
              return (
                <button key={s} onClick={() => setFilterSent(s)}
                  style={{ padding:"5px 12px", borderRadius:9, border:"none",
                    background: filterSent === s ? "#0f172a" : "transparent",
                    color: filterSent === s ? "#fff" : "#64748b",
                    fontFamily:"'DM Sans',sans-serif", fontSize:"12px",
                    fontWeight:500, cursor:"pointer", textTransform:"capitalize",
                    display:"flex", alignItems:"center", gap:4 }}>
                  {cfg && <span style={{ fontSize:12 }}>{cfg.icon}</span>}
                  {s === "all" ? "All" : cfg?.label}
                </button>
              );
            })}
          </div>

          {/* Scope filter */}
          <select value={filterScope} onChange={e => setFilterScope(e.target.value as any)}
            style={{ padding:"8px 12px", borderRadius:12, border:"1.5px solid #e2e8f0",
              background:"#ffffff", fontFamily:"'DM Sans',sans-serif", fontSize:"12px",
              color:"#374151", outline:"none", cursor:"pointer" }}>
            <option value="all">All Scopes</option>
            <option value="global">Global Only</option>
            <option value="branch">Branch-specific</option>
          </select>

          {/* View mode toggle */}
          <div className="flex gap-1 p-1 rounded-xl"
            style={{ background:"#ffffff", border:"1px solid #e2e8f0" }}>
            {[["grid","⊞"],["table","☰"]].map(([mode, icon]) => (
              <button key={mode} onClick={() => setViewMode(mode as any)}
                style={{ padding:"5px 10px", borderRadius:9, border:"none",
                  background: viewMode === mode ? "#0f172a" : "transparent",
                  color: viewMode === mode ? "#fff" : "#64748b",
                  cursor:"pointer", fontSize:"14px" }}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
          onClick={() => setDrawer({})}
          style={{ padding:"9px 20px", borderRadius:12, border:"none",
            background:"#0f172a", color:"#ffffff",
            fontFamily:"'Syne',sans-serif", fontSize:"13px",
            fontWeight:700, cursor:"pointer" }}>
          + New Tag
        </motion.button>
      </div>

      {/* Stats bar */}
      <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
        className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label:"Total Tags",    value:tags.length,                                color:"#0f172a" },
          { label:"Active",        value:tags.filter(t=>t.is_active).length,        color:"#22c55e" },
          { label:"Positive",      value:tags.filter(t=>t.sentiment==="positive").length, color:"#22c55e" },
          { label:"Negative",      value:tags.filter(t=>t.sentiment==="negative").length, color:"#ef4444" },
        ].map((s,i) => (
          <div key={s.label} className="rounded-2xl px-5 py-4"
            style={{ background:"#ffffff", border:"1px solid #f1f5f9",
              boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
            <p style={{ fontFamily:"'Syne',sans-serif", fontSize:"22px",
              fontWeight:800, color:s.color, letterSpacing:"-.03em",
              lineHeight:1, marginBottom:4 }}>
              {s.value}
            </p>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"11px", color:"#94a3b8" }}>
              {s.label}
            </p>
          </div>
        ))}
      </motion.div>

      {/* ── Grid view ── */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <AnimatePresence>
            {filtered.map((tag, i) => {
              const sentCfg = SENTIMENT_CONFIG[tag.sentiment];
              return (
                <motion.div key={tag.id}
                  initial={{ opacity:0, scale:0.94 }} animate={{ opacity:1, scale:1 }}
                  exit={{ opacity:0, scale:0.9 }}
                  transition={{ delay:i*0.04 }}
                  className="rounded-2xl p-4 flex flex-col gap-3 relative"
                  style={{ background:"#ffffff", border:"1px solid #f1f5f9",
                    boxShadow:"0 1px 4px rgba(0,0,0,.04)",
                    opacity: tag.is_active ? 1 : 0.5 }}>

                  {/* Top: chip preview + scope */}
                  <div className="flex items-start justify-between gap-2">
                    <TagChipPreview name={tag.name} color={tag.color}
                      icon={tag.icon} size="sm" />
                    {!tag.branch_id
                      ? <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"9px",
                          color:"#94a3b8", letterSpacing:"0.06em", flexShrink:0 }}>GLOBAL</span>
                      : <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"9px",
                          color:"#3b82f6", letterSpacing:"0.06em", flexShrink:0 }}>BRANCH</span>
                    }
                  </div>

                  {/* KH name */}
                  {tag.name_kh && (
                    <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px",
                      color:"#94a3b8" }}>{tag.name_kh}</p>
                  )}

                  {/* Sentiment + usage */}
                  <div className="flex items-center justify-between">
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"11px",
                      fontWeight:600, color:sentCfg.color }}>
                      {sentCfg.icon} {sentCfg.label}
                    </span>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px",
                      color:"#94a3b8" }}>
                      ×{tag.usage_count.toLocaleString()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1" style={{ borderTop:"1px solid #f8fafc" }}>
                    <button onClick={() => setDrawer(tag)}
                      style={{ flex:1, padding:"6px", borderRadius:8,
                        border:"1px solid #e2e8f0", background:"transparent",
                        fontFamily:"'DM Sans',sans-serif", fontSize:"11px",
                        color:"#374151", cursor:"pointer" }}>
                      Edit
                    </button>
                    <button onClick={() => handleToggle(tag)}
                      style={{ padding:"6px 10px", borderRadius:8,
                        border:`1px solid ${tag.is_active ? "#bbf7d0":"#fecaca"}`,
                        background: tag.is_active ? "#f0fdf4":"#fff1f0",
                        fontSize:"11px", cursor:"pointer",
                        color: tag.is_active ? "#16a34a":"#dc2626" }}>
                      {tag.is_active ? "On":"Off"}
                    </button>
                    <button onClick={() => setDeleteTarget(tag)}
                      style={{ padding:"6px 10px", borderRadius:8,
                        border:"1px solid #fecaca", background:"#fff1f0",
                        fontSize:"11px", color:"#ef4444", cursor:"pointer" }}>
                      🗑
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Table view ── */}
      {viewMode === "table" && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background:"#ffffff", border:"1px solid #e2e8f0",
            boxShadow:"0 1px 6px rgba(0,0,0,.04)" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"#f8fafc", borderBottom:"1px solid #e2e8f0" }}>
                {["#","Tag","Khmer","Sentiment","Scope","Usage","Actions"].map(h => (
                  <th key={h} style={{ padding:"10px 14px", textAlign:"left",
                    fontFamily:"'DM Mono',monospace", fontSize:"9px",
                    color:"#94a3b8", letterSpacing:"0.08em",
                    textTransform:"uppercase", fontWeight:500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((tag, i) => {
                const sentCfg = SENTIMENT_CONFIG[tag.sentiment];
                return (
                  <motion.tr key={tag.id}
                    initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                    transition={{ delay:i*0.03 }}
                    style={{ borderBottom:"1px solid #f1f5f9",
                      opacity: tag.is_active ? 1 : 0.5 }}
                    onMouseEnter={e=>(e.currentTarget.style.background="#fafbfc")}
                    onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
                  >
                    <td style={{ padding:"12px 14px" }}>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px",
                        color:"#94a3b8" }}>{tag.sort_order}</span>
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <TagChipPreview name={tag.name} color={tag.color}
                        icon={tag.icon} size="sm" />
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px",
                        color:"#94a3b8" }}>{tag.name_kh ?? "—"}</span>
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"12px",
                        fontWeight:600, color:sentCfg.color }}>
                        {sentCfg.icon} {sentCfg.label}
                      </span>
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      {tag.branch_id
                        ? <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px",
                            color:"#3b82f6" }}>{tag.branch_name}</span>
                        : <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px",
                            color:"#94a3b8" }}>Global</span>
                      }
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"12px",
                        color:"#0f172a", fontWeight:700 }}>
                        {tag.usage_count.toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <div className="flex gap-2">
                        <button onClick={() => setDrawer(tag)}
                          style={{ padding:"5px 10px", borderRadius:8,
                            border:"1px solid #e2e8f0", background:"transparent",
                            fontFamily:"'DM Sans',sans-serif", fontSize:"11px",
                            color:"#374151", cursor:"pointer" }}>Edit</button>
                        <button onClick={() => handleToggle(tag)}
                          style={{ padding:"5px 8px", borderRadius:8, fontSize:"11px",
                            border:`1px solid ${tag.is_active?"#bbf7d0":"#fecaca"}`,
                            background:tag.is_active?"#f0fdf4":"#fff1f0",
                            color:tag.is_active?"#16a34a":"#dc2626", cursor:"pointer" }}>
                          {tag.is_active?"On":"Off"}
                        </button>
                        <button onClick={() => setDeleteTarget(tag)}
                          style={{ padding:"5px 8px", borderRadius:8,
                            border:"1px solid #fecaca", background:"#fff1f0",
                            fontSize:"11px", color:"#ef4444", cursor:"pointer" }}>🗑</button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-5 py-3" style={{ borderTop:"1px solid #f1f5f9", background:"#fafbfc" }}>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:"#94a3b8" }}>
              Showing {filtered.length} of {tags.length} tags
            </span>
          </div>
        </div>
      )}

      {/* Drawer */}
      <AnimatePresence>
        {drawer !== null && (
          <TagDrawer tag={drawer} onClose={() => setDrawer(null)} onSave={handleSave} />
        )}
      </AnimatePresence>

      {/* Delete modal */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setDeleteTarget(null)} className="fixed inset-0 z-30"
              style={{ background:"rgba(15,23,42,0.5)", backdropFilter:"blur(2px)" }}/>
            <motion.div initial={{ opacity:0, scale:0.92 }} animate={{ opacity:1, scale:1 }}
              exit={{ opacity:0, scale:0.92 }}
              transition={{ type:"spring", stiffness:320, damping:28 }}
              className="fixed z-40 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ width:360, background:"#ffffff", borderRadius:20,
                padding:"28px", boxShadow:"0 20px 60px rgba(15,23,42,0.2)" }}>
              <div className="flex items-center gap-3 mb-4">
                <TagChipPreview name={deleteTarget.name} color={deleteTarget.color}
                  icon={deleteTarget.icon} size="md" />
              </div>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:"16px",
                fontWeight:800, color:"#0f172a", marginBottom:"8px" }}>
                Delete this tag?
              </h3>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"13px",
                color:"#64748b", lineHeight:1.6, marginBottom:"20px" }}>
                Used <strong>{deleteTarget.usage_count.toLocaleString()}</strong> times.
                Existing feedback records will keep their tag associations.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)}
                  style={{ flex:1, padding:"10px", borderRadius:10,
                    border:"1.5px solid #e2e8f0", background:"transparent",
                    fontFamily:"'DM Sans',sans-serif", fontSize:"13px",
                    fontWeight:600, color:"#64748b", cursor:"pointer" }}>Cancel</button>
                <button onClick={handleDelete}
                  style={{ flex:1, padding:"10px", borderRadius:10, border:"none",
                    background:"#ef4444", fontFamily:"'DM Sans',sans-serif",
                    fontSize:"13px", fontWeight:700, color:"#ffffff", cursor:"pointer" }}>
                  Delete Tag
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AdminLayout>
  );
}