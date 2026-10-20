(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SitingModel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function distance(a,b){const rad=Math.PI/180,p1=a[1]*rad,p2=b[1]*rad,dp=(b[1]-a[1])*rad,dl=(b[0]-a[0])*rad;return 6371000*2*Math.asin(Math.sqrt(Math.min(1,Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2)));}
 function evaluate(street,sites,settings){
  const {radius,participation,capacity,failed}=settings;
  if(!Number.isFinite(radius)||radius<100||radius>500||participation<0||participation>100||!Number.isFinite(participation)||capacity<0||!Number.isFinite(capacity))throw Error('选址参数超出范围');
  for(const s of sites)if((s.capacity!==undefined&&(!Number.isFinite(s.capacity)||s.capacity<0))||(s.radius!==undefined&&(!Number.isFinite(s.radius)||s.radius<100||s.radius>500)))throw Error('设施参数超出范围');
  const off=Array.isArray(failed)?failed:[failed];
  const active=sites.filter(s=>!off.includes(s.id)&&s.open!==false),assigned=active.map(()=>0);let covered=0,total=0;
  for(const c of street.cells){total+=c[2];let nearest=-1,best=Infinity;active.forEach((s,i)=>{const d=distance(c,[s.lon,s.lat]);if(d<=(s.radius??radius)+1e-8&&d<best){best=d;nearest=i;}});if(nearest>=0){covered+=c[2];assigned[nearest]+=c[2]*participation/100;}}
  const demand=total*participation/100,served=assigned.reduce((a,n,i)=>a+Math.min(n,active[i].capacity??capacity),0),coveredDemand=covered*participation/100;
  return {population:total,covered,coverage:total?covered/total:0,demand,served,gap:Math.max(0,demand-served),outside:Math.max(0,demand-coveredDemand),overflow:Math.max(0,coveredDemand-served),assigned:active.map((s,i)=>({id:s.id,demand:assigned[i],served:Math.min(assigned[i],s.capacity??capacity)}))};
 }
 function combinations(sites){const list=sites.map(s=>[s]);for(let i=0;i<sites.length;i++)for(let j=i+1;j<sites.length;j++)list.push([sites[i],sites[j]]);return list;}
 function insideRing(p,r){let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
 function contains(p,g){const polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];return polys.some(r=>insideRing(p,r[0])&&!r.slice(1).some(h=>insideRing(p,h)));}
 return {distance,evaluate,combinations,contains};
});
