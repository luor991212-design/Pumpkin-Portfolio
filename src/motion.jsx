import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reversible = trigger => ({
  trigger,
  start: 'top 82%',
  end: 'bottom 12%',
  toggleActions: 'play none none reverse',
});

export function MotionDirector() {
  useLayoutEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;if (matchMedia('(max-width:760px)').matches) return;
    const context = gsap.context(() => {
      gsap.utils.toArray('[data-reveal]').forEach(element => {
        const timeline=gsap.timeline({scrollTrigger:reversible(element)});
        timeline.fromTo(element,
          { y: 72, scaleY: .92, opacity: 0 },
          { y: 0, scaleY: 1, opacity: 1, duration: 1.28, ease: 'expo.out' },0
        ).fromTo(element,{'--entry-blur':'3px'},{'--entry-blur':'0px',duration:.15,ease:'power2.out'},0);
      });
      gsap.utils.toArray('[data-stagger]').forEach(group => {
        const children = Array.from(group.children);
        const timeline=gsap.timeline({scrollTrigger:{...reversible(group),start:'top 74%'}});
        timeline.fromTo(children,
          { '--entry-y': '92px', '--entry-scale': .94, opacity: 0 },
          { '--entry-y': '0px', '--entry-scale': 1, opacity: 1, duration: 1.35, stagger: .13, ease: 'expo.out' },0
        ).fromTo(children,{'--entry-blur':'3.5px'},{'--entry-blur':'0px',duration:.16,stagger:.055,ease:'power2.out'},0);
      });
      gsap.utils.toArray('.parallax-media img').forEach(image => {
        gsap.fromTo(image, { yPercent: -4, scale: 1.07 }, { yPercent: 5, scale: 1.02, ease: 'none', scrollTrigger: { trigger: image.parentElement, start: 'top bottom', end: 'bottom top', scrub: 1.15 } });
      });
      gsap.utils.toArray('[data-compress]').forEach(element => {
        const timeline=gsap.timeline({scrollTrigger:{...reversible(element),start:'top 76%'}});
        timeline.fromTo(element,
          { '--entry-y': '62px', '--entry-scale': .92, opacity: 0 },
          { '--entry-y': '0px', '--entry-scale': 1, opacity: 1, duration: 1.28, ease: 'expo.out' },0
        ).fromTo(element,{'--entry-blur':'3.5px'},{'--entry-blur':'0px',duration:.16,ease:'power2.out'},0);
      });
    });
    const refresh = setTimeout(() => ScrollTrigger.refresh(), 500);
    return () => { clearTimeout(refresh); context.revert(); };
  }, []);
  return null;
}

export function tiltHandlers() {
  return {
    onPointerMove: event => {
      if (event.pointerType === 'touch') return;
      const node = event.currentTarget;
      const rect = node.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      node.style.setProperty('--rx', `${(0.5-y)*4.5}deg`);
      node.style.setProperty('--ry', `${(x-0.5)*6}deg`);
      node.style.setProperty('--mx', `${x*100}%`);
      node.style.setProperty('--my', `${y*100}%`);
    },
    onPointerLeave: event => {
      event.currentTarget.style.setProperty('--rx','0deg');
      event.currentTarget.style.setProperty('--ry','0deg');
    },
  };
}
