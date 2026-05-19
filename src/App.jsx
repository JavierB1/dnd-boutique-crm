import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";

const BACKEND = "https://dnd-boutique-backend-production.up.railway.app";

const STATUS_META = {
  "Nuevo":      { bg: "var(--tag-blue-bg)",   text: "var(--tag-blue)",   dot: "#3b82f6" },
  "Interesado": { bg: "var(--tag-yellow-bg)", text: "var(--tag-yellow)", dot: "#f59e0b" },
  "Cotizado":   { bg: "var(--tag-purple-bg)", text: "var(--tag-purple)", dot: "#8b5cf6" },
  "Cerrado":    { bg: "var(--tag-green-bg)",  text: "var(--tag-green)",  dot: "#10b981" },
  "Perdido":    { bg: "var(--tag-red-bg)",    text: "var(--tag-red)",    dot: "#ef4444" },
};
const STATUSES = ["Nuevo", "Interesado", "Cotizado", "Cerrado", "Perdido"];

const NAV = [
  { id: "dashboard",     icon: "📊", label: "Dashboard" },
  { id: "conversations", icon: "💬", label: "Chats" },
  { id: "clients",       icon: "👥", label: "Clientes" },
  { id: "combos",        icon: "🌸", label: "Combos" },
  { id: "pipeline",      icon: "📈", label: "Pipeline" },
];

