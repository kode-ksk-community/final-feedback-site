    /**
 * AdminUsers.tsx
 *
 * Admin page to manage all users across all roles.
 * (Super Admin, Admin, Branch Manager, Servicer)
 *
 * Route:    GET /admin/users
 * File:     resources/js/Pages/Admin/Users.tsx
 *
 * Features:
 *   - Table with search + role filter + branch filter
 *   - Slide-in drawer for Create / Edit
 *   - Role badge with color
 *   - Active / Inactive toggle
 *   - QR token status for servicers (generate / revoke)
 *   - Password reset button
 *
 * 🔧 STATIC MODE: All data hardcoded. Search "TODO: REPLACE" for swap points.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import AdminLayout from "../Layouts/AdminLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "super_admin" | "admin" | "branch_manager" | "servicer";

interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  branch_id: number | null;
  branch_name: string | null;
  is_active: boolean;
  has_qr_token: boolean;
  feedback_count: number;
  last_active: string | null;
  created_at: string;
}

interface Branch { id: number; name: string; }

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<Role, { label: string; color: string; bg: string }> = {
  super_admin:    { label: "Super Admin",    color: "#6366f1", bg: "#eff6ff" },
  admin:          { label: "Admin",          color: "#0ea5e9", bg: "#f0f9ff" },
  branch_manager: { label: "Branch Manager", color: "#f59e0b", bg: "#fffbeb" },
  servicer:       { label: "Servicer",       color: "#22c55e", bg: "#f0fdf4" },
};

// ─── 🔧 Mock Data ─────────────────────────────────────────────────────────────

const MOCK_BRANCHES: Branch[] = [
  { id:1, name:"Main Branch"  },
  { id:2, name:"North Branch" },
  { id:3, name:"East Branch"  },
];

const INITIAL: User[] = [
  { id:1, name:"Super Admin",          email:"superadmin@feedbackpro.com", role:"super_admin",    branch_id:null, branch_name:null,          is_active:true,  has_qr_token:false, feedback_count:0,    last_active:"2m ago",  created_at:"2024-01-01" },
  { id:2, name:"System Admin",         email:"admin@feedbackpro.com",      role:"admin",          branch_id:null, branch_name:null,          is_active:true,  has_qr_token:false, feedback_count:0,    last_active:"1h ago",  created_at:"2024-01-01" },
  { id:3, name:"Main Branch Manager",  email:"manager@feedbackpro.com",    role:"branch_manager", branch_id:1,    branch_name:"Main Branch",  is_active:true,  has_qr_token:false, feedback_count:0,    last_active:"3h ago",  created_at:"2024-01-15" },
  { id:4, name:"Sophea Chan",          email:"sophea@feedbackpro.com",     role:"servicer",       branch_id:1,    branch_name:"Main Branch",  is_active:true,  has_qr_token:true,  feedback_count:520,  last_active:"5m ago",  created_at:"2024-01-15" },
  { id:5, name:"Dara Lim",             email:"dara@feedbackpro.com",       role:"servicer",       branch_id:1,    branch_name:"Main Branch",  is_active:true,  has_qr_token:true,  feedback_count:380,  last_active:"1h ago",  created_at:"2024-01-15" },
  { id:6, name:"Maly Sok",             email:"maly@feedbackpro.com",       role:"servicer",       branch_id:2,    branch_name:"North Branch", is_active:true,  has_qr_token:true,  feedback_count:210,  last_active:"2h ago",  created_at:"2024-02-20" },
  { id:7, name:"Chan Piseth",          email:"piseth@feedbackpro.com",     role:"servicer",       branch_id:2,    branch_name:"North Branch", is_active:false, has_qr_token:false, feedback_count:88,   last_active:"3d ago",  created_at:"2024-03-01" },
];

// ─── Drawer ───────────────────────────────────────────────────────────────────

function UserDrawer({ user, branches, onClose, onSave }: {
  user: Partial<User> | null;
  branches: Branch[];
  onClose: () => void;
  onSave: (data: Partial<User>) => void;
}) {
  const isEdit = !!user?.id;
  const [form, setForm] = useState({
    name:      user?.name      ?? "",
    email:     user?.email     ?? "",
    role:      user?.role      ?? "servicer" as Role,
    branch_id: user?.branch_id ?? null as number | null,
    is_active: user?.is_active ?? true,
    password:  "",
  });
  const [saving, setSaving] = useState(false);

  const needsBranch = ["branch_manager","servicer"].includes(form.role);

  const handleSave = async () => {
    if (!form.name.trim())  { toast.error("Name is required"); return; }
    if (!form.email.trim()) { toast.error("Email is required"); return; }
    if (!isEdit && !form.password) { toast.error("Password is required for new users"); return; }
    if (needsBranch && !form.branch_id) { toast.error("Branch is required for this role"); return; }
    setSaving(true);
    // TODO: REPLACE with:
    // isEdit
    //   ? router.put(route('admin.users.update', user.id), form, { onSuccess: onClose })
    //   : router.post(route('admin.users.store'), form, { onSuccess: onClose });
    await new Promise(r => setTimeout(r, 700));
    const branch = branches.find(b => b.id === form.branch_id);
    onSave({ ...user, ...form, branch_name: branch?.name ?? null });
    setSaving(false);
    onClose();
  };

  return (
    <>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        onClick={onClose} className="fixed inset-0 z-30"
        style={{ background:"rgba(15,23,42,0.4)",backdropFilter:"blur(2px)" }}/>
      <motion.div initial={{ x:"100%" }} animate={{ x:0 }} exit={{ x:"100%" }}
        transition={{ type:"spring",stiffness:320,damping:32 }}
        className="fixed right-0 top-0 bottom-0 z-40 flex flex-col"
        style={{ width:440,background:"#ffffff",boxShadow:"-8px 0 40px rgba(15,23,42,0.12)" }}>

        <div className="flex items-center justify-between px-7 py-5"
          style={{ borderBottom:"1px solid #f1f5f9" }}>
          <div>
            <h2 style={{ fontFamily:"'Syne',sans-serif",fontSize:"17px",
              fontWeight:800,color:"#0f172a",marginBottom:"2px" }}>
              {isEdit ? "Edit User" : "New User"}
            </h2>
            <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:"12px",color:"#94a3b8" }}>
              {isEdit ? `Editing: ${user?.name}` : "Create a new staff account"}
            </p>
          </div>
          <button onClick={onClose}
            style={{ background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,
              width:32,height:32,cursor:"pointer",display:"flex",
              alignItems:"center",justifyContent:"center",color:"#64748b",fontSize:"16px" }}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-5">

          {/* Name + Email */}
          {[
            { key:"name",  label:"Full Name *",     placeholder:"e.g. Sophea Chan",           type:"text"     },
            { key:"email", label:"Email Address *",  placeholder:"staff@company.com",          type:"email"    },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontFamily:"'DM Sans',sans-serif",fontSize:"12px",
                fontWeight:600,color:"#374151",display:"block",marginBottom:"7px" }}>{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={{ width:"100%",padding:"11px 14px",borderRadius:12,
                  border:"1.5px solid #e2e8f0",background:"#fafbfc",
                  fontFamily:"'DM Sans',sans-serif",fontSize:"13px",
                  color:"#0f172a",outline:"none",transition:"border-color .2s" }}
                onFocus={e=>(e.target.style.borderColor="#0f172a")}
                onBlur={e=>(e.target.style.borderColor="#e2e8f0")}
              />
            </div>
          ))}

          {/* Password */}
          <div>
            <label style={{ fontFamily:"'DM Sans',sans-serif",fontSize:"12px",
              fontWeight:600,color:"#374151",display:"block",marginBottom:"7px" }}>
              {isEdit ? "New Password (leave blank to keep)" : "Password *"}
            </label>
            <input type="password" value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="Min. 8 characters"
              style={{ width:"100%",padding:"11px 14px",borderRadius:12,
                border:"1.5px solid #e2e8f0",background:"#fafbfc",
                fontFamily:"'DM Sans',sans-serif",fontSize:"13px",
                color:"#0f172a",outline:"none" }}
              onFocus={e=>(e.target.style.borderColor="#0f172a")}
              onBlur={e=>(e.target.style.borderColor="#e2e8f0")}
            />
          </div>

          {/* Role selector */}
          <div>
            <label style={{ fontFamily:"'DM Sans',sans-serif",fontSize:"12px",
              fontWeight:600,color:"#374151",display:"block",marginBottom:"7px" }}>
              Role *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([role, cfg]) => (
                <button key={role} onClick={() => setForm(p => ({ ...p, role }))}
                  style={{ padding:"10px 12px",borderRadius:12,cursor:"pointer",
                    border:`1.5px solid ${form.role === role ? cfg.color : "#e2e8f0"}`,
                    background: form.role === role ? cfg.bg : "transparent",
                    display:"flex",alignItems:"center",gap:8 }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: cfg.color }} />
                  <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:"12px",
                    fontWeight: form.role === role ? 600 : 400,
                    color: form.role === role ? cfg.color : "#64748b" }}>
                    {cfg.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Branch (conditional) */}
          <AnimatePresence>
            {needsBranch && (
              <motion.div initial={{ opacity:0,height:0 }} animate={{ opacity:1,height:"auto" }}
                exit={{ opacity:0,height:0 }}>
                <label style={{ fontFamily:"'DM Sans',sans-serif",fontSize:"12px",
                  fontWeight:600,color:"#374151",display:"block",marginBottom:"7px" }}>
                  Branch *
                </label>
                <select value={form.branch_id ?? ""}
                  onChange={e => setForm(p => ({ ...p, branch_id: e.target.value ? Number(e.target.value) : null }))}
                  style={{ width:"100%",padding:"11px 14px",borderRadius:12,
                    border:"1.5px solid #e2e8f0",background:"#fafbfc",
                    fontFamily:"'DM Sans',sans-serif",fontSize:"13px",
                    color:"#0f172a",outline:"none",cursor:"pointer" }}>
                  <option value="">Select branch...</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl"
            style={{ background:"#f8fafc",border:"1px solid #f1f5f9" }}>
            <div>
              <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:"13px",
                fontWeight:600,color:"#374151",marginBottom:"2px" }}>Active Account</p>
              <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:"12px",color:"#94a3b8" }}>
                Inactive accounts cannot log in
              </p>
            </div>
            <button onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
              style={{ width:44,height:24,borderRadius:12,border:"none",position:"relative",
                background:form.is_active ? "#22c55e" : "#d1d5db",cursor:"pointer" }}>
              <motion.div animate={{ left: form.is_active ? 22 : 2 }}
                transition={{ type:"spring",stiffness:500,damping:32 }}
                style={{ position:"absolute",top:2,width:20,height:20,
                  borderRadius:"50%",background:"#ffffff",
                  boxShadow:"0 1px 4px rgba(0,0,0,0.15)" }}/>
            </button>
          </div>
        </div>

        <div className="px-7 py-5 flex gap-3" style={{ borderTop:"1px solid #f1f5f9" }}>
          <button onClick={onClose}
            style={{ flex:1,padding:"11px",borderRadius:12,
              border:"1.5px solid #e2e8f0",background:"transparent",
              fontFamily:"'DM Sans',sans-serif",fontSize:"13px",
              fontWeight:600,color:"#64748b",cursor:"pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:2,padding:"11px",borderRadius:12,border:"none",
              background:saving ? "#d1d5db" : "#0f172a",
              fontFamily:"'Syne',sans-serif",fontSize:"13px",fontWeight:700,
              color:"#ffffff",cursor:saving ? "not-allowed" : "pointer",
              display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
            {saving
              ? <><div style={{ width:14,height:14,borderRadius:"50%",
                  border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",
                  animation:"spin .7s linear infinite" }}/> Saving...</>
              : isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const [users,        setUsers]        = useState<User[]>(INITIAL);
  const [search,       setSearch]       = useState("");
  const [filterRole,   setFilterRole]   = useState<Role | "all">("all");
  const [filterBranch, setFilterBranch] = useState<number | "all">("all");
  const [drawer,       setDrawer]       = useState<Partial<User> | null>(null);

  const filtered = useMemo(() => users
    .filter(u => u.name.toLowerCase().includes(search.toLowerCase()) ||
                 u.email.toLowerCase().includes(search.toLowerCase()))
    .filter(u => filterRole   === "all" ? true : u.role === filterRole)
    .filter(u => filterBranch === "all" ? true : u.branch_id === filterBranch),
    [users, search, filterRole, filterBranch]);

  const handleSave = (data: Partial<User>) => {
    if (data.id) {
      setUsers(p => p.map(u => u.id === data.id ? { ...u, ...data } : u));
      toast.success("User updated!");
    } else {
      setUsers(p => [...p, { ...data, id: Date.now(),
        has_qr_token: data.role === "servicer",
        feedback_count: 0, last_active: null,
        created_at: new Date().toISOString().slice(0,10) } as User]);
      toast.success("User created!");
    }
  };

  const handleToggleActive = (user: User) => {
    // TODO: REPLACE with: router.patch(route('admin.users.toggle', user.id))
    setUsers(p => p.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    toast.success(`${user.name} ${!user.is_active ? "activated" : "deactivated"}`);
  };

  const handleGenerateQR = (user: User) => {
    // TODO: REPLACE with: router.post(route('admin.users.generate-qr', user.id))
    setUsers(p => p.map(u => u.id === user.id ? { ...u, has_qr_token: true } : u));
    toast.success(`QR token generated for ${user.name}`);
  };

  const handleResetPassword = (user: User) => {
    // TODO: REPLACE with: router.post(route('admin.users.reset-password', user.id))
    toast.success(`Password reset email sent to ${user.email}`);
  };

  return (
    <AdminLayout title="Users" active="users">
      <Toaster position="top-right" toastOptions={{
        style: { fontFamily:"'DM Sans',sans-serif",borderRadius:"12px",fontSize:"13px" },
      }}/>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color:"#94a3b8" }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              style={{ paddingLeft:34,paddingRight:14,paddingTop:9,paddingBottom:9,
                borderRadius:12,border:"1.5px solid #e2e8f0",background:"#ffffff",
                fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:"#0f172a",
                outline:"none",width:200 }}
              onFocus={e=>(e.target.style.borderColor="#0f172a")}
              onBlur={e=>(e.target.style.borderColor="#e2e8f0")}
            />
          </div>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value as Role | "all")}
            style={{ padding:"8px 14px",borderRadius:12,border:"1.5px solid #e2e8f0",
              background:"#ffffff",fontFamily:"'DM Sans',sans-serif",fontSize:"13px",
              color:"#374151",outline:"none",cursor:"pointer" }}>
            <option value="all">All Roles</option>
            {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
              <option key={role} value={role}>{cfg.label}</option>
            ))}
          </select>
          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value === "all" ? "all" : Number(e.target.value))}
            style={{ padding:"8px 14px",borderRadius:12,border:"1.5px solid #e2e8f0",
              background:"#ffffff",fontFamily:"'DM Sans',sans-serif",fontSize:"13px",
              color:"#374151",outline:"none",cursor:"pointer" }}>
            <option value="all">All Branches</option>
            {MOCK_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
          onClick={() => setDrawer({})}
          style={{ padding:"9px 20px",borderRadius:12,border:"none",background:"#0f172a",
            color:"#ffffff",fontFamily:"'Syne',sans-serif",fontSize:"13px",
            fontWeight:700,cursor:"pointer" }}>
          + New User
        </motion.button>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background:"#ffffff",border:"1px solid #e2e8f0",
          boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#f8fafc",borderBottom:"1px solid #e2e8f0" }}>
              {["User","Role","Branch","Status","Last Active","Actions"].map(h => (
                <th key={h} style={{ padding:"12px 16px",textAlign:"left",
                  fontFamily:"'DM Mono',monospace",fontSize:"10px",
                  color:"#94a3b8",letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:500 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding:"48px",textAlign:"center",
                  fontFamily:"'DM Sans',sans-serif",fontSize:"14px",color:"#94a3b8" }}>
                  No users found
                </td></tr>
              ) : filtered.map((user, i) => {
                const roleConf = ROLE_CONFIG[user.role];
                return (
                  <motion.tr key={user.id}
                    initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
                    transition={{ delay:i*0.04 }}
                    style={{ borderBottom:"1px solid #f1f5f9" }}
                    onMouseEnter={e=>(e.currentTarget.style.background="#fafbfc")}
                    onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
                  >
                    {/* User */}
                    <td style={{ padding:"14px 16px" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background:`linear-gradient(135deg,${roleConf.color}cc,${roleConf.color})` }}>
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontFamily:"'Syne',sans-serif",fontSize:"13px",
                            fontWeight:700,color:"#0f172a" }}>{user.name}</p>
                          <p style={{ fontFamily:"'DM Mono',monospace",fontSize:"10px",
                            color:"#94a3b8" }}>{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td style={{ padding:"14px 16px" }}>
                      <span style={{ display:"inline-flex",alignItems:"center",gap:6,
                        padding:"4px 10px",borderRadius:100,
                        background:roleConf.bg,
                        fontFamily:"'DM Sans',sans-serif",fontSize:"11px",
                        fontWeight:600,color:roleConf.color }}>
                        <div className="w-1.5 h-1.5 rounded-full"
                          style={{ background:roleConf.color,flexShrink:0 }}/>
                        {roleConf.label}
                      </span>
                    </td>

                    {/* Branch */}
                    <td style={{ padding:"14px 16px" }}>
                      <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:"12px",
                        color:"#64748b" }}>
                        {user.branch_name ?? <span style={{ color:"#cbd5e1" }}>Global</span>}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding:"14px 16px" }}>
                      <button onClick={() => handleToggleActive(user)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                        style={{ background:user.is_active ? "#f0fdf4" : "#fef2f2",
                          border:`1px solid ${user.is_active ? "#bbf7d0" : "#fecaca"}`,
                          cursor:"pointer" }}>
                        <div className="w-1.5 h-1.5 rounded-full"
                          style={{ background:user.is_active ? "#22c55e" : "#ef4444" }}/>
                        <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:"11px",
                          fontWeight:600,color:user.is_active ? "#16a34a" : "#dc2626" }}>
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </button>
                    </td>

                    {/* Last active */}
                    <td style={{ padding:"14px 16px" }}>
                      <span style={{ fontFamily:"'DM Mono',monospace",fontSize:"11px",color:"#94a3b8" }}>
                        {user.last_active ?? "Never"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding:"14px 16px" }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => setDrawer(user)}
                          style={{ padding:"6px 12px",borderRadius:8,
                            border:"1px solid #e2e8f0",background:"transparent",
                            fontFamily:"'DM Sans',sans-serif",fontSize:"12px",
                            color:"#374151",cursor:"pointer" }}>Edit</button>
                        <button onClick={() => handleResetPassword(user)}
                          style={{ padding:"6px 10px",borderRadius:8,
                            border:"1px solid #e2e8f0",background:"transparent",
                            fontSize:"12px",color:"#64748b",cursor:"pointer" }}>🔑</button>
                        {user.role === "servicer" && (
                          <button onClick={() => handleGenerateQR(user)}
                            style={{ padding:"6px 10px",borderRadius:8,
                              border:`1px solid ${user.has_qr_token ? "#bbf7d0" : "#e2e8f0"}`,
                              background:user.has_qr_token ? "#f0fdf4" : "transparent",
                              fontSize:"12px",color:user.has_qr_token ? "#16a34a" : "#64748b",
                              cursor:"pointer",fontFamily:"'DM Mono',monospace" }}>
                            {user.has_qr_token ? "📱 QR" : "+ QR"}
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
        <div className="px-6 py-3" style={{ borderTop:"1px solid #f1f5f9",background:"#fafbfc" }}>
          <span style={{ fontFamily:"'DM Mono',monospace",fontSize:"11px",color:"#94a3b8" }}>
            Showing {filtered.length} of {users.length} users
          </span>
        </div>
      </div>

      <AnimatePresence>
        {drawer !== null && (
          <UserDrawer user={drawer} branches={MOCK_BRANCHES}
            onClose={() => setDrawer(null)} onSave={handleSave} />
        )}
      </AnimatePresence>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AdminLayout>
  );
}