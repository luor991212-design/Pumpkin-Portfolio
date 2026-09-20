import React, { useEffect, useRef } from 'react';

const vertex=`attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.,1.);}`;

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

export function AmbientBackground({className='ambient-background',scrollRef=null,variant='page'}){
  const canvasRef=useRef(null);
  useEffect(()=>{
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const canvas=canvasRef.current,gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance'});if(!gl)return;
    const fragment=`precision highp float;
      uniform vec2 u_resolution,u_view,u_mouse,u_local,u_flow;
      uniform float u_time,u_scroll,u_variant;
      float field(vec2 p,vec2 c,float spread){return exp(-dot(p-c,p-c)*spread);}
      void main(){
        vec2 uv=gl_FragCoord.xy/u_resolution;
        vec2 p=uv;
        vec2 dm=p-u_mouse;
        vec2 localPixels=dm*u_view;
        float radius=length(localPixels);
        float localField=1.0-smoothstep(8.0,52.0,radius);
        localField*=localField;
        float localMotion=clamp(length(u_local)*4.0,0.0,1.0);
        vec2 radial=localPixels/max(radius,1.0),tangent=vec2(-radial.y,radial.x);
        p+=(radial*sin(radius*.17-u_time*8.0)*5.0+tangent*4.5+u_local*5.0)*localField*localMotion/u_view;
        p+=u_flow*.052;
        p.y+=u_scroll*.068;
        float t=u_time*.048;
        vec2 warp=p+vec2(sin(p.y*5.2+t*.55)+sin(p.y*9.1-t*.24),cos(p.x*4.7-t*.43)+cos(p.x*8.3+t*.21))*.018;
        vec2 orangeA=vec2(-.25+.08*sin(t*.64),.24+.10*cos(t*.48))+u_flow*.042;
        vec2 orangeB=vec2(1.25+.08*cos(t*.39),.72+.10*sin(t*.55))-u_flow*.03;
        vec2 violetA=vec2(.70+.09*sin(t*.33),.14+.08*cos(t*.42));
        vec2 lavender=vec2(.46+.15*cos(t*.27),.91+.06*sin(t*.31));
        orangeA.y+=u_scroll*.045;orangeB.y-=u_scroll*.035;
        float spreadBoost=mix(1.0,1.16,u_variant);
        float o1=field(warp,orangeA,5.0*spreadBoost)+field(warp,orangeA+vec2(.18,.12),8.6*spreadBoost)*.48;
        float o2=field(warp,orangeB,4.8*spreadBoost)+field(warp,orangeB-vec2(.18,.14),8.2*spreadBoost)*.44;
        float v1=field(warp,violetA,4.7*spreadBoost),l1=field(warp,lavender,4.3*spreadBoost);
        vec3 color=mix(vec3(.010,.031,.082),vec3(.020,.075,.158),smoothstep(-.1,1.1,p.y));
        vec3 amber=mix(vec3(1.0,.43,.045),vec3(1.0,.49,.07),u_variant);
        vec3 hotOrange=mix(vec3(1.0,.20,.012),vec3(1.0,.28,.025),u_variant);
        vec3 violet=vec3(.12,.10,.38),softBlue=vec3(.12,.23,.58);
        color=mix(color,amber,clamp(o1*(.16+u_variant*.04),0.0,.28+u_variant*.04));
        color=mix(color,hotOrange,clamp(o2*(.14+u_variant*.04),0.0,.25+u_variant*.04));
        color=mix(color,violet,v1*.16);
        color=mix(color,softBlue,l1*.20);
        float vignette=smoothstep(.98,.25,distance(uv,vec2(.5)));
        gl_FragColor=vec4(color*(.73+.27*vignette),1.);
      }`;
    let resources;try{resources=makeProgram(gl,fragment);}catch{return;}
    const {program}=resources;
    const loc=name=>gl.getUniformLocation(program,name),uResolution=loc('u_resolution'),uView=loc('u_view'),uMouse=loc('u_mouse'),uLocal=loc('u_local'),uFlow=loc('u_flow'),uTime=loc('u_time'),uScroll=loc('u_scroll'),uVariant=loc('u_variant');
    const pointer={x:.5,y:.5},target={x:.5,y:.5},previous={x:.5,y:.5},local={x:0,y:0},flow={x:0,y:0};
    const scrollElement=scrollRef?.current||window;let lastScroll=scrollElement===window?scrollY:scrollElement.scrollTop,scrollMomentum=0,scrollOffset=0,raf=0,lastFrame=0;
    const resize=()=>{const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,1.2);canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(uResolution,canvas.width,canvas.height);gl.uniform2f(uView,rect.width,rect.height);gl.uniform1f(uVariant,variant==='modal'?1:0);};
    const move=e=>{const rect=canvas.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)return;const x=(e.clientX-rect.left)/rect.width,y=1-(e.clientY-rect.top)/rect.height,dx=x-previous.x,dy=y-previous.y;local.x+=dx*7.2;local.y+=dy*7.2;flow.x+=dx*.78;flow.y+=dy*.78;previous.x=x;previous.y=y;target.x=x;target.y=y;};
    const scroll=()=>{const current=scrollElement===window?scrollY:scrollElement.scrollTop;scrollMomentum=Math.max(-2.8,Math.min(2.8,scrollMomentum+(current-lastScroll)*.004));lastScroll=current;};
    const render=ms=>{raf=requestAnimationFrame(render);if(ms-lastFrame<24||document.hidden)return;lastFrame=ms;pointer.x+=(target.x-pointer.x)*.11;pointer.y+=(target.y-pointer.y)*.11;local.x*=.9;local.y*=.9;flow.x*=.95;flow.y*=.95;scrollOffset+=scrollMomentum*.07;scrollMomentum*=.91;scrollOffset*=.986;gl.uniform2f(uMouse,pointer.x,pointer.y);gl.uniform2f(uLocal,local.x,local.y);gl.uniform2f(uFlow,flow.x,flow.y);gl.uniform1f(uScroll,scrollOffset);gl.uniform1f(uTime,ms*.001);gl.drawArrays(gl.TRIANGLES,0,6);};
    resize();addEventListener('resize',resize);addEventListener('pointermove',move,{passive:true});scrollElement.addEventListener('scroll',scroll,{passive:true});raf=requestAnimationFrame(render);
    return()=>{cancelAnimationFrame(raf);removeEventListener('resize',resize);removeEventListener('pointermove',move);scrollElement.removeEventListener('scroll',scroll);gl.deleteBuffer(resources.buffer);gl.deleteProgram(resources.program);gl.deleteShader(resources.vs);gl.deleteShader(resources.fs);};
  },[scrollRef,variant]);
  return <canvas className={className} ref={canvasRef} aria-hidden="true"/>;
}

