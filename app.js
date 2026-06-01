const data = Array.isArray(window.FAULT_DATA) ? window.FAULT_DATA : [];
const manual = Array.isArray(window.MANUAL_KNOWLEDGE) ? window.MANUAL_KNOWLEDGE : [];
const faultCodes = Array.isArray(window.FAULT_CODES) ? window.FAULT_CODES : [];
const $ = (id)=>document.getElementById(id);
const state = { q:'', system:'', stage:'', tag:'', ranked:null, codeQ:'' };

const manualGallery = [
  {
    title: '驾驶室操控装置总览',
    chapter: '第4章 操作 · 图4-1',
    desc: '用于快速识别驾驶室主要控制装置、踏板、手柄和开关位置，适合处理挂挡无反应、操作失灵、控制异常类问题时先对照检查。',
    src: 'assets/manual/cockpit_controls.jpg'
  },
  {
    title: '仪表板与主菜单界面',
    chapter: '第4章 操作 · 图4-2/图4-3',
    desc: '可帮助现场人员识别显示器主菜单和报警静音功能，便于处理仪表报警、故障码提示、蜂鸣器报警等问题。',
    src: 'assets/manual/instrument_panel.jpg'
  },
  {
    title: '组合仪表与速度里程显示',
    chapter: '第4章 操作 · 图4-4/图4-5',
    desc: '用于对照车辆运行状态、速度、档位和关键指示信息，适合分析车辆不走、CAN报警、运行状态异常等场景。',
    src: 'assets/manual/combined_dashboard.jpg'
  },
  {
    title: '倒空集尘杯与机油检查示意',
    chapter: '第5章 保养 · 5.4.8 / 5.4.9',
    desc: '展示集尘杯排尘与发动机油位检查相关图示，可用于日常检查、进气系统保养和发动机基础检查。',
    src: 'assets/manual/dust_collector_oil_check.jpg'
  },
  {
    title: '清理发动机与消音器区域',
    chapter: '第5章 保养 · 5.4.17',
    desc: '用于识别发动机和消音器周边清洁重点区域，适合高温、冒烟、积尘、散热差等故障预防与检查。',
    src: 'assets/manual/engine_muffler_cleaning.jpg'
  },
  {
    title: '蓄电池外形与故障诊断',
    chapter: '第5章 保养 · 图5-147',
    desc: '用于识别蓄电池结构和充电不足、过充、电气回路故障等检查方向，适合无法启动、电瓶报警、电气故障类问题。',
    src: 'assets/manual/battery_shape_diagnosis.jpg'
  }
];

const dict = {
  '漏油':['渗油','漏液','渗漏','漏','油管','接头漏油','密封'],
  '漏水':['渗水','防冻液','冷却液','水管渗漏','水箱','回水管'],
  '报警':['红色报警','黄色报警','故障码','仪表报警','代码','报故障','警报'],
  '异响':['噪音','响声','声音大','轴承响','咯噔','嗡嗡','异常噪音'],
  '高温':['温度高','水温高','过热','温升高','散热','冷却'],
  '无法启动':['不能启动','启动不了','打不着','无法起动','不起车','启动失败'],
  '挂挡':['档位','挡位','换挡','手柄','无反应','不走车','挂不上档'],
  '制动':['刹车','驻车','行车制动','压力低','制动压力','电制动','液压制动'],
  '转向':['方向','转向沉','转向压力','方向重','紧急转向'],
  '传感器':['压力传感器','温度传感器','位置传感器','插接件'],
  '线束':['线路','断路','虚接','插头','接插件','短路','接触不良','退针'],
  '轴承':['轴承损坏','温度高','轮边','轮毂'],
  '发动机':['康明斯','机油','水泵','喷油器','缸套','增压器','发动机','黑烟','转速低'],
  '液压':['液压油','油缸','举升','泵','阀','液压系统','滤芯'],
  '电气':['保险','继电器','控制器','ECU','VCU','KCB','电瓶','蓄电池','CAN'],
  '电传动':['驱动','发电机','电动轮','电阻栅','制动电阻','变流柜','牵引'],
  '保养':['周期','10小时','50小时','125小时','250小时','500小时','1000小时','2000小时','滤清器'],
};