export default function App() {
  const [dark, setDark] = useState(true);
  const [section, setSection] = useState("dashboard");
  const [clients, setClients] = useState([]);
  const [combos, setCombos] = useState([]);
  const [conversations, setConversations] = useState({});
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [newMsg, setNewMsg] = useState("");
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddCombo, setShowAddCombo] = useState(false);
  const [newClient, setNewClient] = useState({ nombre: "", telefono: "", status: "Nuevo", notas: "" });
  const [newCombo, setNewCombo] = useState({ nombre: "", descripcion: "", precio: "", stock: "" });
  const [loading, setLoading] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, "combos"), snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (data.length === 0) seedCombos();
        else setCombos(data);
        setLoading(false);
      }),
      onSnapshot(collection(db, "clientes"), snap => setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, "conversaciones"), snap => {
        const c = {};
        snap.docs.forEach(d => { c[d.id] = d.data(); });
        setConversations(c);
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [conversations, selectedPhone]);

  const seedCombos = async () => {
    for (const c of [
      { nombre: "Combo Dúo", descripcion: "2 perfumes a elegir", precio: 25, stock: 15, activo: true },
      { nombre: "Combo Trío", descripcion: "3 perfumes a elegir", precio: 35, stock: 10, activo: true },
      { nombre: "Combo Premium", descripcion: "2 perfumes línea premium", precio: 45, stock: 8, activo: true },
    ]) await addDoc(collection(db, "combos"), c);
  };

  const addCombo = async () => {
    if (!newCombo.nombre) return;
    await addDoc(collection(db, "combos"), { ...newCombo, precio: parseFloat(newCombo.precio) || 0, stock: parseInt(newCombo.stock) || 0, activo: true });
    setNewCombo({ nombre: "", descripcion: "", precio: "", stock: "" });
    setShowAddCombo(false);
  };

  const addClient = async () => {
    if (!newClient.nombre) return;
    await addDoc(collection(db, "clientes"), { ...newClient, totalGastado: 0, createdAt: serverTimestamp() });
    setNewClient({ nombre: "", telefono: "", status: "Nuevo", notas: "" });
    setShowAddClient(false);
  };

  const updateClientStatus = async (id, status) => updateDoc(doc(db, "clientes", id), { status });

  const enviarMensaje = async () => {
    if (!newMsg.trim() || !selectedPhone) return;
    const tiempo = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const conv = conversations[selectedPhone] || { mensajes: [] };
    const mensajes = [...(conv.mensajes || []), { from: "user", texto: newMsg, tiempo }];
    await setDoc(doc(db, "conversaciones", selectedPhone), { ...conv, mensajes, ultimoMsg: newMsg, ultimoTiempo: tiempo }, { merge: true });
    try {
      await fetch(`${BACKEND}/api/enviar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telefono: selectedPhone, mensaje: newMsg }) });
    } catch (e) { console.error(e); }
    setNewMsg("");
  };

  const toggleBot = async (tel) => {
    const conv = conversations[tel] || {};
    await setDoc(doc(db, "conversaciones", tel), { botActivo: !conv.botActivo }, { merge: true });
    try { await fetch(`${BACKEND}/api/modo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telefono: tel, humano: !conv.botActivo }) }); } catch (e) {}
  };

  const totalUnread = Object.values(conversations).reduce((a, c) => a + (c.sinLeer || 0), 0);
  const totalVentas = clients.filter(c => c.status === "Cerrado").reduce((a, c) => a + (c.totalGastado || 0), 0);
  const conversion = clients.length ? Math.round(clients.filter(c => c.status === "Cerrado").length / clients.length * 100) : 0;

  const convList = Object.entries(conversations).map(([tel, conv]) => {
    let nombre = conv.nombre || tel;
    const ultimoMsg = conv.ultimoMsg || "Sin mensajes";
    return { telefono: tel, nombre, ultimoMsg, botActivo: conv.botActivo !== false, sinLeer: conv.sinLeer || 0, ultimoTiempo: conv.ultimoTiempo || "", mensajes: conv.mensajes || [] };
  });

  const theme = {
    "--bg":           dark ? "#0f1117" : "#f8f9fb",
    "--bg2":          dark ? "#1a1d27" : "#ffffff",
    "--bg3":          dark ? "#22263a" : "#f0f2f8",
    "--border":       dark ? "#2a2f45" : "#e2e6f0",
    "--text":         dark ? "#eef0f8" : "#1a1d27",
    "--text2":        dark ? "#8892b0" : "#64748b",
    "--text3":        dark ? "#4a5580" : "#94a3b8",
    "--accent":       "#f472b6",
    "--accent2":      "#a78bfa",
    "--accent3":      "#34d399",
    "--tag-blue-bg":  dark ? "#1e3a5f" : "#dbeafe",
    "--tag-blue":     dark ? "#93c5fd" : "#1d4ed8",
    "--tag-yellow-bg":dark ? "#3b2a00" : "#fef3c7",
    "--tag-yellow":   dark ? "#fcd34d" : "#92400e",
    "--tag-purple-bg":dark ? "#2d1b69" : "#ede9fe",
    "--tag-purple":   dark ? "#c4b5fd" : "#5b21b6",
    "--tag-green-bg": dark ? "#064e3b" : "#d1fae5",
    "--tag-green":    dark ? "#6ee7b7" : "#065f46",
    "--tag-red-bg":   dark ? "#450a0a" : "#fee2e2",
    "--tag-red":      dark ? "#fca5a5" : "#991b1b",
    "--shadow":       dark ? "0 4px 24px rgba(0,0,0,.4)" : "0 4px 24px rgba(0,0,0,.08)",
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#0f1117", flexDirection:"column", gap:16 }}>
      <div style={{ fontSize:48, animation:"spin 1s linear infinite" }}>🌸</div>
      <div style={{ color:"#f472b6", fontFamily:"Poppins, sans-serif", fontSize:16, fontWeight:600 }}>Cargando DND Boutique...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ ...theme, display:"flex", flexDirection:"column", height:"100vh", background:"var(--bg)", fontFamily:"'Poppins', sans-serif", color:"var(--text)", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        .anim { animation: fadeUp 0.3s ease; }
        .card { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; transition: all 0.2s; }
        .card:hover { border-color: var(--accent); box-shadow: var(--shadow); }
        .btn-primary { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: white; border: none; border-radius: 10px; padding: 10px 20px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: Poppins, sans-serif; transition: all 0.2s; }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(244,114,182,.3); }
        .btn-ghost { background: transparent; color: var(--text2); border: 1px solid var(--border); border-radius: 10px; padding: 9px 16px; cursor: pointer; font-size: 13px; font-family: Poppins, sans-serif; transition: all 0.2s; }
        .btn-ghost:hover { background: var(--bg3); color: var(--text); }
        .btn-danger { background: transparent; color: var(--tag-red); border: 1px solid var(--tag-red-bg); border-radius: 10px; padding: 9px 14px; cursor: pointer; font-size: 13px; font-family: Poppins, sans-serif; transition: all 0.2s; }
        .btn-danger:hover { background: var(--tag-red-bg); }
        .input { background: var(--bg3); border: 1.5px solid var(--border); border-radius: 10px; padding: 10px 14px; color: var(--text); font-size: 13px; font-family: Poppins, sans-serif; width: 100%; transition: all 0.2s; outline: none; }
        .input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(244,114,182,.15); }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 12px; cursor: pointer; transition: all 0.2s; font-size: 14px; font-weight: 500; color: var(--text2); }
        .nav-item:hover { background: var(--bg3); color: var(--text); }
        .nav-item.active { background: linear-gradient(135deg, rgba(244,114,182,.15), rgba(167,139,250,.15)); color: var(--accent); border-left: 3px solid var(--accent); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 200; backdrop-filter: blur(8px); padding: 16px; }
        .modal { background: var(--bg2); border: 1px solid var(--border); border-radius: 20px; padding: 28px; width: 100%; max-width: 400px; animation: fadeUp 0.25s ease; box-shadow: var(--shadow); }
        .conv-item { padding: 14px 16px; cursor: pointer; border-bottom: 1px solid var(--border); transition: background 0.15s; }
        .conv-item:hover { background: var(--bg3); }
        .conv-item.active { background: linear-gradient(135deg, rgba(244,114,182,.1), rgba(167,139,250,.1)); border-left: 3px solid var(--accent); }
        .bubble { max-width: 75%; padding: 10px 14px; border-radius: 16px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
        .tag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .stat-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 20px; transition: all 0.2s; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
        select { appearance: none; }
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-sidebar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; background: var(--bg2); border-top: 1px solid var(--border); display: flex; justify-content: space-around; padding: 8px 0 env(safe-area-inset-bottom); }
          .mobile-nav-item { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 16px; border-radius: 10px; cursor: pointer; font-size: 10px; color: var(--text2); }
          .mobile-nav-item.active { color: var(--accent); }
        }
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
        }
      `}</style>

      {/* DESKTOP LAYOUT */}
      <div className="desktop-only" style={{ display:"flex", flex:1, overflow:"hidden" }}>
        {/* Sidebar */}
        <div style={{ width:240, background:dark?"#13161f":"#ffffff", borderRight:`1px solid var(--border)`, display:"flex", flexDirection:"column", padding:"20px 12px", flexShrink:0 }}>
          <div style={{ padding:"8px 12px 24px" }}>
            <div style={{ fontSize:20, fontWeight:800, background:"linear-gradient(135deg, var(--accent), var(--accent2))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>DND Boutique</div>
            <div style={{ fontSize:11, color:"var(--text3)", marginTop:2 }}>CRM · WhatsApp IA</div>
          </div>
          <nav style={{ display:"flex", flexDirection:"column", gap:4, flex:1 }}>
            {NAV.map(item => (
              <div key={item.id} className={`nav-item ${section===item.id?"active":""}`} onClick={() => setSection(item.id)}>
                <span style={{ fontSize:18 }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.id==="conversations" && totalUnread>0 && <span style={{ marginLeft:"auto", background:"var(--accent)", color:"white", fontSize:10, fontWeight:700, borderRadius:20, padding:"1px 7px" }}>{totalUnread}</span>}
              </div>
            ))}
          </nav>
          <div style={{ borderTop:`1px solid var(--border)`, paddingTop:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, color:"var(--text3)" }}>Modo {dark?"oscuro":"claro"}</span>
            <button onClick={() => setDark(!dark)} style={{ background:"var(--bg3)", border:`1px solid var(--border)`, borderRadius:20, padding:"4px 12px", cursor:"pointer", fontSize:16 }}>{dark?"☀️":"🌙"}</button>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ padding:"16px 28px", borderBottom:`1px solid var(--border)`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--bg2)" }}>
            <div>
              <h1 style={{ fontSize:20, fontWeight:700 }}>{NAV.find(n=>n.id===section)?.label}</h1>
              <p style={{ fontSize:11, color:"var(--text3)" }}>{new Date().toLocaleDateString("es-SV",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--accent3)", boxShadow:"0 0 8px var(--accent3)" }} />
              <span style={{ fontSize:12, color:"var(--accent3)", fontWeight:500 }}>Firebase + N8N activos</span>
            </div>
          </div>
          <div style={{ flex:1, overflow:"auto", padding: section==="conversations"?0:"28px" }} className="anim">
            <MainContent section={section} clients={clients} combos={setCombos.bind(null)} combosData={combos} conversations={conversations} convList={convList} selectedPhone={selectedPhone} setSelectedPhone={setSelectedPhone} newMsg={newMsg} setNewMsg={setNewMsg} enviarMensaje={enviarMensaje} toggleBot={toggleBot} chatEndRef={chatEndRef} totalVentas={totalVentas} conversion={conversion} totalUnread={totalUnread} showAddClient={showAddClient} setShowAddClient={setShowAddClient} showAddCombo={showAddCombo} setShowAddCombo={setShowAddCombo} newClient={newClient} setNewClient={setNewClient} newCombo={newCombo} setNewCombo={setNewCombo} addCombo={addCombo} addClient={addClient} updateClientStatus={updateClientStatus} setCombos={setCombos} db={db} dark={dark} />
          </div>
        </div>
      </div>

      {/* MOBILE LAYOUT */}
      <div className="mobile-only" style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"16px 20px 12px", background:"var(--bg2)", borderBottom:`1px solid var(--border)`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:18, fontWeight:800, background:"linear-gradient(135deg, var(--accent), var(--accent2))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            {section==="conversations" && selectedPhone ? "← Chat" : NAV.find(n=>n.id===section)?.label}
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            {section==="conversations" && selectedPhone && <button className="btn-ghost" style={{ fontSize:11, padding:"6px 12px" }} onClick={() => setSelectedPhone(null)}>Volver</button>}
            <button onClick={() => setDark(!dark)} style={{ background:"var(--bg3)", border:`1px solid var(--border)`, borderRadius:20, padding:"4px 10px", cursor:"pointer", fontSize:16 }}>{dark?"☀️":"🌙"}</button>
          </div>
        </div>

        <div style={{ flex:1, overflow:"auto", padding: section==="conversations"?0:"16px", paddingBottom: section==="conversations"?"60px":"76px" }} className="anim">
          <MainContent section={section} clients={clients} combos={setCombos.bind(null)} combosData={combos} conversations={conversations} convList={convList} selectedPhone={selectedPhone} setSelectedPhone={setSelectedPhone} newMsg={newMsg} setNewMsg={setNewMsg} enviarMensaje={enviarMensaje} toggleBot={toggleBot} chatEndRef={chatEndRef} totalVentas={totalVentas} conversion={conversion} totalUnread={totalUnread} showAddClient={showAddClient} setShowAddClient={setShowAddClient} showAddCombo={showAddCombo} setShowAddCombo={setShowAddCombo} newClient={newClient} setNewClient={setNewClient} newCombo={newCombo} setNewCombo={setNewCombo} addCombo={addCombo} addClient={addClient} updateClientStatus={updateClientStatus} setCombos={setCombos} db={db} dark={dark} mobile={true} />
        </div>

        <div className="mobile-sidebar">
          {NAV.map(item => (
            <div key={item.id} className={`mobile-nav-item ${section===item.id?"active":""}`} onClick={() => { setSection(item.id); setSelectedPhone(null); }}>
              <span style={{ fontSize:22, position:"relative" }}>
                {item.icon}
                {item.id==="conversations" && totalUnread>0 && <span style={{ position:"absolute", top:-4, right:-4, background:"var(--accent)", color:"white", fontSize:9, fontWeight:700, borderRadius:"50%", width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center" }}>{totalUnread}</span>}
              </span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MainContent({ section, clients, combosData, conversations, convList, selectedPhone, setSelectedPhone, newMsg, setNewMsg, enviarMensaje, toggleBot, chatEndRef, totalVentas, conversion, totalUnread, showAddClient, setShowAddClient, showAddCombo, setShowAddCombo, newClient, setNewClient, newCombo, setNewCombo, addCombo, addClient, updateClientStatus, setCombos, db, dark, mobile }) {

  // DASHBOARD
  if (section === "dashboard") return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns: mobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {[
          { label:"Clientes", value:clients.length, icon:"👥", color:"var(--accent)" },
          { label:"Cerradas", value:clients.filter(c=>c.status==="Cerrado").length, icon:"✅", color:"var(--accent3)" },
          { label:"Ingresos", value:`$${totalVentas}`, icon:"💵", color:"#f59e0b" },
          { label:"Conversión", value:`${conversion}%`, icon:"📈", color:"var(--accent2)" },
        ].map((s,i) => (
          <div key={i} className="stat-card">
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:10, color:"var(--text3)", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>{s.label}</span>
              <span style={{ fontSize:20 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize:mobile?22:28, fontWeight:800, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap:14 }}>
        <div className="card" style={{ padding:20 }}>
          <h3 style={{ fontSize:13, fontWeight:700, marginBottom:16, color:"var(--text2)" }}>Pipeline de ventas</h3>
          {STATUSES.map(status => {
            const count = clients.filter(c=>c.status===status).length;
            const pct = clients.length ? (count/clients.length)*100 : 0;
            const m = STATUS_META[status];
            return (
              <div key={status} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span className="tag" style={{ background:m.bg, color:m.text }}><span style={{ width:6, height:6, borderRadius:"50%", background:m.dot, display:"inline-block" }} />{status}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"var(--text2)" }}>{count}</span>
                </div>
                <div style={{ height:4, background:"var(--bg3)", borderRadius:4, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg, var(--accent), var(--accent2))`, borderRadius:4, transition:"width 0.6s" }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="card" style={{ padding:20 }}>
          <h3 style={{ fontSize:13, fontWeight:700, marginBottom:16, color:"var(--text2)" }}>Combos activos</h3>
          {combosData.filter(c=>c.activo).map(combo => (
            <div key={combo.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"var(--bg3)", borderRadius:10, marginBottom:8 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600 }}>🌸 {combo.nombre}</div>
                <div style={{ fontSize:11, color:"var(--text3)" }}>{combo.descripcion}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:15, fontWeight:800, color:"var(--accent3)" }}>${combo.precio}</div>
                <div style={{ fontSize:10, color:"var(--text3)" }}>stock: {combo.stock}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // CONVERSACIONES
  if (section === "conversations") {
    if (mobile && !selectedPhone) return (
      <div>
        {convList.length === 0 && <div style={{ textAlign:"center", padding:"60px 20px", color:"var(--text3)" }}><div style={{ fontSize:48, marginBottom:12 }}>💬</div><div>Los mensajes de WhatsApp aparecerán aquí</div></div>}
        {convList.map(conv => (
          <div key={conv.telefono} className="conv-item" onClick={() => setSelectedPhone(conv.telefono)}>
            <div style={{ display:"flex", gap:12, alignItems:"center" }}>
              <div style={{ width:46, height:46, borderRadius:"50%", background:"linear-gradient(135deg, var(--accent), var(--accent2))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700, flexShrink:0 }}>{conv.nombre[0]}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:14, fontWeight:600 }}>{conv.nombre}</span>
                  <span style={{ fontSize:11, color:"var(--text3)" }}>{conv.ultimoTiempo}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, color:"var(--text3)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:200 }}>{conv.ultimoMsg}</span>
                  {conv.sinLeer>0 && <span style={{ background:"var(--accent)", color:"white", fontSize:10, fontWeight:700, borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{conv.sinLeer}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );

    if (mobile && selectedPhone) {
      const conv = conversations[selectedPhone] || { mensajes:[], botActivo:true };
      return (
        <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
          <div style={{ padding:"10px 16px", background:"var(--bg2)", borderBottom:`1px solid var(--border)`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg, var(--accent), var(--accent2))", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>{(conv.nombre||selectedPhone)[0]}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:600 }}>{conv.nombre||selectedPhone}</div>
                <div style={{ fontSize:11, color:"var(--text3)" }}>+{selectedPhone}</div>
              </div>
            </div>
            <span style={{ fontSize:11, padding:"4px 10px", borderRadius:20, background:conv.botActivo?"rgba(244,114,182,.15)":"rgba(245,158,11,.15)", color:conv.botActivo?"var(--accent)":"#f59e0b", fontWeight:600, cursor:"pointer" }} onClick={() => toggleBot(selectedPhone)}>
              {conv.botActivo?"🤖 Bot":"👤 Tú"}
            </span>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:10 }}>
            {(conv.mensajes||[]).map((msg,i) => (
              <div key={i} style={{ display:"flex", justifyContent:msg.from==="client"?"flex-start":"flex-end" }}>
                <div className="bubble" style={{ background:msg.from==="client"?"var(--bg3)":msg.from==="bot"?"rgba(167,139,250,.15)":"linear-gradient(135deg,var(--accent),var(--accent2))", color:msg.from==="user"?"white":"var(--text)", border:msg.from==="client"?`1px solid var(--border)`:msg.from==="bot"?`1px solid rgba(167,139,250,.3)`:"none" }}>
                  {msg.from==="bot"&&<div style={{ fontSize:10, color:"var(--accent2)", fontWeight:700, marginBottom:3 }}>🤖 BOT</div>}
                  {msg.texto}
                  <div style={{ fontSize:10, color:msg.from==="user"?"rgba(255,255,255,.7)":"var(--text3)", marginTop:4, textAlign:"right" }}>{msg.tiempo}</div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding:"10px 16px", background:"var(--bg2)", borderTop:`1px solid var(--border)`, display:"flex", gap:10, position:"sticky", bottom:0 }}>
            <input className="input" value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&enviarMensaje()} placeholder="Escribe un mensaje..." style={{ flex:1 }} />
            <button className="btn-primary" onClick={enviarMensaje} style={{ padding:"10px 16px" }}>→</button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display:"flex", height:"100%" }}>
        <div style={{ width:300, borderRight:`1px solid var(--border)`, overflowY:"auto", flexShrink:0 }}>
          <div style={{ padding:14, borderBottom:`1px solid var(--border)` }}>
            <input className="input" placeholder="🔍 Buscar conversación..." />
          </div>
          {convList.length===0&&<div style={{ padding:40, textAlign:"center", color:"var(--text3)" }}><div style={{ fontSize:40, marginBottom:8 }}>💬</div>Sin conversaciones aún</div>}
          {convList.map(conv => (
            <div key={conv.telefono} className={`conv-item ${selectedPhone===conv.telefono?"active":""}`} onClick={() => setSelectedPhone(conv.telefono)}>
              <div style={{ display:"flex", gap:10 }}>
                <div style={{ width:42, height:42, borderRadius:"50%", background:"linear-gradient(135deg, var(--accent), var(--accent2))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, flexShrink:0 }}>{conv.nombre[0]}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:13, fontWeight:600 }}>{conv.nombre}</span>
                    <span style={{ fontSize:10, color:"var(--text3)" }}>{conv.ultimoTiempo}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:12, color:"var(--text3)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:150 }}>{conv.ultimoMsg}</span>
                    <div style={{ display:"flex", gap:4 }}>
                      {conv.botActivo&&<span style={{ fontSize:9, color:"var(--accent)", background:"rgba(244,114,182,.15)", padding:"1px 6px", borderRadius:4, fontWeight:700 }}>BOT</span>}
                      {conv.sinLeer>0&&<span style={{ background:"var(--accent)", color:"white", fontSize:10, fontWeight:700, borderRadius:"50%", width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center" }}>{conv.sinLeer}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {selectedPhone ? (() => {
          const conv = conversations[selectedPhone]||{mensajes:[],botActivo:true};
          return (
            <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
              <div style={{ padding:"14px 20px", borderBottom:`1px solid var(--border)`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--bg2)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg, var(--accent), var(--accent2))", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>{(conv.nombre||selectedPhone)[0]}</div>
                  <div><div style={{ fontSize:14, fontWeight:600 }}>{conv.nombre||selectedPhone}</div><div style={{ fontSize:11, color:"var(--text3)" }}>+{selectedPhone}</div></div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ fontSize:12, padding:"5px 12px", borderRadius:20, background:conv.botActivo?"rgba(244,114,182,.15)":"rgba(245,158,11,.15)", color:conv.botActivo?"var(--accent)":"#f59e0b", fontWeight:600 }}>{conv.botActivo?"🤖 Bot activo":"👤 Tú atiendes"}</span>
                  <button className="btn-ghost" style={{ fontSize:12 }} onClick={()=>toggleBot(selectedPhone)}>{conv.botActivo?"Tomar control":"Activar bot"}</button>
                </div>
              </div>
              <div style={{ flex:1, overflowY:"auto", padding:24, display:"flex", flexDirection:"column", gap:12 }}>
                {(conv.mensajes||[]).length===0&&<div style={{ textAlign:"center", color:"var(--text3)", marginTop:60 }}>Sin mensajes aún</div>}
                {(conv.mensajes||[]).map((msg,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:msg.from==="client"?"flex-start":"flex-end" }}>
                    <div className="bubble" style={{ background:msg.from==="client"?"var(--bg3)":msg.from==="bot"?"rgba(167,139,250,.15)":"linear-gradient(135deg,var(--accent),var(--accent2))", color:msg.from==="user"?"white":"var(--text)", border:msg.from==="client"?`1px solid var(--border)`:msg.from==="bot"?`1px solid rgba(167,139,250,.3)`:"none" }}>
                      {msg.from==="bot"&&<div style={{ fontSize:10, color:"var(--accent2)", fontWeight:700, marginBottom:3 }}>🤖 BOT · N8N</div>}
                      {msg.texto}
                      <div style={{ fontSize:10, color:msg.from==="user"?"rgba(255,255,255,.7)":"var(--text3)", marginTop:4, textAlign:"right" }}>{msg.tiempo}</div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div style={{ padding:"14px 20px", borderTop:`1px solid var(--border)`, display:"flex", gap:10, background:"var(--bg2)" }}>
                <input className="input" value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&enviarMensaje()} placeholder="Escribe un mensaje..." style={{ flex:1 }} />
                <button className="btn-primary" onClick={enviarMensaje}>Enviar →</button>
              </div>
            </div>
          );
        })() : <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, color:"var(--text3)" }}><div style={{ fontSize:56 }}>💬</div><div style={{ fontSize:15 }}>Selecciona una conversación</div></div>}
      </div>
    );
  }

  // CLIENTES
  if (section === "clients") return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20, gap:12, flexWrap:"wrap" }}>
        <input className="input" placeholder="🔍 Buscar cliente..." style={{ maxWidth:280 }} />
        <button className="btn-primary" onClick={()=>setShowAddClient(true)}>+ Nuevo cliente</button>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {clients.map(client => {
          const m = STATUS_META[client.status||"Nuevo"];
          return (
            <div key={client.id} className="card" style={{ padding:"14px 20px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
              <div style={{ width:42, height:42, borderRadius:"50%", background:"linear-gradient(135deg, var(--accent), var(--accent2))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, flexShrink:0 }}>{client.nombre[0]}</div>
              <div style={{ flex:1, minWidth:120 }}>
                <div style={{ fontSize:14, fontWeight:600 }}>{client.nombre}</div>
                <div style={{ fontSize:12, color:"var(--text3)" }}>{client.telefono}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                {client.totalGastado>0&&<span style={{ fontSize:14, fontWeight:800, color:"var(--accent3)" }}>${client.totalGastado}</span>}
                <span className="tag" style={{ background:m.bg, color:m.text }}><span style={{ width:6, height:6, borderRadius:"50%", background:m.dot, display:"inline-block" }} />{client.status||"Nuevo"}</span>
                <select className="input" value={client.status||"Nuevo"} style={{ width:130, fontSize:12 }} onChange={e=>updateClientStatus(client.id,e.target.value)}>
                  {STATUSES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          );
        })}
      </div>
      {showAddClient&&(
        <div className="modal-overlay" onClick={()=>setShowAddClient(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>Nuevo cliente</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <input className="input" placeholder="Nombre completo" value={newClient.nombre} onChange={e=>setNewClient({...newClient,nombre:e.target.value})} />
              <input className="input" placeholder="Teléfono (+503...)" value={newClient.telefono} onChange={e=>setNewClient({...newClient,telefono:e.target.value})} />
              <select className="input" value={newClient.status} onChange={e=>setNewClient({...newClient,status:e.target.value})}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
              <textarea className="input" placeholder="Notas..." rows={3} style={{ resize:"none" }} value={newClient.notas} onChange={e=>setNewClient({...newClient,notas:e.target.value})} />
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                <button className="btn-ghost" onClick={()=>setShowAddClient(false)} style={{ flex:1 }}>Cancelar</button>
                <button className="btn-primary" onClick={addClient} style={{ flex:1 }}>Agregar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // COMBOS
  if (section === "combos") return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <p style={{ fontSize:13, color:"var(--text3)", alignSelf:"center" }}>{combosData.filter(c=>c.activo).length} activos · {combosData.length} total</p>
        <button className="btn-primary" onClick={()=>setShowAddCombo(true)}>+ Nuevo combo</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr" : "repeat(auto-fill,minmax(240px,1fr))", gap:16 }}>
        {combosData.map(combo => (
          <div key={combo.id} className="card" style={{ padding:20, opacity:combo.activo?1:0.6 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ fontSize:32 }}>🌸</span>
              <span style={{ fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:20, background:combo.activo?"var(--tag-green-bg)":"var(--bg3)", color:combo.activo?"var(--tag-green)":"var(--text3)" }}>{combo.activo?"ACTIVO":"INACTIVO"}</span>
            </div>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>{combo.nombre}</h3>
            <p style={{ fontSize:12, color:"var(--text3)", marginBottom:16 }}>{combo.descripcion}</p>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <span style={{ fontSize:24, fontWeight:800, color:"var(--accent3)" }}>${combo.precio}</span>
              <span style={{ fontSize:12, color:"var(--text3)" }}>stock: {combo.stock}</span>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn-ghost" style={{ flex:1, fontSize:12 }} onClick={()=>updateDoc(doc(db,"combos",combo.id),{activo:!combo.activo})}>{combo.activo?"Desactivar":"Activar"}</button>
              <button className="btn-danger" onClick={()=>deleteDoc(doc(db,"combos",combo.id))}>🗑</button>
            </div>
          </div>
        ))}
      </div>
      {showAddCombo&&(
        <div className="modal-overlay" onClick={()=>setShowAddCombo(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>Nuevo combo</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <input className="input" placeholder="Nombre del combo" value={newCombo.nombre} onChange={e=>setNewCombo({...newCombo,nombre:e.target.value})} />
              <input className="input" placeholder="Descripción" value={newCombo.descripcion} onChange={e=>setNewCombo({...newCombo,descripcion:e.target.value})} />
              <input className="input" placeholder="Precio ($)" type="number" value={newCombo.precio} onChange={e=>setNewCombo({...newCombo,precio:e.target.value})} />
              <input className="input" placeholder="Stock disponible" type="number" value={newCombo.stock} onChange={e=>setNewCombo({...newCombo,stock:e.target.value})} />
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                <button className="btn-ghost" onClick={()=>setShowAddCombo(false)} style={{ flex:1 }}>Cancelar</button>
                <button className="btn-primary" onClick={addCombo} style={{ flex:1 }}>Agregar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // PIPELINE
  if (section === "pipeline") return (
    <div>
      <p style={{ fontSize:13, color:"var(--text3)", marginBottom:20 }}>Vista kanban por etapa de venta</p>
      <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:8 }}>
        {STATUSES.map(status => {
          const m = STATUS_META[status];
          const sc = clients.filter(c=>c.status===status);
          return (
            <div key={status} style={{ minWidth: mobile ? 200 : 180, flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, padding:"8px 14px", background:m.bg, borderRadius:12 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:m.dot, display:"inline-block" }} />
                <span style={{ fontSize:12, fontWeight:700, color:m.text }}>{status}</span>
                <span style={{ marginLeft:"auto", fontSize:11, color:m.text, opacity:.7 }}>{sc.length}</span>
              </div>
              {sc.map(client => (
                <div key={client.id} className="card" style={{ padding:12, marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg, var(--accent), var(--accent2))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700 }}>{client.nombre[0]}</div>
                    <span style={{ fontSize:12, fontWeight:600 }}>{client.nombre}</span>
                  </div>
                  <div style={{ fontSize:11, color:"var(--text3)" }}>{client.telefono}</div>
                  {client.totalGastado>0&&<div style={{ fontSize:13, fontWeight:700, color:"var(--accent3)", marginTop:6 }}>${client.totalGastado}</div>}
                </div>
              ))}
              {sc.length===0&&<div style={{ padding:"20px 12px", textAlign:"center", color:"var(--text3)", fontSize:12, border:`1px dashed var(--border)`, borderRadius:12 }}>Vacío</div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  return null;
}
