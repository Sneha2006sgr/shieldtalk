import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import HQChat from "./HQChat";
import { IconUsers, IconClock, IconActivity, IconSOS, IconOnline } from "../../components/Icons";
import ShieldLogo from "../../components/ShieldLogo";

const TABS = ["OVERVIEW","CHAT","USERS","CREATE USER","GROUPS","PENDING","LOGS","SOS"];
const ROLES = ["defence_personnel","family_member","admin_officer","hq_admin"];
const card = { background:"rgba(10,25,47,0.8)", border:"1px solid rgba(0,255,100,0.15)", borderRadius:10, padding:16 };
const inp = { background:"rgba(0,0,0,0.4)", border:"1px solid rgba(0,255,100,0.25)", color:"#e2e8f0", padding:"8px 12px", borderRadius:6, fontFamily:"monospace", fontSize:12, width:"100%", outline:"none", boxSizing:"border-box", display:"block" };
const mkBtn = (c) => ({ background:"transparent", border:"1px solid "+c, color:c, padding:"5px 12px", borderRadius:4, fontFamily:"monospace", fontSize:11, cursor:"pointer" });

export default function HQDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);
  const [logs, setLogs] = useState([]);
  const [sos, setSos] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [approveLink, setApproveLink] = useState("");
  const [newUser, setNewUser] = useState({ name:"", aadhaar:"", relation:"", role:"defence_personnel" });
  const [newUserResult, setNewUserResult] = useState(null);
  const [newGroup, setNewGroup] = useState({ name:"", memberIds:[] });

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 4000); };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 20000);
    return () => clearInterval(t);
  }, []);

  const fetchAll = async () => {
    try {
      const [s,u,p,l,sosR,g] = await Promise.all([
        api.get("/admin/stats"), api.get("/admin/users"), api.get("/admin/pending-users"),
        api.get("/admin/logs?limit=60"), api.get("/admin/sos-alerts"), api.get("/messages/groups"),
      ]);
      setStats(s.data); setUsers(u.data); setPending(p.data);
      setLogs(l.data); setSos(sosR.data); setGroups(g.data);
    } catch(_) {}
  };

  const approve = async (id) => {
    setLoading(true);
    try {
      const r = await api.post("/admin/approve/"+id);
      const link = window.location.origin + r.data.activationLink;
      setApproveLink(link);
      showToast("User approved! Copy the activation link below.");
      fetchAll();
    } catch(e) { showToast("Error: "+(e.response?.data?.message||e.message)); }
    setLoading(false);
  };

  const reject = async (id) => { await api.post("/admin/reject/"+id); fetchAll(); showToast("Rejected."); };
  const suspend = async (id) => { await api.post("/admin/suspend/"+id); fetchAll(); showToast("Suspended."); };
  const ackSOS = async (id) => { await api.post("/admin/sos-acknowledge/"+id); fetchAll(); };
  const assignRole = async (id, role) => { await api.post("/admin/assign-role/"+id, { role }); showToast("Role updated"); fetchAll(); };

  const createUser = async () => {
    if (!newUser.name || !newUser.aadhaar) return showToast("Name and Aadhaar required");
    try {
      const r = await api.post("/admin/create-user", newUser);
      setNewUserResult(r.data);
      setNewUser({ name:"", aadhaar:"", relation:"", role:"defence_personnel" });
      fetchAll();
    } catch(e) { showToast("Error: "+(e.response?.data?.message||e.message)); }
  };

  const createGroup = async () => {
    if (!newGroup.name.trim()) return showToast("Group name required");
    try {
      await api.post("/messages/groups", newGroup);
      showToast("Group created"); setNewGroup({ name:"", memberIds:[] }); fetchAll();
    } catch(e) { showToast("Error: "+(e.response?.data?.message||e.message)); }
  };

  const toggleMember = (id) => setNewGroup((g) => ({
    ...g, memberIds: g.memberIds.includes(id) ? g.memberIds.filter((x)=>x!==id) : [...g.memberIds, id],
  }));

  const copyLink = (link) => { navigator.clipboard.writeText(link); showToast("Link copied!"); };
  const sevColor = (s) => s==="critical"?"#f87171":s==="warning"?"#fbbf24":"#00ff64";

  return (
    <div style={{ minHeight:"100vh", background:"#020b18", color:"#e2e8f0" }}>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 20px", background:"rgba(10,25,47,0.9)", borderBottom:"1px solid rgba(0,255,100,0.2)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <ShieldLogo size={24} />          <span style={{ fontFamily:"monospace", fontWeight:700, color:"#00ff64", letterSpacing:2 }}>SHIELDTALK HQ</span>
          <span style={{ fontFamily:"monospace", fontSize:10, color:"#475569", marginLeft:8 }}>COMMAND CENTER</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {sos.length > 0 && (
            <motion.span animate={{ opacity:[1,0.3,1] }} transition={{ duration:0.6, repeat:Infinity }}
              style={{ fontFamily:"monospace", fontSize:11, color:"#f87171", border:"1px solid rgba(248,113,113,0.5)", padding:"3px 10px", borderRadius:4 }}>
              SOS {sos.length}
            </motion.span>
          )}
          <span style={{ fontFamily:"monospace", fontSize:12, color:"#00ff64" }}>{user?.name?.toUpperCase()}</span>
          <button onClick={async()=>{ await logout(); navigate("/login"); }} style={mkBtn("#f87171")}>LOGOUT</button>
        </div>
      </div>

      <div style={{ display:"flex", gap:4, padding:"10px 20px", flexWrap:"wrap", borderBottom:"1px solid rgba(0,255,100,0.1)", background:"rgba(2,11,24,0.6)" }}>
        {TABS.map((t,i) => (
          <button key={i} onClick={()=>setTab(i)} style={{ padding:"6px 14px", fontFamily:"monospace", fontSize:11, letterSpacing:1, cursor:"pointer", borderRadius:4, background:tab===i?"rgba(0,100,50,0.4)":"transparent", border:"1px solid "+(tab===i?"#00ff64":"rgba(0,255,100,0.2)"), color:tab===i?"#00ff64":"#475569" }}>{t}</button>
        ))}
      </div>

      {toast && <div style={{ margin:"8px 20px", padding:"8px 14px", background:"rgba(0,100,50,0.3)", border:"1px solid rgba(0,255,100,0.3)", borderRadius:6, fontFamily:"monospace", fontSize:11, color:"#00ff64" }}>{toast}</div>}

      {approveLink && (
        <div style={{ margin:"0 20px 8px", padding:"10px 14px", background:"rgba(0,0,0,0.5)", border:"1px solid rgba(0,255,100,0.3)", borderRadius:6, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontFamily:"monospace", fontSize:10, color:"#00ff64", letterSpacing:1, flexShrink:0 }}>ACTIVATION LINK:</span>
          <span style={{ fontFamily:"monospace", fontSize:11, color:"#e2e8f0", flex:1, wordBreak:"break-all" }}>{approveLink}</span>
          <button onClick={()=>copyLink(approveLink)} style={{ background:"#00ff64", border:"none", color:"#000", padding:"5px 14px", borderRadius:4, fontFamily:"monospace", fontSize:11, fontWeight:700, cursor:"pointer", flexShrink:0 }}>COPY</button>
          <button onClick={()=>setApproveLink("")} style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.2)", color:"#64748b", padding:"5px 10px", borderRadius:4, fontFamily:"monospace", fontSize:11, cursor:"pointer", flexShrink:0 }}>X</button>
        </div>
      )}

      <div style={{ padding:"16px 20px" }}>

        {tab===0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
              {[
                {label:"TOTAL USERS",  val:stats.totalUsers||0,  Icon:IconUsers,    c:"#e2e8f0"},
                {label:"PENDING",      val:stats.pendingUsers||0, Icon:IconClock,    c:"#fbbf24"},
                {label:"ONLINE NOW",   val:stats.activeUsers||0,  Icon:IconOnline,   c:"#00ff64"},
                {label:"ACTIVE SOS",   val:stats.activeSOS||0,    Icon:IconSOS,      c:"#f87171"},
                {label:"STATUS",       val:"ONLINE",              Icon:IconActivity, c:"#00ff64"},
              ].map((s,i)=>(
                <div key={i} style={card}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <s.Icon size={20} color={s.c} />
                    <span style={{ fontFamily:"monospace", fontWeight:700, fontSize:22, color:s.c }}>{s.val}</span>
                  </div>
                  <p style={{ margin:0, fontFamily:"monospace", fontSize:10, color:"#475569" }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div style={card}>
              <p style={{ margin:"0 0 10px", fontFamily:"monospace", fontSize:11, color:"#00ff64", letterSpacing:2 }}>RECENT ACTIVITY</p>
              <div style={{ maxHeight:240, overflowY:"auto", display:"flex", flexDirection:"column", gap:4 }}>
                {(stats.recentLogs||[]).map((l,i)=>(
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"4px 8px", background:"rgba(0,0,0,0.3)", borderRadius:4 }}>
                    <span style={{ fontFamily:"monospace", fontSize:11, color:sevColor(l.severity) }}>{l.action}</span>
                    <span style={{ fontFamily:"monospace", fontSize:10, color:"#475569" }}>{new Date(l.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab===1 && <HQChat myId={String(user?._id||user?.id||"")} />}

        {tab===2 && (
          <div style={card}>
            <p style={{ margin:"0 0 12px", fontFamily:"monospace", fontSize:11, color:"#00ff64", letterSpacing:2 }}>ALL USERS ({users.length})</p>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"monospace", fontSize:11 }}>
                <thead><tr style={{ borderBottom:"1px solid rgba(0,255,100,0.2)" }}>
                  {["NAME","USERNAME","ROLE","STATUS","ONLINE","CHANGE ROLE","ACTIONS"].map((h)=>(
                    <th key={h} style={{ textAlign:"left", padding:"6px 8px", color:"#00ff64", letterSpacing:1 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {users.map((u)=>(
                    <tr key={u._id} style={{ borderBottom:"1px solid rgba(0,255,100,0.05)" }}>
                      <td style={{ padding:"6px 8px", color:"#e2e8f0" }}>{u.name}</td>
                      <td style={{ padding:"6px 8px", color:"#94a3b8" }}>{u.username||""}</td>
                      <td style={{ padding:"6px 8px", color:"#00ff64" }}>{u.role?.replace(/_/g," ").toUpperCase()}</td>
                      <td style={{ padding:"6px 8px" }}>
                        <span style={{ padding:"2px 8px", borderRadius:3, fontSize:10, background:u.status==="approved"?"rgba(0,100,50,0.3)":u.status==="pending"?"rgba(251,191,36,0.2)":"rgba(248,113,113,0.2)", color:u.status==="approved"?"#00ff64":u.status==="pending"?"#fbbf24":"#f87171" }}>{u.status?.toUpperCase()}</span>
                      </td>
                      <td style={{ padding:"6px 8px" }}><span style={{ width:8, height:8, borderRadius:"50%", display:"inline-block", background:u.isOnline?"#22c55e":"#475569" }}/></td>
                      <td style={{ padding:"6px 8px" }}>
                        <select defaultValue={u.role} onChange={(e)=>assignRole(u._id,e.target.value)} style={{ background:"rgba(0,0,0,0.4)", border:"1px solid rgba(0,255,100,0.2)", color:"#e2e8f0", padding:"3px 6px", borderRadius:4, fontFamily:"monospace", fontSize:10, cursor:"pointer" }}>
                          {ROLES.map((r)=><option key={r} value={r}>{r.replace(/_/g," ")}</option>)}
                        </select>
                      </td>
                      <td style={{ padding:"6px 8px" }}>
                        {u.status==="approved"&&u.role!=="hq_admin"&&<button onClick={()=>suspend(u._id)} style={mkBtn("#f87171")}>SUSPEND</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab===3 && (
          <div style={{ maxWidth:520 }}>
            <div style={card}>
              <p style={{ margin:"0 0 14px", fontFamily:"monospace", fontSize:11, color:"#00ff64", letterSpacing:2 }}>CREATE NEW USER</p>
              {newUserResult ? (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <p style={{ fontFamily:"monospace", fontSize:12, color:"#00ff64", margin:0 }}>USER CREATED SUCCESSFULLY</p>
                  <p style={{ fontFamily:"monospace", fontSize:11, color:"#94a3b8", margin:0 }}>Share this activation link with the user:</p>
                  <div style={{ background:"rgba(0,0,0,0.5)", padding:"10px 12px", borderRadius:6, border:"1px solid rgba(0,255,100,0.2)", display:"flex", alignItems:"flex-start", gap:10 }}>
                    <span style={{ fontFamily:"monospace", fontSize:11, color:"#00ff64", flex:1, wordBreak:"break-all" }}>{window.location.origin}{newUserResult.activationLink}</span>
                    <button onClick={()=>copyLink(window.location.origin+newUserResult.activationLink)} style={{ background:"#00ff64", border:"none", color:"#000", padding:"4px 12px", borderRadius:4, fontFamily:"monospace", fontSize:11, fontWeight:700, cursor:"pointer", flexShrink:0 }}>COPY</button>
                  </div>
                  <button onClick={()=>setNewUserResult(null)} style={mkBtn("#00ff64")}>CREATE ANOTHER</button>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {[["FULL NAME","name"],["AADHAAR NUMBER","aadhaar"],["UNIT / RELATION","relation"]].map(([label,key])=>(
                    <div key={key}>
                      <label style={{ fontFamily:"monospace", fontSize:10, color:"#00ff64", letterSpacing:1, display:"block", marginBottom:4 }}>{label}</label>
                      <input value={newUser[key]} onChange={(e)=>setNewUser((p)=>({...p,[key]:e.target.value}))} style={inp} placeholder={label} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontFamily:"monospace", fontSize:10, color:"#00ff64", letterSpacing:1, display:"block", marginBottom:4 }}>ROLE</label>
                    <select value={newUser.role} onChange={(e)=>setNewUser((p)=>({...p,role:e.target.value}))} style={inp}>
                      {ROLES.map((r)=><option key={r} value={r}>{r.replace(/_/g," ")}</option>)}
                    </select>
                  </div>
                  <button onClick={createUser} style={{ ...mkBtn("#00ff64"), padding:"10px 0", width:"100%", fontSize:12, letterSpacing:2 }}>CREATE AND APPROVE USER</button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab===4 && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ ...card, maxWidth:480 }}>
              <p style={{ margin:"0 0 12px", fontFamily:"monospace", fontSize:11, color:"#00ff64", letterSpacing:2 }}>CREATE GROUP</p>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div>
                  <label style={{ fontFamily:"monospace", fontSize:10, color:"#00ff64", display:"block", marginBottom:4 }}>GROUP NAME</label>
                  <input value={newGroup.name} onChange={(e)=>setNewGroup((g)=>({...g,name:e.target.value}))} style={inp} placeholder="e.g. Alpha Squad" />
                </div>
                <div>
                  <label style={{ fontFamily:"monospace", fontSize:10, color:"#00ff64", display:"block", marginBottom:6 }}>SELECT MEMBERS</label>
                  <div style={{ maxHeight:180, overflowY:"auto", display:"flex", flexDirection:"column", gap:4 }}>
                    {users.filter((u)=>u.status==="approved").map((u)=>(
                      <label key={u._id} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"4px 6px", borderRadius:4, background:newGroup.memberIds.includes(u._id)?"rgba(0,100,50,0.3)":"transparent" }}>
                        <input type="checkbox" checked={newGroup.memberIds.includes(u._id)} onChange={()=>toggleMember(u._id)} />
                        <span style={{ fontFamily:"monospace", fontSize:11, color:"#e2e8f0" }}>{u.name}</span>
                        <span style={{ fontFamily:"monospace", fontSize:10, color:"#475569" }}>{u.role?.replace(/_/g," ")}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button onClick={createGroup} style={{ ...mkBtn("#00ff64"), padding:"8px 0", width:"100%", fontSize:12, letterSpacing:2 }}>CREATE GROUP</button>
              </div>
            </div>
            <div style={card}>
              <p style={{ margin:"0 0 10px", fontFamily:"monospace", fontSize:11, color:"#00ff64", letterSpacing:2 }}>EXISTING GROUPS ({groups.length})</p>
              {groups.map((g)=>(
                <div key={g._id} style={{ padding:"8px 10px", background:"rgba(0,0,0,0.3)", borderRadius:6, marginBottom:6, border:"1px solid rgba(0,255,100,0.08)" }}>
                  <p style={{ margin:0, fontFamily:"monospace", fontSize:12, color:"#e2e8f0" }}>[G] {g.name}</p>
                  <p style={{ margin:"2px 0 0", fontFamily:"monospace", fontSize:10, color:"#475569" }}>{g.members?.map((m)=>m.name).join(", ")}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab===5 && (
          <div style={card}>
            <p style={{ margin:"0 0 12px", fontFamily:"monospace", fontSize:11, color:"#00ff64", letterSpacing:2 }}>PENDING APPROVALS ({pending.length})</p>
            {pending.length===0 ? <p style={{ fontFamily:"monospace", fontSize:11, color:"#475569" }}>No pending requests.</p> : pending.map((u)=>(
              <div key={u._id} style={{ padding:12, background:"rgba(251,191,36,0.05)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:8, marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <p style={{ margin:0, fontFamily:"monospace", fontWeight:700, color:"#e2e8f0" }}>{u.name}</p>
                    <p style={{ margin:"3px 0 0", fontFamily:"monospace", fontSize:10, color:"#94a3b8" }}>Aadhaar: {u.aadhaar}  {u.role?.replace(/_/g," ").toUpperCase()}</p>
                    <p style={{ margin:"2px 0 0", fontFamily:"monospace", fontSize:10, color:"#94a3b8" }}>Unit: {u.relation||""}  {new Date(u.createdAt).toLocaleString()}</p>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={()=>approve(u._id)} disabled={loading} style={mkBtn("#00ff64")}>APPROVE</button>
                    <button onClick={()=>reject(u._id)} style={mkBtn("#f87171")}>REJECT</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab===6 && (
          <div style={card}>
            <p style={{ margin:"0 0 10px", fontFamily:"monospace", fontSize:11, color:"#00ff64", letterSpacing:2 }}>AUDIT LOGS</p>
            <div style={{ maxHeight:"65vh", overflowY:"auto", display:"flex", flexDirection:"column", gap:2 }}>
              {logs.map((l,i)=>(
                <div key={i} style={{ display:"flex", gap:12, padding:"4px 8px", background:"rgba(0,0,0,0.2)", borderRadius:3, borderBottom:"1px solid rgba(0,255,100,0.04)" }}>
                  <span style={{ fontFamily:"monospace", fontSize:10, color:sevColor(l.severity), width:60, flexShrink:0 }}>{l.severity?.toUpperCase()}</span>
                  <span style={{ fontFamily:"monospace", fontSize:11, color:"#e2e8f0", flex:1 }}>{l.action}</span>
                  <span style={{ fontFamily:"monospace", fontSize:10, color:"#475569", flexShrink:0 }}>{l.userId?.name||"SYSTEM"}</span>
                  <span style={{ fontFamily:"monospace", fontSize:10, color:"#334155", flexShrink:0 }}>{new Date(l.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab===7 && (
          <div style={card}>
            <p style={{ margin:"0 0 12px", fontFamily:"monospace", fontSize:11, color:"#f87171", letterSpacing:2 }}>ACTIVE SOS ALERTS ({sos.length})</p>
            {sos.length===0 ? <p style={{ fontFamily:"monospace", fontSize:11, color:"#475569" }}>No active SOS alerts.</p> : sos.map((a)=>(
              <motion.div key={a._id} animate={{ borderColor:["rgba(248,113,113,0.2)","rgba(248,113,113,0.7)","rgba(248,113,113,0.2)"] }} transition={{ duration:1, repeat:Infinity }}
                style={{ padding:12, background:"rgba(248,113,113,0.05)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:8, marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <p style={{ margin:0, fontFamily:"monospace", fontWeight:700, color:"#f87171" }}>SOS: {a.message}</p>
                    <p style={{ margin:"3px 0 0", fontFamily:"monospace", fontSize:11, color:"#e2e8f0" }}>{a.userId?.name}  {a.userId?.role?.replace(/_/g," ").toUpperCase()}</p>
                    <p style={{ margin:"2px 0 0", fontFamily:"monospace", fontSize:10, color:"#94a3b8" }}>LAT: {a.location?.lat?.toFixed(4)} | LNG: {a.location?.lng?.toFixed(4)}</p>
                    <p style={{ margin:"2px 0 0", fontFamily:"monospace", fontSize:10, color:"#475569" }}>{new Date(a.timestamp).toLocaleString()}</p>
                  </div>
                  <button onClick={()=>ackSOS(a._id)} style={mkBtn("#00ff64")}>ACKNOWLEDGE</button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}