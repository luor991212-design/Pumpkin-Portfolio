import React,{useEffect,useLayoutEffect,useMemo,useRef,useState}from'react';
import{createRoot}from'react-dom/client';
import gsap from'gsap';
import projectsData from'./projects.json';
import{AmbientBackground,HeroVisual}from'./visual-system.jsx';
import{MotionDirector,tiltHandlers}from'./motion.jsx';
import'./style.css';
import'./final-system.css';

const projects=projectsData.filter(project=>project.id!=='ai-3');
const categoryMeta=[
  {key:'visual',name:'视觉设计',en:'CAMPAIGN VISUAL',note:'主 KV / 线上传播 / 线下物料'},
  {key:'brand',name:'品牌设计',en:'BRAND IDENTITY',note:'标识系统 / VI 应用 / 品牌触点'},
  {key:'type',name:'标志 & 字体设计',en:'LOGO & TYPE',note:'标志构成 / 字形结构 / 视觉语言'},
  {key:'poster',name:'海报设计',en:'POSTER DESIGN',note:'汽车品牌 / 消费品牌 / 视觉传播'},
  {key:'ai',name:'AI 协同设计',en:'AI COLLABORATION',note:'Prompt 协作 / 人工精修 / 规模化适配'},
];
const experience=[
  {date:'2026.02 — 2026.09',name:'重庆麦芽传媒有限公司',role:'平面设计师 · 海外视觉方向',text:'负责海外多语种海报规模化设计，覆盖 16 种语种；建立人工与 AI 协同工作流，并承接弹窗、商店图及差异化海报等专项视觉。'},
  {date:'2025.08 — 2026.01',name:'杭州腾云广告有限公司',role:'平面设计师 · 汽车整合营销',text:'服务吉利、理想、东风奕派、阿维塔、起亚等品牌，独立完成主 KV、线上传播与线下落地物料的全案视觉设计。'},
  {date:'2022.07 — 2025.07',name:'上海新赞文化传播有限公司',role:'平面设计师 · 品牌视觉',text:'负责品牌标识、VI 应用、产品包装与宣传品设计，适配线上线下多场景，维护品牌表达的一致性。'},
];
const metrics=[['500+','年均作品','ANNUAL OUTPUT'],['95%+','客户满意度','CLIENT SATISFACTION'],['20%','点击率提升','CTR INCREASE'],['50%','效率提升','EFFICIENCY'],['4+','全职经验','YEARS EXPERIENCE']];
const skills=[
  ['brand','01','品牌视觉设计','Brand identity','从品牌标识到 VI 应用，建立清晰、一致且可延展的视觉系统。'],
  ['campaign','02','整合营销活动视觉','Campaign design','主 KV、线上宣传与现场物料一体化，让创意落实到每一个触点。'],
  ['language','03','多语种海报规模化设计','Multilingual design','兼顾不同语言的排版与表达，在多任务并行中保持设计一致性。'],
  ['ai','04','AI 协同设计','AI collaboration','通过 Prompt 协作、方向筛选与人工精修，优化从创意到交付的流程。'],
  ['print','05','印刷与线下物料落地','Design to production','熟悉印刷与现场物料需求，让屏幕上的设计准确走向真实空间。'],
  ['team','06','跨团队协作与高效交付','Creative collaboration','拆解需求、协调反馈与交付节奏，支持高并发、多任务设计工作。'],
];
const automotive=new Set(['阿维塔','东风','海狮','吉利','理想','起亚']);

