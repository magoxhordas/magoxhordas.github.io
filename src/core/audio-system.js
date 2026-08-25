// SISTEMA DE ÁUDIO — Música procedural estilo Hollow Knight + SFX
// ══════════════════════════════════════════════════════════════════
const Audio = (function(){
  let ctx = null;
  let masterGain = null, musicGain = null, sfxGain = null, attackGain = null;
  let musicVol = 0.48, sfxVol = 0.65, attackVol = 0.65;
  let attackEnabled = true;
  let enabled = true;
  let currentTrack = null;
  let trackNodes = [];
  let activeMusicTheme = 'none';

  function markMusicTheme(theme){
    activeMusicTheme=theme;
    if(document?.documentElement) document.documentElement.dataset.musicTheme=theme;
  }

  function init(){
    if(ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain(); masterGain.gain.value = 1;

      // Master high-pass — cuts muddy sub bass below 80Hz
      const masterHP = ctx.createBiquadFilter();
      masterHP.type = 'highpass'; masterHP.frequency.value = 80; masterHP.Q.value = 0.7;
      masterHP.connect(ctx.destination);
      masterGain.connect(masterHP);

      musicGain = ctx.createGain(); musicGain.gain.value = musicVol;
      musicGain.connect(masterGain);
      sfxGain = ctx.createGain(); sfxGain.gain.value = sfxVol;
      sfxGain.connect(masterGain);
      attackGain = ctx.createGain(); attackGain.gain.value = attackEnabled?attackVol:0;
      attackGain.connect(masterGain);
    } catch(e){ enabled = false; }
  }

  // ── Helpers ──

  // Plate reverb simulation — shorter, airier than before
  function makeReverb(secs=1.8, density=0.45){
    if(!ctx) return null;
    const len = Math.floor(ctx.sampleRate * secs);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for(let c=0;c<2;c++){
      const d = buf.getChannelData(c);
      for(let i=0;i<len;i++){
        // Exponential decay with slight diffusion
        d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, density) * (i<100?i/100:1);
      }
    }
    const conv = ctx.createConvolver(); conv.buffer = buf;
    // High-pass the reverb output — keep it airy, not boomy
    const hp = ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=300;
    conv.connect(hp);
    return hp; // return the filtered output node
  }

  // White noise burst — band-limited, no sub rumble
  function noise(vol, dest, t, dur, freq=2000, Q=1.2){
    if(!ctx||dur<=0) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = Math.random()*2-1;
    const src = ctx.createBufferSource();
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = freq; filt.Q.value = Q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t+0.004);
    g.gain.linearRampToValueAtTime(0, t+dur);
    src.buffer = buf;
    src.connect(filt); filt.connect(g); g.connect(dest);
    src.start(t);
    return src;
  }

  // Oscillator with envelope — auto-tracked
  function osc(freq, type, vol, dest, t, dur, atk=0.01, rel=0.1){
    if(!ctx||dur<=0) return null;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    const safeVol = Math.max(0, Math.min(1, vol));
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(safeVol, t+Math.max(0.001,atk));
    g.gain.setValueAtTime(safeVol, t+Math.max(atk+0.001, dur-rel));
    g.gain.linearRampToValueAtTime(0, t+dur);
    o.connect(g); g.connect(dest);
    try{ o.start(t); o.stop(t+dur+0.05); } catch(e){ return null; }
    const nd = {osc:o, gain:g, stop:()=>{ try{o.stop(0);}catch(e){} try{g.disconnect();}catch(e){} }};
    trackNodes.push(nd);
    return nd;
  }

  // Note from semitones above base
  function n(base, semi){ return base * Math.pow(2, semi/12); }

  // Stop music with fade
  // ── Robust node tracking with generation IDs ──
  let _gen = 0; // increments each time a new track starts
  let _allTimeouts = []; // all scheduled timeouts

  function _killAll(){
    // Kill every timeout immediately
    _allTimeouts.forEach(id=>clearTimeout(id)); _allTimeouts=[];
    currentTrack=null;
    // Kill every node
    trackNodes.forEach(nd=>{
      try{ if(nd.osc) nd.osc.stop(0); } catch(e){}
      try{ if(nd.stop) nd.stop(0); } catch(e){}
      try{ if(nd.disconnect) nd.disconnect(); } catch(e){}
    });
    trackNodes=[];
    _gen++;
    markMusicTheme('none');
  }

  function _addTimeout(fn, ms){
    const id=setTimeout(fn,ms); _allTimeouts.push(id); return id;
  }

  function stopMusic(fade=1.0){
    if(!ctx) return;
    _killAll();
    // Fade out musicGain
    const now=ctx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value||musicVol, now);
    musicGain.gain.linearRampToValueAtTime(0.0001, now+fade);
    // Restore after fade
    const rid=setTimeout(()=>{
      musicGain.gain.cancelScheduledValues(ctx.currentTime);
      musicGain.gain.setValueAtTime(musicVol, ctx.currentTime);
    }, (fade+0.1)*1000);
    _allTimeouts.push(rid);
  }

  // ══════════════════════════════════
  // MENU — Hollow Knight atmosphere
  // Sparse, high-register, haunting
  // Key: D minor / Dorian, ~62 BPM
  // ══════════════════════════════════
  function playMenuMusic(){
    if(!ctx||!enabled) return;
    stopMusic(0.4);
    const myGen = ++_gen;
    markMusicTheme('menu');
    // Restore gain after stopMusic fade
    setTimeout(()=>{ if(_gen===myGen) musicGain.gain.setValueAtTime(musicVol, ctx.currentTime); }, 500);

    const rev = makeReverb(2.5, 0.42);
    const revG = ctx.createGain(); revG.gain.value = 0.55; rev.connect(revG); revG.connect(musicGain);
    const dry = ctx.createGain(); dry.gain.value = 0.45; dry.connect(musicGain);

    const ROOT = 293.66;
    const minor = [0,2,3,5,7,8,10,12,14,15,17,19];
    const BPM=62, BAR=60/BPM*4;
    let t = ctx.currentTime + 0.6;

    const melPats = [
      [{s:0,d:1.5,ni:7},{s:1.5,d:0.5,ni:5},{s:2,d:1,ni:3},{s:3,d:1,ni:2}],
      [{s:0,d:2,ni:9},{s:2,d:1,ni:7},{s:3,d:1,ni:5}],
      [{s:0,d:0.5,ni:5},{s:0.5,d:0.5,ni:7},{s:1,d:1,ni:9},{s:2,d:2,ni:7}],
      [{s:1,d:1.5,ni:12},{s:2.5,d:1.5,ni:9}],
    ];
    const bellPat = [{s:0,ni:12},{s:1,ni:9},{s:2,ni:7},{s:3.5,ni:5}];

    function bars(rem=64){
      if(_gen!==myGen||!enabled) return;
      const barPhase = Math.floor((64-rem)/4);
      const padFreqs = [ROOT, n(ROOT,3), n(ROOT,7)];
      padFreqs.forEach(f=>{ osc(f,'sine',0.04,revG,t,BAR*1.2,0.6,1.0); });
      const pat = melPats[barPhase%melPats.length];
      const beat = BAR/4;
      pat.forEach(step=>{
        const f = n(ROOT*2, minor[step.ni%minor.length]);
        osc(f,'sine',0.13,dry,t+step.s*beat,step.d*beat*0.88,0.015,step.d*beat*0.5);
        osc(f,'sine',0.06,revG,t+step.s*beat,step.d*beat*1.5,0.015,step.d*beat);
      });
      if(rem%3===0||rem%7===0){
        bellPat.forEach(b=>{
          const bf=n(ROOT*4,minor[b.ni%minor.length]);
          osc(bf,'sine',0.09,revG,t+b.s*beat,BAR*0.8,0.001,BAR*0.75);
        });
      }
      if(rem%2===0){
        const pizzFreq=n(ROOT,minor[(barPhase*3)%minor.length]);
        osc(pizzFreq,'triangle',0.08,dry,t,0.18,0.003,0.15);
      }
      t+=BAR;
      currentTrack=_addTimeout(()=>bars(rem-1),(BAR-0.08)*1000);
    }
    bars(64);
  }

  // ══════════════════════════════════
  // CRIPTA — tema exclusivo das ondas 1–5
  // Marcha fúnebre lenta, coral grave, pedra, correntes e sino distante.
  // ══════════════════════════════════
  function playCryptMusic(){
    if(!ctx||!enabled) return;
    stopMusic(.35);
    const myGen=++_gen;
    markMusicTheme('crypt');
    setTimeout(()=>{if(_gen===myGen)musicGain.gain.setValueAtTime(musicVol,ctx.currentTime);},460);

    const dry=ctx.createGain();dry.gain.value=.48;dry.connect(musicGain);
    const temple=ctx.createGain();temple.gain.value=.32;temple.connect(musicGain);
    const delay=ctx.createDelay(.8);delay.delayTime.value=.37;
    const echoFilter=ctx.createBiquadFilter();echoFilter.type='lowpass';echoFilter.frequency.value=1350;
    const echoGain=ctx.createGain();echoGain.gain.value=.22;
    temple.connect(delay);delay.connect(echoFilter);echoFilter.connect(echoGain);echoGain.connect(musicGain);
    trackNodes.push({stop:()=>{try{dry.disconnect();temple.disconnect();delay.disconnect();echoFilter.disconnect();echoGain.disconnect();}catch(e){}}});

    const ROOT=164.81;
    const scale=[0,1,3,5,7,8,10,12,13];
    const BPM=52,BEAT=60/BPM,BAR=BEAT*4;
    const dirges=[
      [[5,0,1.5],[3,1.5,.5],[1,2,2]],
      [[7,0,2],[5,2,1],[3,3,1]],
      [[4,0,1],[3,1,1],[1,2,2]],
      [[5,0,.75],[4,.75,.75],[3,1.5,.5],[0,2,2]]
    ];
    let t=ctx.currentTime+.16;

    function cryptBars(rem=96){
      if(_gen!==myGen||!enabled||rem<=0){currentTrack=null;return;}
      const barIndex=96-rem;
      const phase=barIndex%dirges.length;

      // Pedal grave e coral masculino: longos e pouco melódicos.
      osc(ROOT*.5,'sine',.105,dry,t,BAR*1.04,.32,1.05);
      [0,3,5].forEach((si,index)=>{
        osc(n(ROOT,scale[si]),index===0?'triangle':'sine',index===0?.052:.026,temple,t,BAR*.96,.58,1.18);
      });

      // Impactos de pedra abafados; não há kick, caixa ou hi-hat.
      [0,BEAT*2.5].forEach((offset,index)=>{
        const at=t+offset;
        const gain=ctx.createGain();gain.gain.setValueAtTime(index?.11:.16,at);gain.gain.exponentialRampToValueAtTime(.001,at+.32);gain.connect(dry);
        const hit=ctx.createOscillator();hit.type='sine';hit.frequency.setValueAtTime(index?96:108,at);hit.frequency.exponentialRampToValueAtTime(82,at+.28);
        hit.connect(gain);try{hit.start(at);hit.stop(at+.36);}catch(e){}
        trackNodes.push({stop:()=>{try{hit.stop(0);}catch(e){}try{gain.disconnect();}catch(e){}}});
      });

      // Corrente e ar de corredor surgem em pontos diferentes a cada compasso.
      noise(.035,temple,t+BEAT*(1.25+(phase*.19)),.3,720+phase*115,4.4);
      noise(.018,temple,t+BEAT*3.45,.52,430,1.2);

      // Lamento agudo muito esparso, com grandes espaços entre as notas.
      dirges[phase].forEach(([si,start,dur])=>{
        const at=t+start*BEAT;
        osc(n(ROOT*2,scale[si]),'sine',.042,temple,at,dur*BEAT*.92,.055,dur*BEAT*.66);
      });

      // Sino funerário a cada dois compassos, com parciais metálicos discretos.
      if(barIndex%2===0){
        const bellAt=t+BEAT*3.08;
        [[1,.045],[1.51,.022],[2.19,.012]].forEach(([ratio,vol])=>osc(ROOT*3*ratio,'sine',vol,temple,bellAt,BEAT*1.72,.004,BEAT*1.55));
      }

      t+=BAR;
      currentTrack=_addTimeout(()=>cryptBars(rem-1),(BAR-.1)*1000);
    }
    cryptBars();
  }

  // ══════════════════════════════════
  // FLORESTA ASSOMBRADA — ondas 6–10
  // Madeira oca, sussurros, pulsos graves e cordas tensas sem aventura alegre.
  // ══════════════════════════════════
  function playHauntedForestMusic(){
    if(!ctx||!enabled) return;
    stopMusic(.38);
    const myGen=++_gen;
    markMusicTheme('haunted-forest');
    setTimeout(()=>{if(_gen===myGen)musicGain.gain.setValueAtTime(musicVol,ctx.currentTime);},500);

    const dry=ctx.createGain();dry.gain.value=.43;dry.connect(musicGain);
    const woods=ctx.createGain();woods.gain.value=.34;woods.connect(musicGain);
    const reverb=makeReverb(3.6,.31);
    const echo=ctx.createGain();echo.gain.value=.37;woods.connect(reverb);reverb.connect(echo);echo.connect(musicGain);
    const whisper=ctx.createBiquadFilter();whisper.type='bandpass';whisper.frequency.value=940;whisper.Q.value=1.8;whisper.connect(woods);
    trackNodes.push({stop:()=>{try{dry.disconnect();woods.disconnect();reverb.disconnect();echo.disconnect();whisper.disconnect();}catch(e){}}});

    const ROOT=146.83,scale=[0,1,3,5,6,7,10,12,13,15];
    const BPM=56,BEAT=60/BPM,BAR=BEAT*4;
    const calls=[
      [[5,.55,.65],[3,1.62,.42],[1,2.78,.75]],
      [[7,.38,.82],[6,1.78,.5],[3,2.65,.9]],
      [[3,.48,.55],[5,1.28,.48],[1,2.46,.74]],
      [[6,.34,.68],[5,1.42,.55],[3,2.52,.44],[0,3.18,.62]]
    ];
    const roots=[[0,3,6],[0,5,7],[1,3,6],[0,3,7]];
    let t=ctx.currentTime+.18;
    function forestBars(rem=96){
      if(_gen!==myGen||!enabled||rem<=0){currentTrack=null;return;}
      const barIndex=96-rem,phase=barIndex%4;
      osc(n(ROOT*.5,scale[phase===2?1:0]),'sine',.085,dry,t,BAR*1.03,.38,.92);
      roots[phase].forEach((si,index)=>osc(n(ROOT,scale[si]),index===0?'triangle':'sine',index===0?.035:.019,woods,t,BAR*.91,.62,1.1));
      noise(.013,whisper,t+BEAT*(.28+phase*.21),BAR*.66,720+phase*110,2.2);
      noise(.01,woods,t+BEAT*3.34,.38,280,1.05);
      calls[phase].forEach(([si,start,dur],index)=>{
        const at=t+start*BEAT,freq=n(ROOT*2,scale[si]);
        osc(freq,index%2?'sine':'triangle',index===0?.041:.028,whisper,at,dur*BEAT*.9,.06,dur*BEAT*.68);
      });
      if(barIndex%2===0){
        const at=t+BEAT*2.52;
        const g=ctx.createGain();g.gain.setValueAtTime(.095,at);g.gain.exponentialRampToValueAtTime(.001,at+.25);g.connect(dry);
        const o=ctx.createOscillator();o.type='sine';o.frequency.setValueAtTime(126,at);o.frequency.exponentialRampToValueAtTime(82,at+.22);o.connect(g);
        try{o.start(at);o.stop(at+.29);}catch(e){}
        trackNodes.push({stop:()=>{try{o.stop(0);}catch(e){}try{g.disconnect();}catch(e){}}});
      }
      if(barIndex%4===3) noise(.018,woods,t+BEAT*3.12,.46,1550,5.2);
      t+=BAR;
      currentTrack=_addTimeout(()=>forestBars(rem-1),(BAR-.1)*1000);
    }
    forestBars();
  }

  // ══════════════════════════════════
  // FORTALEZA CONGELADA — ondas 11–15
  // Dark fantasy frio, melancólico e esparso, sem pulso frenético.
  // ══════════════════════════════════
  function playFrozenMusic(){
    if(!ctx||!enabled) return;
    stopMusic(.45);
    const myGen=++_gen;
    markMusicTheme('frozen');
    setTimeout(()=>{if(_gen===myGen)musicGain.gain.setValueAtTime(musicVol,ctx.currentTime);},560);

    const dry=ctx.createGain();dry.gain.value=.38;dry.connect(musicGain);
    const hall=ctx.createGain();hall.gain.value=.36;hall.connect(musicGain);
    const reverb=makeReverb(4.2,.28);
    const reverbGain=ctx.createGain();reverbGain.gain.value=.44;
    hall.connect(reverb);reverb.connect(reverbGain);reverbGain.connect(musicGain);
    const coldFilter=ctx.createBiquadFilter();coldFilter.type='lowpass';coldFilter.frequency.value=1650;coldFilter.Q.value=.7;coldFilter.connect(hall);
    trackNodes.push({stop:()=>{try{dry.disconnect();hall.disconnect();reverb.disconnect();reverbGain.disconnect();coldFilter.disconnect();}catch(e){}}});

    const ROOT=146.83;
    const scale=[0,2,3,5,7,8,11,12,14,15];
    const BPM=50,BEAT=60/BPM,BAR=BEAT*4;
    const laments=[
      [[7,.35,1.4],[5,2.15,.8],[3,3.1,.7]],
      [[8,.2,1.7],[7,2.3,1.1]],
      [[5,.55,.75],[7,1.55,.8],[3,2.7,1.15]],
      [[11,.4,1.25],[8,2.05,.7],[7,3.05,.75]]
    ];
    const chords=[[0,3,7],[0,5,8],[2,5,7],[0,3,8]];
    let t=ctx.currentTime+.2;

    function frozenBars(rem=96){
      if(_gen!==myGen||!enabled||rem<=0){currentTrack=null;return;}
      const barIndex=96-rem;
      const phase=barIndex%4;

      // Pedra gelada e vento distante sustentam o perigo, sem bateria.
      osc(n(ROOT*.5,scale[phase===2?2:0]),'sine',.09,dry,t,BAR*1.04,.55,1.2);
      chords[phase].forEach((si,index)=>{
        osc(n(ROOT,scale[si]),index===0?'triangle':'sine',index===0?.034:.021,coldFilter,t,BAR*.94,.72,1.3);
      });
      noise(.012,hall,t+BEAT*(.55+phase*.18),BAR*.72,520+phase*95,1.15);

      // Lamento curto e espaçado, com timbre vítreo de castelo congelado.
      laments[phase].forEach(([si,start,dur],index)=>{
        const at=t+start*BEAT;
        const freq=n(ROOT*2,scale[si]);
        osc(freq,'sine',index===0?.05:.036,hall,at,dur*BEAT*.92,.07,dur*BEAT*.74);
        osc(freq*2.003,'sine',.011,coldFilter,at+.012,dur*BEAT*.7,.02,dur*BEAT*.6);
      });

      // Pequenos reflexos musicais de gelo, raros e irregulares.
      if(barIndex%2===0){
        const at=t+BEAT*(3.28+(phase%2)*.12);
        const bell=n(ROOT*4,scale[7+(phase%3)]);
        [[1,.036],[1.498,.014],[2.01,.009]].forEach(([ratio,vol])=>osc(bell*ratio,'sine',vol,hall,at,BEAT*1.65,.003,BEAT*1.55));
      }
      if(barIndex%4===3) noise(.018,hall,t+BEAT*3.52,.42,2250,7.2);

      t+=BAR;
      currentTrack=_addTimeout(()=>frozenBars(rem-1),(BAR-.11)*1000);
    }
    frozenBars();
  }

  // ══════════════════════════════════
  // RUÍNAS FÓSSEIS — ondas 16–20
  // Deserto antigo, horizonte vasto e tensão mística sem clima de aventura alegre.
  // ══════════════════════════════════
  function playFossilDesertMusic(){
    if(!ctx||!enabled) return;
    stopMusic(.42);
    const myGen=++_gen;
    markMusicTheme('fossil-desert');
    setTimeout(()=>{if(_gen===myGen)musicGain.gain.setValueAtTime(musicVol,ctx.currentTime);},520);

    const dry=ctx.createGain();dry.gain.value=.42;dry.connect(musicGain);
    const ruins=ctx.createGain();ruins.gain.value=.31;ruins.connect(musicGain);
    const reverb=makeReverb(3.4,.32);
    const reverbGain=ctx.createGain();reverbGain.gain.value=.38;
    ruins.connect(reverb);reverb.connect(reverbGain);reverbGain.connect(musicGain);
    const reedFilter=ctx.createBiquadFilter();reedFilter.type='bandpass';reedFilter.frequency.value=980;reedFilter.Q.value=1.25;reedFilter.connect(ruins);
    trackNodes.push({stop:()=>{try{dry.disconnect();ruins.disconnect();reverb.disconnect();reverbGain.disconnect();reedFilter.disconnect();}catch(e){}}});

    const ROOT=146.83;
    const scale=[0,1,3,5,7,8,10,12,13,15];
    const BPM=58,BEAT=60/BPM,BAR=BEAT*4;
    const calls=[
      [[7,.5,.72],[5,1.55,.48],[3,2.58,.88]],
      [[8,.35,.65],[7,1.28,.58],[5,2.72,.9]],
      [[5,.7,.48],[6,1.48,.62],[3,2.42,.5],[1,3.12,.62]],
      [[7,.42,1.05],[8,2.02,.55],[5,3.02,.62]]
    ];
    const buriedChords=[[0,3,7],[0,5,8],[1,5,7],[0,3,8]];
    let t=ctx.currentTime+.18;

    function fossilBars(rem=96){
      if(_gen!==myGen||!enabled||rem<=0){currentTrack=null;return;}
      const barIndex=96-rem;
      const phase=barIndex%4;

      // Horizonte aberto: pedal grave e quintas longas, com bastante silêncio interno.
      osc(n(ROOT*.5,scale[phase===2?1:0]),'sine',.085,dry,t,BAR*1.03,.42,1.05);
      buriedChords[phase].forEach((si,index)=>{
        osc(n(ROOT,scale[si]),index===0?'triangle':'sine',index===0?.034:.018,ruins,t,BAR*.9,.68,1.18);
      });

      // Sopro quente distante e areia raspando pedras antigas.
      noise(.015,ruins,t+BEAT*(.32+phase*.17),BAR*.62,420+phase*85,1.05);
      noise(.012,reedFilter,t+BEAT*3.36,.28,1750+phase*180,5.4);

      // Frases modais lembram uma flauta de osso, nunca uma melodia festiva.
      calls[phase].forEach(([si,start,dur],index)=>{
        const at=t+start*BEAT;
        const freq=n(ROOT*2,scale[si]);
        osc(freq,index%2?'sine':'triangle',index===0?.043:.031,reedFilter,at,dur*BEAT*.88,.045,dur*BEAT*.62);
        osc(freq*.501,'sine',.012,ruins,at+.025,dur*BEAT*.78,.06,dur*BEAT*.68);
      });

      // Impactos ocos e raros sugerem ruínas soterradas, sem virar bateria moderna.
      if(barIndex%2===0){
        const at=t+BEAT*(2.72+(phase%2)*.18);
        const hitGain=ctx.createGain();hitGain.gain.setValueAtTime(.11,at);hitGain.gain.exponentialRampToValueAtTime(.001,at+.34);hitGain.connect(dry);
        const hit=ctx.createOscillator();hit.type='sine';hit.frequency.setValueAtTime(104,at);hit.frequency.exponentialRampToValueAtTime(72,at+.31);
        hit.connect(hitGain);try{hit.start(at);hit.stop(at+.38);}catch(e){}
        trackNodes.push({stop:()=>{try{hit.stop(0);}catch(e){}try{hitGain.disconnect();}catch(e){}}});
      }
      if(barIndex%4===1){
        const boneAt=t+BEAT*3.18;
        [[1,.029],[1.47,.012],[2.12,.007]].forEach(([ratio,vol])=>osc(ROOT*3*ratio,'sine',vol,ruins,boneAt,BEAT*1.4,.003,BEAT*1.3));
      }

      t+=BAR;
      currentTrack=_addTimeout(()=>fossilBars(rem-1),(BAR-.1)*1000);
    }
    fossilBars();
  }

  // ══════════════════════════════════
  // INFERNO ANCESTRAL — ondas 21–25
  // Calor, ameaça e ritual vulcânico: energia constante sem bateria moderna.
  // ══════════════════════════════════
  function playAncientVolcanoMusic(){
    if(!ctx||!enabled) return;
    stopMusic(.38);
    const myGen=++_gen;
    markMusicTheme('ancient-volcano');
    setTimeout(()=>{if(_gen===myGen)musicGain.gain.setValueAtTime(musicVol,ctx.currentTime);},480);

    const dry=ctx.createGain();dry.gain.value=.46;dry.connect(musicGain);
    const ritual=ctx.createGain();ritual.gain.value=.34;ritual.connect(musicGain);
    const reverb=makeReverb(3.0,.37);
    const reverbGain=ctx.createGain();reverbGain.gain.value=.42;
    ritual.connect(reverb);reverb.connect(reverbGain);reverbGain.connect(musicGain);
    const fireFilter=ctx.createBiquadFilter();fireFilter.type='bandpass';fireFilter.frequency.value=620;fireFilter.Q.value=.72;fireFilter.connect(ritual);
    const hornFilter=ctx.createBiquadFilter();hornFilter.type='lowpass';hornFilter.frequency.value=920;hornFilter.Q.value=1.1;hornFilter.connect(ritual);
    trackNodes.push({stop:()=>{try{dry.disconnect();ritual.disconnect();reverb.disconnect();reverbGain.disconnect();fireFilter.disconnect();hornFilter.disconnect();}catch(e){}}});

    const ROOT=110;
    const scale=[0,1,3,5,6,7,10,12,13,15,17];
    const BPM=70,BEAT=60/BPM,BAR=BEAT*4;
    const buriedChords=[[0,6,8],[0,5,7],[1,6,9],[0,3,6]];
    const hornCalls=[
      [[7,.34,.72],[6,1.72,.48],[3,2.58,.72]],
      [[10,.28,.58],[7,1.35,.66],[6,2.72,.8]],
      [[6,.42,.55],[7,1.18,.46],[3,2.18,.9]],
      [[5,.3,.62],[3,1.48,.56],[1,2.45,.48],[0,3.12,.68]]
    ];
    let t=ctx.currentTime+.16;

    function ritualImpact(at,heavy=false){
      const g=ctx.createGain();g.gain.setValueAtTime(heavy?.18:.115,at);g.gain.exponentialRampToValueAtTime(.001,at+(heavy?.58:.38));g.connect(dry);
      const o=ctx.createOscillator();o.type='sine';o.frequency.setValueAtTime(heavy?126:108,at);o.frequency.exponentialRampToValueAtTime(heavy?82:88,at+(heavy?.48:.31));
      o.connect(g);try{o.start(at);o.stop(at+(heavy?.62:.43));}catch(e){}
      noise(heavy?.045:.025,ritual,at+.012,heavy?.28:.2,270,1.1);
      trackNodes.push({stop:()=>{try{o.stop(0);}catch(e){}try{g.disconnect();}catch(e){}}});
    }

    function volcanoBars(rem=96){
      if(_gen!==myGen||!enabled||rem<=0){currentTrack=null;return;}
      const barIndex=96-rem;
      const phase=barIndex%4;

      // O vulcão sustenta um pedal grave e acordes com trítono, como um lugar vivo.
      osc(n(ROOT,scale[phase===2?1:0]),'sine',.095,dry,t,BAR*1.04,.32,.95);
      osc(n(ROOT*.5,scale[phase===3?3:0]),'triangle',.052,dry,t,BAR*.98,.38,.86);
      buriedChords[phase].forEach((si,index)=>{
        osc(n(ROOT*2,scale[si]),index===0?'triangle':'sine',index===0?.036:.02,ritual,t,BAR*.9,.42,1.05);
      });

      // Golpes cerimoniais largos: marcam o pulso sem formar uma bateria moderna.
      ritualImpact(t,barIndex%4===0);
      ritualImpact(t+BEAT*2.55,false);
      if(barIndex%2===1) ritualImpact(t+BEAT*3.34,false);

      // Fogo, pedra e ar quente mantêm movimento entre os ataques.
      noise(.018,fireFilter,t+BEAT*.22,BAR*.72,520+phase*55,.82);
      noise(.012,ritual,t+BEAT*2.02,.46,1280+phase*90,2.4);
      hornCalls[phase].forEach(([si,start,dur],index)=>{
        const at=t+start*BEAT;
        const freq=n(ROOT*2,scale[si]);
        osc(freq,index===0?'sawtooth':'triangle',index===0?.032:.026,hornFilter,at,dur*BEAT*.88,.09,dur*BEAT*.54);
        osc(freq*.5,'sine',.014,ritual,at+.03,dur*BEAT*.76,.08,dur*BEAT*.64);
      });

      // Metal ancestral distante e irregular, como ressonância sob a rocha.
      if(barIndex%4===2){
        const at=t+BEAT*3.08;
        [[1,.026],[1.505,.012],[2.04,.007]].forEach(([ratio,vol])=>osc(ROOT*4*ratio,'sine',vol,ritual,at,BEAT*1.75,.003,BEAT*1.62));
      }

      t+=BAR;
      currentTrack=_addTimeout(()=>volcanoBars(rem-1),(BAR-.1)*1000);
    }
    volcanoBars();
  }

  // ══════════════════════════════════
  // COMBAT — arenas abertas
  // Percussion-forward, clear mid
  // Key: D minor, 96 BPM
  // ══════════════════════════════════
  const COMBAT_THEMES={
    castle:{root:293.66,bpm:96,bass:[[0,0,3,5,0,0,7,5],[0,3,0,0,5,0,3,7]],lead:[[0,.5],[3,.25],[5,.25],[7,.5],[5,.25],[3,.25],[2,.5],[0,.5]]},
    forest:{root:261.63,bpm:100,bass:[[0,3,0,5,7,5,3,0],[0,0,5,3,7,3,5,0]],lead:[[0,.25],[3,.25],[7,.5],[5,.5],[3,.25],[2,.25],[0,1]]},
    snow:{root:220,bpm:92,bass:[[0,0,5,7,0,3,7,5],[0,3,5,3,7,5,3,0]],lead:[[7,.5],[5,.5],[3,.5],[0,.5],[2,.25],[3,.25],[5,.5],[7,.5]]},
    desert:{root:196,bpm:104,bass:[[0,1,0,5,0,7,5,1],[0,0,4,5,7,5,4,1]],lead:[[0,.25],[1,.25],[4,.5],[5,.25],[7,.25],[5,.5],[1,.5],[0,.5]]},
    volcano:{root:164.81,bpm:110,bass:[[0,0,3,0,6,5,3,0],[0,3,6,5,0,6,5,3]],lead:[[0,.25],[3,.25],[6,.5],[7,.25],[6,.25],[5,.5],[3,.5],[0,.5]]},
    dungeon:{root:246.94,bpm:102,bass:[[0,0,3,6,0,5,3,1],[0,3,1,5,6,5,3,0]],lead:[[0,.5],[6,.25],[5,.25],[3,.5],[1,.5],[5,.25],[3,.25],[0,.5]]}
  };

  function playCombatMusic(theme='castle'){
    if(theme==='crypt'){playCryptMusic();return;}
    if(theme==='forest'){playHauntedForestMusic();return;}
    if(theme==='snow'){playFrozenMusic();return;}
    if(theme==='desert'){playFossilDesertMusic();return;}
    if(theme==='volcano'){playAncientVolcanoMusic();return;}
    if(!ctx||!enabled) return;
    stopMusic(0.2);
    const myGen = ++_gen;
    markMusicTheme('combat:'+theme);
    setTimeout(()=>{ if(_gen===myGen) musicGain.gain.setValueAtTime(musicVol, ctx.currentTime); }, 300);

    const profile=COMBAT_THEMES[theme]||COMBAT_THEMES.castle;
    const darkAmbient=!!profile.darkAmbient;
    const rev = makeReverb(darkAmbient?2.8:1.0, darkAmbient?0.38:0.55);
    const revG = ctx.createGain(); revG.gain.value=darkAmbient?0.48:0.22; rev.connect(revG); revG.connect(musicGain);
    const dry = ctx.createGain(); dry.gain.value=darkAmbient?0.52:0.78; dry.connect(musicGain);

    const ROOT=profile.root, minor=profile.scale||[0,2,3,5,7,8,10,12,14];
    const BPM=profile.bpm, BEAT=60/BPM, BAR=BEAT*4;
    let t=ctx.currentTime+0.1;
    const bassSeqs=profile.bass;
    const melSeq=profile.lead;

    function combatBars(rem=80){
      if(_gen!==myGen||!enabled||rem<=0){ currentTrack=null; return; }
      const phase=Math.floor((80-rem)/4)%bassSeqs.length;
      const bseq=bassSeqs[phase];
      bseq.forEach((si,bi)=>{
        const bt=t+bi*(BEAT/2);
        const bf=n(ROOT*0.5,minor[si%minor.length]);
        osc(bf,'triangle',darkAmbient?0.12:0.20,dry,bt,BEAT*(darkAmbient?.82:.38),darkAmbient?.035:.004,darkAmbient?.3:.08);
        osc(bf*2,'sine',darkAmbient?0.035:0.05,darkAmbient?revG:dry,bt,BEAT*(darkAmbient?.7:.3),darkAmbient?.04:.004,darkAmbient?.38:.07);
      });
      if(darkAmbient){
        // Batidas de pedra abafadas, correntes distantes e sino funerário: tensão sem bateria moderna.
        [0,BEAT*2].forEach(kt=>{
          const kg=ctx.createGain();kg.gain.setValueAtTime(.2,t+kt);kg.gain.exponentialRampToValueAtTime(.001,t+kt+.3);kg.connect(dry);
          const ko=ctx.createOscillator();ko.type='sine';ko.frequency.setValueAtTime(104,t+kt);ko.frequency.exponentialRampToValueAtTime(82,t+kt+.26);
          ko.connect(kg);try{ko.start(t+kt);ko.stop(t+kt+.34);}catch(e){}
          trackNodes.push({stop:()=>{try{ko.stop(0);}catch(e){}}});
        });
        [BEAT*1.5,BEAT*3.4].forEach(st=>noise(.045,revG,t+st,.2,720,3.2));
        if(rem%2===0){
          osc(n(ROOT*2,minor[7]),'sine',.035,revG,t+BEAT*3.05,BEAT*1.55,.004,BEAT*1.35);
          noise(.025,revG,t+BEAT*3.08,.34,1480,5.5);
        }
      }else{
        // Percussão das arenas abertas.
        [0,BEAT*2,BEAT*2.75].forEach(kt=>{
          const kg=ctx.createGain(); kg.gain.setValueAtTime(0.5,t+kt); kg.gain.exponentialRampToValueAtTime(0.001,t+kt+0.11); kg.connect(dry);
          const ko=ctx.createOscillator(); ko.type='sine'; ko.frequency.setValueAtTime(140,t+kt); ko.frequency.exponentialRampToValueAtTime(55,t+kt+0.09);
          ko.connect(kg); try{ko.start(t+kt);ko.stop(t+kt+0.14);}catch(e){}
          trackNodes.push({stop:()=>{try{ko.stop(0);}catch(e){}}});
          noise(0.3,dry,t+kt,0.022,2500,2.0);
        });
        [BEAT,BEAT*3].forEach(st=>{
          noise(0.26,dry,t+st,0.08,1800,1.5);
          noise(0.10,revG,t+st,0.2,1000,1.0);
          const sg=ctx.createGain(); sg.gain.setValueAtTime(0.16,t+st); sg.gain.exponentialRampToValueAtTime(0.001,t+st+0.09); sg.connect(dry);
          const so=ctx.createOscillator(); so.type='triangle'; so.frequency.value=250; so.connect(sg); try{so.start(t+st);so.stop(t+st+0.11);}catch(e){}
          trackNodes.push({stop:()=>{try{so.stop(0);}catch(e){}}});
        });
        for(let h=0;h<16;h++){ const hv=h%4===0?0:h%2===0?0.05:0.025; if(hv>0) noise(hv,dry,t+h*(BEAT/4),0.025,9500,0.8); }
      }
      // Melody
      const melFilt=ctx.createBiquadFilter(); melFilt.type='lowpass'; melFilt.frequency.value=darkAmbient?1250:3000; melFilt.connect(darkAmbient?revG:dry);
      let mt=t;
      melSeq.forEach(([si,dur])=>{ osc(n(ROOT*2,minor[si%minor.length]),darkAmbient?'sine':'square',darkAmbient?.045:.05,melFilt,mt,dur*BEAT*(darkAmbient?.95:.85),darkAmbient?.035:.005,darkAmbient?dur*BEAT*.58:.04); mt+=dur*BEAT; });
      if(darkAmbient){
        osc(n(ROOT*.5,minor[0]),'sine',.085,dry,t,BAR,.35,.8);
        osc(n(ROOT,minor[3]),'triangle',.035,revG,t,BAR,.5,.9);
      }else{
        osc(n(ROOT,minor[0]),'sawtooth',0.04,revG,t,BAR,0.3,0.5);
        osc(n(ROOT,minor[0])*1.003,'sawtooth',0.04,revG,t,BAR,0.3,0.5);
      }
      t+=BAR;
      currentTrack=_addTimeout(()=>combatBars(rem-1),(BAR-0.08)*1000);
    }
    combatBars(80);
  }

  // ══════════════════════════════════
  // BOSS — Intense, heavy but clear
  // 108 BPM, D minor, mid-forward
  // ══════════════════════════════════
  const BOSS_THEMES={
    default:{root:293.66,bpm:108,scale:[0,2,3,5,7,8,10,12],bass:[0,0,3,0,0,5,0,3,7,0,3,0,0,3,5,7],lead:[[0,.25],[3,.25],[5,.5],[7,.25],[5,.25],[3,.5],[0,.5],[2,.5],[0,1]],accent:'war'},
    skeleton_king:{root:246.94,bpm:106,scale:[0,2,3,5,7,8,11,12],bass:[0,0,3,5,0,7,5,3,0,3,7,5,3,2,0,7],lead:[[7,.5],[5,.25],[3,.25],[0,.5],[11,.25],[7,.25],[5,.5],[3,.5],[0,1]],accent:'bell'},
    aracne:{root:261.63,bpm:122,scale:[0,1,3,5,6,8,10,12],bass:[0,3,0,6,0,5,3,1,0,6,3,0,5,3,1,0],lead:[[0,.25],[6,.25],[3,.25],[8,.25],[5,.5],[1,.25],[3,.25],[0,.5],[6,.5]],accent:'web'},
    frost:{root:220,bpm:94,scale:[0,2,3,5,7,8,11,12],bass:[0,0,5,7,0,3,8,7,0,5,3,0,7,8,5,3],lead:[[12,.5],[8,.5],[7,.5],[5,.5],[11,.25],[8,.25],[7,.5],[3,1]],accent:'ice'},
    sandworm:{root:196,bpm:112,scale:[0,1,4,5,7,8,10,12],bass:[0,0,1,0,5,4,1,0,0,7,5,4,1,0,5,7],lead:[[0,.25],[1,.25],[4,.5],[7,.25],[5,.25],[4,.5],[1,.5],[0,.5],[8,.5]],accent:'sand'},
    balrog:{root:164.81,bpm:126,scale:[0,2,3,5,7,8,11,12],bass:[0,0,3,0,7,5,3,0,11,7,5,3,0,3,5,7],lead:[[0,.25],[3,.25],[7,.5],[11,.25],[8,.25],[7,.5],[5,.25],[3,.25],[0,1]],accent:'fire'},
    brute:{root:174.61,bpm:114,scale:[0,3,5,7,10,12,15,17],bass:[0,0,3,0,5,0,3,7,0,5,3,0,7,5,3,0],lead:[[0,.5],[3,.5],[5,.25],[7,.25],[5,.5],[3,.5],[10,.5],[7,.5]],accent:'stone'},
    pet:{root:233.08,bpm:116,scale:[0,2,3,6,7,9,10,12],bass:[0,3,0,6,7,3,0,6,0,7,3,0,6,3,0,7],lead:[[0,.25],[3,.25],[6,.5],[9,.25],[7,.25],[6,.5],[3,.5],[0,.5]],accent:'wild'}
  };
  const BOSS_THEME_ALIASES={
    boss_skel_king:'skeleton_king',skeleton:'skeleton_king',boss_aracne:'aracne',
    boss_frost:'frost',boss_sandworm:'sandworm',worm:'sandworm',boss_balrog:'balrog',
    boss_brute:'brute',boss_orc:'brute'
  };

  function playBossMusic(bossId='default'){
    if(!ctx||!enabled) return;
    stopMusic(0.15);
    const myGen = ++_gen;
    markMusicTheme('boss:'+bossId);
    setTimeout(()=>{ if(_gen===myGen) musicGain.gain.setValueAtTime(musicVol, ctx.currentTime); }, 250);

    const rev=makeReverb(1.4,0.5);
    const revG=ctx.createGain(); revG.gain.value=0.28; rev.connect(revG); revG.connect(musicGain);
    const dry=ctx.createGain(); dry.gain.value=0.72; dry.connect(musicGain);
    const themeId=BOSS_THEME_ALIASES[bossId]||bossId;
    const profile=BOSS_THEMES[themeId]||BOSS_THEMES.default;
    const ROOT=profile.root, minor=profile.scale;
    const BPM=profile.bpm, BEAT=60/BPM, BAR=BEAT*4;
    let t=ctx.currentTime+0.1;
    const ws=ctx.createWaveShaper();
    ws.curve=(()=>{ const c=new Float32Array(512); for(let i=0;i<512;i++){ const x=i*2/512-1; c[i]=x/(1+Math.abs(x*3))*1.5; } return c; })();
    ws.connect(dry);
    const bassSeq=profile.bass;
    const leadSeq=profile.lead;

    function bossBars(rem=128){
      if(_gen!==myGen||!enabled||rem<=0){ currentTrack=null; return; }
      const bi=Math.floor((128-rem)/2)%4;
      for(let b=0;b<8;b++){
        const bf=n(ROOT*0.5,minor[bassSeq[(bi*4+b%4)%bassSeq.length]%minor.length]);
        osc(bf,'sawtooth',0.17,dry,t+b*(BEAT/2),BEAT*0.32,0.003,0.06);
      }
      let lt=t;
      leadSeq.forEach(([si,dur])=>{
        const f=n(ROOT*2,minor[si%minor.length]);
        const lo=ctx.createOscillator(); lo.type='sawtooth'; lo.frequency.value=f;
        const lg=ctx.createGain(); lg.gain.setValueAtTime(0,lt); lg.gain.linearRampToValueAtTime(0.14,lt+0.008); lg.gain.linearRampToValueAtTime(0,lt+dur*BEAT-0.02);
        lo.connect(lg); lg.connect(ws); try{lo.start(lt);lo.stop(lt+dur*BEAT);}catch(e){}
        trackNodes.push({stop:()=>{try{lo.stop(0);}catch(e){}}}); lt+=dur*BEAT;
      });
      [0,BEAT*0.5,BEAT*2,BEAT*2.5,BEAT*3.75].forEach(kt=>{
        const kg=ctx.createGain(); kg.gain.setValueAtTime(0.6,t+kt); kg.gain.exponentialRampToValueAtTime(0.001,t+kt+0.1); kg.connect(dry);
        const ko=ctx.createOscillator(); ko.type='sine'; ko.frequency.setValueAtTime(140,t+kt); ko.frequency.exponentialRampToValueAtTime(50,t+kt+0.08);
        ko.connect(kg); try{ko.start(t+kt);ko.stop(t+kt+0.12);}catch(e){}
        trackNodes.push({stop:()=>{try{ko.stop(0);}catch(e){}}});
        noise(0.4,dry,t+kt,0.02,2800,2.5);
      });
      [BEAT,BEAT*3].forEach(st=>{
        noise(0.35,dry,t+st,0.09,1600,1.4); noise(0.12,revG,t+st,0.28,900,1.0);
        const sg=ctx.createGain(); sg.gain.setValueAtTime(0.18,t+st); sg.gain.exponentialRampToValueAtTime(0.001,t+st+0.1); sg.connect(dry);
        const so=ctx.createOscillator(); so.type='triangle'; so.frequency.value=240; so.connect(sg); try{so.start(t+st);so.stop(t+st+0.12);}catch(e){}
        trackNodes.push({stop:()=>{try{so.stop(0);}catch(e){}}});
      });
      for(let h=0;h<16;h++) noise(h%2===0?0.044:0.02,dry,t+h*(BEAT/4),0.022,10000,0.7);
      if(rem%8===0) noise(0.5,revG,t,0.6,7000,0.5);
      [0,3,7].forEach(si=>osc(n(ROOT,minor[si]),'sawtooth',0.035,revG,t,BAR,0.3,0.5));
      // Cada chefe possui uma assinatura audível própria, sem usar arquivos externos.
      if(profile.accent==='bell') [0,2].forEach(k=>osc(n(ROOT*4,minor[(k*3+3)%minor.length]),'sine',0.08,revG,t+k*BEAT*2,BEAT*1.4,0.002,BEAT));
      if(profile.accent==='web') [0.75,1.75,2.75,3.5].forEach(k=>noise(0.12,revG,t+k*BEAT,0.08,5200,5));
      if(profile.accent==='ice') [0,1,2,3].forEach(k=>osc(n(ROOT*4,minor[(k+4)%minor.length]),'sine',0.065,revG,t+k*BEAT,BEAT*.8,0.002,BEAT*.65));
      if(profile.accent==='sand') { osc(ROOT*.25,'triangle',0.16,dry,t,BAR*.9,0.08,.3); noise(0.09,revG,t,BAR*.7,650,1.1); }
      if(profile.accent==='fire') [0,.5,1.5,2,3].forEach(k=>noise(0.16,dry,t+k*BEAT,0.045,3200,1.8));
      if(profile.accent==='stone') [0,1.5,2.5].forEach(k=>{osc(58,'sine',0.22,dry,t+k*BEAT,.16,.002,.12);noise(.15,dry,t+k*BEAT,.05,900,2.4);});
      if(profile.accent==='wild') [0,1,2,3].forEach(k=>osc(n(ROOT*2,minor[(k*2+1)%minor.length]),'square',0.035,revG,t+k*BEAT,BEAT*.35,.004,.08));
      t+=BAR;
      currentTrack=_addTimeout(()=>bossBars(rem-1),(BAR-0.08)*1000);
    }
    bossBars(128);
  }

  function playCampMusic(){
    if(!ctx||!enabled) return;
    stopMusic(0.7);
    const myGen = ++_gen;
    markMusicTheme('camp');
    setTimeout(()=>{ if(_gen===myGen) musicGain.gain.setValueAtTime(musicVol, ctx.currentTime); }, 850);

    const rev=makeReverb(3.0,0.35);
    const revG=ctx.createGain(); revG.gain.value=0.55; rev.connect(revG); revG.connect(musicGain);
    const dry=ctx.createGain(); dry.gain.value=0.45; dry.connect(musicGain);
    const ROOT=392, major=[0,2,4,5,7,9,11,12,14,16];
    const BPM=54, BEAT=60/BPM, BAR=BEAT*3;
    let t=ctx.currentTime+0.7;
    const melPats=[
      [{s:0,d:1,ni:7},{s:1,d:0.5,ni:9},{s:1.5,d:0.5,ni:7},{s:2,d:1,ni:4}],
      [{s:0,d:1.5,ni:9},{s:1.5,d:1.5,ni:7}],
      [{s:0,d:0.5,ni:4},{s:0.5,d:0.5,ni:5},{s:1,d:1,ni:7},{s:2,d:1,ni:9}],
      [{s:0,d:3,ni:7}],
    ];
    const chordProg=[[0,4,7],[5,9,12],[3,7,10],[0,4,7]];

    function campBars(rem=64){
      if(_gen!==myGen||!enabled||rem<=0){ currentTrack=null; return; }
      const phase=Math.floor((64-rem)/4)%4;
      osc(n(ROOT*0.5,major[(phase*2)%major.length]),'triangle',0.11,dry,t,0.22,0.003,0.18);
      chordProg[phase].forEach(cs=>osc(n(ROOT,major[cs%major.length]),'sine',0.05,revG,t,BAR*1.1,0.45,0.9));
      const pat=melPats[Math.floor((64-rem)/2)%melPats.length];
      const beat=BAR/3;
      pat.forEach(step=>{
        osc(n(ROOT*2,major[step.ni%major.length]),'sine',0.12,dry,t+step.s*beat,step.d*beat*0.9,0.018,step.d*beat*0.5);
        osc(n(ROOT*2,major[step.ni%major.length]),'sine',0.055,revG,t+step.s*beat,step.d*beat*1.4,0.018,step.d*beat);
      });
      if(rem%5===0) osc(n(ROOT*4,major[((64-rem)*2)%major.length]),'sine',0.07,revG,t+beat,BAR*0.9,0.001,BAR*0.88);
      t+=BAR;
      currentTrack=_addTimeout(()=>campBars(rem-1),(BAR-0.08)*1000);
    }
    campBars(64);
  }

  function playDeathStinger(){
    if(!ctx||!enabled) return;
    const rev=makeReverb(2.8,0.4); const rg=ctx.createGain(); rg.gain.value=0.6; rev.connect(rg); rg.connect(musicGain);
    const dry=ctx.createGain(); dry.gain.value=0.4; dry.connect(musicGain);
    const ROOT=293.66; const t=ctx.currentTime+0.1;
    // Descending in mid register (D4 range)
    [[0,0.4,0.18],[3,0.3,0.14],[2,0.5,0.14],[0,0.8,0.12],[-2,1.4,0.10]].forEach(([s,d,v],i)=>{
      osc(n(ROOT,s),'sine',v,dry,t+i*0.3,d,0.01,d*0.85);
      osc(n(ROOT,s),'sine',v*0.45,rg,t+i*0.3,d+0.8,0.01,d+0.7);
    });
    // Low sustained toll (A3=220Hz, not too low)
    osc(220,'sine',0.14,rg,t+0.2,3.5,0.08,3.3);
  }

  function playBossSpawn(){
    if(!ctx||!enabled) return;
    const rev=makeReverb(1.6,0.5); const rg=ctx.createGain(); rg.gain.value=0.65; rev.connect(rg); rg.connect(sfxGain);
    const dry=ctx.createGain(); dry.gain.value=0.55; dry.connect(sfxGain);
    const t=ctx.currentTime;
    // Impact noise — mid-heavy (not rumble)
    noise(0.75, rg, t, 0.5, 400, 0.8);
    noise(0.55, dry, t, 0.28, 300, 1.0);
    // Chord stab — D4 register
    [0,3,7].forEach(s=>osc(n(293.66,s),'sawtooth',0.14,rg,t+0.05,1.8,0.005,1.7));
    // High shriek for drama
    osc(n(293.66*4,0),'sine',0.12,rg,t,0.6,0.003,0.55);
    // Sweep down
    const sg=ctx.createGain(); sg.gain.setValueAtTime(0.3,t); sg.gain.exponentialRampToValueAtTime(0.001,t+1.2); sg.connect(dry);
    const sw=ctx.createOscillator(); sw.type='sawtooth'; sw.frequency.setValueAtTime(800,t); sw.frequency.exponentialRampToValueAtTime(120,t+1.2);
    sw.connect(sg); sw.start(t); sw.stop(t+1.3);
  }

  function playBossDefeat(){
    if(!ctx||!enabled) return;
    const rev=makeReverb(2.5,0.32); const rg=ctx.createGain(); rg.gain.value=0.6; rev.connect(rg); rg.connect(sfxGain);
    const dry=ctx.createGain(); dry.gain.value=0.4; dry.connect(sfxGain);
    const t=ctx.currentTime;
    // Ascending triumph — D5 register
    [[0,0],[4,0.1],[7,0.2],[12,0.3],[7,0.5],[12,0.7],[16,0.9]].forEach(([s,d])=>{
      osc(n(293.66*2,s),'triangle',0.2,dry,t+d,0.5,0.008,0.45);
      osc(n(293.66*2,s),'sine',0.1,rg,t+d,0.9,0.008,0.85);
    });
    // Final chord — D4 spread
    [0,4,7,12].forEach(s=>osc(n(293.66,s),'sine',0.16,rg,t+1.2,3.0,0.06,2.9));
    // Bell crown
    osc(n(293.66*8,0),'sine',0.12,rg,t+1.0,2.0,0.002,1.9);
  }

  // ══ SFX ══

  function sfxSword(){
    if(!ctx||!enabled||!attackEnabled) return;
    const g=ctx.createGain(); g.gain.value=0.42; g.connect(attackGain); const t=ctx.currentTime;
    // Whoosh — high freq, fast
    noise(0.5, g, t, 0.11, 4500, 1.8);
    // Metallic ring — mid-high
    const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(1400,t); o.frequency.exponentialRampToValueAtTime(500,t+0.14);
    const og=ctx.createGain(); og.gain.setValueAtTime(0.28,t); og.gain.exponentialRampToValueAtTime(0.001,t+0.16);
    o.connect(og); og.connect(g); o.start(t); o.stop(t+0.18);
  }

  function sfxBow(){
    if(!ctx||!enabled||!attackEnabled) return;
    const g=ctx.createGain(); g.gain.value=0.38; g.connect(attackGain); const t=ctx.currentTime;
    // Twang — mid
    const o=ctx.createOscillator(); o.type='triangle'; o.frequency.setValueAtTime(900,t); o.frequency.exponentialRampToValueAtTime(280,t+0.1);
    const og=ctx.createGain(); og.gain.setValueAtTime(0.32,t); og.gain.exponentialRampToValueAtTime(0.001,t+0.12);
    o.connect(og); og.connect(g); o.start(t); o.stop(t+0.15);
    noise(0.25, g, t+0.04, 0.16, 5000, 1.5); // arrow in air
  }

  function sfxAxe(){
    if(!ctx||!enabled||!attackEnabled) return;
    const g=ctx.createGain(); g.gain.value=0.52; g.connect(attackGain); const t=ctx.currentTime;
    // Heavy thud — centered, not sub
    noise(0.65, g, t, 0.18, 1200, 1.2);
    const o=ctx.createOscillator(); o.type='triangle'; o.frequency.setValueAtTime(380,t); o.frequency.exponentialRampToValueAtTime(100,t+0.2);
    const og=ctx.createGain(); og.gain.setValueAtTime(0,t); og.gain.linearRampToValueAtTime(0.35,t+0.004); og.gain.exponentialRampToValueAtTime(0.001,t+0.22);
    o.connect(og); og.connect(g); o.start(t); o.stop(t+0.25);
    noise(0.18, g, t+0.04, 0.18, 3000, 1.5); // scrape
  }

  function sfxHit(){
    if(!ctx||!enabled) return;
    const g=ctx.createGain(); g.gain.value=0.42; g.connect(sfxGain); const t=ctx.currentTime;
    noise(0.5, g, t, 0.09, 900, 1.3);
    const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(280,t); o.frequency.exponentialRampToValueAtTime(90,t+0.09);
    const og=ctx.createGain(); og.gain.setValueAtTime(0.22,t); og.gain.exponentialRampToValueAtTime(0.001,t+0.11);
    o.connect(og); og.connect(g); o.start(t); o.stop(t+0.13);
  }

  function sfxPlayerHit(){
    if(!ctx||!enabled) return;
    const g=ctx.createGain(); g.gain.value=0.55; g.connect(sfxGain); const t=ctx.currentTime;
    noise(0.6, g, t, 0.13, 500, 1.2);
    // Impact — mid-low, not sub
    const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(220,t); o.frequency.exponentialRampToValueAtTime(80,t+0.15);
    const og=ctx.createGain(); og.gain.setValueAtTime(0.4,t); og.gain.exponentialRampToValueAtTime(0.001,t+0.18);
    o.connect(og); og.connect(g); o.start(t); o.stop(t+0.2);
    // High sting
    const o2=ctx.createOscillator(); o2.type='sine'; o2.frequency.setValueAtTime(900,t); o2.frequency.exponentialRampToValueAtTime(300,t+0.1);
    const og2=ctx.createGain(); og2.gain.setValueAtTime(0.18,t); og2.gain.exponentialRampToValueAtTime(0.001,t+0.12);
    o2.connect(og2); og2.connect(g); o2.start(t); o2.stop(t+0.14);
  }

  function sfxCoin(){
    if(!ctx||!enabled) return;
    const g=ctx.createGain(); g.gain.value=0.28; g.connect(sfxGain); const t=ctx.currentTime;
    const f=900+Math.random()*500;
    osc(f,'sine',0.28,g,t,0.09,0.002,0.08);
    osc(f*1.5,'sine',0.14,g,t+0.03,0.07,0.002,0.06);
  }

  function sfxEnemyDeath(){
    if(!ctx||!enabled) return;
    const g=ctx.createGain(); g.gain.value=0.32; g.connect(sfxGain); const t=ctx.currentTime;
    noise(0.38,g,t,0.1,700,1.4);
    osc(250,'sine',0.18,g,t,0.14,0.003,0.13);
  }

  function sfxLevelUp(){
    if(!ctx||!enabled) return;
    const g=ctx.createGain(); g.gain.value=0.38; g.connect(sfxGain); const t=ctx.currentTime;
    [0,4,7,12,16].forEach((s,i)=>{ osc(n(523.25,s),'sine',0.24-i*0.03,g,t+i*0.07,0.32,0.002,0.28); });
  }

  function sfxWaveClear(){
    if(!ctx||!enabled) return;
    const g=ctx.createGain(); g.gain.value=0.33; g.connect(sfxGain); const t=ctx.currentTime;
    [[0,0],[4,0.08],[7,0.16],[12,0.24]].forEach(([s,d])=>osc(n(523.25,s),'triangle',0.2,g,t+d,0.38,0.004,0.34));
    osc(n(1046.5,0),'sine',0.14,g,t+0.5,0.9,0.002,0.85);
  }

  function sfxMenuClick(){
    if(!ctx||!enabled) return;
    const g=ctx.createGain(); g.gain.value=0.22; g.connect(sfxGain); const t=ctx.currentTime;
    osc(1100,'sine',0.25,g,t,0.07,0.002,0.06);
    osc(1380,'sine',0.12,g,t+0.04,0.05,0.002,0.04);
  }

  function sfxShopBuy(){
    if(!ctx||!enabled) return;
    const g=ctx.createGain(); g.gain.value=0.28; g.connect(sfxGain); const t=ctx.currentTime;
    [0,4,7,12].forEach((s,i)=>osc(n(523.25,s),'sine',0.2-i*0.02,g,t+i*0.07,0.18,0.003,0.16));
  }

  function sfxPetCapture(){
    if(!ctx||!enabled) return;
    const g=ctx.createGain(); g.gain.value=0.32; g.connect(sfxGain);
    const rev=makeReverb(2,0.4); const rg=ctx.createGain(); rg.gain.value=0.55; rev.connect(rg); rg.connect(sfxGain);
    const t=ctx.currentTime;
    [0,4,7,12,16,19,24].forEach((s,i)=>{
      osc(n(523.25,s),'sine',0.18,g,t+i*0.1,0.5,0.003,0.45);
      osc(n(523.25,s),'sine',0.09,rg,t+i*0.1,0.8,0.003,0.75);
    });
  }

  // Assinaturas curtas do Necromante. Elas usam a mesma cadeia de volume dos
  // demais efeitos e evitam graves/subgraves excessivos para continuarem
  // legiveis quando varias invocacoes estiverem atacando.
  function sfxNecroSoul(){
    if(!ctx||!enabled) return;
    const g=ctx.createGain();g.gain.value=.24;g.connect(sfxGain);const t=ctx.currentTime;
    osc(392,'sine',.12,g,t,.20,.004,.17);
    osc(587.33,'sine',.10,g,t+.035,.25,.003,.22);
    osc(987.77,'triangle',.045,g,t+.09,.22,.002,.19);
  }

  function sfxNecroSummon(){
    if(!ctx||!enabled) return;
    const g=ctx.createGain();g.gain.value=.30;g.connect(sfxGain);const t=ctx.currentTime;
    noise(.25,g,t,.16,620,1.15);
    osc(118,'triangle',.18,g,t,.32,.006,.27);
    osc(176,'sine',.075,g,t+.08,.38,.02,.31);
  }

  function sfxNecroCurse(){
    if(!ctx||!enabled||!attackEnabled) return;
    const g=ctx.createGain();g.gain.value=.22;g.connect(attackGain);const t=ctx.currentTime;
    const o=ctx.createOscillator();o.type='triangle';o.frequency.setValueAtTime(430,t);o.frequency.exponentialRampToValueAtTime(125,t+.24);
    const og=ctx.createGain();og.gain.setValueAtTime(.17,t);og.gain.exponentialRampToValueAtTime(.001,t+.25);
    o.connect(og);og.connect(g);o.start(t);o.stop(t+.27);
    noise(.11,g,t+.02,.20,1150,2.4);
  }

  function sfxNecroScythe(){
    if(!ctx||!enabled||!attackEnabled) return;
    const g=ctx.createGain();g.gain.value=.28;g.connect(attackGain);const t=ctx.currentTime;
    noise(.32,g,t,.16,2400,1.35);
    const o=ctx.createOscillator();o.type='sine';o.frequency.setValueAtTime(760,t);o.frequency.exponentialRampToValueAtTime(210,t+.18);
    const og=ctx.createGain();og.gain.setValueAtTime(.12,t);og.gain.exponentialRampToValueAtTime(.001,t+.20);
    o.connect(og);og.connect(g);o.start(t);o.stop(t+.22);
  }

  function sfxNecroBell(){
    if(!ctx||!enabled) return;
    const g=ctx.createGain();g.gain.value=.25;g.connect(sfxGain);const t=ctx.currentTime;
    [[220,1],[440,.43],[659.25,.22],[933.08,.10]].forEach(([freq,mix],index)=>{
      osc(freq,index===0?'triangle':'sine',.18*mix,g,t+index*.008,.72,.003,.64);
    });
    noise(.07,g,t+.02,.18,760,3.1);
  }

  // Assinatura curta de aparicao divina (cerca de 2 s). A base e comum a
  // todos os fornecedores; os deuses gregos recebem um acento reconhecivel.
  function deitySweep(t,fromFreq,toFreq,dur,vol,dest,type='sine',attack=0.012){
    const o=ctx.createOscillator();
    const g=ctx.createGain();
    o.type=type;
    o.frequency.setValueAtTime(Math.max(20,fromFreq),t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20,toFreq),t+dur);
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(vol,t+Math.min(dur*.82,Math.max(.003,attack)));
    g.gain.exponentialRampToValueAtTime(.001,t+dur);
    o.connect(g);g.connect(dest);o.start(t);o.stop(t+dur+.03);
    trackNodes.push({osc:o,gain:g,stop:()=>{try{o.stop(0);}catch(e){}try{g.disconnect();}catch(e){}}});
  }

  function deityNoise(vol,dest,t,dur,fromFreq,toFreq,Q=1.1,type='bandpass'){
    const len=Math.max(1,Math.floor(ctx.sampleRate*dur));
    const buf=ctx.createBuffer(1,len,ctx.sampleRate);
    const data=buf.getChannelData(0);
    let held=0;
    for(let i=0;i<len;i++){
      // Sample-and-hold e quantizacao discretos: textura 16/32-bit sem soar futurista.
      if(i%4===0) held=Math.round((Math.random()*2-1)*24)/24;
      data[i]=held;
    }
    const src=ctx.createBufferSource();src.buffer=buf;
    const filter=ctx.createBiquadFilter();filter.type=type;filter.Q.value=Q;
    filter.frequency.setValueAtTime(Math.max(30,fromFreq),t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(30,toFreq),t+dur);
    const g=ctx.createGain();g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(vol,t+Math.min(.07,dur*.3));
    g.gain.exponentialRampToValueAtTime(.001,t+dur);
    src.connect(filter);filter.connect(g);g.connect(dest);src.start(t);src.stop(t+dur+.02);
    trackNodes.push({stop:()=>{try{src.stop(0);}catch(e){}try{src.disconnect();filter.disconnect();g.disconnect();}catch(e){}}});
  }

  function deityMetal(dest,t,base=620,vol=.08,dur=.38){
    [[1,1],[1.414,.72],[2.32,.42]].forEach(([ratio,mix])=>{
      osc(base*ratio,'sine',vol*mix,dest,t,dur,0.002,dur*.9);
    });
  }

  function deityPluck(dest,t,freq=440,vol=.07,dur=.34){
    osc(freq,'triangle',vol,dest,t,dur,.002,dur*.94);
    osc(freq*2.01,'sine',vol*.34,dest,t+.006,dur*.78,.002,dur*.72);
  }

  function deityImpact(dest,t,{freq=104,vol=.22,dur=.32,metal=false}={}){
    deitySweep(t,freq*1.18,freq*.58,dur,vol,dest,'sine',.003);
    deityNoise(vol*.42,dest,t+.005,Math.min(.19,dur*.62),820,210,1.05,'lowpass');
    if(metal) deityMetal(dest,t+.008,freq*4.4,vol*.38,dur*1.15);
  }

  function deityTempleBus(dest){
    const input=ctx.createGain();
    [[.065,.24,1180],[.13,.16,920],[.22,.1,720]].forEach(([delayTime,level,cutoff])=>{
      const delay=ctx.createDelay(.3);delay.delayTime.value=delayTime;
      const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=cutoff;
      const gain=ctx.createGain();gain.gain.value=level;
      input.connect(delay);delay.connect(filter);filter.connect(gain);gain.connect(dest);
    });
    return input;
  }

  function playDeityArrival(deityId=''){
    if(!ctx) init();
    if(!ctx||!enabled||!sfxGain) return false;
    if(ctx.state==='suspended') ctx.resume().catch(()=>{});

    const limiter=ctx.createDynamicsCompressor();
    limiter.threshold.value=-18;limiter.knee.value=7;limiter.ratio.value=4;
    limiter.attack.value=.002;limiter.release.value=.18;limiter.connect(sfxGain);
    const bus=ctx.createGain();bus.gain.value=.62;bus.connect(limiter);
    const dry=ctx.createGain();dry.gain.value=.72;dry.connect(bus);
    const temple=deityTempleBus(bus);
    const t=ctx.currentTime+.025;
    const id=String(deityId||'').toLowerCase();

    // 0.00-0.35: whoosh profundo que atravessa a tela.
    deityNoise(.25,dry,t,.32,180,1320,.9,'bandpass');
    deitySweep(t+.015,82,185,.31,.085,temple,'triangle',.14);

    // 0.35-0.80: impacto grave, curto e controlado.
    deityImpact(dry,t+.34,{freq:112,vol:.25,dur:.34});
    osc(82,'triangle',.105,temple,t+.37,.41,.004,.37);

    // 0.80-1.50: coral masculino discreto, templo, metal e energia crescente.
    [98,146.83,196].forEach((freq,index)=>{
      osc(freq,index===0?'triangle':'sine',index===0?.062:.029,temple,t+.75,.68,.11,.48);
    });
    deityNoise(.045,temple,t+.79,.62,470,1700,.72,'bandpass');
    deitySweep(t+.83,180,540,.52,.045,temple,'triangle',.2);
    deityMetal(temple,t+1.02,560,.052,.4);

    // Acento individual. Fornecedores sem perfil usam somente a assinatura universal.
    switch(id){
      case 'zeus':
        deityNoise(.18,dry,t+.74,.2,3600,520,.7,'lowpass');
        deitySweep(t+.755,178,66,.22,.15,dry,'triangle',.003);
        deityNoise(.085,temple,t+.83,.14,4200,1550,3.4,'bandpass');
        break;
      case 'ares':
        deityImpact(dry,t+.77,{freq:122,vol:.17,dur:.27,metal:true});
        deityMetal(temple,t+.80,470,.085,.31);
        break;
      case 'hecate':
        deitySweep(t+.71,1220,390,.46,.055,temple,'sine',.34);
        deityNoise(.052,temple,t+.81,.45,570,2260,4.2,'bandpass');
        deityPluck(temple,t+1.03,369.99,.045,.36);
        break;
      case 'poseidon':
        deityNoise(.12,temple,t+.69,.58,150,610,.68,'bandpass');
        deitySweep(t+.76,64,98,.48,.125,dry,'sine',.2);
        break;
      case 'artemis':
        deitySweep(t+.70,225,870,.18,.052,dry,'triangle',.15);
        deitySweep(t+.89,1040,310,.14,.085,dry,'triangle',.002);
        deityNoise(.052,temple,t+.92,.20,3900,1950,1.9,'bandpass');
        break;
      case 'hefesto':
        deityImpact(dry,t+.76,{freq:128,vol:.19,dur:.29,metal:true});
        deityMetal(temple,t+.78,505,.12,.55);
        break;
      case 'hermes':
        deityNoise(.12,dry,t+.59,.17,440,2700,1.3,'bandpass');
        deityPluck(temple,t+.81,880,.06,.22);
        deityPluck(temple,t+.96,1174.66,.052,.22);
        break;
      case 'dionisio':
        deityMetal(temple,t+.82,1320,.044,.26);
        deityPluck(dry,t+.91,440,.052,.23);
        deityPluck(temple,t+1.04,659.25,.037,.29);
        break;
      case 'selene':
        deityMetal(temple,t+.79,1046.5,.047,.5);
        osc(1567.98,'sine',.041,temple,t+1.08,.52,.05,.46);
        break;
      case 'atena':
        deityImpact(dry,t+.79,{freq:118,vol:.13,dur:.27,metal:true});
        deityMetal(dry,t+.80,550,.075,.28);
        deityPluck(temple,t+1.03,523.25,.045,.33);
        break;
      case 'moros':
        deityImpact(dry,t+.73,{freq:106,vol:.11,dur:.10});
        osc(110,'sine',.078,temple,t+.91,.69,.02,.61);
        deityMetal(temple,t+1.0,330,.032,.46);
        break;
      case 'hercules':
        deityImpact(dry,t+.70,{freq:96,vol:.20,dur:.37});
        deityImpact(dry,t+.94,{freq:88,vol:.14,dur:.25});
        deityNoise(.038,temple,t+1.02,.35,420,1080,1.8,'bandpass');
        deitySweep(t+1.05,132,80,.31,.032,temple,'sawtooth',.08);
        break;
      case 'ents':
        deityNoise(.075,temple,t+.77,.55,180,760,.82,'bandpass');
        deitySweep(t+.84,92,126,.48,.07,dry,'triangle',.18);
        break;
      case 'nazgul':
        deitySweep(t+.72,760,170,.46,.065,temple,'sine',.31);
        deityNoise(.052,temple,t+.77,.48,420,1680,3.2,'bandpass');
        break;
      case 'sauron':
        deityImpact(dry,t+.74,{freq:92,vol:.16,dur:.34,metal:true});
        osc(123.47,'triangle',.06,temple,t+.91,.55,.03,.48);
        break;
    }

    // 1.50-2.00: ting brilhante da bencao, com cauda curta de templo.
    osc(1760,'sine',.085,dry,t+1.5,.31,.002,.28);
    osc(2637.02,'sine',.048,temple,t+1.515,.48,.002,.44);
    osc(3520,'sine',.02,temple,t+1.54,.38,.002,.35);
    return true;
  }

  // Assinatura cinematográfica comum às cinco telas de capítulo.
  // O arco é sempre o mesmo (entrada, título, atmosfera, transição), enquanto
  // o miolo muda de instrumentação para identificar cada bioma.
  function playChapterIntro(chapterNumber=1){
    if(!ctx) init();
    if(!ctx||!enabled||!musicGain) return false;
    if(ctx.state==='suspended') ctx.resume().catch(()=>{});
    stopMusic(.12);
    const myGen=++_gen;
    markMusicTheme(`chapter:${chapterNumber}`);
    setTimeout(()=>{if(_gen===myGen)musicGain.gain.setValueAtTime(musicVol,ctx.currentTime);},180);

    const dry=ctx.createGain(); dry.gain.value=.58; dry.connect(musicGain);
    const hall=ctx.createGain(); hall.gain.value=.31; hall.connect(musicGain);
    const delay=ctx.createDelay(.8); delay.delayTime.value=.29;
    const echoFilter=ctx.createBiquadFilter(); echoFilter.type='lowpass'; echoFilter.frequency.value=1450;
    const echoGain=ctx.createGain(); echoGain.gain.value=.24;
    hall.connect(delay); delay.connect(echoFilter); echoFilter.connect(echoGain); echoGain.connect(musicGain);
    trackNodes.push({stop:()=>{try{dry.disconnect();hall.disconnect();delay.disconnect();echoFilter.disconnect();echoGain.disconnect();}catch(e){}}});

    const t=ctx.currentTime+.035;
    function chapterImpact(at,vol=.2,freq=112,dur=.42){
      deitySweep(at,freq*1.2,freq*.68,dur,vol,dry,'sine',.003);
      deityNoise(vol*.28,dry,at+.008,Math.min(.2,dur*.58),720,210,1.05,'lowpass');
    }
    function chapterChoir(at,freq=110,dur=1.5,vol=.05){
      [1,1.5,2].forEach((ratio,index)=>osc(freq*ratio,index===0?'triangle':'sine',vol*(index===0?1:.48),hall,at,dur,.18,dur*.62));
    }
    function chapterBell(at,freq=440,vol=.065,dur=1.25){
      [[1,1],[2.01,.42],[3.98,.18]].forEach(([ratio,mix])=>osc(freq*ratio,'sine',vol*mix,hall,at,dur,.002,dur*.94));
    }

    // 0.00–0.80: entrada compartilhada; o título recebe um impacto controlado.
    deityNoise(.11,hall,t,.66,170,1180,.75,'bandpass');
    deitySweep(t+.03,78,152,.64,.058,hall,'triangle',.22);
    chapterImpact(t+.76,.21,108,.42);

    // 0.80–4.20: identidade do capítulo.
    switch(Number(chapterNumber)||1){
      case 1:
        // Dungeon medieval: tambores graves, sino distante, cordas e coral masculino.
        osc(82.41,'triangle',.065,hall,t+.92,3.18,.28,.9);
        [1.03,2.34,3.62].forEach((offset,index)=>chapterImpact(t+offset,index===0?.15:.11,index===0?104:96,.34));
        chapterBell(t+1.28,220,.058,1.65);
        chapterBell(t+3.12,164.81,.035,1.28);
        [146.83,155.56].forEach((freq,index)=>osc(freq,'sawtooth',.019,hall,t+1.12+index*.08,2.7,.42,1.1));
        chapterChoir(t+1.62,98,2.25,.044);
        break;
      case 2:
        // Floresta observadora: cordas tensas, sino invertido, madeira e insetos remotos.
        osc(110,'triangle',.052,hall,t+.92,3.22,.3,.82);
        [196,207.65,233.08].forEach((freq,index)=>osc(freq,index===0?'triangle':'sawtooth',index===0?.035:.017,hall,t+1.02+index*.04,2.85,.32,.88));
        deitySweep(t+.92,1180,330,.62,.052,hall,'sine',.34);
        [1.42,2.61,3.54].forEach(offset=>{
          deityNoise(.035,dry,t+offset,.09,760,2100,3.8,'bandpass');
          osc(156,'triangle',.035,dry,t+offset,.12,.002,.1);
        });
        deityNoise(.024,hall,t+1.08,2.95,3900,2450,5.2,'bandpass');
        break;
      case 3:
        // Reino congelado: piano espaçado, sinos, vento, cordas e coral etéreo.
        deityNoise(.052,hall,t+.9,3.16,520,1350,.62,'bandpass');
        osc(110,'triangle',.046,hall,t+1.02,3.06,.38,.9);
        [[1.08,293.66],[2.04,261.63],[3.12,220]].forEach(([offset,freq])=>{
          osc(freq,'triangle',.06,dry,t+offset,.56,.002,.5);
          osc(freq*2,'sine',.025,hall,t+offset+.01,1.08,.002,1.02);
        });
        chapterBell(t+1.38,880,.045,1.48);
        chapterBell(t+2.82,1046.5,.032,1.22);
        chapterChoir(t+1.46,146.83,2.3,.026);
        break;
      case 4:
        // Ruínas ancestrais: tambores secos, flauta distante, drone e vento do deserto.
        deityNoise(.052,hall,t+.9,3.18,760,1620,.66,'bandpass');
        osc(98,'triangle',.064,hall,t+.96,3.14,.32,.82);
        [1.05,1.88,2.73,3.58].forEach((offset,index)=>chapterImpact(t+offset,index===0?.13:.09,118,.25));
        [[1.3,392,.62],[2.12,349.23,.56],[3.02,466.16,.72]].forEach(([offset,freq,dur])=>{
          osc(freq,'sine',.045,hall,t+offset,dur,.08,dur*.72);
          deityNoise(.012,hall,t+offset,dur,1100,750,2.6,'bandpass');
        });
        break;
      case 5:
        // Coração vulcânico: percussão pesada, coral, pedra/metal e magma.
        deityNoise(.068,hall,t+.88,3.28,230,720,.72,'bandpass');
        osc(82.41,'triangle',.085,hall,t+.92,3.2,.24,.78);
        [1.0,1.92,2.74,3.62].forEach((offset,index)=>chapterImpact(t+offset,index===0?.19:.14,index%2?92:106,.38));
        chapterChoir(t+1.18,92.5,2.86,.058);
        deityMetal(hall,t+1.48,410,.076,.72);
        deityMetal(hall,t+3.18,330,.052,.66);
        deityNoise(.033,dry,t+1.06,2.92,460,280,.82,'lowpass');
        break;
    }

    // 5.20–6.00: passagem compartilhada para o combate.
    osc(98,'sine',.025,hall,t+4.05,1.28,.28,.78);
    deityNoise(.09,hall,t+5.12,.58,260,1680,.82,'bandpass');
    deitySweep(t+5.14,116,284,.5,.052,hall,'triangle',.2);
    chapterImpact(t+5.55,.16,124,.28);
    chapterBell(t+5.63,880,.046,.42);
    return true;
  }

  function setMusicVol(v){ musicVol=v; if(musicGain){ musicGain.gain.cancelScheduledValues(ctx.currentTime); musicGain.gain.setValueAtTime(v,ctx.currentTime); } }
  function setSfxVol(v){ sfxVol=v; if(sfxGain) sfxGain.gain.value=v; }
  function setAttackVol(v){ attackVol=v; if(attackGain) attackGain.gain.value=attackEnabled?v:0; }
  function setAttackEnabled(v){ attackEnabled=!!v; if(attackGain) attackGain.gain.value=attackEnabled?attackVol:0; }
  function toggle(){ enabled=!enabled; if(!enabled) stopMusic(0.2); return enabled; }

  return {
    init, stopMusic,
    playMenuMusic, playCryptMusic, playHauntedForestMusic, playFrozenMusic, playFossilDesertMusic, playAncientVolcanoMusic, playCombatMusic, playBossMusic, playCampMusic,
    playDeathStinger, playBossDefeat, playBossSpawn, playDeityArrival, playChapterIntro,
    sfxSword, sfxBow, sfxAxe, sfxHit, sfxPlayerHit, sfxCoin,
    sfxEnemyDeath, sfxLevelUp, sfxWaveClear, sfxMenuClick, sfxShopBuy, sfxPetCapture,
    sfxNecroSoul, sfxNecroSummon, sfxNecroCurse, sfxNecroScythe, sfxNecroBell,
    setMusicVol, setSfxVol, setAttackVol, setAttackEnabled, toggle,
    get enabled(){ return enabled; },
    get attackEnabled(){ return attackEnabled; },
    get activeMusicTheme(){ return activeMusicTheme; }
  };
})();
