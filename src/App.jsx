import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  collection, doc, onSnapshot, setDoc, updateDoc,
  deleteDoc, addDoc, serverTimestamp
} from "firebase/firestore";

const BACKEND = "https://dnd-boutique-backend-production.up.railway.app";

const STATUS_META = {
  "Nuevo":      { bg:"rgba(59,130,246,.08)",  text:"#60a5fa", dot:"#3b82f6" },
  "Interesado": { bg:"rgba(245,158,11,.08)",  text:"#fbbf24", dot:"#f59e0b" },
  "Cotizado":   { bg:"rgba(139,92,246,.08)",  text:"#a78bfa", dot:"#8b5cf6" },
  "Cerrado":    { bg:"rgba(52,211,153,.08)",  text:"#34d399", dot:"#10b981" },
  "Perdido":    { bg:"rgba(239,68,68,.08)",   text:"#f87171", dot:"#ef4444" },
};
const STATUSES = ["Nuevo","Interesado","Cotizado","Cerrado","Perdido"];
const NAV = [
  { id:"dashboard",     icon:"⬡", label:"Dashboard" },
  { id:"conversations", icon:"◎", label:"Chats" },
  { id:"clients",       icon:"◈", label:"Clientes" },
  { id:"combos",        icon:"◇", label:"Combos" },
  { id:"pipeline",      icon:"◫", label:"Pipeline" },
];

