import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function HexCardTag({name,effect,tier,statistics}:{name:string;effect:string;tier:string;statistics?:{key:string;label:string;value:string}[]}) {
 const [open,setOpen]=useState(false);
 const [position,setPosition]=useState({left:8,top:8});
 const trigger=useRef<HTMLButtonElement>(null),popup=useRef<HTMLDivElement>(null);
 const id=useId();
 useLayoutEffect(()=>{
  if(!open||!trigger.current||!popup.current)return;
  const anchor=trigger.current.getBoundingClientRect(),box=popup.current.getBoundingClientRect();
  const left=Math.max(8,Math.min(anchor.left,window.innerWidth-box.width-8));
  const below=anchor.bottom+8;
  const top=below+box.height<=window.innerHeight-8?below:Math.max(8,anchor.top-box.height-8);
  setPosition({left,top});
 },[open,name,effect,statistics]);
 useEffect(()=>{
  if(!open)return;
  const dismiss=(event:PointerEvent)=>{
   if(!trigger.current?.contains(event.target as Node)&&!popup.current?.contains(event.target as Node))setOpen(false);
  };
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
  const close=()=>setOpen(false);
  document.addEventListener('pointerdown',dismiss);
  document.addEventListener('keydown',escape);
  window.addEventListener('resize',close);
  window.addEventListener('scroll',close,true);
  return()=>{
   document.removeEventListener('pointerdown',dismiss);
   document.removeEventListener('keydown',escape);
   window.removeEventListener('resize',close);
   window.removeEventListener('scroll',close,true);
  };
 },[open]);
 return <>
  <button ref={trigger} type="button" className={`hex-tag ${tier}`} aria-expanded={open} aria-describedby={open?id:undefined}
   onPointerEnter={event=>{if(event.pointerType==='mouse')setOpen(true);}}
   onPointerLeave={event=>{if(event.pointerType==='mouse')setOpen(false);}}
   onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)}
   onClick={()=>setOpen(true)}>{name}</button>
  {open&&createPortal(<div ref={popup} id={id} role="tooltip" className={`hex-effect-popup ${tier}`} style={position}>
   <strong>{name}</strong><p>{effect}</p>{!!statistics?.length&&<div className="hex-card-statistics"><dl>{statistics.map(stat=><div key={stat.key}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}</dl></div>}
  </div>,document.body)}
 </>;
}
