(function(){
  const LOCAL_KEY = "xde130_access_logs";
  const SESSION_KEY = "xde130_session_id";

  function cfg(){ return window.XDE130_CONFIG || {}; }
  function now(){ return new Date().toISOString(); }
  function sessionId(){
    let id = localStorage.getItem(SESSION_KEY);
    if(!id){
      id = "S-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,8);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }
  function profile(){
    try { return JSON.parse(localStorage.getItem("xde130_user_profile") || "{}"); }
    catch(e){ return {}; }
  }
  function deviceInfo(){
    const ua = navigator.userAgent || "";
    const isMobile = /Android|iPhone|iPad|Mobile/i.test(ua);
    return {
      userAgent: ua,
      device: isMobile ? "mobile" : "desktop",
      language: navigator.language || "",
      platform: navigator.platform || ""
    };
  }
  function readLocal(){
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"); }
    catch(e){ return []; }
  }
  function writeLocal(list){
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(-1000)));
  }
  function localAdd(row){
    const list = readLocal();
    list.push(row);
    writeLocal(list);
  }
  function supabaseClient(){
    const c = cfg();
    if(!c.SUPABASE_URL || !c.SUPABASE_ANON_KEY || !window.supabase) return null;
    if(!window.__xde130Supabase){
      window.__xde130Supabase = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY);
    }
    return window.__xde130Supabase;
  }

  async function logEvent(eventType, options){
    options = options || {};
    const p = profile();
    const d = deviceInfo();
    const row = {
      event_type: eventType,
      operator_name: p.name || "未填写",
      operator_id: p.employeeId || "",
      role: p.role || "",
      query_text: options.queryText || "",
      matched_count: Number(options.matchedCount || 0),
      detail: options.detail || {},
      user_agent: d.userAgent,
      device: d.device,
      session_id: sessionId(),
      created_at: now()
    };
    localAdd(row);
    const sb = supabaseClient();
    if(sb){
      try {
        await sb.from("xde130_access_logs").insert(row);
      } catch(e) {
        console.warn("Supabase log failed:", e);
      }
    }
    return row;
  }

  async function getLogs(){
    const sb = supabaseClient();
    if(sb){
      try {
        const { data, error } = await sb.from("xde130_access_logs").select("*").order("created_at", { ascending:false }).limit(500);
        if(!error && Array.isArray(data)) return data;
      } catch(e) {
        console.warn("Supabase read failed:", e);
      }
    }
    return readLocal().slice().reverse();
  }

  function toCsv(rows){
    const headers = ["created_at","operator_name","operator_id","role","event_type","query_text","matched_count","device","session_id","user_agent"];
    const esc = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
    return headers.join(",") + "\n" + rows.map(r=>headers.map(h=>esc(r[h])).join(",")).join("\n");
  }

  function downloadCsv(rows){
    const blob = new Blob(["\ufeff" + toCsv(rows)], {type:"text/csv;charset=utf-8"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "xde130_login_query_logs.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function statHtml(rows){
    const login = rows.filter(r=>r.event_type==="login").length;
    const query = rows.filter(r=>String(r.event_type).includes("query")).length;
    const users = new Set(rows.map(r=>r.operator_name).filter(Boolean)).size;
    return `<div><b>${login}</b><span>登录次数</span></div><div><b>${query}</b><span>查询次数</span></div><div><b>${users}</b><span>使用人数</span></div><div><b>${rows.length}</b><span>总记录</span></div>`;
  }
  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

  async function renderAdmin(){
    const hint = document.getElementById("adminHint");
    const pwd = document.getElementById("adminPassword");
    const body = document.getElementById("adminLogBody");
    const stats = document.getElementById("adminStats");
    if(!pwd || !body) return;
    if((pwd.value || "").trim() !== (cfg().ADMIN_PASSWORD || "XDE130-ADMIN")){
      hint.textContent = "管理员密码不正确。";
      pwd.focus();
      return;
    }
    const rows = await getLogs();
    window.__xde130LastLogs = rows;
    hint.textContent = "已加载记录。" + ((cfg().SUPABASE_URL && cfg().SUPABASE_ANON_KEY) ? "当前读取 Supabase 数据。" : "当前读取本机浏览器记录。");
    stats.innerHTML = statHtml(rows);
    body.innerHTML = rows.slice(0,300).map(r=>`<tr>
      <td>${escapeHtml((r.created_at||"").replace("T"," ").slice(0,19))}</td>
      <td>${escapeHtml(r.operator_name)}</td>
      <td>${escapeHtml(r.operator_id)}</td>
      <td>${escapeHtml(r.role)}</td>
      <td>${escapeHtml(r.event_type)}</td>
      <td>${escapeHtml(r.query_text)}</td>
      <td>${escapeHtml(r.matched_count)}</td>
      <td>${escapeHtml(r.device || "")}</td>
    </tr>`).join("");
  }

  document.addEventListener("DOMContentLoaded", function(){
    const load = document.getElementById("adminLoadBtn");
    const exp = document.getElementById("adminExportBtn");
    const clear = document.getElementById("adminClearLocalBtn");
    if(load) load.onclick = renderAdmin;
    if(exp) exp.onclick = async function(){
      const rows = window.__xde130LastLogs || await getLogs();
      downloadCsv(rows);
    };
    if(clear) clear.onclick = function(){
      if(confirm("只会清空当前浏览器本地记录，不会删除 Supabase 后台数据。确定清空？")){
        localStorage.removeItem(LOCAL_KEY);
        renderAdmin();
      }
    };
  });

  window.XDE130_TRACKER = { logEvent, getLogs, downloadCsv };
})();