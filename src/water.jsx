import React, { useEffect, useRef } from 'react';

// A small GPU water surface: pointer impulses propagate outward and leave a
// fading refractive highlight. It never captures clicks or covers page text.
export function LiquidField({ paused }) {
  const canvas = useRef(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(pointer: coarse)').matches) return;
    const el = canvas.current;
    const gl = el.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    const vert = `attribute vec2 a; void main(){gl_Position=vec4(a,0.,1.);}`;
    const frag = `precision mediump float;
      uniform vec2 size; uniform float time; uniform vec4 drops[16];
      void main(){
        vec2 uv=gl_FragCoord.xy/size;
        vec2 p=vec2(uv.x*size.x/size.y,uv.y);
        float h=0.; vec2 slope=vec2(0.);
        for(int i=0;i<16;i++){
          float age=time-drops[i].z;
          if(age>0. && age<2.8 && drops[i].w>0.){
            vec2 delta=p-vec2(drops[i].x*size.x/size.y,drops[i].y);
            float dist=length(delta); float r=dist-age*.13;
            float envelope=exp(-r*r*2600.)*exp(-age*1.6)*drops[i].w;
            float w=sin(r*185.)*envelope;
            h+=w; slope+=normalize(delta+vec2(.0001))*cos(r*185.)*envelope;
          }
        }
        float light=max(0.,dot(slope,vec2(.65,.75)));
        float alpha=clamp(abs(h)*.09+light*.13,0.,.22);
        gl_FragColor=vec4(vec3(.36,.57,.9)+light*.12,alpha);
      }`;
    const compile = (type, source) => { const s = gl.createShader(type); gl.shaderSource(s,source); gl.compileShader(s); if (!gl.getShaderParameter(s,gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; } return s; };
    const vs = compile(gl.VERTEX_SHADER, vert), fs = compile(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return;
    const program = gl.createProgram(); gl.attachShader(program,vs); gl.attachShader(program,fs); gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) return;
    gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const attr = gl.getAttribLocation(program,'a'); gl.enableVertexAttribArray(attr); gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
    const size = gl.getUniformLocation(program,'size'), time = gl.getUniformLocation(program,'time'), impulses = gl.getUniformLocation(program,'drops[0]');
    const drops = new Float32Array(64); let next = 0, last = 0, frame = 0, lastDraw = 0, activeUntil = 0;
    const resize = () => { const dpr = Math.min(devicePixelRatio,1.25); el.width = Math.round(innerWidth*dpr); el.height = Math.round(innerHeight*dpr); gl.viewport(0,0,el.width,el.height); gl.uniform2f(size,el.width,el.height); };
    const move = e => { const now = performance.now()/1000; if (now-last<.045 || pausedRef.current) return; const j = (next++%16)*4; drops[j]=e.clientX/innerWidth; drops[j+1]=1-e.clientY/innerHeight; drops[j+2]=now; drops[j+3]=.8; last=now; activeUntil=now+3; };
    const draw = now => { frame=requestAnimationFrame(draw); if(now-lastDraw<32) return; lastDraw=now; if (document.hidden || pausedRef.current || now/1000>activeUntil) { gl.clear(gl.COLOR_BUFFER_BIT); return; } gl.uniform1f(time,now/1000); gl.uniform4fv(impulses,drops); gl.drawArrays(gl.TRIANGLES,0,6); };
    resize(); addEventListener('resize',resize); addEventListener('pointermove',move,{ passive:true }); frame=requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); removeEventListener('resize',resize); removeEventListener('pointermove',move); gl.deleteBuffer(buffer); gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs); };
  }, []);
  return <canvas className="liquid-field" ref={canvas} aria-hidden="true"/>;
}