const PREFIJOS = [
  { code:"+503", flag:"🇸🇻", name:"El Salvador" },
  { code:"+502", flag:"🇬🇹", name:"Guatemala" },
  { code:"+504", flag:"🇭🇳", name:"Honduras" },
  { code:"+505", flag:"🇳🇮", name:"Nicaragua" },
  { code:"+506", flag:"🇨🇷", name:"Costa Rica" },
  { code:"+507", flag:"🇵🇦", name:"Panamá" },
  { code:"+52",  flag:"🇲🇽", name:"México" },
  { code:"+1",   flag:"🇺🇸", name:"EE.UU / Canadá" },
  { code:"+57",  flag:"🇨🇴", name:"Colombia" },
  { code:"+51",  flag:"🇵🇪", name:"Perú" },
  { code:"+58",  flag:"🇻🇪", name:"Venezuela" },
  { code:"+56",  flag:"🇨🇱", name:"Chile" },
  { code:"+54",  flag:"🇦🇷", name:"Argentina" },
  { code:"+34",  flag:"🇪🇸", name:"España" },
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html,body,#root{height:100%;overflow:hidden;background-color:var(--bg);}
  
  /* Tipografía base fluida e impecable */
  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-thumb{background:rgba(148, 163, 184, 0.2);border-radius:10px;}
  ::-webkit-scrollbar-thumb:hover{background:rgba(148, 163, 184, 0.4);}
  
  /* Animaciones cinemáticas suaves */
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes popIn{from{transform:scale(.97);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
  
  .fade-up{animation:fadeUp .35s cubic-bezier(0.16, 1, 0.3, 1) both;}
  .fade-in{animation:fadeIn .25s ease both;}
  .pop-in{animation:popIn .3s cubic-bezier(0.34, 1.56, 0.64, 1) both;}
  .shake{animation:shake .3s ease;}
  
  /* Elementos de Navegación Lateral */
  .nav-item{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;cursor:pointer;transition:all .2s cubic-bezier(0.4, 0, 0.2, 1);font-size:13px;font-weight:500;color:var(--text2);border:1px solid transparent;}
  .nav-item:hover{background:var(--bg3);color:var(--text);}
  .nav-item.active{background:linear-gradient(135deg,rgba(244,114,182,.08),rgba(167,139,250,.08));color:var(--accent);border-color:rgba(244,114,182,.15);font-weight:600;}
  
  /* Tarjetas minimalistas con elevación sutil */
  .card{background:var(--bg2);border:1px solid var(--border);border-radius:16px;transition:all .25s cubic-bezier(0.4, 0, 0.2, 1);box-shadow:0 2px 12px rgba(0,0,0,0.015);}
  .card:hover{border-color:rgba(244,114,182,.2);box-shadow:0 12px 30px rgba(0,0,0,.035);}
  
  /* Botones modernos */
  .btn{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:12px;border:none;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;transition:all .2s cubic-bezier(0.4, 0, 0.2, 1);white-space:nowrap;}
  .btn-primary{background:linear-gradient(135deg,#f472b6,#a78bfa);color:white;box-shadow:0 4px 14px rgba(244,114,182,.2);}
  .btn-primary:hover{opacity:.95;transform:translateY(-1px);box-shadow:0 6px 20px rgba(244,114,182,.3);}
  .btn-ghost{background:var(--bg3);color:var(--text2);border:1px solid var(--border);}
  .btn-ghost:hover{color:var(--text);border-color:rgba(244,114,182,.25);background:var(--bg2);}
  .btn-danger{background:rgba(239,68,68,.05);color:#f87171;border:1px solid rgba(239,68,68,.15);}
  .btn-danger:hover{background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.25);}
  .btn-warning{background:rgba(245,158,11,.05);color:#fbbf24;border:1px solid rgba(245,158,11,.15);}
  .btn-sm{padding:6px 12px;font-size:11px;border-radius:8px;}
  .btn-icon{padding:8px;aspect-ratio:1;justify-content:center;}
  
  /* Controles de Entrada */
  .input{background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:10px 14px;color:var(--text);font-size:13px;font-family:inherit;width:100%;transition:all .2s;outline:none;}
  .input:focus{border-color:var(--accent);background:var(--bg2);box-shadow:0 0 0 3px rgba(244,114,182,.08);}
  .input::placeholder{color:var(--text3);}
  .input-error{border-color:#ef4444!important;box-shadow:0 0 0 3px rgba(239,68,68,.08)!important;}
  .phone-row{display:flex;gap:10px;}
  .prefix-select{background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:10px;color:var(--text);font-size:13px;font-family:inherit;transition:all .2s;outline:none;cursor:pointer;flex-shrink:0;width:140px;}
  .prefix-select:focus{border-color:var(--accent);}
  
  /* Lista de Chat y Burbujas */
  .conv-item{padding:14px 18px;cursor:pointer;border-bottom:1px solid var(--border);transition:all .2s cubic-bezier(0.4, 0, 0.2, 1);position:relative;}
  .conv-item:hover{background:var(--bg3);}
  .conv-item.active{background:var(--bg3);}
  .conv-item.active::before{content:'';position:absolute;left:0;top:10%;bottom:10%;width:3px;background:linear-gradient(180deg,#f472b6,#a78bfa);border-radius:0 4px 4px 0;}
  .bubble{max-width:70%;padding:10px 15px;border-radius:16px;font-size:13px;line-height:1.55;white-space:pre-wrap;word-break:break-word;box-shadow:0 1px 3px rgba(0,0,0,0.01);}
  .tag{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;}
  
  /* Modales Estilo Glassmorphism */
  .modal-overlay{position:fixed;inset:0;background:rgba(9,11,18,.45);display:flex;align-items:center;justify-content:center;z-index:300;backdrop-filter:blur(8px);padding:16px;animation:fadeIn .25s ease;}
  .modal{background:var(--bg2);border:1px solid var(--border);border-radius:20px;padding:28px;width:100%;max-width:440px;box-shadow:0 24px 60px rgba(0,0,0,.15);animation:popIn .3s cubic-bezier(0.34,1.56,.64,1);}
  .alert-modal{max-width:380px;}
  
  /* Notificaciones Flotantes */
  .notif{position:fixed;top:24px;right:24px;z-index:999;background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px 20px;box-shadow:0 12px 36px rgba(0,0,0,.08);display:flex;align-items:center;gap:12px;font-size:13px;animation:fadeUp .3s cubic-bezier(0.16, 1, 0.3, 1);min-width:280px;}
  select option{background:var(--bg2); color:var(--text);}
  
  @media(max-width:768px){
    .desktop-sidebar{display:none!important;}
    .mobile-tabbar{position:fixed;bottom:0;left:0;right:0;z-index:100;background:var(--bg2);border-top:1px solid var(--border);display:flex;justify-content:space-around;padding:10px 0 env(safe-area-inset-bottom,10px);}
    .mobile-tab{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 14px;border-radius:10px;cursor:pointer;font-size:10px;font-weight:500;color:var(--text3);}
    .mobile-tab.active{color:var(--accent);}
    .mobile-tab-icon{font-size:18px;}
  }
  @media(min-width:769px){
    .mobile-tabbar{display:none!important;}
    .mobile-only{display:none!important;}
  }
`;

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
  const [showEditCombo, setShowEditCombo] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showEditChat, setShowEditChat] = useState(false);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [newClient, setNewClient] = useState({ nombre:"", telefono:"", status:"Nuevo", notas:"" });
  const [newCombo, setNewCombo] = useState({ nombre:"", descripcion:"", precio:"", stock:"" });
  const [editCombo, setEditCombo] = useState({ nombre:"", descripcion:"", precio:"", stock:"" });
  const [newChatPrefijo, setNewChatPrefijo] = useState("+503");
  const [newChatNumero, setNewChatNumero] = useState("");
  const [newChatNombre, setNewChatNombre] = useState("");
  const [newChatMsg, setNewChatMsg] = useState("");
  const [newChatError, setNewChatError] = useState("");
  const [editChatData, setEditChatData] = useState({ nombre:"", notas:"", status:"Nuevo" });
  const [searchConv, setSearchConv] = useState("");
  const [notif, setNotif] = useState(null);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef(null);
  const prevMsgCount = useRef({});
  const notifTimer = useRef(null);

  const resetNewChatFields = () => {
    setNewChatNumero("");
    setNewChatNombre("");
    setNewChatMsg("");
    setNewChatPrefijo("+503");
    setNewChatError("");
  };

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, "combos"), snap => {
        const data = snap.docs.map(d => ({ id:d.id, ...d.data() }));
        if (data.length === 0) seedCombos();
        else setCombos(data);
        setLoading(false);
      }),
      onSnapshot(collection(db, "clientes"), snap =>
        setClients(snap.docs.map(d => ({ id:d.id, ...d.data() })))
      ),
      onSnapshot(collection(db, "conversaciones"), snap => {
        const c = {};
        snap.docs.forEach(d => { c[d.id] = d.data(); });
        setConversations(prev => {
          Object.entries(c).forEach(([tel, conv]) => {
            const prevConv = prev[tel];
            const prevLen = prevConv?.mensajes?.length || 0;
            const currLen = conv?.mensajes?.length || 0;
            const lastMsg = conv?.mensajes?.[currLen - 1];
            if (currLen > prevLen && lastMsg?.from === "client" && tel !== selectedPhone) {
              showNotif(`📩 ${conv.nombre || tel}`, lastMsg.texto?.slice(0, 60));
            }
          });
          return c;
        });
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [selectedPhone]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const showNotif = (title, body) => {
    setNotif({ title, body });
    if (notifTimer.current) clearTimeout(notifTimer.current);
    notifTimer.current = setTimeout(() => setNotif(null), 4000);
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  };

  useEffect(() => { scrollBottom("instant"); }, [selectedPhone]);

  useEffect(() => {
    if (!selectedPhone) return;
    const curr = conversations[selectedPhone]?.mensajes?.length || 0;
    const prev = prevMsgCount.current[selectedPhone] || 0;
    if (curr !== prev) {
      scrollBottom("smooth");
      prevMsgCount.current[selectedPhone] = curr;
    }
  }, [conversations, selectedPhone]);

  useEffect(() => {
    if (!selectedPhone) return;
    const conv = conversations[selectedPhone];
    if (conv?.sinLeer > 0) {
      setDoc(doc(db, "conversaciones", selectedPhone), { sinLeer: 0 }, { merge:true });
    }
  }, [selectedPhone]);

  const scrollBottom = (behavior="smooth") =>
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior, block:"end" }), 60);

  const seedCombos = async () => {
    for (const c of [
      { nombre:"Combo Dúo", descripcion:"2 perfumes a elegir", precio:25, stock:15, activo:true },
      { nombre:"Combo Trío", descripcion:"3 perfumes a elegir", precio:35, stock:10, activo:true },
      { nombre:"Combo Premium", descripcion:"2 perfumes línea premium", precio:45, stock:8, activo:true },
    ]) await addDoc(collection(db, "combos"), c);
  };

  const addCombo = async () => {
    if (!newCombo.nombre) return;
    await addDoc(collection(db, "combos"), {
      ...newCombo, precio:parseFloat(newCombo.precio)||0,
      stock:parseInt(newCombo.stock)||0, activo:true
    });
    setNewCombo({ nombre:"", descripcion:"", precio:"", stock:"" });
    setShowAddCombo(false);
  };

  const saveEditCombo = async () => {
    if (!showEditCombo) return;
    await updateDoc(doc(db, "combos", showEditCombo), {
      nombre: editCombo.nombre, descripcion: editCombo.descripcion,
      precio: parseFloat(editCombo.precio)||0, stock: parseInt(editCombo.stock)||0,
    });
    setShowEditCombo(null);
  };

  const addClient = async () => {
    if (!newClient.nombre) return;
    await addDoc(collection(db, "clientes"), { ...newClient, totalGastado:0, createdAt:serverTimestamp() });
    setNewClient({ nombre:"", telefono:"", status:"Nuevo", notas:"" });
    setShowAddClient(false);
  };

  const updateClientStatus = async (id, status) => updateDoc(doc(db, "clientes", id), { status });

  const enviarMensaje = async () => {
    if (!newMsg.trim() || !selectedPhone) return;
    const texto = newMsg.trim();
    const tiempo = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
    const conv = conversations[selectedPhone] || { mensajes:[] };
    const msgs = conv.mensajes || [];
    const ultimo = msgs[msgs.length-1];
    if (ultimo?.from === "user" && ultimo?.texto === texto) { setNewMsg(""); return; }
    const mensajes = [...msgs, { from:"user", texto, tiempo }];
    await setDoc(doc(db, "conversaciones", selectedPhone),
      { ...conv, mensajes, ultimoMsg:texto, ultimoTiempo:tiempo, sinLeer:0 }, { merge:true });
    try {
      await fetch(`${BACKEND}/api/enviar`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ telefono:selectedPhone, mensaje:texto })
      });
    } catch(e) { console.error(e); }
    setNewMsg("");
    scrollBottom("smooth");
  };

  const iniciarChat = async () => {
    setNewChatError("");
    const numLimpio = newChatNumero.replace(/\D/g,"");
    if (!numLimpio) { setNewChatError("Ingresa un número válido"); return; }
    if (numLimpio.length < 7) { setNewChatError("El número es demasiado corto"); return; }
    if (!newChatMsg.trim()) { setNewChatError("Escribe un mensaje para iniciar"); return; }

    const prefijoNum = newChatPrefijo.replace("+","");
    const tel = `${prefijoNum}${numLimpio}`;

    const existe = conversations[tel] || conversations[`+${tel}`];
    if (existe) {
      setShowDuplicateAlert(true);
      return;
    }

    const nombre = newChatNombre.trim() || tel;
    const tiempo = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
    
    await setDoc(doc(db, "conversaciones", tel), {
      nombre, mensajes:[{ from:"user", texto:newChatMsg, tiempo }],
      ultimoMsg:newChatMsg, ultimoTiempo:tiempo, botActivo:true, sinLeer:0
    }, { merge:true });

    const clienteExiste = clients.find(c => c.telefono===tel || c.telefono===`+${tel}`);
    if (!clienteExiste && nombre) {
      await addDoc(collection(db, "clientes"), {
        nombre, telefono:tel, status:"Nuevo",
        totalGastado:0, notas:"", createdAt:serverTimestamp()
      });
    }

    try {
      await fetch(`${BACKEND}/api/enviar`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ telefono:tel, mensaje:newChatMsg })
      });
    } catch(e) {}
    setSelectedPhone(tel);
    setSection("conversations");
    
    // Reset and Close
    resetNewChatFields();
    setShowNewChat(false);
  };

  const abrirEditChat = () => {
    if (!selectedPhone) return;
    const conv = conversations[selectedPhone] || {};
    const cliente = clients.find(c => c.telefono===selectedPhone || c.telefono===`+${selectedPhone}`);
    setEditChatData({
      nombre: conv.nombre || selectedPhone,
      notas: cliente?.notas || "",
      status: cliente?.status || "Nuevo",
    });
    setShowEditChat(true);
  };

  const guardarEditChat = async () => {
    if (!selectedPhone) return;
    await setDoc(doc(db, "conversaciones", selectedPhone), { nombre: editChatData.nombre }, { merge:true });
    const cliente = clients.find(c => c.telefono===selectedPhone || c.telefono===`+${selectedPhone}`);
    if (cliente) {
      await updateDoc(doc(db, "clientes", cliente.id), {
        nombre: editChatData.nombre,
        notas: editChatData.notas,
        status: editChatData.status,
      });
    }
    setShowEditChat(false);
  };

  const toggleBot = async (tel) => {
    const conv = conversations[tel] || {};
    const botActivo = !conv.botActivo;
    await setDoc(doc(db, "conversaciones", tel), { botActivo }, { merge:true });
    try {
      await fetch(`${BACKEND}/api/modo`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ telefono:tel, humano:!botActivo })
      });
    } catch(e) {}
  };

  const chatsUnread = Object.values(conversations).filter(c => (c.sinLeer||0) > 0).length;
  const totalVentas = clients.filter(c=>c.status==="Cerrado").reduce((a,c)=>a+(c.totalGastado||0),0);
  const conversion = clients.length ? Math.round(clients.filter(c=>c.status==="Cerrado").length/clients.length*100) : 0;

  const convList = Object.entries(conversations)
    .map(([tel,conv]) => ({
      telefono:tel, nombre:conv.nombre||tel,
      ultimoMsg:conv.ultimoMsg||"Sin mensajes",
      botActivo:conv.botActivo!==false,
      sinLeer:conv.sinLeer||0,
      ultimoTiempo:conv.ultimoTiempo||"",
      mensajes:conv.mensajes||[],
    }))
    .filter(c => {
      if (!searchConv) return true;
      const q = searchConv.toLowerCase();
      return c.nombre.toLowerCase().includes(q) || c.telefono.includes(q) || c.ultimoMsg.toLowerCase().includes(q);
    })
    .sort((a,b) => b.sinLeer - a.sinLeer);

  const theme = {
    "--bg":dark?"#090a0f":"#f8fafc",
    "--bg2":dark?"#0f111a":"#ffffff",
    "--bg3":dark?"#151824":"#f1f5f9",
    "--border":dark?"#1d2133":"#e2e8f0",
    "--text":dark?"#f1f3f9":"#0f172a",
    "--text2":dark?"#94a3b8":"#475569",
    "--text3":dark?"#475569":"#94a3b8",
    "--accent":"#f472b6",
    "--accent2":"#a78bfa",
    "--accent3":"#34d399",
  };

  if (loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0d0f18",flexDirection:"column",gap:14 }}>
      <style>{CSS}</style>
      <div style={{ width:40,height:40,border:"3px solid rgba(244,114,182,.2)",borderTop:"3px solid #f472b6",borderRadius:"50%",animation:"spin 1s linear infinite" }} />
      <div style={{ color:"#f472b6",fontFamily:"inherit",fontSize:13,fontWeight:600 }}>Cargando DND Boutique...</div>
    </div>
  );

  const shared = {
    clients,combos,conversations,convList,selectedPhone,setSelectedPhone,
    newMsg,setNewMsg,enviarMensaje,toggleBot,chatEndRef,totalVentas,conversion,
    chatsUnread,showAddClient,setShowAddClient,showAddCombo,setShowAddCombo,
    showEditCombo,setShowEditCombo,editCombo,setEditCombo,saveEditCombo,
    showNewChat,setShowNewChat,newClient,setNewClient,newCombo,setNewCombo,
    addCombo,addClient,updateClientStatus,setCombos,db,dark,scrollBottom,
    searchConv,setSearchConv,abrirEditChat,
  };

  return (
    <div style={{ ...theme,display:"flex",height:"100vh",background:"var(--bg)",fontFamily:"inherit",color:"var(--text)",overflow:"hidden" }}>
      <style>{CSS}</style>

      {/* Notificación flotante */}
      {notif && (
        <div className="notif">
          <span style={{ fontSize:20 }}>📩</span>
          <div>
            <div style={{ fontWeight:700,fontSize:13 }}>{notif.title}</div>
            <div style={{ fontSize:12,color:"var(--text3)",marginTop:2 }}>{notif.body}</div>
          </div>
          <button onClick={()=>setNotif(null)} style={{ marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"var(--text3)",fontSize:16 }}>✕</button>
        </div>
      )}

      {/* Modal nueva conversación */}
      {showNewChat && (
        <div className="modal-overlay" onClick={()=>{setShowNewChat(false); resetNewChatFields();}}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontSize:16,fontWeight:700,marginBottom:6 }}>Nueva conversación</h3>
            <p style={{ fontSize:12,color:"var(--text3)",marginBottom:20 }}>Completa los datos para iniciar el chat</p>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <input className="input" placeholder="Nombre del contacto (opcional)"
                value={newChatNombre} onChange={e=>setNewChatNombre(e.target.value)} />
              <div className="phone-row">
                <select className="prefix-select" value={newChatPrefijo} onChange={e=>setNewChatPrefijo(e.target.value)}>
                  {PREFIJOS.map(p => (
                    <option key={p.code} value={p.code}>{p.flag} {p.code} {p.name}</option>
                  ))}
                </select>
                <input className={`input ${newChatError&&!newChatNumero?"input-error":""}`}
                  placeholder="Número (sin prefijo)"
                  value={newChatNumero}
                  onChange={e=>setNewChatNumero(e.target.value.replace(/\D/g,""))}
                  style={{ flex:1 }} />
              </div>
              {newChatNumero && (
                <div style={{ fontSize:11,color:"var(--text3)",padding:"6px 12px",background:"var(--bg3)",borderRadius:8 }}>
                  📱 Número completo: <strong style={{ color:"var(--accent)" }}>+{newChatPrefijo.replace("+","")}{newChatNumero}</strong>
                </div>
              )}
              <textarea className={`input ${newChatError&&!newChatMsg.trim()?"input-error":""}`}
                placeholder="Mensaje inicial..." rows={3} style={{ resize:"none" }}
                value={newChatMsg} onChange={e=>setNewChatMsg(e.target.value)} />
              {newChatError && (
                <div style={{ fontSize:12,color:"#f87171",padding:"8px 12px",background:"rgba(239,68,68,.08)",borderRadius:8,border:"1px solid rgba(239,68,68,.2)" }}>
                  ⚠️ {newChatError}
                </div>
              )}
              <div style={{ display:"flex",gap:10,marginTop:4 }}>
                <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>{setShowNewChat(false); resetNewChatFields();}}>Cancelar</button>
                <button className="btn btn-primary" style={{ flex:1 }} onClick={iniciarChat}>Enviar →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal número duplicado */}
      {showDuplicateAlert && (
        <div className="modal-overlay" onClick={()=>setShowDuplicateAlert(false)}>
          <div className="modal alert-modal" onClick={e=>e.stopPropagation()}>
            <div style={{ textAlign:"center",marginBottom:16 }}>
              <div style={{ fontSize:36,marginBottom:8 }}>⚠️</div>
              <h3 style={{ fontSize:16,fontWeight:700,marginBottom:6 }}>Número ya existe</h3>
              <p style={{ fontSize:13,color:"var(--text3)",lineHeight:1.6 }}>
                Ya existe una conversación con el número <strong style={{ color:"var(--accent)" }}>+{newChatPrefijo.replace("+","")}{newChatNumero}</strong>. Búscala en la lista de chats.
              </p>
            </div>
            <button className="btn btn-primary" style={{ width:"100%",justifyContent:"center" }}
              onClick={()=>{
                setShowDuplicateAlert(false);
                setShowNewChat(false);
                resetNewChatFields();
                setSection("conversations");
                const tel = `${newChatPrefijo.replace("+","")}${newChatNumero}`;
                setSelectedPhone(tel);
              }}>
              Ir al chat →
            </button>
            <button className="btn btn-ghost" style={{ width:"100%",justifyContent:"center",marginTop:8 }}
              onClick={()=>setShowDuplicateAlert(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal editar chat */}
      {showEditChat && (
        <div className="modal-overlay" onClick={()=>setShowEditChat(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontSize:16,fontWeight:700,marginBottom:6 }}>Editar conversación</h3>
            <p style={{ fontSize:12,color:"var(--text3)",marginBottom:20 }}>El número no puede modificarse</p>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <div>
                <label style={{ fontSize:11,color:"var(--text3)",fontWeight:600,display:"block",marginBottom:6 }}>NOMBRE</label>
                <input className="input" placeholder="Nombre del contacto"
                  value={editChatData.nombre} onChange={e=>setEditChatData({...editChatData,nombre:e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize:11,color:"var(--text3)",fontWeight:600,display:"block",marginBottom:6 }}>NÚMERO</label>
                <input className="input" value={selectedPhone} disabled
                  style={{ opacity:.5,cursor:"not-allowed" }} />
              </div>
              <div>
                <label style={{ fontSize:11,color:"var(--text3)",fontWeight:600,display:"block",marginBottom:6 }}>ESTADO</label>
                <select className="input" value={editChatData.status}
                  onChange={e=>setEditChatData({...editChatData,status:e.target.value})}>
                  {STATUSES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11,color:"var(--text3)",fontWeight:600,display:"block",marginBottom:6 }}>NOTAS</label>
                <textarea className="input" placeholder="Notas sobre este cliente..." rows={3}
                  style={{ resize:"none" }} value={editChatData.notes}
                  onChange={e=>setEditChatData({...editChatData,notas:e.target.value})} />
              </div>
              <div style={{ display:"flex",gap:10,marginTop:4 }}>
                <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setShowEditChat(false)}>Cancelar</button>
                <button className="btn btn-primary" style={{ flex:1 }} onClick={guardarEditChat}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar combo */}
      {showEditCombo && (
        <div className="modal-overlay" onClick={()=>setShowEditCombo(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontSize:16,fontWeight:700,marginBottom:20 }}>Editar combo</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <input className="input" placeholder="Nombre" value={editCombo.nombre} onChange={e=>setEditCombo({...editCombo,nombre:e.target.value})} />
              <textarea className="input" placeholder="Descripción" rows={4} style={{ resize:"none" }} value={editCombo.descripcion} onChange={e=>setEditCombo({...editCombo,descripcion:e.target.value})} />
              <input className="input" placeholder="Precio ($)" type="number" value={editCombo.precio} onChange={e=>setEditCombo({...editCombo,precio:e.target.value})} />
              <input className="input" placeholder="Stock" type="number" value={editCombo.stock} onChange={e=>setEditCombo({...editCombo,stock:e.target.value})} />
              <div style={{ display:"flex",gap:10,marginTop:4 }}>
                <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setShowEditCombo(null)}>Cancelar</button>
                <button className="btn btn-primary" style={{ flex:1 }} onClick={saveEditCombo}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar de escritorio minimalista */}
      <aside className="desktop-sidebar" style={{ width:230,background:"var(--bg2)",borderRight:"1px solid var(--border)",display:"flex",flexDirection:"column",padding:"24px 16px",flexShrink:0 }}>
        <div style={{ padding:"6px 10px 26px" }}>
          <div style={{ fontSize:19,fontWeight:800,background:"linear-gradient(135deg,#f472b6,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>DND Boutique</div>
          <div style={{ fontSize:10,color:"var(--text3)",marginTop:2,letterSpacing:".8px",fontWeight:600 }}>CRM · WHATSAPP IA</div>
        </div>
        <nav style={{ display:"flex",flexDirection:"column",gap:4,flex:1 }}>
          {NAV.map(item => (
            <div key={item.id} className={`nav-item ${section===item.id?"active":""}`} onClick={()=>setSection(item.id)}>
              <span style={{ fontSize:15,opacity:.9 }}>{item.icon}</span>
              <span>{item.label}</span>
              {item.id==="conversations" && chatsUnread>0 && (
                <span style={{ marginLeft:"auto",background:"var(--accent)",color:"white",fontSize:10,fontWeight:700,borderRadius:20,padding:"1px 7px",minWidth:20,textAlign:"center" }}>{chatsUnread}</span>
              )}
            </div>
          ))}
        </nav>
        <button className="btn btn-primary" style={{ width:"100%",marginBottom:16,justifyContent:"center" }} onClick={()=>setShowNewChat(true)}>+ Nueva conversación</button>
        <div style={{ borderTop:"1px solid var(--border)",paddingTop:16,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <span style={{ fontSize:11,color:"var(--text3)" }}>{dark?"Modo oscuro":"Modo claro"}</span>
          <button onClick={()=>setDark(!dark)} style={{ background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:20,padding:"3px 12px",cursor:"pointer",fontSize:14 }}>{dark?"☀️":"🌙"}</button>
        </div>
      </aside>

      {/* Panel Principal */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden" }}>
        <header style={{ padding:"16px 24px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--bg2)",flexShrink:0 }}>
          <div>
            <h1 style={{ fontSize:18,fontWeight:700,letterSpacing:"-.3px" }}>{NAV.find(n=>n.id===section)?.label}</h1>
            <p style={{ fontSize:10,color:"var(--text3)",marginTop:1 }}>{new Date().toLocaleDateString("es-SV",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <button className="mobile-only" onClick={()=>setDark(!dark)} style={{ background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:20,padding:"3px 10px",cursor:"pointer",fontSize:14 }}>{dark?"☀️":"🌙"}</button>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <span style={{ width:7,height:7,borderRadius:"50%",background:"var(--accent3)",boxShadow:"0 0 8px var(--accent3)" }} />
              <span style={{ fontSize:11,color:"var(--accent3)",fontWeight:600 }}>Firebase + N8N activos</span>
            </div>
          </div>
        </header>
        <main style={{ flex:1,overflow:"auto",padding:section==="conversations"?0:"28px" }} className="fade-up">
          {section==="dashboard"     && <Dashboard {...shared} />}
          {section==="conversations" && <Conversations {...shared} showEditChat={showEditChat} setShowEditChat={setShowEditChat} abrirEditChat={abrirEditChat} />}
          {section==="clients"       && <Clients {...shared} />}
          {section==="combos"        && <Combos {...shared} />}
          {section==="pipeline"      && <Pipeline {...shared} />}
        </main>
      </div>

      {/* Tabbar para Móviles */}
      <div className="mobile-tabbar">
        {NAV.map(item => (
          <div key={item.id} className={`mobile-tab ${section===item.id?"active":""}`} onClick={()=>{setSection(item.id);setSelectedPhone(null);}}>
            <span className="mobile-tab-icon" style={{ position:"relative" }}>
              {item.icon}
              {item.id==="conversations" && chatsUnread>0 && (
                <span style={{ position:"absolute",top:-4,right:-4,background:"var(--accent)",color:"white",fontSize:8,fontWeight:700,borderRadius:"50%",width:14,height:14,display:"flex",alignItems:"center",justifyContent:"center" }}>{chatsUnread}</span>
              )}
            </span>
            <span>{item.label}</span>
          </div>
        ))}
        <div className="mobile-tab" onClick={()=>setShowNewChat(true)}>
          <span className="mobile-tab-icon">✦</span>
          <span>Nuevo</span>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ clients, combos, totalVentas, conversion, chatsUnread }) {
  return (
    <div style={{ maxWidth:960 }}>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:14,marginBottom:24 }}>
        {[
          { label:"Clientes",       value:clients.length,                                  icon:"◈", color:"var(--accent)" },
          { label:"Ventas cerradas",value:clients.filter(c=>c.status==="Cerrado").length,  icon:"✓", color:"var(--accent3)" },
          { label:"Ingresos",       value:`$${totalVentas}`,                               icon:"$", color:"#fbbf24" },
          { label:"Conversión",     value:`${conversion}%`,                                icon:"↑", color:"var(--accent2)" },
          { label:"Chats sin leer", value:chatsUnread,                                     icon:"◎", color:"var(--accent)" },
        ].map((s,i) => (
          <div key={i} className="card fade-up" style={{ padding:"20px 22px",animationDelay:`${i*.05}s` }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}>
              <span style={{ fontSize:10,color:"var(--text3)",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.2px" }}>{s.label}</span>
              <span style={{ fontSize:16,color:s.color,fontWeight:700 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize:28,fontWeight:800,color:s.color,letterSpacing:"-1.2px" }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
        <div className="card" style={{ padding:24 }}>
          <h3 style={{ fontSize:11,fontWeight:700,marginBottom:20,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1.2px" }}>Pipeline</h3>
          {STATUSES.map(status => {
            const count = clients.filter(c=>c.status===status).length;
            const pct = clients.length?(count/clients.length)*100:0;
            const m = STATUS_META[status];
            return (
              <div key={status} style={{ marginBottom:16 }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                  <span className="tag" style={{ background:m.bg,color:m.text }}>
                    <span style={{ width:6,height:6,borderRadius:"50%",background:m.dot,display:"inline-block" }} />{status}
                  </span>
                  <span style={{ fontSize:13,fontWeight:700 }}>{count}</span>
                </div>
                <div style={{ height:4,background:"var(--bg3)",borderRadius:4,overflow:"hidden" }}>
                  <div style={{ height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,var(--accent),var(--accent2))",borderRadius:4,transition:"width .6s" }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="card" style={{ padding:24 }}>
          <h3 style={{ fontSize:11,fontWeight:700,marginBottom:20,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1.2px" }}>Combos activos</h3>
          {combos.filter(c=>c.activo).map(combo => (
            <div key={combo.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:"var(--bg3)",borderRadius:12,marginBottom:10 }}>
              <div>
                <div style={{ fontSize:13,fontWeight:600 }}>◇ {combo.nombre}</div>
                <div style={{ fontSize:11,color:"var(--text3)",marginTop:2 }}>{combo.descripcion?.slice(0,50)}</div>
              </div>
              <div style={{ textAlign:"right",flexShrink:0 }}>
                <div style={{ fontSize:16,fontWeight:800,color:"var(--accent3)" }}>${combo.precio}</div>
                <div style={{ fontSize:10,color:"var(--text3)" }}>stock: {combo.stock}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Conversations({ conversations,convList,selectedPhone,setSelectedPhone,newMsg,setNewMsg,enviarMensaje,toggleBot,chatEndRef,db,dark,scrollBottom,clients,updateClientStatus,searchConv,setSearchConv,abrirEditChat }) {
  const conv = selectedPhone?(conversations[selectedPhone]||{mensajes:[],botActivo:true}):null;
  const clienteRelacionado = selectedPhone
    ? clients.find(c => c.telefono===selectedPhone || c.telefono===`+${selectedPhone}`)
    : null;

  const ChatList = (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:"var(--bg2)",borderRight:"1px solid var(--border)" }}>
      <div style={{ padding:"14px",borderBottom:"1px solid var(--border)",flexShrink:0 }}>
        <input className="input" placeholder="Buscar conversación..."
          style={{ fontSize:12 }} value={searchConv}
          onChange={e=>setSearchConv(e.target.value)} />
      </div>
      <div style={{ flex:1,overflowY:"auto" }}>
        {convList.length===0 && (
          <div style={{ textAlign:"center",padding:"60px 20px",color:"var(--text3)" }}>
            <div style={{ fontSize:36,marginBottom:10,opacity:.4 }}>◎</div>
            <div style={{ fontSize:13 }}>{searchConv?"Sin resultados":"Los mensajes aparecerán aquí"}</div>
          </div>
        )}
        {convList.map(c => (
          <div key={c.telefono} className={`conv-item ${selectedPhone===c.telefono?"active":""}`} onClick={()=>setSelectedPhone(c.telefono)}>
            <div style={{ display:"flex",gap:12,alignItems:"center" }}>
              <div style={{ width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,var(--accent),var(--accent2))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"white",flexShrink:0 }}>
                {c.nombre[0]?.toUpperCase()}
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                  <span style={{ fontSize:13,fontWeight:600 }}>{c.nombre}</span>
                  <span style={{ fontSize:10,color:"var(--text3)" }}>{c.ultimoTiempo}</span>
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <span style={{ fontSize:12,color:"var(--text3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160 }}>{c.ultimoMsg}</span>
                  <div style={{ display:"flex",gap:4,alignItems:"center",flexShrink:0 }}>
                    {c.botActivo && <span style={{ fontSize:9,color:"var(--accent)",background:"rgba(244,114,182,.1)",padding:"1px 6px",borderRadius:4,fontWeight:700 }}>BOT</span>}
                    {c.sinLeer>0 && <span style={{ background:"var(--accent)",color:"white",fontSize:9,fontWeight:700,borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center" }}>!</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ChatArea = conv ? (
    <div style={{ flex:1,display:"flex",flexDirection:"column",minWidth:0 }}>
      <div style={{ padding:"14px 20px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justify:"space-between",background:"var(--bg2)",flexShrink:0 }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,var(--accent),var(--accent2))",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"white",fontSize:14 }}>
            {(conv.nombre||selectedPhone)[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:14,fontWeight:600 }}>{conv.nombre||selectedPhone}</div>
            <div style={{ fontSize:10,color:"var(--text3)" }}>+{selectedPhone}</div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={abrirEditChat} title="Editar contacto"
            style={{ marginLeft:6 }}>✎</button>
        </div>
        <div style={{ display:"flex",gap:10,alignItems:"center",flexWrap:"wrap" }}>
          {clienteRelacionado && (
            <select className="input" value={clienteRelacionado.status||"Nuevo"}
              style={{ width:130,fontSize:11,padding:"4px 10px",height:"auto",
                background:STATUS_META[clienteRelacionado.status||"Nuevo"].bg,
                color:STATUS_META[clienteRelacionado.status||"Nuevo"].text,
                border:`1px solid ${STATUS_META[clienteRelacionado.status||"Nuevo"].dot}44`,
                fontWeight:700 }}
              onChange={e=>updateClientStatus(clienteRelacionado.id, e.target.value)}>
              {STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
          )}
          <span style={{ fontSize:11,padding:"4px 12px",borderRadius:20,fontWeight:600,
            background:conv.botActivo?"rgba(244,114,182,.1)":"rgba(245,158,11,.1)",
            color:conv.botActivo?"var(--accent)":"#fbbf24" }}>
            {conv.botActivo?"🤖 Bot activo":"👤 Tú atiendes"}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={()=>toggleBot(selectedPhone)}>
            {conv.botActivo?"Tomar control":"Activar bot"}
          </button>
        </div>
      </div>

      <div style={{ flex:1,overflowY:"auto",padding:"24px",display:"flex",flexDirection:"column",gap:12,background:"var(--bg)" }}>
        {(conv.mensajes||[]).length===0 && (
          <div style={{ textAlign:"center",color:"var(--text3)",marginTop:60,fontSize:13 }}>Sin mensajes aún</div>
        )}
        {(conv.mensajes||[]).map((msg,i) => (
          <div key={i} style={{ display:"flex",justifyContent:msg.from==="client"?"flex-start":"flex-end" }}>
            <div className="bubble" style={{
              background:msg.from==="client"?"var(--bg2)":msg.from==="bot"?"rgba(167,139,250,.1)":"linear-gradient(135deg,#f472b6,#a78bfa)",
              color:msg.from==="user"?"white":"var(--text)",
              border:msg.from==="client"?"1px solid var(--border)":msg.from==="bot"?"1px solid rgba(167,139,250,.25)":"none",
              borderBottomLeftRadius:msg.from==="client"?4:16,
              borderBottomRightRadius:msg.from!=="client"?4:16,
            }}>
              {msg.from==="bot" && <div style={{ fontSize:10,color:"var(--accent2)",fontWeight:700,marginBottom:4 }}>🤖 BOT · N8N</div>}
              {msg.texto}
              <div style={{ fontSize:10,marginTop:5,textAlign:"right",color:msg.from==="user"?"rgba(255,255,255,.6)":"var(--text3)" }}>{msg.tiempo}</div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} style={{ height:1 }} />
      </div>

      <div style={{ padding:"14px 20px",borderTop:"1px solid var(--border)",display:"flex",gap:10,background:"var(--bg2)",flexShrink:0 }}>
        <input className="input" value={newMsg} onChange={e=>setNewMsg(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),enviarMensaje())}
          placeholder="Escribe un mensaje... (Enter para enviar)" style={{ flex:1 }} />
        <button className="btn btn-primary" onClick={enviarMensaje} style={{ paddingLeft:22,paddingRight:22 }}>→</button>
      </div>
    </div>
  ) : (
    <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:"var(--text3)" }}>
      <div style={{ fontSize:48,opacity:.15 }}>◎</div>
      <div style={{ fontSize:14 }}>Selecciona una conversación</div>
    </div>
  );

  return (
    <div style={{ display:"flex",height:"100%" }}>
      <div style={{ width:290,flexShrink:0 }}>{ChatList}</div>
      {ChatArea}
    </div>
  );
}

function Clients({ clients,showAddClient,setShowAddClient,newClient,setNewClient,addClient,updateClientStatus }) {
  const [search,setSearch] = useState("");
  const filtered = clients.filter(c=>
    c.nombre?.toLowerCase().includes(search.toLowerCase())||c.telefono?.includes(search)
  );
  return (
    <div style={{ maxWidth:880 }}>
      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:20,gap:12,flexWrap:"wrap" }}>
        <input className="input" placeholder="Buscar cliente..." style={{ maxWidth:280,fontSize:12 }} value={search} onChange={e=>setSearch(e.target.value)} />
        <button className="btn btn-primary" onClick={()=>setShowAddClient(true)}>+ Nuevo cliente</button>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        {filtered.map((client,i) => {
          const m = STATUS_META[client.status||"Nuevo"];
          return (
            <div key={client.id} className="card fade-up" style={{ padding:"14px 20px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",animationDelay:`${i*.03}s` }}>
              <div style={{ width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,var(--accent),var(--accent2))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"white",flexShrink:0 }}>
                {client.nombre[0]?.toUpperCase()}
              </div>
              <div style={{ flex:1,minWidth:120 }}>
                <div style={{ fontSize:13,fontWeight:600 }}>{client.nombre}</div>
                <div style={{ fontSize:11,color:"var(--text3)" }}>{client.telefono}</div>
                {client.notas && <div style={{ fontSize:11,color:"var(--text3)",marginTop:2,fontStyle:"italic" }}>📝 {client.notas.slice(0,60)}</div>}
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" }}>
                {client.totalGastado>0 && <span style={{ fontSize:14,fontWeight:800,color:"var(--accent3)" }}>${client.totalGastado}</span>}
                <span className="tag" style={{ background:m.bg,color:m.text }}>
                  <span style={{ width:6,height:6,borderRadius:"50%",background:m.dot,display:"inline-block" }} />{client.status||"Nuevo"}
                </span>
                <select className="input" value={client.status||"Nuevo"} style={{ width:130,fontSize:12 }} onChange={e=>updateClientStatus(client.id,e.target.value)}>
                  {STATUSES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          );
        })}
        {filtered.length===0 && <div style={{ textAlign:"center",color:"var(--text3)",padding:"50px 0",fontSize:13 }}>{clients.length===0?"Sin clientes aún":"Sin resultados"}</div>}
      </div>
      {showAddClient && (
        <div className="modal-overlay" onClick={()=>setShowAddClient(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontSize:16,fontWeight:700,marginBottom:20 }}>Nuevo cliente</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <input className="input" placeholder="Nombre completo" value={newClient.nombre} onChange={e=>setNewClient({...newClient,nombre:e.target.value})} />
              <input className="input" placeholder="Teléfono (+503...)" value={newClient.telefono} onChange={e=>setNewClient({...newClient,telefono:e.target.value})} />
              <select className="input" value={newClient.status} onChange={e=>setNewClient({...newClient,status:e.target.value})}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
              <textarea className="input" placeholder="Notas..." rows={3} style={{ resize:"none" }} value={newClient.notas} onChange={e=>setNewClient({...newClient,notas:e.target.value})} />
              <div style={{ display:"flex",gap:10,marginTop:4 }}>
                <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setShowAddClient(false)}>Cancelar</button>
                <button className="btn btn-primary" style={{ flex:1 }} onClick={addClient}>Agregar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Combos({ combos,showAddCombo,setShowAddCombo,showEditCombo,setShowEditCombo,editCombo,setEditCombo,saveEditCombo,newCombo,setNewCombo,addCombo,db }) {
  return (
    <div style={{ maxWidth:920 }}>
      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10,alignItems:"center" }}>
        <p style={{ fontSize:12,color:"var(--text3)" }}>{combos.filter(c=>c.activo).length} activos · {combos.length} total</p>
        <button className="btn btn-primary" onClick={()=>setShowAddCombo(true)}>+ Nuevo combo</button>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:16 }}>
        {combos.map((combo,i) => (
          <div key={combo.id} className="card fade-up" style={{ padding:22,opacity:combo.activo?1:.55,animationDelay:`${i*.05}s` }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:16 }}>
              <span style={{ fontSize:11,fontWeight:700,padding:"4px 12px",borderRadius:20,
                background:combo.activo?"rgba(52,211,153,.1)":"var(--bg3)",
                color:combo.activo?"var(--accent3)":"var(--text3)" }}>
                {combo.activo?"ACTIVO":"INACTIVO"}
              </span>
              <div style={{ display:"flex",gap:6 }}>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>{
                  setEditCombo({ nombre:combo.nombre,descripcion:combo.descripcion,precio:combo.precio,stock:combo.stock });
                  setShowEditCombo(combo.id);
                }}>✎</button>
                <button className="btn btn-danger btn-icon btn-sm" onClick={()=>deleteDoc(doc(db,"combos",combo.id))}>✕</button>
              </div>
            </div>
            <h3 style={{ fontSize:15,fontWeight:700,marginBottom:6 }}>◇ {combo.nombre}</h3>
            <p style={{ fontSize:12,color:"var(--text3)",marginBottom:20,lineHeight:1.6 }}>{combo.descripcion?.slice(0,100)}{combo.descripcion?.length>100?"...":""}</p>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <span style={{ fontSize:24,fontWeight:800,color:"var(--accent3)" }}>${combo.precio}</span>
              <span style={{ fontSize:11,color:"var(--text3)" }}>stock: {combo.stock}</span>
            </div>
            <button className="btn btn-ghost" style={{ width:"100%",justifyContent:"center",fontSize:12 }}
              onClick={()=>updateDoc(doc(db,"combos",combo.id),{activo:!combo.activo})}>
              {combo.activo?"Desactivar":"Activar"}
            </button>
          </div>
        ))}
      </div>
      {showAddCombo && (
        <div className="modal-overlay" onClick={()=>setShowAddCombo(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontSize:16,fontWeight:700,marginBottom:20 }}>Nuevo combo</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <input className="input" placeholder="Nombre del combo" value={newCombo.nombre} onChange={e=>setNewCombo({...newCombo,nombre:e.target.value})} />
              <textarea className="input" placeholder="Descripción completa" rows={4} style={{ resize:"none" }} value={newCombo.descripcion} onChange={e=>setNewCombo({...newCombo,descripcion:e.target.value})} />
              <input className="input" placeholder="Precio ($)" type="number" value={newCombo.precio} onChange={e=>setNewCombo({...newCombo,precio:e.target.value})} />
              <input className="input" placeholder="Stock disponible" type="number" value={newCombo.stock} onChange={e=>setNewCombo({...newCombo,stock:e.target.value})} />
              <div style={{ display:"flex",gap:10,marginTop:4 }}>
                <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setShowAddCombo(false)}>Cancelar</button>
                <button className="btn btn-primary" style={{ flex:1 }} onClick={addCombo}>Agregar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Pipeline({ clients,updateClientStatus }) {
  return (
    <div>
      <p style={{ fontSize:11,color:"var(--text3)",marginBottom:20,textTransform:"uppercase",letterSpacing:"1.2px",fontWeight:700 }}>Vista kanban</p>
      <div style={{ display:"flex",gap:14,overflowX:"auto",paddingBottom:16 }}>
        {STATUSES.map(status => {
          const m = STATUS_META[status];
          const sc = clients.filter(c=>c.status===status);
          return (
            <div key={status} style={{ minWidth:210,flex:"0 0 210px" }}>
              <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"8px 14px",background:m.bg,borderRadius:12 }}>
                <span style={{ width:6,height:6,borderRadius:"50%",background:m.dot,display:"inline-block" }} />
                <span style={{ fontSize:12,fontWeight:700,color:m.text }}>{status}</span>
                <span style={{ marginLeft:"auto",fontSize:11,color:m.text,opacity:.7 }}>{sc.length}</span>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {sc.map(client => (
                  <div key={client.id} className="card" style={{ padding:14 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
                      <div style={{ width:24,height:24,borderRadius:"50%",background:"linear-gradient(135deg,var(--accent),var(--accent2))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"white",flexShrink:0 }}>
                        {client.nombre[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{client.nombre}</span>
                    </div>
                    <div style={{ fontSize:10,color:"var(--text3)" }}>{client.telefono}</div>
                    {client.notas && <div style={{ fontSize:10,color:"var(--text3)",marginTop:4,fontStyle:"italic" }}>📝 {client.notas.slice(0,40)}</div>}
                    {client.totalGastado>0 && <div style={{ fontSize:13,fontWeight:800,color:"var(--accent3)",marginTop:8 }}>${client.totalGastado}</div>}
                    <select className="input" value={client.status||"Nuevo"} style={{ width:"100%",fontSize:11,marginTop:10,padding:"4px 8px" }}
                      onChange={e=>updateClientStatus(client.id,e.target.value)}>
                      {STATUSES.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
                {sc.length===0 && <div style={{ padding:"24px 14px",textAlign:"center",color:"var(--text3)",fontSize:11,border:"1.5px dashed var(--border)",borderRadius:14 }}>Vacío</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
