'use strict';
(() => {
 const G=window.LanzhouGeo, q=new URLSearchParams(location.search);
 let sid=G.streets.some(f=>String(f.properties.id)===q.get('street'))?Number(q.get('street')):15;
 let priority=['shade','green','surface'].includes(q.get('priority'))?q.get('priority'):'shade', overview=false;
 const flat=c=>typeof c[0]==='number'?[c]:c.flatMap(flat);
 for(const layer of Object.values(G)) for(const f of layer){const pts=flat(f.geometry.coordinates);f.box=[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))];}
 const section=document.createElement('section');section.id='decision';section.className='panel decision';
 section.innerHTML=`<div class="paneltitle"><div><p class="eyebrow">兰州 / 真实空间 · 方案初筛</p><h2>这笔预算，先改哪里、先做什么？</h2></div><span class="tag">50 个街道 · 107 个公园要素</span></div>
 <div class="decision-grid"><div class="geo-pane"><div class="geo-tools"><label>浏览街道<select id="streetSelect"></select></label><button id="extent">查看主城区</button></div><svg id="geoMap" viewBox="0 0 900 470" aria-label="兰州街道真实地理边界，点击选择街道" role="img"></svg><div class="geo-legend"><span>🟩 公园</span><span>▰ 建筑</span><span>蓝色：水体</span><span>橙色：选中街道</span></div><div class="geo-switches"><label><input id="showParks" type="checkbox" checked>公园</label><label><input id="showRoads" type="checkbox" checked>道路</label><label><input id="showBuildings" type="checkbox" checked>建筑</label></div><p id="geoCaption" class="hint"></p><p class="hint">边界、公园来自提供的数据；建筑、道路、水体来自 OSM。边界沿用原数据版本，不代表最新行政区划。<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors · ODbL</a>。这里只显示真实地理要素，尚未将拟建设施落到具体坐标。</p></div>
 <div class="decision-card"><p class="eyebrow">决策条件</p><h3 id="regionTitle"></h3><label>本次更新优先目标<select id="priority"><option value="shade">短期遮阳：先改善停留空间</option><option value="green">长期增绿：兼顾树木养护</option><option value="surface">铺装更新：结合地面改造</option></select></label><p class="hint">下方预算和价格设置同步影响候选方案；措施工程量为一个公共空间的演示规模，不按整个街道计价。</p><div id="recommendation"></div><button id="applyCandidate">将候选方案用于下方比较 ↓</button><button id="decisionExport">导出决策说明</button><p class="hint">规则初筛，不是降温最优解。未用任意权重生成综合分数；空间选区不自动改变模型结果、费用或服务人数。</p></div></div>
 <div class="decision-bottom"><div><h3>措施怎么取舍</h3><div class="compare-wrap"><table><thead><tr><th>方向</th><th>方案意图</th><th>实施前需核实</th></tr></thead><tbody><tr><td>增绿</td><td>增加树荫和绿化空间</td><td>地下管线、种植空间、树冠成长与灌溉</td></tr><tr><td>遮阳</td><td>优先覆盖候车、休憩等停留点</td><td>遮蔽时段、抗风、净高与通行条件</td></tr><tr><td>材料改造</td><td>结合铺装更新检验热环境变化</td><td>反射对行人的影响、防滑和维护</td></tr><tr><td>增绿＋遮阳</td><td>比较组合措施的投入与实施条件</td><td>空间冲突、养护与预算，不假定效果简单相加</td></tr></tbody></table></div></div><div><h3>热浪期间，还缺多少服务？</h3><p id="emergencyDecision"></p><p class="hint">这是给定容量下的时段推演。真实避暑点位置、开放时间、容量与可达性需要现场核实；公园图斑不等于可用避暑服务点。</p><a class="button" href="#workspace">调整预算、故障和开放时间 ↓</a></div></div>`;
 $('workspace').before(section);
 $('streetSelect').innerHTML=G.streets.map(f=>`<option value="${f.properties.id}">${esc(f.properties.district)} · ${esc(f.properties.name)}</option>`).join('');
 $('streetSelect').value=sid;$('priority').value=priority;
 for(const key of ['budget','priceFactor','years','discount']) $(key).addEventListener('input',()=>{if(!$(key).value)return;try{state=M.validateState({...state,[key]:Number($(key).value)},data);render();}catch{ /* Allow an incomplete number while typing. */ }});
 const interests={shade:['S2','S4'],green:['S1','S4'],surface:['S3']};
 function decision(){const rows=M.compare(data,state),ids=interests[priority];return rows.filter(r=>ids.includes(r.id)&&r.capex<=state.budget*10000).sort((a,b)=>a.total-b.total)[0]||null;}
 function syncQuery(){const params=new URLSearchParams(location.search);params.set('street',sid);params.set('priority',priority);history.replaceState(null,'',location.pathname+'?'+params+location.hash);}
 function draw(){const feature=G.streets.find(f=>f.properties.id===sid),box=overview?[103.57,36.01,103.95,36.16]:feature.box,cy=(box[1]+box[3])/2,cos=Math.cos(cy*Math.PI/180),w=(box[2]-box[0])*cos,h=box[3]-box[1],s=Math.min(830/w,390/h),cx=(box[0]+box[2])/2;
 const xy=p=>[450+(p[0]-cx)*cos*s,235-(p[1]-cy)*s];
 const line=ring=>ring.map((p,i)=>{const a=xy(p);return `${i?'L':'M'}${a[0].toFixed(1)},${a[1].toFixed(1)}`;}).join('');
 const path=g=>{if(g.type==='Polygon')return g.coordinates.map(r=>line(r)+'Z').join('');if(g.type==='MultiPolygon')return g.coordinates.map(p=>p.map(r=>line(r)+'Z').join('')).join('');if(g.type==='LineString')return line(g.coordinates);if(g.type==='MultiLineString')return g.coordinates.map(line).join('');return '';};
 const visible=f=>f.box[2]>=box[0]&&f.box[0]<=box[2]&&f.box[3]>=box[1]&&f.box[1]<=box[3];
 let html='<rect width="900" height="470" fill="#edf1e9"/>';
 const paint=(key,fill,stroke,width)=>{for(const f of G[key].filter(visible))html+=`<path d="${path(f.geometry)}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" fill-rule="evenodd"/>`;};
 paint('water','#b9dbe4','none',0);
 if(!overview&&$('showBuildings').checked)paint('buildings','#c9d0c7','none',0);
 if($('showParks').checked)paint('parks','#85b895','#639675',0.5);
 if($('showRoads').checked)paint('roads','none','#fff',overview?0.5:1.2);
 for(const f of G.streets.filter(visible))html+=`<path data-street="${f.properties.id}" tabindex="0" role="button" aria-label="选择${esc(f.properties.name)}" d="${path(f.geometry)}" fill="${f===feature?'#edb76322':'transparent'}" stroke="${f===feature?'#b46d27':'#778c7b'}" stroke-width="${f===feature?2.5:0.8}" fill-rule="evenodd"><title>${esc(f.properties.name)}</title></path>`;
 html+=`<rect x="15" y="15" width="270" height="33" rx="7" fill="white" fill-opacity=".92"/><text x="28" y="37" font-size="15" fill="#254536">${esc(overview?'兰州市主城区 · 点击边界选择':feature.properties.name+' · 街道浏览范围')}</text><text x="870" y="33" text-anchor="middle" fill="#254536">↑ N</text><text x="20" y="450" font-size="12" fill="#516553">WGS84 经纬度 · 真实地理图层 · 非温度分布图</text>`;
 $('geoMap').innerHTML=html;$('extent').textContent=overview?'聚焦选中街道':'查看主城区';
 $('geoCaption').textContent=`当前：${feature.properties.district} / ${feature.properties.name}。街道用于浏览与筛选；具体公共空间、措施位置及权属尚待选定。`;
 }
 function update(){const f=G.streets.find(f=>f.properties.id===sid),r=decision();$('regionTitle').textContent=f.properties.district+' · '+f.properties.name;
 $('recommendation').innerHTML=r?`<span class="tag">满足当前预算的目标匹配方案</span><h2>${esc(r.name)}</h2><p>建设 ${money(r.capex)}<br>${state.years}年评价期费用 ${money(r.total)}</p><p>先按更新目标筛选，再按评价期费用从低到高排列。当前候选为费用最低的匹配方案。</p>`:'<h2>当前预算下暂无匹配方案</h2><p>可以调整工程量或预算。此处不会自动推荐超预算方案。</p>';
 $('applyCandidate').disabled=!r;
 const a=M.service(data,state,state.hour),normal=M.service(data,{...state,outage:false,temporary:false},state.hour),backup=M.service(data,{...state,temporary:true,tempStart:Math.min(state.hour,state.tempStart)},state.hour);
 $('emergencyDecision').textContent=`${state.hour}:00，当前响应未获服务 ${a.gap} 人；相同需求与响应比例下，A正常、C不开时缺口 ${normal.gap} 人；若C在此时开放，缺口 ${backup.gap} 人。${a.gap?'应优先核实备用服务容量与开放时间。':'当前假设容量满足响应需求，仍需核查可达性。'}`;
 }
 $('streetSelect').onchange=()=>{sid=Number($('streetSelect').value);overview=false;syncQuery();draw();update();};
 $('priority').onchange=()=>{priority=$('priority').value;syncQuery();update();};
 $('extent').onclick=()=>{overview=!overview;draw();};
 ['showParks','showRoads','showBuildings'].forEach(id=>$(id).onchange=draw);
 function selectMap(e){const f=e.target.closest('[data-street]');if(f){sid=Number(f.dataset.street);$('streetSelect').value=sid;overview=false;syncQuery();draw();update();}}
 $('geoMap').onclick=selectMap;$('geoMap').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectMap(e);}};
 $('applyCandidate').onclick=()=>{const r=decision();if(r){state.scenario=r.id;render();$('workspace').scrollIntoView({behavior:'smooth'});}};
 $('decisionExport').onclick=()=>{const f=G.streets.find(f=>f.properties.id===sid),r=decision();download('Cooler-cities-决策说明.json',JSON.stringify({type:'cooler-decision-v1',region:f.properties,priority,budgetYuan:state.budget*10000,candidate:r,scenario:pack(),serviceDiscussion:$('emergencyDecision').textContent,limitations:'街道为浏览范围，不代表实际干预边界；费用、需求与容量为当前输入；热环境未接入时不能判断最优降温措施；未开展空间可达性分析。'},null,2),'application/json');};
 document.addEventListener('cooler-render',update);syncQuery();draw();update();
})();