function Signature(){return <span className="signature">Pumpkin<span>.</span></span>}
function SectionTitle({num,english,title,children}){return <div className="section-heading" data-reveal><div><div className="eyebrow"><span>{num}</span> / {english}</div><h2>{title}</h2></div>{children&&<p>{children}</p>}</div>}
function roundedPoint(distance,width,height,radius){
  const r=Math.max(0,Math.min(radius,width/2,height/2)),straightX=width-r*2,straightY=height-r*2,arc=Math.PI*r/2,perimeter=2*(straightX+straightY)+4*arc;
  let d=((distance%perimeter)+perimeter)%perimeter;
  if(d<=straightX)return{x:r+d,y:0};d-=straightX;
  if(d<=arc){const a=-Math.PI/2+d/r;return{x:width-r+Math.cos(a)*r,y:r+Math.sin(a)*r}}d-=arc;
  if(d<=straightY)return{x:width,y:r+d};d-=straightY;
  if(d<=arc){const a=d/r;return{x:width-r+Math.cos(a)*r,y:height-r+Math.sin(a)*r}}d-=arc;
  if(d<=straightX)return{x:width-r-d,y:height};d-=straightX;
  if(d<=arc){const a=Math.PI/2+d/r;return{x:r+Math.cos(a)*r,y:height-r+Math.sin(a)*r}}d-=arc;
  if(d<=straightY)return{x:0,y:height-r-d};d-=straightY;
  const a=Math.PI+d/r;return{x:r+Math.cos(a)*r,y:r+Math.sin(a)*r};
}
function haloPerimeter(width,height,radius){const r=Math.max(0,Math.min(radius,width/2,height/2));return 2*(width+height-4*r)+2*Math.PI*r}
function traceHaloSegment(ctx,center,length,width,height,radius,pad){
  const steps=Math.min(180,Math.max(30,Math.ceil(length/3)));ctx.beginPath();
  for(let i=0;i<=steps;i++){const p=roundedPoint(center-length/2+length*i/steps,width,height,radius),x=p.x+pad,y=p.y+pad;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}
}
function drawTaperedHalo(ctx,center,length,width,height,radius,pad){
  const steps=240;ctx.lineCap='round';
  for(let i=0;i<steps;i++){
    const a=-length/2+length*i/steps,b=-length/2+length*(i+1)/steps,t=(i+0.5)/steps,k=Math.sin(Math.PI*t),intensity=k*k;
    if(intensity<.02)continue;
    const p1=roundedPoint(center+a,width,height,radius),p2=roundedPoint(center+b,width,height,radius);
    ctx.beginPath();ctx.moveTo(p1.x+pad,p1.y+pad);ctx.lineTo(p2.x+pad,p2.y+pad);
    ctx.lineWidth=2*intensity;ctx.strokeStyle=`rgba(255,255,255,${.95*intensity})`;ctx.stroke();
  }
}
function CardHalo(){
  const canvasRef=useRef(null);
  useEffect(()=>{
    const canvas=canvasRef.current,parent=canvas?.parentElement;if(!canvas||!parent)return;
    const ctx=canvas.getContext('2d'),pad=96,duration=7600,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const off=document.createElement('canvas'),offCtx=off.getContext('2d');
    let width=0,height=0,radius=22,frame=0,active=false,phase=0,started=0;
    const resize=()=>{width=parent.clientWidth;height=parent.clientHeight;radius=parseFloat(getComputedStyle(parent).getPropertyValue('--halo-radius'))||22;const dpr=Math.min(devicePixelRatio||1,1.35),cw=width+pad*2,ch=height+pad*2;canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);off.width=canvas.width;off.height=canvas.height;ctx.setTransform(dpr,0,0,dpr,0,0);offCtx.setTransform(dpr,0,0,dpr,0,0);draw(performance.now())};
    const drawGlow=(c,center,length,inside)=>{c.save();c.beginPath();if(inside){c.roundRect(pad,pad,width,height,radius);c.clip()}else{c.rect(0,0,width+pad*2,height+pad*2);c.roundRect(pad,pad,width,height,radius);c.clip('evenodd')}c.lineCap='butt';const steps=20;for(let i=0;i<steps;i++){const a=-length/2+length*i/steps,b=-length/2+length*(i+1)/steps,t=(i+0.5)/steps,k=Math.sin(Math.PI*t),intensity=k*k;if(intensity<.03)continue;const p1=roundedPoint(center+a,width,height,radius),p2=roundedPoint(center+b,width,height,radius);c.beginPath();c.moveTo(p1.x+pad,p1.y+pad);c.lineTo(p2.x+pad,p2.y+pad);if(inside){c.lineWidth=80*intensity;c.strokeStyle=`rgba(134,198,255,${.05*intensity})`;c.stroke();c.lineWidth=30*intensity;c.strokeStyle=`rgba(170,215,255,${.1*intensity})`;c.stroke()}else{c.lineWidth=90*intensity;c.strokeStyle=`rgba(6,29,91,${.05*intensity})`;c.stroke();c.lineWidth=36*intensity;c.strokeStyle=`rgba(10,43,116,${.1*intensity})`;c.stroke()}}c.restore()};
    const draw=now=>{if(!width||!height)return;offCtx.clearRect(0,0,width+pad*2,height+pad*2);const perimeter=haloPerimeter(width,height,radius),elapsed=active?(now-started)/duration:0,progress=(phase+elapsed)%1,center=progress*perimeter,length=perimeter*.14;for(const lightCenter of[center,center+perimeter/2]){drawTaperedHalo(offCtx,lightCenter,length,width,height,radius,pad)}ctx.clearRect(0,0,width+pad*2,height+pad*2);ctx.drawImage(off,0,0,width+pad*2,height+pad*2);if(active&&!reduced)frame=requestAnimationFrame(draw)};
    const start=()=>{if(active)return;active=true;started=performance.now();cancelAnimationFrame(frame);draw(started)};
    const stop=()=>{if(!active)return;phase=(phase+(performance.now()-started)/duration)%1;active=false;cancelAnimationFrame(frame);draw(performance.now())};
    const focusOut=event=>{if(!parent.contains(event.relatedTarget))stop()};
    const observer=new ResizeObserver(resize);observer.observe(parent);parent.addEventListener('pointerenter',start);parent.addEventListener('pointerleave',stop);parent.addEventListener('focusin',start);parent.addEventListener('focusout',focusOut);resize();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();parent.removeEventListener('pointerenter',start);parent.removeEventListener('pointerleave',stop);parent.removeEventListener('focusin',start);parent.removeEventListener('focusout',focusOut)};
  },[]);
  return <canvas ref={canvasRef} className="card-halo" aria-hidden="true"/>;
}
function SkillIcon({type}){const common={fill:'none',stroke:'currentColor',strokeWidth:'1.6',strokeLinecap:'round',strokeLinejoin:'round'};return <svg className="skill-icon" viewBox="0 0 48 48" aria-hidden="true" {...common}>{type==='brand'&&<><path d="M13 34 24 10l11 24-11-5-11 5Z"/><circle cx="24" cy="23" r="4"/></>}{type==='campaign'&&<><rect x="9" y="12" width="24" height="20" rx="3"/><path d="m16 25 5-6 5 5 4-4 9 12M35 15h4v21H16v-3"/></>}{type==='language'&&<><circle cx="24" cy="24" r="16"/><path d="M8 24h32M24 8c6 6 6 26 0 32M24 8c-6 6-6 26 0 32"/></>}{type==='ai'&&<><path d="M17 15a7 7 0 0 1 14 0 7 7 0 0 1 2 13 7 7 0 0 1-9 9 7 7 0 0 1-9-9 7 7 0 0 1 2-13Z"/><path d="M24 12v24M16 22h16M18 31h12"/></>}{type==='print'&&<><path d="M14 17V9h20v8M14 34H9V19h30v15h-5M14 28h20v11H14z"/><path d="M34 23h1"/></>}{type==='team'&&<><circle cx="17" cy="19" r="5"/><circle cx="32" cy="17" r="4"/><path d="M8 38c1-8 4-12 9-12s8 4 9 12M27 27c7-3 12 1 13 9"/></>}</svg>}

