import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CARDS, SCORE_CAPS, type ScoreCap, type TableSnapshot, type TileType, type Move, type Suit, type Pattern, type RoundPlayerView } from '@hex/shared';
import './style.css';
import { tileArtwork } from './tile-artwork.js';
import { localConnection, type GameConnection } from './local-connection.js';
import { PlayerAudio } from './player-audio.js';
import { HexCardTag } from './hex-card-tag.js';
const en = {
 username:'Username',usernameHint:'Leave blank for Player 1, Player 2, …',reconnectHint:'Return automatically after switching apps. Use a unique name and room code to recover on any device within 30 minutes. Anyone with both can reclaim your seat.',
 exited:'Left this round',exitWatch:'You left this round. Watch the remaining players.',hexExit:'left this round; future payments are frozen',hexRefill:'missing-suit tiles returned and hand refilled',title:'Hex Mahjong',unavailable:'not yet available',scoreChange:'Score change',games:'Games',localError:'Could not start the bot game. Please refresh and try again.', subtitle:'A quiet table. Three willing rivals.', practice:'Play against 3 bots', create:'Create a friends room', join:'Join room', room:'Room ID', cap:'Win cap per payer', rounds:'Rounds', share:'Copy invitation', leave:'Leave table', uncapped:'Uncapped', error:'Could not connect. Check that the local server is running.', waiting:'Waiting for friends', copied:'Invitation copied', reconnect:'Reconnect to your table', start:'Start · fill empty seats with bots', next:'Next round', you:'You', bot:'Bot', friend:'Player', empty:'Empty seat', offline:'Reconnecting…', dealer:'Dealer', points:'points', tiles:'tiles left', round:'Round', selectSuit:'Choose your missing suit', suitHelp:'Review your dealt hand above, then choose a suit. Discard that suit first and clear it before winning.', characters:'Characters', bamboo:'Bamboo', dots:'Dots', discard:'Discard selected tile', selectTile:'Click a legal tile to discard it immediately.', win:'Declare win', kong:'Kong', pong:'Pong', pass:'Pass', yourTurn:'Your turn', thinking:'The table is playing…', claims:'Respond to this discard', rob:'An added kong can be robbed', won:'Won · sitting out', watch:'You won! Watch the remaining players finish.', forced:'Clear your missing suit first.', declareWaiting:'Waiting for the other players to declare…', base:'HEX MAHJONG · LOCAL PLAYTEST', baseHelp:'Selected Hex cards last until round end.',hexRounds:'Hex selections per round',hexOne:'1 · Opening only',hexTwo:'2 · Opening + 16 tiles',hexThree:'3 · Opening + 32 + 16 tiles',middleHex:'Extra selection · before the last 32 tiles', settlement:'Round settlement', wallEnd:'The wall is empty', winnersEnd:'Fewer than two active players remain', ledger:'Payment ledger', noPayments:'No transfers this round.', from:'From', to:'To', amount:'Points', reason:'Reason', winReason:'Win', kongReason:'Kong', flower_pig:'Flower pig', not_ready:'Not ready', refund:'Kong refund', log:'Table activity', discardEvent:'discarded', drawEvent:'drew a tile', pongEvent:'claimed a pong', kongEvent:'declared a kong', winEvent:'won', declareEvent:'declared a missing suit', dealEvent:'dealt the round', settledEvent:'round settled', pending:'Last offered tile', ready:'Your score', sessionEnd:'Session complete', finish:'Final scores', waitingHost:'Waiting for the host to start the next round.', invalid:'That action is no longer available. Use the highlighted options.', rate:'A little slower, please.', hand:'Your hand', concealedKong:'Concealed kong', melds:'Melds', discards:'Discards', noDiscards:'No discards yet', fan:'fan', selected:'selected', rules:'Four sets + a pair, or seven pairs. No chow. Winners retire; the others play on.', fresh:'Create a new table', review:'Round complete · review your hand and ledger',controls:'Your actions', decline:'Pass / decline', connected:'Connected', waitingAction:'Waiting for another player’s decision…',chooseHex:'Choose your Hex card',initialHex:'First selection · before the opening discard',lastHex:'Final selection · before the last 16 tiles',silver:'Silver',gold:'Gold',prismatic:'Prismatic',choose:'Choose',lockedChoice:'Choice locked · waiting for the table',autoChoice:'Auto-choice in',seconds:'s',collateralChoice:'Activate Collateral Damage?',collateralHelp:'Each eligible bystander pays half the final discard payment, rounded down. The choice is locked before the critical roll.',yesCollateral:'Yes · collect collateral',noCollateral:'No · normal payment only',collateral:'Collateral',pong_card:'Pong card',precision_strike:'Precision Strike',willing_victim:'Willing Victim',torment:'Liandry’s Torment',critical:'Critical ×2',handLocked:'Auto-play · wins, added kongs and discards are automatic.',bloodWins:'Wins',extraTurn:'Bonus turn',hexSelection:'Hex selection started',hexAcquired:'selected',hexRemoved:'wall tiles removed',hexCopied:'copies inserted into the wall',hexCheat:'copied an owned tile instead of drawing',hexBonus:'takes one bonus turn',hexInterrupted:'bonus interrupted by a claim',hexLock:'locked their hand after winning',hexCritical:'critical settlement ×2',hexSkip:'selection skipped · insufficient eligible cards'
};
const zh: Record<keyof typeof en, string> = {
 username:'用户名',usernameHint:'留空则使用玩家1、玩家2等默认名称',reconnectHint:'切换应用后自动重连。断线后30分钟内，可在任意设备使用房间内唯一的用户名和房间号找回座位；知道两者的人均可找回。',
 exited:'已离开本轮',exitWatch:'你已离开本轮，之后流水与你无关。',hexExit:'离开本轮，之后不再参与流水',hexRefill:'张定缺牌放回牌墙并补齐手牌',title:'海克斯科技麻将',unavailable:'暂未开放',scoreChange:'分数变化',games:'游戏列表',localError:'机器人对局启动失败，请刷新后重试。',subtitle:'一张牌桌，三位陪练。',practice:'与三个机器人开局',create:'创建好友牌桌',join:'加入房间',room:'房间编号',cap:'单个付款人胡牌封顶',rounds:'局数',share:'复制邀请',leave:'离开牌桌',uncapped:'不封顶',error:'连接失败，请检查本地服务器是否运行。',waiting:'等待好友',copied:'邀请链接已复制',reconnect:'重新连接牌桌',start:'开始 · 空位由机器人补齐',next:'下一局',you:'你',bot:'机器人',friend:'玩家',empty:'空位',offline:'重连中…',dealer:'庄家',points:'分',tiles:'张剩余',round:'第',selectSuit:'请选择定缺花色',suitHelp:'先查看上方已发好的手牌，再选择定缺花色。必须优先打完该花色才能胡牌。',characters:'万',bamboo:'条',dots:'筒',discard:'打出选中的牌',selectTile:'单击可出的手牌即可直接打出。',win:'胡牌',kong:'杠',pong:'碰',pass:'过',yourTurn:'轮到你了',thinking:'牌局进行中…',claims:'是否认领这张牌？',rob:'有人加杠，可以抢杠胡',won:'已胡 · 停止本局行动',watch:'你已胡牌！请观看其他玩家完成本局。',forced:'请先打完定缺花色。',declareWaiting:'等待其他玩家定缺…',base:'海克斯麻将 · 本地试玩',baseHelp:'所选海克斯卡牌仅在本局生效。',hexRounds:'每局海克斯选择次数',hexOne:'1次 · 仅开局',hexTwo:'2次 · 开局 + 剩余16张',hexThree:'3次 · 开局 + 剩余32张 + 剩余16张',middleHex:'额外选择 · 最后32张摸牌前',settlement:'本局结算',wallEnd:'牌墙耗尽',winnersEnd:'剩余可行动玩家不足两人',ledger:'分数流水',noPayments:'本局暂无分数转移。',from:'付款',to:'收款',amount:'分数',reason:'事由',winReason:'胡牌',kongReason:'杠钱',flower_pig:'查花猪',not_ready:'查叫',refund:'退杠钱',log:'牌局记录',discardEvent:'打出',drawEvent:'摸了一张牌',pongEvent:'碰牌',kongEvent:'杠牌',winEvent:'胡牌',declareEvent:'已定缺',dealEvent:'发牌',settledEvent:'本局结束',pending:'待认领牌',ready:'当前分数',sessionEnd:'全部对局结束',finish:'最终排名',waitingHost:'等待房主开始下一局。',invalid:'该操作已不可用，请使用当前显示的操作。',rate:'操作稍快，请稍后再试。',hand:'你的手牌',concealedKong:'暗杠',melds:'副露',discards:'弃牌',noDiscards:'暂无弃牌',fan:'番',selected:'已选',rules:'四组牌加一对，或七对；不能吃。胡牌后退出本局，其他玩家继续。',fresh:'创建新牌桌',review:'本局结束 · 可查看手牌与分数流水',controls:'你的操作',decline:'过 / 放弃',connected:'已连接',waitingAction:'等待其他玩家决定…',chooseHex:'选择海克斯卡',initialHex:'首次选择 · 庄家首张弃牌前',lastHex:'最后一次选择 · 最后16张摸牌前',silver:'白银',gold:'黄金',prismatic:'棱彩',choose:'选择',lockedChoice:'已锁定选择 · 等待其他玩家',autoChoice:'自动选择倒计时',seconds:'秒',collateralChoice:'发动连带伤害？',collateralHelp:'其他符合条件的玩家各支付本次放炮最终付款的一半，向下取整；先锁定选择，再判定暴击。',yesCollateral:'发动 · 收取连带分数',noCollateral:'不发动 · 仅正常结算',collateral:'连带伤害',pong_card:'指碰为杠',precision_strike:'精准打击',willing_victim:'愿者上钩',torment:'兰德里的折磨',critical:'暴击 ×2',handLocked:'自动行动中 · 自动胡牌、加杠，否则打出新摸的牌。',bloodWins:'胡牌次数',extraTurn:'额外回合',hexSelection:'开始海克斯选择',hexAcquired:'选择了',hexRemoved:'张牌从牌墙移除',hexCopied:'张复制牌插入牌墙',hexCheat:'复制持有牌代替摸牌',hexBonus:'获得一次额外回合',hexInterrupted:'额外回合被认领打断',hexLock:'首次胡牌后锁定手牌',hexCritical:'结算暴击 ×2',hexSkip:'卡池不足，跳过本次选择'
};
const patternWords: Record<Pattern['key'], [string, string]> = { all_pongs:['All pongs','对对胡'],pure_suit:['Pure suit','清一色'],seven_pairs:['Seven pairs','七对'],pure_seven_pairs:['Pure seven pairs','清七对'],roots:['Roots','根'],single_wait:['Single wait','大单调'],self_draw:['Self-draw','自摸'],rob_kong:['Robbed kong','抢杠'],after_kong:['After kong','杠上花 / 杠上炮'] };
const suitOrder: Suit[] = ['characters','bamboo','dots'];
function Face({tile,small=false}:{tile:TileType;small?:boolean}) {
 return <span className={`tile-face ${tile.suit} ${small?'small':''}`} role="img" aria-label={`${tile.rank} ${tile.suit}`} dangerouslySetInnerHTML={{__html:tileArtwork(tile)}}/>;
}
type ScoreFlash = {id:number;gain:number;loss:number};
function App() {
 const [lang,setLang]=useState<'en'|'zh'>(()=>localStorage.getItem('hex-language')==='zh'?'zh':'en');
 const [audioEnabled,setAudioEnabled]=useState(()=>localStorage.getItem('hex-audio')!=='off');
 const t=lang==='en'?en:zh;
 const [cap,setCap]=useState<ScoreCap>(16),[rounds,setRounds]=useState<8|16>(8),[hexSelections,setHexSelections]=useState<1|2|3>(2),[id,setId]=useState(new URL(location.href).searchParams.get('room')??localStorage.getItem('hex-last-room')??'');
 const [username,setUsername]=useState(()=>localStorage.getItem('hex-username')??'');
 const reconnectKey=(roomId:string)=>`hex-reconnect:${roomId}:${username.trim().toLowerCase()}`;
 const [table,setTable]=useState<TableSnapshot|null>(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const room=useRef<GameConnection|null>(null);
 const recoveryCleanup=useRef<(()=>void)|null>(null);
 const audio=useRef<PlayerAudio|null>(null);
 audio.current??=new PlayerAudio();
 useEffect(()=>{
  const unlock=()=>{if(audioEnabled)audio.current?.unlock();};
  document.addEventListener('pointerdown',unlock);
  document.addEventListener('keydown',unlock);
  return()=>{document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock);};
 },[audioEnabled]);
 const sentDecision=useRef<string|null>(null);
 const scoreCursor=useRef<{key:string;lastPayment:number}|null>(null);
 const flashTimers=useRef<(ReturnType<typeof setTimeout>|null)[]>([null,null,null,null]);
 const flashId=useRef(0);
 const [scoreFlashes,setScoreFlashes]=useState<(ScoreFlash|null)[]>([null,null,null,null]);
 useEffect(()=>()=>{flashTimers.current.forEach(timer=>{if(timer)clearTimeout(timer);});recoveryCleanup.current?.();room.current?.leave();},[]);
 function clearFlashes(){
  flashTimers.current.forEach(timer=>{if(timer)clearTimeout(timer);});
  flashTimers.current=[null,null,null,null];setScoreFlashes([null,null,null,null]);
 }
 function resetFeedback(){
  audio.current?.reset();
  sentDecision.current=null;scoreCursor.current=null;clearFlashes();
 }
 function receiveTable(value:TableSnapshot){
  audio.current?.receive(value);
  const round=value.round,key=`${value.room.roomId}:${round?.number??0}:${value.you.seat}`;
  const cursor=scoreCursor.current;
  if(round&&cursor?.key===key){
   const fresh=round.payments.filter(payment=>payment.id>cursor.lastPayment);
   for(const {seat} of round.players){
    const gain=fresh.filter(p=>p.to===seat).reduce((n,p)=>n+p.amount,0);
    const loss=fresh.filter(p=>p.from===seat).reduce((n,p)=>n+p.amount,0);
    if(gain||loss){
     const timer=flashTimers.current[seat];if(timer)clearTimeout(timer);
     const flash={id:++flashId.current,gain,loss};
     setScoreFlashes(previous=>previous.map((old,index)=>index===seat?flash:old));
     flashTimers.current[seat]=setTimeout(()=>{
      setScoreFlashes(previous=>previous.map((old,index)=>index===seat?null:old));
      flashTimers.current[seat]=null;
     },1000);
    }
   }
  }else if(cursor?.key!==key)clearFlashes();
  scoreCursor.current={key,lastPayment:round?.payments.at(-1)?.id??0};
  setTable(value);setId(value.room.roomId);
  if(!value.round){setCap(value.room.settings.scoreCap);setRounds(value.room.settings.rounds);setHexSelections(value.room.settings.hexSelections??2);}
 }
 function actionError(code:string){sentDecision.current=null;setStatus(code==='LOCAL_GAME_ERROR'?t.localError:code==='RATE_LIMITED'?t.rate:t.invalid);}
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{const tick=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(tick);},[]);
 useEffect(()=>{document.documentElement.lang=lang==='zh'?'zh-CN':'en';localStorage.setItem('hex-language',lang);},[lang]);
 async function connect(mode:'practice'|'create'|'join'|'reconnect') {
  audio.current?.unlock();
  setBusy(true);setStatus('');resetFeedback();
  localStorage.setItem('hex-username',username.trim());
  try {
   if(__BOT_ONLY__||mode==='practice'){
    if(mode!=='practice')return;
    const local=localConnection({scoreCap:cap,rounds,hexSelections},receiveTable,actionError,username.trim());
    room.current=local;local.send('action',{type:'start_game'});return;
   }
   const {Client}=await import('colyseus.js');
   const response=await fetch(new URL('config.json',document.baseURI),{cache:'no-store'});
   if(!response.ok)throw Error();
   const config:unknown=await response.json();
   const endpoint=(config as {serverUrl?:unknown})?.serverUrl;
   if(typeof endpoint!=='string')throw Error();
   const url=new URL(endpoint);
   if(!['http:','https:','ws:','wss:'].includes(url.protocol)||url.username||url.password||(location.protocol==='https:'&&!['https:','wss:'].includes(url.protocol)))throw Error();
   const client=new Client(endpoint),saved=localStorage.getItem(reconnectKey(id.trim()));
   const credential=saved?JSON.parse(saved) as {endpoint:string;token:string}:null;
   const token=credential?.endpoint===endpoint?credential.token:null;
   const joined=await (async()=>{
    if((mode==='reconnect'||mode==='join')&&token){
     try{return await client.reconnect(token);}catch{localStorage.removeItem(reconnectKey(id.trim()));}
    }
    if((mode==='join'||mode==='reconnect')&&username.trim()){
     const recoveryUrl=new URL(endpoint);recoveryUrl.protocol=recoveryUrl.protocol.replace('ws','http');recoveryUrl.pathname='/recover-seat';
     const recovered=await fetch(recoveryUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId:id.trim(),username:username.trim()})});
     if(recovered.ok){const {token}=await recovered.json();return client.reconnect(token);}
    }
    if(mode==='join')return client.joinById(id.trim(),{username:username.trim()});
    if(mode==='reconnect')throw Error('NO_RECONNECT');
    return client.create('hex',{scoreCap:cap,rounds,hexSelections,username:username.trim()});
   })();
   let stopped=false,retrying=false;
   let retryTimer:ReturnType<typeof setTimeout>|undefined,watchdog:ReturnType<typeof setTimeout>|undefined;
   let current=joined;
   let retryDeadline=0;
   const key=reconnectKey(joined.roomId);
   const attach=(connection:typeof joined)=>{
    current=connection;room.current=connection;sentDecision.current=null;
    localStorage.setItem(key,JSON.stringify({endpoint,token:connection.reconnectionToken}));
    localStorage.setItem('hex-last-room',connection.roomId);
    connection.onMessage('public',()=>{});
    connection.onMessage('table',value=>{if(!stopped&&current===connection){receiveTable(value);setStatus('');}});
    connection.onMessage('error',(value:{code:string})=>actionError(value.code));
    connection.onMessage('pong',()=>{clearTimeout(watchdog);watchdog=undefined;});
    connection.onLeave((code)=>{if(!stopped&&current===connection){
     clearTimeout(watchdog);watchdog=undefined;
     if(code===4010||code===4000){recoveryCleanup.current?.();room.current=null;setTable(null);setStatus(t.error);return;}
     room.current=null;retryDeadline=Date.now()+1800000;setStatus(t.offline);void retry();
    }});
   };
   const retry=async()=>{
    if(stopped||retrying)return;
    if(Date.now()>retryDeadline){recoveryCleanup.current?.();room.current=null;setTable(null);setStatus(t.error);return;}
    retrying=true;
    try{
     const resumed=await client.reconnect(current.reconnectionToken);
     if(stopped){void resumed.leave();return;}
     attach(resumed);setStatus('');
    }catch{if(!stopped)retryTimer=setTimeout(()=>void retry(),2000);}
    finally{retrying=false;}
   };
   const probe=()=>{
    if(stopped||document.visibilityState==='hidden')return;
    if(!room.current){clearTimeout(retryTimer);void retry();return;}
    if(watchdog)return;
    watchdog=setTimeout(()=>{watchdog=undefined;current.connection.close();},5000);
    current.send('ping');
   };
   recoveryCleanup.current?.();
   recoveryCleanup.current=()=>{stopped=true;clearTimeout(retryTimer);clearTimeout(watchdog);clearInterval(heartbeat);document.removeEventListener('visibilitychange',probe);window.removeEventListener('online',probe);};
   attach(joined);
   const heartbeat=setInterval(probe,15000);
   document.addEventListener('visibilitychange',probe);window.addEventListener('online',probe);
  }catch{setStatus(__BOT_ONLY__||mode==='practice'?t.localError:t.error);}finally{setBusy(false);}
 }
 function action(type:'start_game'|'next_round') {setStatus('');room.current?.send('action',{type});}
 function play(move:Move) {if(!table||sentDecision.current===table.you.legal.decisionId)return;sentDecision.current=table.you.legal.decisionId;setStatus('');room.current?.send('action',{type:'play',move,decisionId:table.you.legal.decisionId});}
 function leave(){recoveryCleanup.current?.();const old=room.current;room.current=null;localStorage.removeItem(reconnectKey(id));void old?.leave();setTable(null);resetFeedback();setStatus('');}
 async function share(){try{const url=new URL(location.href);url.search='';url.searchParams.set('room',id);await navigator.clipboard.writeText(url.href);setStatus(t.copied);}catch{setStatus(t.error);}}
 const round=table?.round,me=table?.you,legal=me?.legal;
 const roundChanges=round?.players.map(player=>round.payments.reduce((change,payment)=>
  change+(payment.to===player.seat?payment.amount:0)-(payment.from===player.seat?payment.amount:0),0))??[];
 const signedScore=(score:number)=>`${score>0?'+':''}${score}`;
 const host=table?.room.hostId===room.current?.sessionId;
 const card=(id:string)=>CARDS.find(c=>c.id===id)!;
 const name=(seat:number)=>table?.room.seats[seat]?.username||`${table?.room.seats[seat]?.bot?t.bot:t.friend} ${seat+1}`;
 function changeSettings(patch: Partial<{scoreCap:ScoreCap;rounds:8|16;hexSelections:1|2|3}>){
  const settings={scoreCap:cap,rounds,hexSelections,...patch};
  if(table){setStatus('');room.current?.send('action',{type:'update_settings',settings});}
  else {setCap(settings.scoreCap);setRounds(settings.rounds);setHexSelections(settings.hexSelections);}
 }
 function settingsControls(){return <div className="settings"><label>{t.cap}<select value={cap} disabled={!!table&&!host} onChange={e=>changeSettings({scoreCap:e.target.value==='uncapped'?'uncapped':Number(e.target.value) as ScoreCap})}>{SCORE_CAPS.map(c=><option key={c} value={c}>{c==='uncapped'?t.uncapped:c}</option>)}</select></label><label>{t.rounds}<select value={rounds} disabled={!!table&&!host} onChange={e=>changeSettings({rounds:Number(e.target.value) as 8|16})}><option>8</option><option>16</option></select></label><label>{t.hexRounds}<select value={hexSelections} disabled={!!table&&!host} onChange={e=>changeSettings({hexSelections:Number(e.target.value) as 1|2|3})}><option value={1}>{t.hexOne}</option><option value={2}>{t.hexTwo}</option><option value={3}>{t.hexThree}</option></select></label></div>;}
 function scoreFeedback(seat:number,zone=false){
  const flash=scoreFlashes[seat];
  return flash&&<div key={flash.id} className={`score-flash${zone?' player-score-flash':''}`} role="status" aria-label={`${name(seat)} · ${t.scoreChange}`}>
   {flash.gain>0&&<span className="score-gain">+{flash.gain}</span>}{flash.loss>0&&<span className="score-loss">−{flash.loss}</span>}
  </div>;
 }
 function player(p:RoundPlayerView,position:string){return <section className={`player ${position} ${round?.turn===p.seat&&round.phase==='discard'?'active':''} ${p.won||p.exited?'retired':''}`} key={p.seat}>
  {p.seat!==me?.seat&&scoreFeedback(p.seat,true)}
  <div className="player-top"><h3>{name(p.seat)} {p.seat===round?.dealer&&<span className="badge">{t.dealer}</span>}</h3><strong className={p.score<0?'negative':'score'}>{p.score>0?'+':''}{p.score}</strong></div>
  <div className="player-meta">{p.exited?t.exited:p.won?t.won:`${p.handCount} ${lang==='en'?'in hand':'张手牌'}`} · {p.missingSuit?`${lang==='en'?'Missing':'缺'} ${t[p.missingSuit]}`:'—'}</div>
  {!!p.cards.length&&<div className="hex-owned">{p.cards.map(id=><HexCardTag key={id} tier={card(id).tier} name={card(id).name[lang]} effect={card(id).description[lang]}/>)}{p.winCount>0&&!p.won&&<span className="blood-count">{t.bloodWins}: {p.winCount}</span>}</div>}
  {p.seat!==me?.seat&&(p.revealedHand!==null?<div className="revealed-hand" aria-label={`${name(p.seat)} · ${t.hand}`}>{[...p.revealedHand].sort((a,b)=>suitOrder.indexOf(a.suit)-suitOrder.indexOf(b.suit)||a.rank-b.rank).map((tile,i)=><Face key={i} tile={tile} small/>)}</div>:<div className="backs" aria-label={`${p.handCount} concealed tiles`}>{Array.from({length:p.handCount},(_,i)=><span key={i}/>)}</div>)}
  <div className="discards" aria-label={t.discards}>{p.discards.length?p.discards.map((tile,i)=><Face tile={tile} key={i} small/>):<small>{t.noDiscards}</small>}</div>
  {(!!p.melds.length||!!p.winningTiles.length)&&<div className="meld-row" aria-label={t.melds}>{p.melds.map((meld,i)=><div className="meld" key={i}>{meld.kind==='concealed_kong'&&!meld.tiles.length?(p.seat===me?.seat&&me.concealedKongs.find(k=>k.meldIndex===i)?Array.from({length:4},(_,j)=><Face key={j} tile={me.concealedKongs.find(k=>k.meldIndex===i)!.tile} small/>):<span className="concealed">▥ ▥ ▥ ▥ <small>{t.concealedKong}</small></span>):meld.tiles.map((tile,j)=><Face key={j} tile={tile} small/>)}</div>)}{p.winningTiles.map((tile,i)=><div className="meld winning-tile" key={`win-${i}`} aria-label={t.win}><span className="win-tile-label">{lang==='zh'?'胡':'Win'}</span><Face tile={tile} small/></div>)}</div>}
 </section>;}
 const hand=me?[...me.hand].sort((a,b)=>a.id===me.drawnId?1:b.id===me.drawnId?-1:suitOrder.indexOf(a.type.suit)-suitOrder.indexOf(b.type.suit)||a.type.rank-b.type.rank):[];
 const automatic=!!round?.players[me!.seat]?.handLocked && !round.players[me!.seat]!.exited && round.phase!=='settled';
 const yourTurn=!automatic&&!!legal?.discardIds.length;
 const hasClaim=!automatic&&!!legal?.claims.length;
 const needSuit=!!legal?.declarations.length;
 const needCard=!automatic&&!!legal?.cardOffers.length;
 const needCollateral=!!legal?.canChooseCollateral;
 const decision=round?.selection??round?.collateral;
 const remainingSeconds=decision?.deadline?Math.max(0,Math.ceil((decision.deadline-now)/1000)):null;
 const settled=round?.phase==='settled';
 return <main className={round?'playing':''}>
  <header><a className="brand" href="#" onClick={e=>e.preventDefault()}>HEX <span>麻将</span></a><div>{__BOT_ONLY__&&<a className="games-link" href="../games.html">← {t.games}</a>}<button className="quiet" aria-pressed={audioEnabled} onClick={()=>{const enabled=!audioEnabled;audio.current?.setEnabled(enabled);setAudioEnabled(enabled);}}>{lang==='zh'?(audioEnabled?'声音：开':'声音：关'):(audioEnabled?'Audio: On':'Audio: Off')}</button><button className="quiet" onClick={()=>setLang(lang==='en'?'zh':'en')}>{lang==='en'?'中文':'English'}</button>{table&&<button className="quiet" onClick={leave}>{t.leave}</button>}</div></header>
  {!table?<div className="landing"><p className="eyebrow">{t.base}</p><h1>{t.title}</h1><p className="subtitle">{t.subtitle}</p><section className="lobby"><label>{t.username}<input value={username} onChange={e=>setUsername(e.target.value)} maxLength={24} placeholder={t.usernameHint} autoComplete="nickname"/></label><p className="muted">{t.usernameHint}</p>{settingsControls()}
   <button className="primary wide" disabled={busy} onClick={()=>void connect('practice')}>{t.practice} <span>→</span></button><button className="quiet wide" disabled={busy||__BOT_ONLY__} onClick={()=>void connect('create')}>{t.create}{__BOT_ONLY__?` (${t.unavailable})`:''}</button>{!__BOT_ONLY__&&<><hr/>
   <label>{t.room}<input value={id} onChange={e=>setId(e.target.value)} inputMode="numeric" maxLength={6}/></label><button disabled={busy||!id.trim()} onClick={()=>void connect('join')}>{t.join}</button>{localStorage.getItem(reconnectKey(id.trim()))&&<button className="quiet" disabled={busy} onClick={()=>void connect('reconnect')}>{t.reconnect}</button>}</>}
   <p className="muted">{t.baseHelp}</p>{!__BOT_ONLY__&&<p className="muted">{t.reconnectHint}</p>}</section><p className="rules-note">{t.rules}</p></div>:
   !round?<section className="lobby waiting"><p className="eyebrow">{t.waiting}</p><h1>{t.title}</h1>{settingsControls()}<ol>{table.room.seats.map(s=><li key={s.index}>{s.playerId?name(s.index):t.empty} <span>{s.connected?t.connected:''}</span></li>)}</ol><p className="code">{id}</p><button onClick={()=>void share()}>{t.share}</button>{host&&<button className="primary" onClick={()=>action('start_game')}>{t.start}</button>}</section>:
   <>
    <div className="table-heading"><div><p className="eyebrow">{t.base}</p><h2>{t.round} {round.number} / {table.room.settings.rounds}</h2></div><div className="wall-counter"><strong>{round.wallRemaining}</strong><span>{t.tiles}</span></div></div>
    <div className={`mahjong-table ${needSuit||needCard||needCollateral||hasClaim||(!automatic&&(legal!.canWin||legal!.kongIds.length>0))?'awaiting-decision':''}`}>
     {player(round.players[(me!.seat+2)%4]!,'north')}{player(round.players[(me!.seat+1)%4]!,'west')}{player(round.players[(me!.seat+3)%4]!,'east')}
     <div className="table-center"><span className="table-mark">麻</span>{scoreFeedback(me!.seat)}<p className="turn-label" role="status">{settled?t.settlement:automatic?t.handLocked:round.phase==='card_selection'?(needCard?t.chooseHex:t.lockedChoice):round.phase==='collateral'?(needCollateral?t.collateralChoice:t.lockedChoice):needSuit?t.selectSuit:yourTurn?(round.bonusTurn?`${t.yourTurn} · ${t.extraTurn}`:t.yourTurn):hasClaim?t.claims:round.players[me!.seat]!.exited?t.exitWatch:round.players[me!.seat]!.won?t.watch:round.phase==='declare'?t.declareWaiting:`${name(round.turn)} · ${t.thinking}`}</p>{round.pending&&<div className="pending"><small>{round.pending.robKong?t.rob:t.pending}</small><Face tile={round.pending.tile}/><span>{name(round.pending.seat)}</span></div>}
     <div className="table-decisions" aria-label={t.controls}>
     {needSuit&&<div className="declare"><h3>{t.selectSuit}</h3><p>{t.suitHelp}</p>{suitOrder.map(suit=><button className={suit} key={suit} onClick={()=>play({type:'declare',suit})}>{t[suit]}</button>)}</div>}
     {!automatic&&round.phase==='card_selection'&&<div className="hex-selection"><p className="eyebrow">{round.selection?.stage==='initial'?t.initialHex:round.selection?.stage==='last32'?t.middleHex:t.lastHex} · {round.selection?t[round.selection.tier]:''}</p><h3>{needCard?t.chooseHex:t.lockedChoice}</h3>{remainingSeconds!==null&&<p className="decision-countdown">{t.autoChoice} {remainingSeconds}{t.seconds}</p>}<div className="hex-offers">{legal!.cardOffers.map(id=><button key={id} className={`hex-card ${card(id).tier}`} onClick={()=>play({type:'choose_card',cardId:id})}><span className="hex-tier">{t[card(id).tier]}</span><strong>{card(id).name[lang]}</strong><span>{card(id).description[lang]}</span><b>{t.choose} →</b></button>)}</div></div>}
     {needCollateral&&<div className="collateral-choice"><h3>{t.collateralChoice}</h3><p>{t.collateralHelp}</p>{remainingSeconds!==null&&<p className="decision-countdown">{t.autoChoice} {remainingSeconds}{t.seconds}</p>}<button className="primary" onClick={()=>play({type:'collateral',use:true})}>{t.yesCollateral}</button><button className="quiet" onClick={()=>play({type:'collateral',use:false})}>{t.noCollateral}</button></div>}
      <div className="action-bar">
       {!automatic&&legal!.canWin&&<button className="win-button" onClick={()=>play({type:'win'})}>{t.win}</button>}
       {(!automatic?legal!.kongIds:[]).map(tileId=><button key={tileId} onClick={()=>play({type:'kong',tileId})}>{t.kong} · {me!.hand.find(tile=>tile.id===tileId)!.type.rank}{t[me!.hand.find(tile=>tile.id===tileId)!.type.suit]}</button>)}
       {(!automatic?legal!.claims:[]).map(claim=><button key={claim} className={claim==='win'?'win-button':claim==='pass'?'quiet':'primary'} onClick={()=>play({type:'claim',claim})}>{t[claim]}</button>)}
      </div>
     </div></div>
     {player(round.players[me!.seat]!,'south')}
    </div>
    {<section className={`hand-panel ${yourTurn||hasClaim||needSuit||needCard||needCollateral?'has-action':''}`} aria-label={t.controls}>
      <div className="hand-heading"><h3>{t.hand}</h3><span>{settled?t.review:automatic?t.handLocked:needSuit?t.selectSuit:needCard?t.chooseHex:needCollateral?t.collateralChoice:round.phase==='card_selection'?t.lockedChoice:yourTurn?t.selectTile:round.players[me!.seat]!.exited?t.exitWatch:round.players[me!.seat]!.won?t.watch:hasClaim?t.claims:t.waitingAction}</span></div>
      <div className="hand">{hand.map(tile=><button key={tile.id} aria-label={`${tile.type.rank} ${t[tile.type.suit]}`} aria-disabled={automatic||!legal!.discardIds.includes(tile.id)} className={`tile-button ${tile.id===me!.drawnId?'drawn':''} ${yourTurn&&!legal!.discardIds.includes(tile.id)?'not-discardable':''}`} onClick={event=>{if(!automatic&&event.detail<=1&&legal!.discardIds.includes(tile.id))play({type:'discard',tileId:tile.id});}}><Face tile={tile.type}/></button>)}</div>
     {round.players[me!.seat]!.handLocked&&!settled&&<p className="forced">{t.handLocked}</p>}
      {yourTurn&&!round.players[me!.seat]!.cards.includes('colour-blind')&&me!.hand.some(tile=>tile.type.suit===round.players[me!.seat]!.missingSuit)&&<p className="forced">{t.forced}</p>}

    </section>}
    {settled&&<section className="settlement"><p className="eyebrow">{table.room.lifecycle==='game_complete'?t.sessionEnd:t.settlement}</p><h2>{round.endReason==='wall_empty'?t.wallEnd:t.winnersEnd}</h2><div className="scoreboard">{[...round.players].sort((a,b)=>b.score-a.score||name(a.seat).localeCompare(name(b.seat))).map((p,i)=><div key={p.seat}><span>{i+1}. {name(p.seat)}</span><strong>{signedScore(roundChanges[p.seat]??0)} ({signedScore(p.score)})</strong></div>)}</div>{host&&round.number<table.room.settings.rounds?<button className="primary" onClick={()=>action('next_round')}>{t.next} →</button>:round.number===table.room.settings.rounds?<button onClick={leave}>{t.fresh}</button>:<p>{t.waitingHost}</p>}</section>}
    <div className="details-grid"><details open={!!settled}><summary>{t.ledger} <span>{round.payments.length}</span></summary><div className="ledger-scroll">{!round.payments.length?<p className="muted">{t.noPayments}</p>:<table><thead><tr><th>{t.from} → {t.to}</th><th>{t.amount}</th><th>{t.reason}</th></tr></thead><tbody>{round.payments.map(p=><tr key={p.id}><td>{name(p.from)} → {name(p.to)}</td><td>{p.amount}{p.critical&&<small className="crit-label">{t.critical}</small>}</td><td>{p.reason==='win'?t.winReason:p.reason==='kong'?t.kongReason:t[p.reason]}{p.patterns.length>0&&<small>{p.patterns.map(pattern=>`${patternWords[pattern.key][lang==='en'?0:1]} +${pattern.fan}`).join(' · ')} = {p.fan} {t.fan}</small>}</td></tr>)}</tbody></table>}</div></details>
     <details><summary>{t.log}</summary><ol className="event-log">{[...round.events].reverse().map(e=><li key={e.id}><span>{name(e.seat)} · {e.kind==='discard'?t.discardEvent:e.kind==='draw'?t.drawEvent:e.kind==='pong'?t.pongEvent:e.kind==='kong'?t.kongEvent:e.kind==='win'?t.winEvent:e.kind==='declare'?t.declareEvent:e.kind==='deal'?t.dealEvent:e.kind==='hex'?`${e.effect==='selection'?t.hexSelection:e.effect==='acquired'?t.hexAcquired:e.effect==='wall_removed'?`${e.count} ${t.hexRemoved}`:e.effect==='wall_copied'?`${e.count} ${t.hexCopied}`:e.effect==='cheat_draw'?t.hexCheat:e.effect==='extra_turn'?t.hexBonus:e.effect==='bonus_interrupted'?t.hexInterrupted:e.effect==='hand_locked'?t.hexLock:e.effect==='turn_restarted'?`${card(e.card!).name[lang]} · ${t.hexBonus}`:e.effect==='round_exit'?t.hexExit:e.effect==='hand_refilled'?`${e.count} ${t.hexRefill}`:e.effect==='critical'?t.hexCritical:t.hexSkip}${e.effect==='acquired'&&e.card?` ${card(e.card).name[lang]}`:''}`:t.settledEvent}</span>{e.tile&&<Face tile={e.tile} small/>}</li>)}</ol></details></div>
    <footer>{t.baseHelp} {!__BOT_ONLY__&&room.current?.sessionId!=='local-player'&&<button className="quiet" onClick={()=>void share()}>{t.share}</button>}</footer>
   </>}
  <p className="status" role="alert">{status}</p>
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
