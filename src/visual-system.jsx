import React, { useEffect, useRef } from 'react';
import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react';

const vertex=`attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.,1.);}`;
const TRAIL_POINTS=16;

function makeProgram(gl,fragment){
  const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
  const program=gl.createProgram(),vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const location=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
  return{program,buffer,vs,fs};
}

function createTrail(){return{data:new Float32Array(TRAIL_POINTS*4),next:0,previousX:null,previousY:null,lastEmit:0,activeUntil:0};}
function insertDrop(trail,x,y,now,power){const i=(trail.next++%TRAIL_POINTS)*4;trail.data[i]=x;trail.data[i+1]=y;trail.data[i+2]=now;trail.data[i+3]=power;trail.activeUntil=now+2.4;}
function recordTrail(trail,clientX,clientY,rect,now){
  const x=clientX-rect.left,y=clientY-rect.top;
  if(x<0||x>rect.width||y<0||y>rect.height){trail.previousX=null;trail.previousY=null;return{dx:0,dy:0,active:false};}
  const px=trail.previousX,py=trail.previousY;trail.previousX=x;trail.previousY=y;
  if(px===null||now-trail.lastEmit<.028)return{dx:0,dy:0,active:true};
  const dx=x-px,dy=y-py,distance=Math.hypot(dx,dy);if(distance<2)return{dx,dy,active:true};
  const steps=Math.min(4,Math.max(1,Math.ceil(distance/22))),power=Math.min(1,.34+distance/38);
  for(let step=1;step<=steps;step+=1){const amount=step/steps;insertDrop(trail,(px+dx*amount)/rect.width,1-(py+dy*amount)/rect.height,now-(steps-step)*.008,power);}
  trail.lastEmit=now;return{dx,dy,active:true};
}
function releaseTrail(trail){trail.previousX=null;trail.previousY=null;}

export function AmbientBackground({className='ambient-background',scrollRef=null}){
  const rootRef=useRef(null);
  const density=typeof window!=='undefined'&&innerWidth<760 ? .85 : 1.2;
  return <div className={className} ref={rootRef} aria-hidden="true"><div className="shader-gradient-plane"><ShaderGradientCanvas style={{position:'absolute',inset:0}} pixelDensity={density} fov={45} pointerEvents="none" lazyLoad={false} powerPreference="high-performance"><ShaderGradient control="props" animate="on" brightness={1.1} cAzimuthAngle={182} cDistance={3.91} cPolarAngle={97} cameraZoom={1} color1="#0b1c45" color2="#050a89" color3="#050729" envPreset="city" grain="off" lightType="3d" positionX={-.5} positionY={.1} positionZ={0} range="disabled" rangeEnd={40} rangeStart={0} reflection={.1} rotationX={10} rotationY={10} rotationZ={235} shader="defaults" type="waterPlane" uAmplitude={0} uDensity={1.6} uFrequency={5.5} uSpeed={.2} uStrength={1.3} uTime={.2} wireframe={false} zoomOut={false} toggleAxis={false}/></ShaderGradientCanvas></div><PointerFlowLayer hostRef={rootRef}/></div>;
}