function Hero(){
  const root=useRef(null),lock=useRef(false),stageRef=useRef(0),sceneTimer=useRef(null),routeTimer=useRef(null),previousScene=useRef(0),sceneReady=useRef(false);
  const[stage,setStage]=useState(0),[textStage,setTextStage]=useState(0);stageRef.current=stage;
  const moveTo=target=>{const current=stageRef.current,longTransition=Math.min(current,target)===1&&Math.max(current,target)===2,duration=longTransition?2440:1840;lock.current=true;setTextStage(null);setStage(target);clearTimeout(sceneTimer.current);return duration};
  const cueScene=actualStage=>{if(actualStage===stageRef.current)setTextStage(actualStage)};
  const settleScene=actualStage=>{if(actualStage!==stageRef.current){stageRef.current=actualStage;setStage(actualStage)}setTextStage(actualStage);clearTimeout(sceneTimer.current);sceneTimer.current=setTimeout(()=>{lock.current=false},180)};
  const go=next=>{const target=Math.max(0,Math.min(2,next)),current=stageRef.current;if(target===current)return;clearTimeout(routeTimer.current);if(Math.abs(target-current)>1){const middle=current+Math.sign(target-current),delay=moveTo(middle);routeTimer.current=setTimeout(()=>{lock.current=false;moveTo(target)},delay)}else moveTo(target)};
  useEffect(()=>{
    const wheel=e=>{const rect=root.current?.getBoundingClientRect();if(!rect||Math.abs(rect.top)>8)return;if(lock.current){e.preventDefault();return}if(Math.abs(e.deltaY)<3)return;const direction=Math.sign(e.deltaY);if(direction<0&&stageRef.current===0)return;if(direction>0&&stageRef.current===2)return;e.preventDefault();go(stageRef.current+direction)};
    const key=e=>{if(scrollY>8||!['ArrowDown','ArrowUp','PageDown','PageUp',' '].includes(e.key))return;if(lock.current){e.preventDefault();return}const direction=['ArrowUp','PageUp'].includes(e.key)?-1:1;if(direction<0&&stageRef.current===0)return;if(direction>0&&stageRef.current===2)return;e.preventDefault();go(stageRef.current+direction)};
    addEventListener('wheel',wheel,{passive:false});addEventListener('keydown',key);return()=>{removeEventListener('wheel',wheel);removeEventListener('keydown',key);clearTimeout(sceneTimer.current);clearTimeout(routeTimer.current)};
  },[]);
  useLayoutEffect(()=>{
    const scenes=[...root.current.querySelectorAll('.hero-scene')],previousIndex=previousScene.current,active=textStage===null?null:scenes[textStage],previous=scenes[previousIndex];
    gsap.killTweensOf(scenes);
    if(!sceneReady.current){
      gsap.set(scenes,{autoAlpha:0});
      gsap.fromTo(active,{autoAlpha:0,y:38,scaleY:.97},{autoAlpha:1,y:0,scaleY:1,duration:.88,delay:.1,ease:'expo.out'});
      sceneReady.current=true;
    }else if(textStage===null){
      gsap.set(scenes.filter((_,index)=>index!==previousIndex),{autoAlpha:0});
      if(previous)gsap.to(previous,{autoAlpha:0,y:-22,scaleY:.98,duration:.3,ease:'power3.in'});
    }else{
      gsap.set(scenes.filter((_,index)=>index!==textStage),{autoAlpha:0});
      const direction=textStage>previousIndex?1:-1;
      gsap.fromTo(active,{autoAlpha:0,y:38*direction,scaleY:.97},{autoAlpha:1,y:0,scaleY:1,duration:.9,ease:'expo.out'});
      previousScene.current=textStage;
    }
    return()=>gsap.killTweensOf(scenes);
  },[textStage]);
  const visibleStage=textStage??previousScene.current;
  return <section id="home" className={`hero stage-${stage}`} ref={root} aria-label="三幕个人介绍首页"><HeroVisual stage={stage} onTextCue={cueScene} onSettled={settleScene}/><div className="hero-shade"/><div className="hero-caption"><span>INDEPENDENT VISION. SHARED POSSIBILITIES.</span><span>PORTFOLIO — 2026</span></div>
    <div className="hero-scene hero-intro"><div className="eyebrow">LUO RUI / PUMPKIN</div><h1>罗睿<span>/</span><small>平面设计师</small></h1><p>品牌与营销视觉设计 · AI 协同设计实践者</p></div>
    <div className="hero-scene hero-about"><div className="eyebrow">01 / ABOUT ME</div><h2>以视觉建立连接，<br/>用创意拓展可能。</h2><p>4 年品牌与营销设计经验。从品牌视觉、整合营销活动全案，到多语种海报与 AI<br/>协同设计，让每一次表达清晰而有力量。</p><div><span>品牌视觉</span><span>营销全案</span><span>AI 协同</span></div></div>
    <div className="hero-scene hero-experience"><div className="eyebrow">02 / EXPERIENCE</div><h2>从品牌表达，<br/>到完整的视觉体验。</h2><div className="hero-timeline">{experience.map(item=><div key={item.name}><span>{item.date}</span><strong>{item.name}</strong><p>{item.role}</p></div>)}</div><a href="#work" className="text-link">探索我的作品</a></div>
    <div className="hero-controls"><div className="hero-ornament" aria-hidden="true"><span>VISUAL ARCHIVE</span><i/><small>LUO RUI · FRAME 0{visibleStage+1}</small></div><span className="hero-code">DESIGN × AI WORKFLOW</span></div>
  </section>;
}

