import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  collection, doc, onSnapshot, setDoc, updateDoc,
  deleteDoc, addDoc, serverTimestamp
} from "firebase/firestore";

const BACKEND = "https://dnd-boutique-backend-production.up.railway.app";

const STATUS_META = {
  "Nuevo":      { bg:"#f0f7ff",  text:"#0066ff", dot:"#0066ff" },
  "Interesado": { bg:"#fff9e6",  text:"#d97706", dot:"#d97706" },
  "Cotizado":   { bg:"#f5f0ff",  text:"#7c3aed", dot:"#7c3aed" },
  "Cerrado":    { bg:"#ecfdf5",  text:"#059669", dot:"#059669" },
  "Perdido":    { bg:"#fef2f2",  text:"#dc2626", dot:"#dc2626" },
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
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html,body,#root{height:100%;overflow:hidden;background:#f9f9f9;}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-thumb{background:#e0e0e0;border-radius:4px;}
  body{font-family:'Inter',sans-serif;color:#1a1a1a;}
  .fade-up{animation:fadeUp .3s ease both;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .nav-item{display:flex;align-items:center;gap:12px;padding:10px 16px;border-radius:10px;cursor:pointer;transition:all .2s;font-size:14px;color:#666;}
  .nav-item:hover{background:#f0f0f0;color:#000;}
  .nav-item.active{background:#000;color:#fff;}
  .card{background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);transition:all .2s;}
  .btn{border:none;cursor:pointer;font-weight:500;border-radius:8px;padding:8px 16px;transition:all .2s;}
  .btn-primary{background:#000;color:#fff;}
  .btn-primary:hover{opacity:.8;}
  .btn-ghost{background:transparent;border:1px solid #eee;color:#666;}
  .btn-ghost:hover{background:#f9f9f9;}
  .input{border:1px solid #e5e5e5;border-radius:8px;padding:10px 12px;width:100%;outline:none;}
  .input:focus{border-color:#000;}
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;z-index:300;backdrop-filter:blur(2px);}
  .modal{background:#fff;border-radius:16px;padding:32px;width:100%;max-width:400px;box-shadow:0 10px 25px rgba(0,0,0,0.1);}
  @media(max-width:768px){.desktop-sidebar{display:none!important;}}
`;

export default function App() {
  const [dark, setDark] = useState(false);
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
      ultimoMsg:newChatMsg, ultimoTiempo:tiempo, botActivo:false, sinLeer:0
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

  if (loading) return null;

  const shared = {
    clients,combos,conversations,convList,selectedPhone,setSelectedPhone,
    newMsg,setNewMsg,enviarMensaje,toggleBot,chatEndRef,totalVentas,conversion,
    chatsUnread,showAddClient,setShowAddClient,showAddCombo,setShowAddCombo,
    showEditCombo,setShowEditCombo,editCombo,setEditCombo,saveEditCombo,
    showNewChat,setShowNewChat,newClient,setNewClient,newCombo,setNewCombo,
    addCombo,addClient,updateClientStatus,setCombos,db,scrollBottom,
    searchConv,setSearchConv,abrirEditChat,
  };

  return (
    <div style={{ display:"flex",height:"100vh",background:"#f9f9f9",fontFamily:"'Inter',sans-serif",overflow:"hidden" }}>
      <style>{CSS}</style>

      {/* Sidebar minimalista */}
      <aside className="desktop-sidebar" style={{ width:240,background:"#fff",borderRight:"1px solid #f0f0f0",padding:"40px 20px",display:"flex",flexDirection:"column",gap:40 }}>
        <h2 style={{ fontSize:18,fontWeight:600 }}>DND Boutique</h2>
        <nav style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {NAV.map(item => (
            <div key={item.id} className={`nav-item ${section===item.id?"active":""}`} onClick={()=>setSection(item.id)}>
              {item.label}
            </div>
          ))}
        </nav>
        <button className="btn btn-primary" style={{ marginTop:"auto" }} onClick={()=>setShowNewChat(true)}>+ Nueva charla</button>
      </aside>

      {/* Main */}
      <main style={{ flex:1,padding:40,overflowY:"auto" }}>
        <header style={{ marginBottom:40 }}>
          <h1 style={{ fontSize:32,fontWeight:600,textTransform:"capitalize" }}>{NAV.find(n=>n.id===section)?.label}</h1>
        </header>
        {section==="dashboard" && <div className="card"><p>Contenido Dashboard</p></div>}
        {section==="conversations" && <div className="card" style={{ height:"calc(100vh - 150px)" }}><p>Contenido Chats</p></div>}
        {/* ... resto de secciones igual */}
      </main>

      {/* Modales */}
      {showNewChat && (
        <div className="modal-overlay" onClick={()=>{setShowNewChat(false); resetNewChatFields();}}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontSize:18,fontWeight:600,marginBottom:20 }}>Nueva Conversación</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
              <input className="input" placeholder="Nombre" value={newChatNombre} onChange={e=>setNewChatNombre(e.target.value)} />
              <input className="input" placeholder="Teléfono" value={newChatNumero} onChange={e=>setNewChatNumero(e.target.value.replace(/\D/g,""))} />
              <textarea className="input" placeholder="Mensaje inicial..." rows={3} value={newChatMsg} onChange={e=>setNewChatMsg(e.target.value)} />
              <div style={{ display:"flex",gap:10 }}>
                <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>{setShowNewChat(false); resetNewChatFields();}}>Cancelar</button>
                <button className="btn btn-primary" style={{ flex:1 }} onClick={iniciarChat}>Enviar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
