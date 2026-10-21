import type { TableSnapshot, TableEvent } from '@hex/shared';

/** One voice per seat for the lifetime of a table connection. */
export class PlayerAudio {
 private voices = Array.from({length:4},()=>Math.random()<0.5?'Female':'Male');
 private context: AudioContext | null = null;
 private buffers = new Map<string, Promise<AudioBuffer>>();
 private cursor: {key:string;id:number} | null = null;
 private sources = new Set<AudioBufferSourceNode>();
 private generation = 0;
 private enabled = localStorage.getItem('hex-audio')!=='off';

 unlock() {
  this.context ??= new AudioContext();
  void this.context.resume().catch(()=>{});
  // Starting a source during the tap unlocks audio on mobile browsers.
  const source=this.context.createBufferSource();
  source.buffer=this.context.createBuffer(1,1,this.context.sampleRate);
  source.connect(this.context.destination);source.start();
 }

 setEnabled(enabled:boolean) {
  this.enabled=enabled;
  localStorage.setItem('hex-audio',enabled?'on':'off');
  if(enabled){this.unlock();this.play({id:0,kind:'pong',seat:0,tile:null});}
  else {
   this.generation++;
   for(const source of this.sources)source.stop();
   this.sources.clear();
  }
 }

 reset() {
  this.generation++;
  for(const source of this.sources)source.stop();
  this.sources.clear();
  this.cursor=null;
  this.voices=Array.from({length:4},()=>Math.random()<0.5?'Female':'Male');
 }

 receive(table:TableSnapshot) {
  const round=table.round;
  if(!round)return;
  const key=`${table.room.roomId}:${round.number}`;
  // Establish a baseline on join/reconnect; never announce historical moves.
  if(this.cursor?.key===key){
   for(const event of round.events)if(event.id>this.cursor.id)this.play(event);
  }
  this.cursor={key,id:round.events.at(-1)?.id??0};
 }

 private play(event:TableEvent) {
  if(!this.enabled)return;
  const voice=this.voices[event.seat];
  let path:string;
  if(event.kind==='discard'&&event.tile){
   const offset={characters:0,bamboo:10,dots:20}[event.tile.suit];
   path=`Discard/${voice}/${String(offset+event.tile.rank).padStart(2,'0')}.wav`;
  }else if(event.kind==='pong'||event.kind==='kong'||event.kind==='win'){
   const action={pong:'Pong',kong:'Kong',win:'Win'}[event.kind];
   path=`PlayerAction/${voice}/${action}.wav`;
  }else return;
  const context=this.context,generation=this.generation;
  if(!context||!voice)return;
  let buffer=this.buffers.get(path);
  if(!buffer){
   buffer=fetch(new URL(`assets/audio/${path}`,document.baseURI))
    .then(response=>{if(!response.ok)throw Error('Audio unavailable');return response.arrayBuffer();})
    .then(data=>context.decodeAudioData(data));
   this.buffers.set(path,buffer);
  }
  void buffer.then(decoded=>{
   if(generation!==this.generation||context.state!=='running')return;
   const source=context.createBufferSource();
   source.buffer=decoded;source.connect(context.destination);
   this.sources.add(source);source.onended=()=>this.sources.delete(source);
   source.start();
  }).catch(()=>{this.buffers.delete(path);});
 }
}