// One persistent texture is the visible hero. Video elements are decoders only:
// stopping, seeking and priming a decoder can never replace the displayed frame.
export function HeroVisual({stage,onSettled}){
  const root=useRef(null),canvasRef=useRef(null),forwardRef=useRef(null),reverseRef=useRef(null);
  const controller=useRef(null),settled=useRef(onSettled);
  settled.current=onSettled;

  useEffect(()=>{
    const canvas=canvasRef.current,node=root.current;
    const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance'});
    if(!gl){node.dataset.renderer='unavailable';return;}
    const fragment=`precision highp float;
      uniform sampler2D u_image;
      uniform vec2 u_resolution,u_view,u_imageSize,u_pointer,u_velocity;
      uniform float u_energy,u_time;
      void main(){
        vec2 uv=gl_FragCoord.xy/u_resolution;
        vec2 delta=uv*u_view-u_pointer;
        float radius=length(delta);
        float envelope=1.0-smoothstep(8.0,52.0,radius);
        envelope*=envelope;
        vec2 radial=delta/max(radius,1.0);
        vec2 tangent=vec2(-radial.y,radial.x);
        float wave=sin(radius*.17-u_time*8.0);
        vec2 shift=(radial*wave*5.0+tangent*4.5+u_velocity*.18)*envelope*u_energy;
        vec2 displaced=uv+shift/u_view;
        float cover=max(u_view.x/u_imageSize.x,u_view.y/u_imageSize.y);
        vec2 crop=u_view/(u_imageSize*cover);
        vec2 sampleUV=(displaced-.5)*crop+.5;
        gl_FragColor=vec4(texture2D(u_image,clamp(sampleUV,vec2(.001),vec2(.999))).rgb,1.0);
      }`;
    let resources;
    try{resources=makeProgram(gl,fragment);}catch(error){console.error('Hero renderer:',error);return;}
    const uniform=name=>gl.getUniformLocation(resources.program,name);
    const uniforms=Object.fromEntries(['resolution','view','imageSize','pointer','velocity','energy','time'].map(name=>[name,uniform('u_'+name)]));
    const texture=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([9,19,38,255]));
    gl.uniform1i(uniform('u_image'),0);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer={x:-200,y:-200,targetX:-200,targetY:-200,vx:0,vy:0,energy:0,previousX:null,previousY:null};
    let raf=0,lastTick=0,width=1,height=1,dirty=true,hasFrame=false,visible=true,disposed=false;
    let operation=0,currentStage=0,frameHandle=0,frameVideo=null,fallbackTimer=0;
    const fps=30,frame=1/fps;
    const videos={forward:forwardRef.current,reverse:reverseRef.current};

    const resize=()=>{
      const rect=node.getBoundingClientRect();
      width=rect.width;height=rect.height;
      const dpr=Math.min(devicePixelRatio||1,1.5);
      canvas.width=Math.max(1,Math.round(width*dpr));canvas.height=Math.max(1,Math.round(height*dpr));
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);
      gl.uniform2f(uniforms.view,width,height);
      dirty=true;
    };
    const upload=(video,time)=>{
      if(disposed||video.readyState<2||!video.videoWidth)return;
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);
      gl.uniform2f(uniforms.imageSize,video.videoWidth,video.videoHeight);
      hasFrame=true;dirty=true;node.dataset.ready='true';
      canvas.dataset.mediaTime=time.toFixed(4);
    };
    const render=ms=>{
      raf=requestAnimationFrame(render);
      const dt=Math.min(.05,(ms-lastTick)/1000||1/60);lastTick=ms;
      const decay=Math.exp(-dt*5.3),follow=1-Math.exp(-dt*24),previousEnergy=pointer.energy;
      pointer.x+=(pointer.targetX-pointer.x)*follow;pointer.y+=(pointer.targetY-pointer.y)*follow;
      pointer.vx*=decay;pointer.vy*=decay;pointer.energy*=decay;
      if(pointer.energy<.001)pointer.energy=0;
      if(previousEnergy>0&&pointer.energy===0)dirty=true;
      if(!hasFrame||!visible||document.hidden)return;
      if(!dirty&&pointer.energy===0)return;
      gl.uniform2f(uniforms.pointer,pointer.x,pointer.y);
      gl.uniform2f(uniforms.velocity,pointer.vx,pointer.vy);
      gl.uniform1f(uniforms.energy,pointer.energy);
      gl.uniform1f(uniforms.time,ms/1000);
      gl.drawArrays(gl.TRIANGLES,0,6);
      canvas.dataset.motionStrength=pointer.energy.toFixed(3);
      dirty=false;
    };
    const move=event=>{
      if(reduced||event.pointerType==='touch')return;
      const rect=node.getBoundingClientRect(),x=event.clientX-rect.left,y=rect.bottom-event.clientY;
      if(x<0||x>width||y<0||y>height){pointer.previousX=null;pointer.previousY=null;return;}
      const dx=pointer.previousX===null?0:x-pointer.previousX,dy=pointer.previousY===null?0:y-pointer.previousY;
      if(pointer.previousX===null){pointer.x=x;pointer.y=y;}
      pointer.previousX=x;pointer.previousY=y;pointer.targetX=x;pointer.targetY=y;
      pointer.vx=Math.max(-22,Math.min(22,dx));pointer.vy=Math.max(-22,Math.min(22,dy));
      pointer.energy=Math.min(1,pointer.energy+Math.hypot(dx,dy)*.055);
      dirty=true;
    };
    const leave=()=>{pointer.previousX=null;pointer.previousY=null;};
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;dirty=true;});
    observer.observe(node);
    const resizer=new ResizeObserver(resize);resizer.observe(node);
    addEventListener('pointermove',move,{passive:true});addEventListener('blur',leave);
    document.documentElement.addEventListener('pointerleave',leave);
    resize();raf=requestAnimationFrame(render);

    const ready=video=>new Promise((resolve,reject)=>{
      if(video.readyState>=2){resolve();return;}
      const cleanup=()=>{video.removeEventListener('loadeddata',done);video.removeEventListener('error',fail);};
      const done=()=>{cleanup();resolve();};
      const fail=()=>{cleanup();reject(new Error('首页视频未能加载'));};
      video.addEventListener('loadeddata',done,{once:true});video.addEventListener('error',fail,{once:true});
    });
    const readiness={forward:ready(videos.forward),reverse:ready(videos.reverse)};
    const position=(video,direction,index)=>{
      const last=(Math.round(video.duration*fps)-1)/fps;
      const forward=[0,49/fps,last][index];
      return direction==='forward'?forward:last-forward;
    };
    const seek=async(video,time)=>{
      video.pause();
      if(!video.seeking&&Math.abs(video.currentTime-time)<.012)return;
      await new Promise(resolve=>{
        video.addEventListener('seeked',resolve,{once:true});
        video.currentTime=time;
      });
    };
    const stopWatch=()=>{
      if(frameVideo&&frameHandle)frameVideo.cancelVideoFrameCallback?.(frameHandle);
      clearTimeout(fallbackTimer);frameHandle=0;
    };
    const go=async target=>{
      if(target===currentStage)return;
      const from=currentStage,direction=target>from?'forward':'reverse',video=videos[direction],token=++operation;
      stopWatch();Object.values(videos).forEach(v=>v.pause());
      node.dataset.playback='preparing';
      try{
        await readiness[direction];
        if(disposed||token!==operation)return;
        const start=position(video,direction,from),end=position(video,direction,target);
        await seek(video,start);
        if(disposed||token!==operation)return;
        let finished=false,lastPresented=start-frame;
        const finish=()=>{
          if(finished||disposed||token!==operation)return;
          finished=true;video.pause();stopWatch();video.removeEventListener('ended',finish);
          // Keep the texture untouched. No poster swap, seek or opacity change.
          currentStage=target;node.dataset.playback='held';node.dataset.scene=String(target);
          settled.current?.(target);
          const peerDirection=direction==='forward'?'reverse':'forward',peer=videos[peerDirection];
          readiness[peerDirection].then(()=>{
            if(!disposed&&token===operation)seek(peer,position(peer,peerDirection,target));
          }).catch(()=>{});
        };
        const next=()=>{
          frameVideo=video;
          if(video.requestVideoFrameCallback)frameHandle=video.requestVideoFrameCallback(present);
          else fallbackTimer=setTimeout(()=>present(0,{mediaTime:video.currentTime}),16);
        };
        const present=(_,metadata)=>{
          if(finished||disposed||token!==operation)return;
          const t=metadata.mediaTime;
          if(t>=start-frame*.4&&t>=lastPresented&&t<=end+frame*.4){upload(video,t);lastPresented=t;}
          if(t>=end-frame*.2){finish();return;}
          next();
        };
        video.addEventListener('ended',finish,{once:true});
        node.dataset.playback='playing';next();
        await video.play();
      }catch(error){
        if(disposed||token!==operation)return;
        node.dataset.playback='error';console.error('Hero playback:',error);
        settled.current?.(from);
      }
    };
    controller.current={go};
    readiness.forward.then(()=>{
      if(disposed||operation!==0)return;
      upload(videos.forward,0);node.dataset.playback='held';node.dataset.scene='0';
    }).catch(error=>console.error(error));
    // Catch preload errors even when the user has not requested reverse playback.
    readiness.reverse.catch(()=>{});
    return()=>{
      disposed=true;operation++;stopWatch();controller.current=null;
      Object.values(videos).forEach(v=>v.pause());cancelAnimationFrame(raf);
      observer.disconnect();resizer.disconnect();removeEventListener('pointermove',move);removeEventListener('blur',leave);
      document.documentElement.removeEventListener('pointerleave',leave);
      gl.deleteTexture(texture);gl.deleteBuffer(resources.buffer);gl.deleteProgram(resources.program);
      gl.deleteShader(resources.vs);gl.deleteShader(resources.fs);
    };
  },[]);

  useEffect(()=>{controller.current?.go(stage);},[stage]);
  return <div className="hero-visual" ref={root} aria-hidden="true" data-renderer="persistent-webgl">
    <img className="hero-fallback" src="/media/hero-1.webp" alt=""/>
    <video className="hero-decoder" ref={forwardRef} src="/media/hero-timeline-forward.mp4" muted playsInline preload="auto"/>
    <video className="hero-decoder" ref={reverseRef} src="/media/hero-timeline-reverse.mp4" muted playsInline preload="auto"/>
    <canvas className="hero-surface" ref={canvasRef}/>
  </div>;
}