function previewImages(items,key){
  const all=items.flatMap(project=>project.images.map(image=>({...image,projectId:project.id,projectTitle:project.title})));
  const usable=all.filter(image=>image.width/image.height>1.28&&image.width/image.height<3.4);
  if(key==='ai'||!usable.length)return all.slice(0,3);
  return[usable.find(image=>key!=='poster'||image.projectTitle==='理想')||usable[0]];
}
function CategoryCard({meta,items,index,onOpen}){
  const previews=previewImages(items,meta.key),groups=meta.key==='poster'?[items.filter(item=>automotive.has(item.title)),items.filter(item=>!automotive.has(item.title))]:[items];
  return <div className="flow-card-shell" style={{'--index':index}} {...tiltHandlers()}><CardHalo/><article className={`category-card category-card-${meta.key}`}><div className={`category-media ${previews.length>1?'is-collage':''}`}>{previews.map((image,i)=><img key={image.src} src={image.src} alt="" loading="lazy" style={{'--preview':i}}/>)}</div><div className="category-panel"><div className="category-copy"><small>{meta.en}</small><h3>{meta.name}</h3><p>{meta.note}</p><em>{items.length.toString().padStart(2,'0')} PROJECTS</em></div><div className="category-projects">{groups.map((projectsInGroup,groupIndex)=><div className="project-group" key={groupIndex}><div>{projectsInGroup.map(item=><button key={item.id} onClick={()=>onOpen(item)}>{item.title}</button>)}</div></div>)}</div></div></article></div>;
}