const FLOW_POINTS=24;
function PointerFlowLayer({hostRef}){
  const canvasRef=useRef(null);
  useEffect(()=>{
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const canvas=canvasRef.current,host=hostRef.current,gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,powerPreference:'high-performance'});if(!gl)return;
    const fragment=`precision highp float;
      uniform vec2 u_resolution;uniform float u_time;uniform vec4 u_drops[24];
      void main(){vec2 uv=gl_FragCoord.xy/u_resolution;float aspect=u_resolution.x/max(u_resolution.y,1.0);float light=0.0;float body=0.0;
        for(int i=0;i<24;i++){float age=u_time-u_drops[i].z;if(age>0.0&&age<3.2&&u_drops[i].w>0.0){vec2 delta=uv-u_drops[i].xy;delta.x*=aspect;float dist=length(delta);float front=age*.037;float life=1.0-smoothstep(1.15,3.15,age);float decay=exp(-age*.72)*life*life*u_drops[i].w;float ring=exp(-pow((dist-front)*82.0,2.0));float wake=sin((dist-age*.026)*112.0)*exp(-dist*dist*72.0);light+=(ring*.72+abs(wake)*.22)*decay;body+=wake*decay;}}
        float alpha=clamp(light*.16+abs(body)*.026,0.0,.18);vec3 tint=mix(vec3(.38,.65,.96),vec3(.88,.95,1.0),clamp(light,0.0,1.0));gl_FragColor=vec4(tint,alpha);}`;
    let resources;try{resources=makeProgram(gl,fragment);}catch(error){console.error('Pointer flow:',error);return;}
    const uResolution=gl.getUniformLocation(resources.program,'u_resolution'),uTime=gl.getUniformLocation(resources.program,'u_time'),uDrops=gl.getUniformLocation(resources.program,'u_drops[0]');
    const trail={data:new Float32Array(FLOW_POINTS*4),next:0,previousX:null,previousY:null,lastEmit:0,activeUntil:0};
    let raf=0,width=1,height=1,lastFrame=0,cleared=true;
    const resize=()=>{const rect=host.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.25);width=Math.max(rect.width,1);height=Math.max(rect.height,1);canvas.width=Math.max(1,Math.round(width*dpr));canvas.height=Math.max(1,Math.round(height*dpr));gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(uResolution,canvas.width,canvas.height);};
    const emit=(x,y,now,power)=>{const i=(trail.next++%FLOW_POINTS)*4;trail.data[i]=x;trail.data[i+1]=y;trail.data[i+2]=now;trail.data[i+3]=power;trail.activeUntil=now+3.2;canvas.dataset.flowActive='true';cleared=false;};
    const move=event=>{if(event.pointerType==='touch')return;const rect=host.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;if(x<0||x>rect.width||y<0||y>rect.height){trail.previousX=null;trail.previousY=null;return;}const now=performance.now()/1000,px=trail.previousX,py=trail.previousY;trail.previousX=x;trail.previousY=y;if(px===null||now-trail.lastEmit<.032)return;const dx=x-px,dy=y-py,distance=Math.hypot(dx,dy);if(distance<3)return;const steps=Math.min(3,Math.max(1,Math.ceil(distance/28))),power=Math.min(.68,.2+distance/85);for(let step=1;step<=steps;step+=1){const amount=step/steps;emit((px+dx*amount)/rect.width,1-(py+dy*amount)/rect.height,now-(steps-step)*.01,power);}trail.lastEmit=now;};
    const leave=()=>{trail.previousX=null;trail.previousY=null;};
    const render=ms=>{raf=requestAnimationFrame(render);if(document.hidden||ms-lastFrame<24)return;lastFrame=ms;const now=ms*.001;if(now>trail.activeUntil){if(!cleared){gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);canvas.dataset.flowActive='false';cleared=true;}return;}gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform1f(uTime,now);gl.uniform4fv(uDrops,trail.data);gl.drawArrays(gl.TRIANGLES,0,6);};
    const resizer=new ResizeObserver(resize);resizer.observe(host);addEventListener('pointermove',move,{passive:true});addEventListener('blur',leave);document.documentElement.addEventListener('pointerleave',leave);resize();raf=requestAnimationFrame(render);
    return()=>{cancelAnimationFrame(raf);resizer.disconnect();removeEventListener('pointermove',move);removeEventListener('blur',leave);document.documentElement.removeEventListener('pointerleave',leave);gl.deleteBuffer(resources.buffer);gl.deleteProgram(resources.program);gl.deleteShader(resources.vs);gl.deleteShader(resources.fs);};
  },[hostRef]);
  return <canvas className="pointer-flow-layer" ref={canvasRef}/>;
}