function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function normalize(s){return String(s||'').toLowerCase().replace(/[，。；、,.!?！？;:：\s]+/g,'')}
function uniq(arr){return [...new Set(arr.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'zh-Hans-CN'))}
function countBy(arr, keyFn){const m=new Map();arr.forEach(x=>{const k=keyFn(x)||'未填写';m.set(k,(m.get(k)||0)+1)});return [...m.entries()].sort((a,b)=>b[1]-a[1])}
function fillSelect(id, values){const el=$(id); values.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;el.appendChild(o)})}
function blob(x){return [x.caseNo,x.fault,x.solution,x.system,x.stage,x.hours,(x.tags||[]).join(' ')].join(' ')}
function manualBlob(x){return [x.system,x.summary,x.solution,x.warning,x.chapter,x.page,(x.keys||[]).join(' '),(x.causes||[]).join(' '),(x.checks||[]).join(' ')] .join(' ')}
function codeBlob(x){return [x.code,x.name,x.system,x.category,x.levelName,x.risk,x.advice,x.source].join(' ')}
function codeMatchesNumber(codeText, n){
  const s=String(codeText||'');
  if(!/^\d+$/.test(String(n))) return false;
  if(s===String(n)) return true;
  const m=s.match(/^(\d+)\s*-\s*(\d+)$/);
  if(m){ const a=Number(m[1]), b=Number(m[2]), num=Number(n); if((b-a)<=20 && num>=a && num<=b) return true; }
  return false;
}
function tokenize(s){
  const raw = String(s||'').toLowerCase();
  const words = raw.split(/[\s，。；、,.!?！？;:：/\\|()（）【】\[\]"'“”]+/).filter(Boolean);
  const added = [];
  Object.entries(dict).forEach(([k,vals])=>{
    if(raw.includes(k) || vals.some(v=>raw.includes(v))) added.push(k,...vals);
  });
  words.forEach(w=>{
    if(w.length>1) added.push(w);
    for(let i=0;i<w.length-1;i++) added.push(w.slice(i,i+2));
  });
  return [...new Set(added.map(normalize).filter(x=>x.length>=2))];
}
function scoreText(input, text, extraKeys=[]){
  const q=normalize(input); const tokens=tokenize(input); const b=normalize(text);
  let score = 0;
  if(q && b.includes(q)) score += 160;
  tokens.forEach(t=>{ if(b.includes(t)) score += t.length>=4 ? 20 : 9; });
  extraKeys.forEach(k=>{ const nk=normalize(k); if(q.includes(nk) || tokens.includes(nk)) score += 25; });
  return score;
}
function rankByFault(input){
  return data.map(x=>{
    let score = scoreText(input, blob(x), x.tags||[]);
    const topManual = rankManual(input).slice(0,3).map(m=>m.system).join(' ');
    if(topManual && normalize(x.system).includes(normalize(topManual.slice(0,2)))) score += 8;
    return {...x, _score:score};
  }).filter(x=>x._score>0).sort((a,b)=>b._score-a._score || a.id-b.id);
}
function rankManual(input){
  return manual.map(m=>({ ...m, _score: scoreText(input, manualBlob(m), m.keys||[]) + (m.priority==='high'?12:0) }))
    .filter(m=>m._score>0).sort((a,b)=>b._score-a._score);
}
function rankFaultCodes(input){
  const raw=String(input||'').toLowerCase();
  const nums=(raw.match(/\d{3}/g)||[]);
  return faultCodes.map(c=>{
    let score=scoreText(input, codeBlob(c), [c.code,c.name,c.system,c.category]);
    nums.forEach(n=>{ if(codeMatchesNumber(c.code,n)) score += 220; else if(String(c.code).includes(n)) score += 80; });
    if(raw.includes(String(c.name||'').toLowerCase())) score += 100;
    if(c.level===0) score += 8;
    return {...c,_score:score};
  }).filter(c=>c._score>0).sort((a,b)=>b._score-a._score || String(a.code).localeCompare(String(b.code)));
}
function buildPlan(input, ranked, manuals){
  const top = manuals.slice(0,3);
  const codeHits = rankFaultCodes(input).slice(0,8);
  const best = ranked[0];
  const topSystems = countBy(ranked.slice(0,40), x=>x.system).slice(0,5);
  const topTags = countBy(ranked.slice(0,40).flatMap(x=>x.tags||[]), x=>x).slice(0,10).map(x=>x[0]);
  const tokens = tokenize(input);
  const highRisk = top.some(m=>m.priority==='high') || codeHits.some(c=>c.level===0) || /红色|着火|冒烟|失控|制动|刹车|转向|高温|无法启动|断电/.test(input);
  const confidence = Math.min(98, Math.round((best?best._score:0)/2.3 + (top[0]?top[0]._score:0)/2 + Math.min(ranked.length,30)));
  let firstActions = ['记录故障现象、报警颜色、故障码、发生工况和设备编号','查看仪表/诊断系统历史故障，不要先清码','按推荐系统从安全项开始逐项排查'];
  if(highRisk) firstActions.unshift('先停机、挂P档/实施驻车制动，必要时使用轮挡，确认人员安全');
  const combinedChecks = uniq(top.flatMap(m=>m.checks||[])).slice(0,10);
  const combinedCauses = uniq(top.flatMap(m=>m.causes||[])).slice(0,10);
  return {top, best, topSystems, topTags, tokens, confidence, highRisk, firstActions, combinedChecks, combinedCauses, codeHits};
}

function getRiskProfile(input, plan){
  const raw = String(input || '');
  const highWords = ['制动','刹车','转向','方向重','高温','水温高','过热','冒烟','着火','失火','无法启动','断电','牵引','驻车','压力低','蓄能器','电气报警'];
  const midWords = ['漏油','漏水','渗漏','异响','轮边','轴承','举升慢','报警','线束','传感器','空调'];
  let level = '低';
  if (plan.highRisk || (plan.codeHits||[]).some(c=>c.level===0) || highWords.some(w => raw.includes(w))) level = '高';
  else if (midWords.some(w => raw.includes(w))) level = '中';
  const advice = level === '高'
    ? '禁止带故障继续作业，先停机隔离，确认人员、制动、转向、温度、电气状态安全后再排查。'
    : level === '中'
      ? '建议尽快安排检查，避免故障扩大；可在安全条件下按步骤定位。'
      : '可按计划检修，但仍需记录故障现象和处理结果。';
  return { level, advice };
}
function copyAnalysisText(text, p, best){
  return `XDE130现场故障智能分析\n输入：${text}\n风险等级：${p.risk.level}\n风险建议：${p.risk.advice}\n综合匹配度：${p.confidence}%\n\n优先处理：\n${p.firstActions.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\n可能原因：\n${p.combinedCauses.slice(0,8).map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\n检查步骤：\n${p.combinedChecks.slice(0,10).map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\n手册依据：${p.top.map(m=>`${m.system}(${m.chapter})`).join('、')}\n\n最相似历史故障：${best ? best.fault : '暂无直接匹配'}\n参考解决方案：${best ? best.solution : '建议补充故障码、报警颜色、发生工况、漏点位置和车辆小时数。'}`;
}
function copyCheckText(text, p){
  return `XDE130检查步骤\n输入：${text}\n风险等级：${p.risk.level}\n\n${p.combinedChecks.slice(0,10).map((s,i)=>`${i+1}. ${s}`).join('\n')}`;
}
function copySolutionText(text, p, best){
  const manualSolutions = p.top.map((m,i)=>`${i+1}. [${m.system}] ${m.solution}`).join('\n');
  return `XDE130解决方案\n输入：${text}\n风险等级：${p.risk.level}\n\n手册建议：\n${manualSolutions || '暂无手册匹配'}\n\n历史案例参考：\n${best ? best.solution : '暂无直接历史案例'}`;
}

function init(){
  $('totalCount').textContent = data.length;
  document.body.classList.add('privacy-version');
  $('manualCount').textContent = manual.length;
  if($('codeCount')) $('codeCount').textContent = faultCodes.length;
  if(!data.length){ $('aiHint').textContent='数据没有读取到。请确认 data.js 已上传完整，文件名必须是 data.js。'; }
  fillSelect('systemFilter', uniq(data.map(x=>x.system)));
  fillSelect('tagFilter', uniq(data.flatMap(x=>x.tags||[])));
  $('askBtn').onclick = ask;
  $('faultInput').addEventListener('keydown', e=>{ if(e.ctrlKey && e.key==='Enter') ask(); });
  $('clearBtn2').onclick = ()=>{ $('faultInput').value=''; state.ranked=null; $('answerBox').classList.add('hidden'); $('aiHint').textContent=''; render(); };
  document.querySelectorAll('.tips button').forEach(btn=>btn.onclick=()=>{ $('faultInput').value=btn.dataset.demo; ask(); });
  $('q').addEventListener('input', e=>{state.q=e.target.value.trim().toLowerCase(); state.ranked=null; $('answerBox').classList.add('hidden'); render()});
  $('systemFilter').addEventListener('change', e=>{state.system=e.target.value; render()});
  $('tagFilter').addEventListener('change', e=>{state.tag=e.target.value; render()});
  $('clearBtn').onclick=()=>{['q','systemFilter','tagFilter'].forEach(id=>$(id).value=''); Object.assign(state,{q:'',system:'',stage:'',tag:'',ranked:null}); $('answerBox').classList.add('hidden'); render()};
  if($('codeSearch')) $('codeSearch').addEventListener('input', e=>{state.codeQ=e.target.value.trim(); renderFaultCodeList();});
  if($('codeClear')) $('codeClear').onclick=()=>{state.codeQ=''; $('codeSearch').value=''; renderFaultCodeList();};
  renderManualKnowledge();
  renderManualGallery();
  renderFaultCodeList();
  renderStats(); renderSide(); render();
}
function ask(){
  const text = $('faultInput').value.trim();
  if(!text){ $('aiHint').textContent='请先输入故障现象，例如：发动机报警、漏水、异响、挂挡无反应。'; return; }
  const manuals = rankManual(text);
  const ranked = rankByFault(text);
  state.ranked = ranked;
  state.q = '';
  $('q').value = '';
  const plan = buildPlan(text, ranked, manuals);
  plan.risk = getRiskProfile(text, plan);
  renderAnswer(text, plan, ranked);
  $('aiHint').textContent = `已匹配 ${manuals.length} 条手册知识、${ranked.length} 条相似历史案例、${plan.codeHits.length} 条故障代码。`;
  renderManualKnowledge(manuals.slice(0,5).map(m=>m.id));
  render();
  $('answerBox').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderAnswer(text,p,ranked){
  const best = p.best;
  const manualHtml = p.top.length ? p.top.map(m=>`<article class="manual-card ${m.priority==='high'?'risk':''}">
    <div class="manual-head"><b>${escapeHtml(m.system)}</b><span>${escapeHtml(m.chapter)}｜${escapeHtml(m.page)}</span></div>
    <p>${escapeHtml(m.summary)}</p>
    <b>手册增强判断</b><ul>${(m.causes||[]).slice(0,5).map(c=>`<li>${escapeHtml(c)}</li>`).join('')}</ul>
    <b>手册建议检查</b><ul>${(m.checks||[]).slice(0,6).map(s=>`<li>${escapeHtml(s)}</li>`).join('')}</ul>
    <div class="solutionLine"><b>建议方案：</b>${escapeHtml(m.solution)}</div>
    ${m.warning?`<div class="warning">⚠ ${escapeHtml(m.warning)}</div>`:''}
  </article>`).join('') : '<p>未匹配到手册知识，请补充更具体故障描述。</p>';
  const bestHtml = best ? `<div class="best-summary"><h4>最相似历史案例</h4><p><b>故障：</b>${escapeHtml(best.fault||'未填写')}</p><p><b>解决方案：</b>${escapeHtml(best.solution||'原表未填写处理方法。')}</p><p><small>系统：${escapeHtml(best.system||'-')} ｜ 案例：${escapeHtml(best.caseNo||'-')} ｜ 小时数：${escapeHtml(best.hours||'-')} ｜ 匹配分：${best._score}</small></p><button id="copyAi">复制分析结果</button></div>` : `<div class="best-summary"><h4>未找到直接历史案例</h4><p>建议补充：故障码、报警颜色、发生工况、漏点位置、车辆小时数。</p></div>`;
  const codeHtml = (p.codeHits||[]).length ? `<section class="best-summary"><h3>匹配故障代码</h3><div class="answer-code-list">${p.codeHits.slice(0,6).map(c=>`<article class="answer-code risk-${escapeHtml(c.risk)}"><b>${escapeHtml(c.code)}</b><span>${escapeHtml(c.name)}</span><em>${escapeHtml(c.levelName||'未标注')} ｜ 风险${escapeHtml(c.risk)}</em><p>${escapeHtml(c.advice)}</p></article>`).join('')}</div></section>` : '';
  $('answerBox').classList.remove('hidden');
  $('answerBox').innerHTML = `<div class="answer-head"><div><h2>智能分析结果</h2><p>输入内容：${escapeHtml(text)}</p><div class="copy-actions"><button id="copyFull" type="button">复制完整分析</button><button id="copyChecks" type="button">复制检查步骤</button><button id="copySolution" type="button">复制解决方案</button></div></div><div class="risk-wrap"><div class="risk-badge risk-${p.risk.level}"><span>风险等级</span><b>${p.risk.level}</b></div><div class="confidence"><span>综合匹配度</span><b>${p.confidence}%</b></div></div></div>
  <div class="risk-advice risk-${p.risk.level}"><b>风险建议：</b>${escapeHtml(p.risk.advice)}</div>
  ${p.highRisk?'<div class="danger">高风险提示：该故障可能涉及制动、转向、高温、断电、火灾或启动安全。请先停机隔离，确认安全后再排查。</div>':''}
  <div class="answer-grid"><div class="answer-main">
    <section class="best-summary"><h3>现场优先处理顺序</h3><ol>${p.firstActions.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ol></section>
    ${codeHtml}
    <section class="best-summary"><h3>综合可能原因</h3><ul>${p.combinedCauses.slice(0,8).map(x=>`<li>${escapeHtml(x)}</li>`).join('') || '<li>暂无</li>'}</ul></section>
    <section class="best-summary"><h3>综合检查步骤</h3><ol>${p.combinedChecks.slice(0,10).map(x=>`<li>${escapeHtml(x)}</li>`).join('') || '<li>暂无</li>'}</ol></section>
    <h3>手册依据与解决方案</h3>${manualHtml}${bestHtml}
  </div><div class="answer-side"><h3>识别关键词</h3><div class="keywords">${(p.tokens.slice(0,18).map(t=>`<span>${escapeHtml(t)}</span>`).join('') || '<span>无</span>')}</div><h3>历史案例集中系统</h3><div>${(p.topSystems.map(([k,v])=>`<span class="system-chip">${escapeHtml(k)} · ${v}条</span>`).join('') || '<span class="system-chip">暂无</span>')}</div><h3>相似标签</h3><ul>${(p.topTags.map(t=>`<li>${escapeHtml(t)}</li>`).join('') || '<li>暂无</li>')}</ul><p class="hint">本系统为维修辅助工具，最终处理以现场检测、故障码和厂家规范为准。</p></div></div>`;
  if(best){
    $('copyAi').onclick = ()=>copyText(copyAnalysisText(text, p, best));
  }
  if($('copyFull')) $('copyFull').onclick = ()=>copyText(copyAnalysisText(text, p, best));
  if($('copyChecks')) $('copyChecks').onclick = ()=>copyText(copyCheckText(text, p));
  if($('copySolution')) $('copySolution').onclick = ()=>copyText(copySolutionText(text, p, best));
}
function renderManualKnowledge(activeIds=[]){
  const systems = manual.map(m=>m.system);
  $('manualTags').innerHTML = uniq(systems).map(s=>`<button data-system="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('');
  const list = activeIds.length ? manual.filter(m=>activeIds.includes(m.id)) : manual.slice(0,6);
  $('manualList').innerHTML = list.map(m=>`<article class="manual-mini ${activeIds.includes(m.id)?'active':''}"><b>${escapeHtml(m.system)}</b><span>${escapeHtml(m.chapter)}｜${escapeHtml(m.page)}</span><p>${escapeHtml(m.summary)}</p></article>`).join('');
  document.querySelectorAll('#manualTags button').forEach(btn=>btn.onclick=()=>{
    const sys = btn.dataset.system;
    const items = manual.filter(m=>m.system===sys);
    $('manualList').innerHTML = items.map(m=>`<article class="manual-mini active"><b>${escapeHtml(m.system)}</b><span>${escapeHtml(m.chapter)}｜${escapeHtml(m.page)}</span><p>${escapeHtml(m.summary)}</p><p><b>方案：</b>${escapeHtml(m.solution)}</p></article>`).join('');
  });
}

function renderManualGallery(){
  const el = $('manualGallery');
  if(!el) return;
  el.innerHTML = manualGallery.map(item=>`<article class="manual-gallery-card"><img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.title)}" loading="lazy" /><div class="manual-gallery-body"><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.chapter)}</span><p>${escapeHtml(item.desc)}</p></div></article>`).join('');
}


function renderFaultCodeList(){
  const listEl=$('faultCodeList');
  if(!listEl) return;
  const q=state.codeQ || '';
  let arr = q ? rankFaultCodes(q) : [];
  if($('codeResultInfo')) $('codeResultInfo').textContent = q ? `匹配 ${arr.length} 条故障代码，点击结果可展开详情` : `已导入 ${faultCodes.length} 条故障代码。请输入代码或名称查询，明细默认隐藏。`;
  if(!q){ listEl.innerHTML='<div class="empty code-compact-empty">故障代码库明细已隐藏。请输入故障代码或名称，例如：601、制动压力、CAN、电机温度。</div>'; return; }
  if(!arr.length){ listEl.innerHTML='<div class="empty">没有匹配故障代码。可以输入 601、制动压力、CAN、电机温度等关键词。</div>'; return; }
  listEl.innerHTML = arr.slice(0,120).map(c=>`<details class="fault-code-card code-compact-card risk-${escapeHtml(c.risk)}"><summary><div class="code-top"><b>${escapeHtml(c.code)}</b><span>${escapeHtml(c.levelName||'未标注')}</span></div><h3>${escapeHtml(c.name)}</h3><p><b>系统：</b>${escapeHtml(c.system)} ｜ <b>风险：</b>${escapeHtml(c.risk)}</p><em>点击展开/收起详情</em></summary><div class="code-detail"><p>${escapeHtml(c.advice)}</p><small>${escapeHtml(c.source||'')}</small></div></details>`).join('');
}

function filterData(){
  let base = state.ranked || data;
  return base.filter(x=>{
    const b=blob(x).toLowerCase();
    return (!state.q || b.includes(state.q)) && (!state.system || x.system===state.system) && (!state.tag || (x.tags||[]).includes(state.tag));
  });
}
function render(){
  const arr = filterData();
  $('resultInfo').textContent = `当前显示 ${arr.length} 条`;
  $('results').innerHTML='';
  if(!arr.length){ $('results').innerHTML='<div class="empty">没有匹配记录。换一个关键词试试。</div>'; return; }
  arr.slice(0,120).forEach(x=>renderCard(x));
  if(arr.length>120){ const more=document.createElement('div');more.className='empty';more.textContent=`还有 ${arr.length-120} 条未显示，可继续缩小筛选。`; $('results').appendChild(more); }
}
function renderCard(x){
  const tpl=$('cardTpl').content.cloneNode(true);
  tpl.querySelector('.system').textContent=x.system||'未分类';  tpl.querySelector('.score').textContent=x._score?`匹配 ${x._score}`:'记录';
  tpl.querySelector('.fault').textContent=x.fault||'未填写故障描述';
  tpl.querySelector('.meta').innerHTML = [`案例：${escapeHtml(x.caseNo||'-')}`,`小时数：${escapeHtml(x.hours||'未记录')}`,`使用阶段：${escapeHtml(x.stage||'-')}`].join(' ｜ ');
  tpl.querySelector('.solution').textContent=x.solution||'原表未填写处理方法。';
  tpl.querySelector('.tags').innerHTML=(x.tags||[]).map(t=>`<span>${escapeHtml(t)}</span>`).join('');
  tpl.querySelector('.copyBtn').onclick=()=>copyText(`故障：${x.fault}\n解决方案：${x.solution}\n系统：${x.system}\n小时数：${x.hours || '未记录'}`);
  $('results').appendChild(tpl);
}
function renderStats(){
  const systems=countBy(data,x=>x.system).slice(0,4);
  const stages=countBy(data,x=>x.stage).slice(0,4);
  $('stats').innerHTML = `<div><b>${data.length}</b><span>案例记录</span></div><div><b>${manual.length}</b><span>手册知识</span></div><div><b>${systems.length?escapeHtml(systems[0][0]):'-'}</b><span>最高频系统</span></div><div><b>${stages.length?escapeHtml(stages[0][0]):'-'}</b><span>最高频使用阶段</span></div>`;
}
function renderSide(){
  const tags=countBy(data.flatMap(x=>x.tags||[]),x=>x).slice(0,20);
  $('topTags').innerHTML=tags.map(([k,v])=>`<button data-tag="${escapeHtml(k)}">${escapeHtml(k)} <em>${v}</em></button>`).join('');
  document.querySelectorAll('#topTags button').forEach(btn=>btn.onclick=()=>{state.tag=btn.dataset.tag;$('tagFilter').value=state.tag;render()});
  const systems=countBy(data,x=>x.system).slice(0,12); const max=systems[0]?.[1]||1;
  $('systemBars').innerHTML=systems.map(([k,v])=>`<div class="bar"><span>${escapeHtml(k)}</span><i style="width:${Math.round(v/max*100)}%"></i><em>${v}</em></div>`).join('');
}
function copyText(text){navigator.clipboard?.writeText(text).then(()=>alert('已复制')).catch(()=>alert(text));}

document.addEventListener('DOMContentLoaded', init);