function artworkLayout(project,image,sectionLength){
  const ratio=image.width/image.height,name=image.name;
  if(project.category==='brand')return'layout-wide';
  if(project.category==='type')return'layout-half';
  if(project.category==='poster')return ratio>1.25?'layout-wide':project.title==='东风'?'layout-half':'layout-third';
  if(project.id==='ai-1')return'layout-half';
  if(project.id==='ai-2')return'layout-third';
  if(project.category==='visual'){
    if(sectionLength===1)return'layout-wide';
    if(project.id==='visual-1'&&/画架\d+|拍照打卡框/.test(name))return'layout-third';
    if(/道旗|入园指引/.test(name))return'layout-half';
    if(/手举牌/i.test(name))return'layout-wide';
  }
  if(ratio>2||ratio<.25)return'layout-wide';
  if(ratio<.72)return'layout-third';
  return'layout-half';
}
function EditorialGallery({project}){
  const sections=[...new Set(project.images.map(image=>image.section))];
  return <div className={`project-gallery gallery-${project.category} gallery-${project.id}`}>{sections.map((section,sectionIndex)=>{const images=project.images.filter(image=>image.section===section);return <section className="gallery-section" key={section}><header><span>0{sectionIndex+1}</span><h3>{section}</h3><i>{String(images.length).padStart(2,'0')} IMAGES</i></header><div className="editorial-grid">{images.map(image=><figure className={`artwork ${artworkLayout(project,image,images.length)}`} key={image.src}><div className="artwork-reveal"><img src={image.src} alt={`${project.title} — ${image.name}`} width={image.width} height={image.height} loading={sectionIndex===0?'eager':'lazy'}/></div>{project.category==='visual'&&<figcaption>{image.name}</figcaption>}</figure>)}</div></section>})}</div>;
}