export function HeroVisual({stage,onSettled,onTextCue}){
  const root=useRef(null),canvasRef=useRef(null),t1f=useRef(null),t2f=useRef(null),t1r=useRef(null),t2r=useRef(null),controller=useRef(null),settled=useRef(onSettled),textCue=useRef(onTextCue);settled.current=onSettled;textCue.current=onTextCue;
  useEffect(()=>{
    if(matchMedia('(max-width:760px)').matches){root.current.dataset.playback='static';return;}
    const canvas=canvasRef.current,node=root.current,gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance'});if(!gl){node.dataset.renderer='unavailable';return;}
    const fragment=`precision highp float;
      uniform sampler2D u_image;uniform vec2 u_resolution,u_view,u_imageSize;uniform float u_time;uniform vec4 u_drops[16];
      void main(){vec2 uv=gl_FragCoord.xy/u_resolution;float aspect=u_view.x/max(u_view.y,1.0);vec2 displacement=vec2(0.0);
        for(int i=0;i<16;i++){float age=u_time-u_drops[i].z;if(age>0.0&&age<2.4&&u_drops[i].w>0.0){vec2 delta=uv-u_drops[i].xy;delta.x*=aspect;float dist=length(delta),travel=age*.055;float ring=exp(-pow((dist-travel)*28.0,2.0));float wake=exp(-dist*dist*50.0)*exp(-age*1.55);float life=1.0-smoothstep(.42,2.35,age);float decay=exp(-age*.9)*life*life*u_drops[i].w;vec2 direction=delta/max(dist,.001);direction.x/=aspect;displacement+=direction*(ring*sin((dist-travel)*93.0)*.0123+wake*.0048)*decay;}}
        vec2 displaced=uv+displacement;float cover=max(u_view.x/u_imageSize.x,u_view.y/u_imageSize.y);vec2 crop=u_view/(u_imageSize*cover);vec2 sampleUV=(displaced-.5)*crop+.5;vec3 color=texture2D(u_image,clamp(sampleUV,vec2(.001),vec2(.999))).rgb;float refract=clamp(length(displacement)*25.0,0.0,.16);gl_FragColor=vec4(color+vec3(refract*.34),1.0);}`;
    let resources;try{resources=makeProgram(gl,fragment);}catch(error){console.error('Hero renderer:',error);return;}
    const uniform=name=>gl.getUniformLocation(resources.program,name),uniforms={resolution:uniform('u_resolution'),view:uniform('u_view'),imageSize:uniform('u_imageSize'),time:uniform('u_time'),drops:uniform('u_drops[0]')};
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([2,8,28,255]));gl.uniform1i(uniform('u_image'),0);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,trail=createTrail(),videos={'0-1':t1f.current,'1-2':t2f.current,'2-1':t2r.current,'1-0':t1r.current};
    const stills=['/media/hero-1.webp','/media/hero-2.webp','/media/hero-3.webp'].map(src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;}));
    const ready=new Map(Object.values(videos).map(video=>[video,new Promise((resolve,reject)=>{if(video.readyState>=2){resolve();return;}const done=()=>{cleanup();resolve();},fail=()=>{cleanup();reject(new Error('首页过渡视频未能加载'));},cleanup=()=>{video.removeEventListener('loadeddata',done);video.removeEventListener('error',fail);};video.addEventListener('loadeddata',done,{once:true});video.addEventListener('error',fail,{once:true});})]));
    let raf=0,width=1,height=1,visible=true,dirty=true,playing=false,hasFrame=false,disposed=false,operation=0,currentStage=0,frameHandle=0,frameVideo=null,fallbackTimer=0,lastFrame=0,trailWasActive=false;
    const resize=()=>{const rect=node.getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(devicePixelRatio||1,1.25);canvas.width=Math.max(1,Math.round(width*dpr));canvas.height=Math.max(1,Math.round(height*dpr));gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);gl.uniform2f(uniforms.view,width,height);dirty=true;};
    const upload=(source,mediaTime=0)=>{if(disposed)return;const w=source.videoWidth||source.naturalWidth,h=source.videoHeight||source.naturalHeight;if(!w||!h)return;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.uniform2f(uniforms.imageSize,w,h);hasFrame=true;dirty=true;node.dataset.ready='true';canvas.dataset.mediaTime=Number(mediaTime).toFixed(4);};
    const stopWatch=()=>{if(frameVideo&&frameHandle)frameVideo.cancelVideoFrameCallback?.(frameHandle);clearTimeout(fallbackTimer);frameHandle=0;frameVideo=null;};
    const render=ms=>{raf=requestAnimationFrame(render);if(ms-lastFrame<16||!visible||document.hidden||!hasFrame)return;lastFrame=ms;const trailActive=ms*.001<trail.activeUntil;if(trailWasActive&&!trailActive)dirty=true;trailWasActive=trailActive;canvas.dataset.trailActive=String(trailActive);if(!dirty&&!playing&&!trailActive)return;gl.uniform1f(uniforms.time,ms*.001);gl.uniform4fv(uniforms.drops,trail.data);gl.drawArrays(gl.TRIANGLES,0,6);dirty=false;};
    const move=event=>{if(reduced||event.pointerType==='touch')return;const motion=recordTrail(trail,event.clientX,event.clientY,node.getBoundingClientRect(),performance.now()/1000);if(motion.active)dirty=true;},leave=()=>releaseTrail(trail);
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;dirty=true;});observer.observe(node);const resizer=new ResizeObserver(resize);resizer.observe(node);addEventListener('pointermove',move,{passive:true});addEventListener('blur',leave);document.documentElement.addEventListener('pointerleave',leave);resize();raf=requestAnimationFrame(render);
    const seekStart=async video=>{video.pause();if(video.currentTime<.012&&!video.seeking)return;await new Promise(resolve=>{video.addEventListener('seeked',resolve,{once:true});video.currentTime=0;});};
    const finishAt=(target,token)=>{if(disposed||token!==operation)return;playing=false;stopWatch();Object.values(videos).forEach(video=>video.pause());currentStage=target;node.dataset.playback='held';node.dataset.scene=String(target);dirty=true;settled.current?.(target);};
    const go=async target=>{if(target===currentStage)return;const from=currentStage,video=videos[from+'-'+target];if(!video)return;const token=++operation;stopWatch();Object.values(videos).forEach(item=>item.pause());node.dataset.playback='preparing';
      try{if(reduced){upload(await stills[target],target);textCue.current?.(target);finishAt(target,token);return;}await ready.get(video);await seekStart(video);if(disposed||token!==operation)return;let lastPresented=-1,finished=false,cueSent=false;
        const sendTextCue=()=>{if(cueSent||disposed||token!==operation)return;cueSent=true;canvas.dataset.textCue=String(target);textCue.current?.(target);};
        const finish=()=>{if(finished||disposed||token!==operation)return;finished=true;video.removeEventListener('ended',finish);sendTextCue();finishAt(target,token);};
        const present=(_,metadata)=>{if(finished||disposed||token!==operation)return;const mediaTime=metadata?.mediaTime??video.currentTime;if(mediaTime+.001>=lastPresented){upload(video,mediaTime);lastPresented=mediaTime;}const duration=video.duration;if(!cueSent&&Number.isFinite(duration)&&duration>0&&mediaTime/duration>=.50)sendTextCue();if(video.ended||mediaTime>=duration-.024){finish();return;}schedule();};
        const schedule=()=>{frameVideo=video;if(video.requestVideoFrameCallback)frameHandle=video.requestVideoFrameCallback(present);else fallbackTimer=setTimeout(()=>present(0,{mediaTime:video.currentTime}),16);};
        video.addEventListener('ended',finish,{once:true});playing=true;node.dataset.playback='playing';node.dataset.transition=from+'-'+target;schedule();await video.play();
      }catch(error){if(disposed||token!==operation)return;console.error('Hero playback:',error);upload(await stills[from],from);playing=false;node.dataset.playback='error';textCue.current?.(from);settled.current?.(from);}};
    controller.current={go};stills[0].then(image=>{if(disposed||operation!==0)return;upload(image,0);node.dataset.playback='held';node.dataset.scene='0';}).catch(console.error);for(const item of ready.values())item.catch(()=>{});
    return()=>{disposed=true;operation+=1;stopWatch();controller.current=null;Object.values(videos).forEach(video=>video.pause());cancelAnimationFrame(raf);observer.disconnect();resizer.disconnect();removeEventListener('pointermove',move);removeEventListener('blur',leave);document.documentElement.removeEventListener('pointerleave',leave);gl.deleteTexture(texture);gl.deleteBuffer(resources.buffer);gl.deleteProgram(resources.program);gl.deleteShader(resources.vs);gl.deleteShader(resources.fs);};
  },[]);
  useEffect(()=>{controller.current?.go(stage);},[stage]);
  return <div className="hero-visual" ref={root} aria-hidden="true" data-renderer="persistent-webgl"><img className="hero-fallback" src="/media/hero-1.webp" alt=""/><video className="hero-decoder" ref={t1f} src="/media/transition-1.mp4" muted playsInline preload="auto"/><video className="hero-decoder" ref={t2f} src="/media/transition-2.mp4" muted playsInline preload="auto"/><video className="hero-decoder" ref={t1r} src="/media/transition-1-reverse.mp4" muted playsInline preload="auto"/><video className="hero-decoder" ref={t2r} src="/media/transition-2-reverse.mp4" muted playsInline preload="auto"/><canvas className="hero-surface" ref={canvasRef}/></div>;
}