function ProjectModal({project,onClose,onNavigate}){
  const dialog=useRef(null),scroller=useRef(null),closing=useRef(false);
  const reduced=useRef(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const requestClose=()=>{if(closing.current)return;if(reduced.current){onClose();return}closing.current=true;const node=dialog.current,shell=node.querySelector('.dialog-shell'),background=node.querySelector('.modal-background');node.classList.add('is-closing');gsap.timeline({onComplete:onClose}).to(shell,{y:72,scale:.91,autoAlpha:0,filter:'blur(8px)',borderRadius:'34px',duration:.52,ease:'power3.in'},0).to(background,{scale:1.08,autoAlpha:0,duration:.5,ease:'power2.in'},0).to(node,{autoAlpha:0,duration:.42,ease:'power2.in'},.1)};
  useEffect(()=>{const node=dialog.current,active=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';node.showModal();if(reduced.current)gsap.set(node,{autoAlpha:1});else{const shell=node.querySelector('.dialog-shell'),background=node.querySelector('.modal-background');gsap.set(node,{autoAlpha:1});gsap.fromTo(shell,{y:78,scale:.9,autoAlpha:0,filter:'blur(10px)',borderRadius:'38px'},{y:0,scale:1,autoAlpha:1,filter:'blur(0px)',borderRadius:'0px',duration:.72,ease:'expo.out'});gsap.fromTo(background,{scale:1.1,autoAlpha:0},{scale:1,autoAlpha:1,duration:.75,ease:'power3.out'})}return()=>{gsap.killTweensOf([node,node.querySelector('.dialog-shell'),node.querySelector('.modal-background')]);node.close();document.body.style.overflow=overflow;active?.focus({preventScroll:true})}},[]);
  useEffect(()=>{scroller.current?.scrollTo(0,0);const context=gsap.context(()=>{gsap.fromTo('.project-detail-heading>*',{y:54,clipPath:'inset(0 0 100% 0)'},{y:0,clipPath:'inset(0 0 0% 0)',duration:1.05,stagger:.08,ease:'expo.out'});gsap.utils.toArray('.gallery-section').forEach(section=>{const items=section.querySelectorAll('.artwork-reveal');gsap.fromTo(items,{clipPath:'inset(0 0 100% 0)',y:56},{clipPath:'inset(0 0 0% 0)',y:0,duration:1.15,stagger:.07,ease:'expo.out',scrollTrigger:{trigger:section,scroller:scroller.current,start:'top 84%',toggleActions:'play none none reverse'}})})},dialog);return()=>context.revert()},[project.id]);
  const projectIndex=projects.findIndex(item=>item.id===project.id);
  return <dialog ref={dialog} className="project-dialog" aria-labelledby="project-title" onCancel={event=>{event.preventDefault();requestClose()}} onClick={event=>{if(event.target===dialog.current)requestClose()}}><AmbientBackground className="modal-background" scrollRef={scroller}/><div className="dialog-shell"><header className="dialog-header"><span>PUMPKIN / {project.categoryName}</span><button onClick={requestClose} aria-label="关闭项目"><span>关闭</span><svg width="22" height="22" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg></button></header><div className="dialog-scroll" ref={scroller}><div className="project-detail-heading"><div className="eyebrow">SELECTED PROJECT / {project.categoryName}</div><h2 id="project-title">{project.title}</h2><p>{project.description}</p><div className="project-meta"><div><span>项目类别</span><strong>{project.type}</strong></div><div><span>我的职责</span><strong>{project.role}</strong></div><div><span>设计内容</span><strong>{project.tags.join(' / ')}</strong></div></div></div>{project.category==='ai'&&<div className="workflow-note"><span>PROMPT → EXPLORE → REFINE → DELIVER</span><p>需求拆解与 Prompt 协作 → 视觉方向探索 → 人工精修与排版 → 多语种及多尺寸适配</p><small>AI 参与视觉素材探索，最终画面由设计判断、精修与版式设计共同完成。</small></div>}<EditorialGallery project={project}/><div className="project-outro"><span>THANK YOU FOR WATCHING</span><h3>{project.title}</h3><div><button onClick={requestClose}>返回作品集</button><button onClick={()=>onNavigate(projects[(projectIndex+1)%projects.length])}>下一个项目</button></div></div></div></div></dialog>;
}
function ExperienceCard({item}){return <article className="experience-card" {...tiltHandlers()}><CardHalo/><div className="experience-top"><time>{item.date}</time></div><h3>{item.name}</h3><div className="experience-detail"><h4>{item.role}</h4><p>{item.text}</p><span>VIEW EXPERIENCE</span></div></article>}

function App(){
  const[project,setProject]=useState(null),[toast,setToast]=useState(''),[scrolled,setScrolled]=useState(false);const toastTimer=useRef(null);
  const categoryGroups=useMemo(()=>categoryMeta.map(meta=>({...meta,items:projects.filter(project=>project.category===meta.key)})),[]);
  useLayoutEffect(()=>{const previous=history.scrollRestoration;history.scrollRestoration='manual';const reset=()=>scrollTo({top:0,left:0,behavior:'instant'});reset();requestAnimationFrame(reset);const timers=[80,260,720].map(delay=>setTimeout(reset,delay));addEventListener('pageshow',reset);return()=>{timers.forEach(clearTimeout);removeEventListener('pageshow',reset);history.scrollRestoration=previous}},[]);
  useEffect(()=>{const update=()=>setScrolled(scrollY>24);addEventListener('scroll',update,{passive:true});return()=>removeEventListener('scroll',update)},[]);useEffect(()=>()=>clearTimeout(toastTimer.current),[]);
  const copyWechat=async()=>{try{await navigator.clipboard.writeText('CHO_12');setToast('微信号 CHO_12 已复制')}catch{setToast('微信号：CHO_12')}clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),3200)};
  return <>
    <AmbientBackground/>
    <MotionDirector/>
    <a className="skip-link" href="#work">直接浏览作品</a>
    <header className={`site-header ${scrolled?'scrolled':''}`}>
      <a className="brand" href="#home" aria-label="Pumpkin 罗睿，返回首页"><Signature/><span>VISUAL DESIGNER</span></a>
      <nav aria-label="主导航"><a href="#home">首页<span>HOME</span></a><a href="#work">作品<span>WORK</span></a><a href="#about">关于<span>ABOUT</span></a></nav>
    </header>
    <main>
      <Hero/>
      <section id="work" className="work-section section-wrap">
        <SectionTitle num="01" english="SELECTED WORK" title={<>五种视角，<span>构成我的设计实践。</span></>}>选择一个项目，进入独立案例空间。<br/>横向卡片保留更完整的作品画面。</SectionTitle>
        <div className="category-list" data-stagger>{categoryGroups.map((group,index)=><CategoryCard key={group.key} meta={group} items={group.items} index={index} onOpen={setProject}/>)}</div>
      </section>
      <section id="about" className="about-section section-wrap">
        <SectionTitle num="02" english="ABOUT / EXPERIENCE" title={<>保持好奇，<span>持续创造。</span></>}/>
        <div className="about-intro" data-compress><CardHalo/><div className="portrait-wrap parallax-media"><img src="/media/portrait-transparent.png" alt="罗睿的个人头像" loading="lazy"/><span>LUO RUI / PUMPKIN</span></div><div><h3>罗睿 <small>LUO RUI</small></h3><p className="role">平面设计师 / 视觉设计师</p><p>4 年品牌与营销设计经验，专注品牌视觉、整合营销活动全案、多语种海报与 AI 协同设计。具备高并发多任务交付能力。</p><a href="mailto:1376025974@qq.com">1376025974@qq.com</a></div></div>
        <div className="metric-grid" data-stagger>{metrics.map(([number,label,en])=><article key={label}><CardHalo/><strong>{number}</strong><span>{label}</span><small>{en}</small></article>)}</div>
        <div className="experience-grid" data-stagger>{experience.map(item=><ExperienceCard key={item.name} item={item}/>)}</div>
      </section>
      <section id="skills" className="skills-section section-wrap">
        <SectionTitle num="03" english="WHAT I BRING" title={<>创意之外，<span>是可靠的执行。</span></>}/>
        <div className="skills-grid" data-stagger>{skills.map(([icon,n,t,en,d])=><article key={n}><CardHalo/><div className="skill-top"><span>{n}</span><SkillIcon type={icon}/></div><h3>{t}</h3><small>{en}</small><p>{d}</p></article>)}</div>
      </section>
      <footer id="contact" className="contact-section">
        <div className="contact-content section-wrap" data-reveal><div className="contact-lead"><div className="eyebrow">HAVE A PROJECT IN MIND?</div><h2><span className="contact-title-line contact-title-white">下一个好想法<span className="contact-punctuation">，</span></span><span className="contact-title-line contact-title-accent">一起实现<span className="contact-punctuation">。</span></span></h2></div><div className="contact-actions"><div className="contact-primary"><a className="email-link" href="mailto:1376025974@qq.com"><span>EMAIL</span>1376025974@qq.com</a><a href="tel:18581501407"><span>PHONE</span>185 8150 1407</a><button onClick={copyWechat}><span>WECHAT · 点击复制</span>CHO_12</button></div><a className="contact-portfolio" href="#work">浏览作品</a></div></div>
        <div className="footer-bottom section-wrap"><strong>PUMPKIN</strong><span>© {new Date().getFullYear()} 罗睿 · PUMPKIN</span><a href="#home">回到顶部</a></div>
      </footer>
    </main>
    {project&&<ProjectModal project={project} onClose={()=>setProject(null)} onNavigate={setProject}/>}<div className={`toast ${toast?'visible':''}`} role="status">{toast}</div>
  </>;
}

createRoot(document.getElementById('root')).render(<App/>);
