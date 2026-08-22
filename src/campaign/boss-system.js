// ═══ Corpos pixel-art dos bosses (Gigante de Gelo / Balrog) ═══
const PAL_BOSS_FROST={'X':'#0b1626','N':'#16324a','I':'#2a5070','i':'#3d7aa0','L':'#5aaad0','W':'#cfe8f8','w':'#a8cce2','C':'#40e0ff','c':'#9af2ff','S':'#e8f4fc'};
const FROST_BODY=[['  S     SS    S ',' XWX   XWWX  XWX',' XWWX XXWWXX XWX','  XWWWWWWWWWWWX ','  XIWWWWWWWWIX  ','  XINNiiiiNNIX  ','  XIiCciicCiIX  ','  XIiiiwwiiiIX  ',' XWXIiwwwwiIXWX ','XWWXIIiiiiIIXWWX','XIIXiIiLLiIiXIIX','XIiXiILccLIiXiIX','XIiXiILLLLIiXiIX',' XX XiIiiIiX XX ','    XNiIIiNX    ','   XIiX  XiIX   ','   XNNX  XNNX   '],['  S     SS    S ',' XWX   XWWX  XWX',' XWWX XXWWXX XWX','  XWWWWWWWWWWWX ','  XIWWWWWWWWIX  ','  XINNiiiiNNIX  ','  XIiCciicCiIX  ','  XIiiiwwiiiIX  ',' XWXIiwwwwiIXWX ','XWWXIIiiiiIIXWWX','XIIXiIiLLiIiXIIX','XIiXiILccLIiXiIX','XIiXiILLLLIiXiIX',' XX XiIiiIiX XX ','    XNiIIiNX    ','   XIiX   XiIX  ','   XNNX   XNNX  ']];
const PAL_BOSS_BALROG={
  'X':'#080403','D':'#260c07','d':'#4b1a0f','B':'#71301c','b':'#9b431e',
  'K':'#171615','M':'#333738','m':'#5b6262','R':'#c72a0b','r':'#721408',
  'O':'#ff6411','Y':'#ffc21b','E':'#ff8e24','e':'#ffe06a','T':'#f6d59c'
};
const BALROG_W=46, BALROG_H=38;
function balrogGrid(){ return Array.from({length:BALROG_H},()=>Array(BALROG_W).fill(' ')); }
function balrogPixel(g,x,y,ch){ if(y>=0&&y<BALROG_H&&x>=0&&x<BALROG_W)g[y][x]=ch; }
function balrogRect(g,x,y,w,h,ch){
  for(let yy=Math.max(0,y);yy<Math.min(BALROG_H,y+h);yy++)
    for(let xx=Math.max(0,x);xx<Math.min(BALROG_W,x+w);xx++)g[yy][xx]=ch;
}
function balrogCircle(g,cx,cy,r,ch){
  for(let y=Math.floor(cy-r);y<=Math.ceil(cy+r);y++)
    for(let x=Math.floor(cx-r);x<=Math.ceil(cx+r);x++)
      if((x-cx)*(x-cx)+(y-cy)*(y-cy)<=r*r)balrogPixel(g,x,y,ch);
}
function balrogPoly(g,points,ch){
  for(let y=0;y<BALROG_H;y++)for(let x=0;x<BALROG_W;x++){
    let inside=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[i],b=points[j];
      if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1]||1)+a[0]))inside=!inside;
    }
    if(inside)balrogPixel(g,x,y,ch);
  }
}
function balrogLine(g,x0,y0,x1,y1,ch,width=1){
  let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;
  while(true){
    if(width>1)balrogCircle(g,x0,y0,(width-1)/2,ch);else balrogPixel(g,x0,y0,ch);
    if(x0===x1&&y0===y1)break;
    const e2=2*err;if(e2>=dy){err+=dy;x0+=sx;}if(e2<=dx){err+=dx;y0+=sy;}
  }
}
function balrogFinish(g){ return g.map(row=>row.join('')); }
function balrogCrack(g,points){
  for(let i=1;i<points.length;i++)balrogLine(g,points[i-1][0],points[i-1][1],points[i][0],points[i][1],i%2?'O':'R',2);
  const hot=points[Math.floor(points.length/2)];balrogPixel(g,hot[0],hot[1],'Y');
}
function makeBalrogBodyFrame(pose=0){
  const g=balrogGrid(),attack=pose===2,rage=pose===1;
  // Chifres pesados e curvos, desenhados atrás da cabeça.
  balrogLine(g,19,12,14,8,'X',8);balrogLine(g,14,8,9,8,'X',7);balrogLine(g,9,8,6,3,'X',6);
  balrogLine(g,27,12,32,8,'X',8);balrogLine(g,32,8,37,8,'X',7);balrogLine(g,37,8,40,3,'X',6);
  balrogLine(g,19,12,14,8,'B',5);balrogLine(g,14,8,9,8,'B',4);balrogLine(g,9,8,6,3,'d',3);
  balrogLine(g,27,12,32,8,'B',5);balrogLine(g,32,8,37,8,'B',4);balrogLine(g,37,8,40,3,'d',3);
  balrogPixel(g,6,2,'b');balrogPixel(g,40,2,'b');

  // Pernas grossas e curvadas, com botas apoiadas no chão.
  const legLift=rage?1:0;
  balrogCircle(g,18,29-legLift,5,'X');balrogCircle(g,28,29+legLift,5,'X');
  balrogCircle(g,18,29-legLift,4,'D');balrogCircle(g,28,29+legLift,4,'D');
  balrogRect(g,14,31-legLift,7,6,'X');balrogRect(g,25,31+legLift,7,6,'X');
  balrogRect(g,15,31-legLift,5,5,'B');balrogRect(g,26,31+legLift,5,5,'B');
  balrogRect(g,12,36,10,2,'X');balrogRect(g,24,36,10,2,'X');
  balrogRect(g,14,36,7,1,'b');balrogRect(g,25,36,7,1,'b');
  balrogPixel(g,16,33-legLift,'O');balrogPixel(g,30,33+legLift,'R');

  // Peitoral largo e cintura estreita: musculoso sem formato arredondado.
  balrogPoly(g,[[15,13],[31,13],[36,19],[34,25],[29,31],[17,31],[12,25],[10,19]],'X');
  balrogPoly(g,[[16,14],[30,14],[34,19],[32,24],[28,29],[18,29],[14,24],[12,19]],'D');
  balrogPoly(g,[[16,16],[30,16],[32,20],[28,22],[18,22],[14,20]],'d');
  balrogRect(g,17,15,12,3,'B');
  // Placas do peitoral e abdômen, separadas por sulcos escuros.
  balrogRect(g,15,19,7,3,'B');balrogRect(g,24,19,7,3,'B');
  balrogRect(g,18,23,10,2,'d');balrogRect(g,19,26,8,2,'B');
  balrogLine(g,23,18,23,28,'X',1);
  balrogCrack(g,[[23,14],[21,18],[24,21],[20,24],[23,28]]);
  balrogCrack(g,[[15,20],[18,22],[16,25]]);balrogCrack(g,[[31,19],[28,22],[31,25]]);

  // Ombros elevados com placas vulcânicas.
  balrogCircle(g,11,18,6,'X');balrogCircle(g,35,18,6,'X');
  balrogCircle(g,11,18,5,'d');balrogCircle(g,35,18,5,'d');
  balrogRect(g,6,12,5,5,'B');balrogRect(g,35,12,5,5,'B');
  balrogLine(g,8,13,7,9,'O',3);balrogLine(g,13,13,14,9,'R',3);
  balrogLine(g,33,13,32,9,'R',3);balrogLine(g,38,13,39,9,'O',3);
  balrogPixel(g,8,10,'Y');balrogPixel(g,39,10,'Y');

  // Braços e punhos desproporcionalmente grandes.
  const lHand=attack?[10,22]:[6,29],rHand=attack?[36,22]:[40,29];
  balrogLine(g,11,19,lHand[0]+1,lHand[1]-2,'X',8);balrogLine(g,35,19,rHand[0]-1,rHand[1]-2,'X',8);
  balrogLine(g,11,19,lHand[0]+1,lHand[1]-2,'B',4);balrogLine(g,35,19,rHand[0]-1,rHand[1]-2,'B',4);
  balrogCircle(g,lHand[0],lHand[1],4,'X');balrogCircle(g,rHand[0],rHand[1],4,'X');
  balrogCircle(g,lHand[0],lHand[1],3,'b');balrogCircle(g,rHand[0],rHand[1],3,'b');
  balrogRect(g,lHand[0]-2,lHand[1]-1,5,2,'B');balrogRect(g,rHand[0]-2,rHand[1]-1,5,2,'B');
  balrogPixel(g,lHand[0]-2,lHand[1]-2,'O');balrogPixel(g,rHand[0]+2,rHand[1]-2,'O');

  // Cinturão metálico largo e fivela em forma de crânio.
  balrogRect(g,11,27,24,4,'X');balrogRect(g,12,28,22,2,'M');
  balrogRect(g,20,27,6,4,'K');balrogRect(g,21,28,4,2,'m');
  balrogPixel(g,21,28,'T');balrogPixel(g,24,28,'T');balrogPixel(g,22,29,'X');balrogPixel(g,23,29,'X');

  // Cabeça grande, baixa e encaixada entre os ombros.
  balrogRect(g,16,8,14,10,'X');balrogRect(g,17,9,12,8,'D');
  balrogRect(g,20,4,6,6,'X');balrogRect(g,21,4,4,6,'O');
  balrogRect(g,22,3,2,6,'Y');balrogPixel(g,23,3,'e');
  balrogRect(g,18,10,4,3,'B');balrogRect(g,25,10,4,3,'B');
  balrogRect(g,19,11,3,2,'Y');balrogRect(g,25,11,3,2,'Y');
  balrogPixel(g,20,12,'e');balrogPixel(g,26,12,'e');
  balrogRect(g,18,14,11,4,'X');balrogRect(g,19,14,9,2,'d');
  for(const tx of [19,22,25,28])balrogPixel(g,tx,15,'T');
  balrogRect(g,21,16,5,1,'R');balrogPixel(g,23,16,'O');
  return balrogFinish(g);
}
function makeBalrogRunFrame(step=0){
  const g=balrogGrid(),alt=step===1;
  // Perfil correndo: chifres e cabeça projetados para a frente.
  balrogLine(g,30,13,25,9,'X',8);balrogLine(g,25,9,18,9,'X',7);balrogLine(g,18,9,14,5,'X',6);
  balrogLine(g,30,13,25,9,'B',5);balrogLine(g,25,9,18,9,'B',4);balrogLine(g,18,9,14,5,'d',3);
  balrogCircle(g,25,21,11,'X');balrogCircle(g,25,21,10,'D');
  balrogCircle(g,18,19,7,'X');balrogCircle(g,18,19,6,'d');
  balrogRect(g,29,10,10,9,'X');balrogRect(g,30,11,9,7,'D');
  balrogRect(g,36,13,6,5,'X');balrogRect(g,37,13,4,3,'B');
  balrogRect(g,34,12,2,2,'Y');balrogPixel(g,35,12,'e');
  balrogRect(g,36,16,5,2,'X');balrogPixel(g,38,16,'T');balrogPixel(g,40,16,'T');
  balrogRect(g,31,7,5,5,'X');balrogRect(g,32,7,3,5,'O');balrogPixel(g,33,7,'Y');

  // Um braço golpeia à frente e o outro compensa atrás.
  const frontY=alt?21:24,backY=alt?25:22;
  balrogLine(g,28,20,39,frontY,'X',9);balrogLine(g,28,20,39,frontY,'B',5);
  balrogCircle(g,41,frontY,5,'X');balrogCircle(g,41,frontY,4,'b');balrogPixel(g,42,frontY-2,'O');
  balrogLine(g,18,20,9,backY,'X',8);balrogLine(g,18,20,9,backY,'B',5);
  balrogCircle(g,7,backY,4,'X');balrogCircle(g,7,backY,3,'b');

  // Passada longa com todo o corpo inclinado.
  if(!alt){
    balrogLine(g,22,28,35,34,'X',9);balrogLine(g,22,28,35,34,'D',5);
    balrogLine(g,21,29,10,36,'X',9);balrogLine(g,21,29,10,36,'B',5);
    balrogRect(g,32,35,12,3,'X');balrogRect(g,5,35,12,3,'X');
  }else{
    balrogLine(g,23,28,37,36,'X',9);balrogLine(g,23,28,37,36,'B',5);
    balrogLine(g,21,29,13,33,'X',9);balrogLine(g,21,29,13,33,'D',5);
    balrogRect(g,34,35,11,3,'X');balrogRect(g,7,34,12,3,'X');
  }
  balrogRect(g,14,27,20,4,'X');balrogRect(g,15,28,18,2,'M');
  balrogCrack(g,[[25,14],[23,19],[27,22],[23,26]]);
  balrogCrack(g,[[18,18],[20,21],[18,24]]);
  return balrogFinish(g);
}
function makeBalrogBodyFrameV3(pose=0){
  const g=balrogGrid(),attack=pose===2,rage=pose===1;
  // Chifres altos e curvos, com quatro tons para dar volume.
  balrogLine(g,19,11,14,7,'X',7);balrogLine(g,14,7,9,7,'X',6);balrogLine(g,9,7,6,2,'X',5);
  balrogLine(g,27,11,32,7,'X',7);balrogLine(g,32,7,37,7,'X',6);balrogLine(g,37,7,40,2,'X',5);
  balrogLine(g,19,11,14,7,'B',4);balrogLine(g,14,7,9,7,'B',3);balrogLine(g,9,7,6,2,'d',2);
  balrogLine(g,27,11,32,7,'B',4);balrogLine(g,32,7,37,7,'B',3);balrogLine(g,37,7,40,2,'d',2);
  balrogPixel(g,6,1,'b');balrogPixel(g,40,1,'b');
  balrogPixel(g,11,5,'b');balrogPixel(g,35,5,'b');

  // Pernas separadas e mais longas; a cintura não encosta nas botas.
  const legLift=rage?1:0;
  balrogPoly(g,[[15,28-legLift],[21,28-legLift],[21,36],[14,36],[13,33]],'X');
  balrogPoly(g,[[25,28+legLift],[31,28+legLift],[33,33],[32,36],[25,36]],'X');
  balrogRect(g,16,29-legLift,4,6,'B');balrogRect(g,26,29+legLift,4,6,'B');
  balrogRect(g,12,35,10,3,'X');balrogRect(g,24,35,10,3,'X');
  balrogRect(g,14,35,7,2,'b');balrogRect(g,25,35,7,2,'b');
  balrogPixel(g,17,31-legLift,'O');balrogPixel(g,28,32+legLift,'R');
  balrogPixel(g,18,34-legLift,'Y');balrogPixel(g,29,34+legLift,'O');

  // Silhueta em V: peitoral largo, abdômen dividido e cintura estreita.
  balrogPoly(g,[[14,14],[32,14],[34,18],[31,23],[29,29],[17,29],[15,23],[12,18]],'X');
  balrogPoly(g,[[15,15],[31,15],[32,18],[29,22],[28,28],[18,28],[17,22],[14,18]],'D');
  balrogPoly(g,[[16,16],[22,15],[22,21],[17,21],[14,18]],'B');
  balrogPoly(g,[[24,15],[30,16],[32,18],[29,21],[24,21]],'B');
  balrogRect(g,19,22,8,2,'d');balrogRect(g,20,25,6,2,'B');
  balrogRect(g,21,27,4,2,'d');balrogLine(g,23,15,23,28,'X',1);
  balrogCrack(g,[[23,14],[21,18],[24,20],[21,23],[23,27]]);
  balrogCrack(g,[[16,17],[18,19],[16,21]]);balrogCrack(g,[[30,17],[28,19],[30,21]]);

  // Ombreiras angulares menores deixam os braços longos aparentes.
  balrogPoly(g,[[8,12],[13,11],[17,15],[14,20],[8,20],[5,16]],'X');
  balrogPoly(g,[[38,12],[33,11],[29,15],[32,20],[38,20],[41,16]],'X');
  balrogPoly(g,[[9,13],[13,13],[15,16],[13,18],[8,18],[7,16]],'d');
  balrogPoly(g,[[37,13],[33,13],[31,16],[33,18],[38,18],[39,16]],'d');
  balrogRect(g,7,12,4,3,'B');balrogRect(g,35,12,4,3,'B');
  balrogLine(g,8,13,7,9,'O',2);balrogLine(g,13,13,14,9,'R',2);
  balrogLine(g,33,13,32,9,'R',2);balrogLine(g,38,13,39,9,'O',2);
  balrogPixel(g,8,10,'Y');balrogPixel(g,39,10,'Y');

  // Braços compridos, antebraços segmentados e mãos compactas.
  const lHand=attack?[8,23]:[7,30],rHand=attack?[38,23]:[39,30];
  balrogLine(g,10,18,lHand[0]+1,lHand[1]-2,'X',6);balrogLine(g,36,18,rHand[0]-1,rHand[1]-2,'X',6);
  balrogLine(g,10,18,lHand[0]+1,lHand[1]-2,'B',3);balrogLine(g,36,18,rHand[0]-1,rHand[1]-2,'B',3);
  balrogRect(g,lHand[0]-3,lHand[1]-5,6,2,'M');balrogRect(g,rHand[0]-2,rHand[1]-5,6,2,'M');
  balrogCircle(g,lHand[0],lHand[1],3,'X');balrogCircle(g,rHand[0],rHand[1],3,'X');
  balrogCircle(g,lHand[0],lHand[1],2,'b');balrogCircle(g,rHand[0],rHand[1],2,'b');
  balrogRect(g,lHand[0]-2,lHand[1]-1,4,2,'B');balrogRect(g,rHand[0]-1,rHand[1]-1,4,2,'B');
  balrogPixel(g,lHand[0]-2,lHand[1]-2,'O');balrogPixel(g,rHand[0]+2,rHand[1]-2,'O');

  // Cinturão estreito e fivela em forma de crânio.
  balrogRect(g,15,27,16,4,'X');balrogRect(g,16,28,14,2,'M');
  balrogRect(g,20,27,6,4,'K');balrogRect(g,21,28,4,2,'m');
  balrogPixel(g,21,28,'T');balrogPixel(g,24,28,'T');balrogPixel(g,22,29,'X');balrogPixel(g,23,29,'X');

  // Cabeça estreita encaixada entre os ombros.
  balrogRect(g,17,8,12,9,'X');balrogRect(g,18,9,10,7,'D');
  balrogRect(g,20,4,6,6,'X');balrogRect(g,21,4,4,6,'O');
  balrogRect(g,22,3,2,6,'Y');balrogPixel(g,23,3,'e');
  balrogRect(g,18,10,4,3,'B');balrogRect(g,24,10,4,3,'B');
  balrogRect(g,19,11,3,2,'Y');balrogRect(g,24,11,3,2,'Y');
  balrogPixel(g,20,12,'e');balrogPixel(g,26,12,'e');
  balrogRect(g,18,14,10,3,'X');balrogRect(g,19,14,8,2,'d');
  for(const tx of [19,22,25,27])balrogPixel(g,tx,15,'T');
  balrogRect(g,21,16,5,1,'R');balrogPixel(g,23,16,'Y');
  return balrogFinish(g);
}
function makeBalrogBackFrame(step=0){
  const g=balrogGrid(),lift=step===1?1:0;
  balrogLine(g,19,11,14,7,'X',7);balrogLine(g,14,7,9,7,'X',6);balrogLine(g,9,7,6,2,'X',5);
  balrogLine(g,27,11,32,7,'X',7);balrogLine(g,32,7,37,7,'X',6);balrogLine(g,37,7,40,2,'X',5);
  balrogLine(g,19,11,14,7,'B',4);balrogLine(g,27,11,32,7,'B',4);
  balrogLine(g,14,7,9,7,'d',3);balrogLine(g,32,7,37,7,'d',3);
  balrogRect(g,17,8,12,9,'X');balrogRect(g,18,9,10,7,'D');
  balrogRect(g,20,4,6,7,'X');balrogRect(g,21,4,4,6,'O');balrogRect(g,22,3,2,5,'Y');

  // Costas em placas sobrepostas, afunilando até o cinturão.
  balrogPoly(g,[[14,14],[32,14],[34,18],[31,23],[29,29],[17,29],[15,23],[12,18]],'X');
  balrogPoly(g,[[15,15],[31,15],[32,18],[29,22],[28,28],[18,28],[17,22],[14,18]],'D');
  balrogPoly(g,[[16,16],[30,16],[29,19],[17,19]],'B');
  balrogPoly(g,[[17,20],[29,20],[27,23],[19,23]],'d');
  balrogPoly(g,[[19,24],[27,24],[25,27],[21,27]],'B');
  balrogLine(g,23,15,23,27,'X',1);
  balrogCrack(g,[[23,15],[25,18],[22,21],[25,24],[23,27]]);
  balrogCrack(g,[[16,17],[19,19],[17,22]]);balrogCrack(g,[[30,17],[27,19],[29,22]]);

  balrogPoly(g,[[8,12],[13,11],[17,15],[14,20],[8,20],[5,16]],'X');
  balrogPoly(g,[[38,12],[33,11],[29,15],[32,20],[38,20],[41,16]],'X');
  balrogPoly(g,[[9,13],[13,13],[15,16],[13,18],[8,18],[7,16]],'d');
  balrogPoly(g,[[37,13],[33,13],[31,16],[33,18],[38,18],[39,16]],'d');
  balrogLine(g,10,18,7,28,'X',6);balrogLine(g,36,18,39,28,'X',6);
  balrogLine(g,10,18,7,28,'B',3);balrogLine(g,36,18,39,28,'B',3);
  balrogRect(g,4,25,6,2,'M');balrogRect(g,36,25,6,2,'M');
  balrogCircle(g,7,30,3,'X');balrogCircle(g,39,30,3,'X');
  balrogCircle(g,7,30,2,'b');balrogCircle(g,39,30,2,'b');

  balrogRect(g,15,27,16,4,'X');balrogRect(g,16,28,14,2,'M');
  balrogRect(g,21,27,4,3,'K');balrogPixel(g,22,28,'m');balrogPixel(g,23,28,'m');
  balrogPoly(g,[[15,29-lift],[21,29-lift],[21,36],[13,36],[13,33]],'X');
  balrogPoly(g,[[25,29+lift],[31,29+lift],[33,33],[33,36],[25,36]],'X');
  balrogRect(g,16,30-lift,4,5,'B');balrogRect(g,26,30+lift,4,5,'B');
  balrogRect(g,12,35,10,3,'X');balrogRect(g,24,35,10,3,'X');
  balrogPixel(g,18,32-lift,'O');balrogPixel(g,28,33+lift,'R');
  return balrogFinish(g);
}
function makeBalrogRunFrameV3(step=0){
  const g=balrogGrid(),alt=step===1;
  // Perfil atlético inclinado para a corrida.
  balrogLine(g,30,13,25,9,'X',7);balrogLine(g,25,9,18,9,'X',6);balrogLine(g,18,9,14,5,'X',5);
  balrogLine(g,30,13,25,9,'B',4);balrogLine(g,25,9,18,9,'B',3);balrogLine(g,18,9,14,5,'d',2);
  balrogPoly(g,[[16,14],[29,13],[34,18],[32,24],[28,29],[17,29],[13,24],[12,18]],'X');
  balrogPoly(g,[[17,15],[28,15],[32,18],[30,23],[27,28],[18,28],[15,23],[14,18]],'D');
  balrogPoly(g,[[16,16],[26,15],[29,18],[26,21],[16,21],[14,18]],'B');
  balrogPoly(g,[[18,22],[28,22],[26,25],[19,25]],'d');
  balrogCircle(g,16,18,5,'X');balrogCircle(g,16,18,4,'d');
  balrogRect(g,29,10,10,9,'X');balrogRect(g,30,11,9,7,'D');
  balrogRect(g,36,13,6,5,'X');balrogRect(g,37,13,4,3,'B');
  balrogRect(g,34,12,2,2,'Y');balrogPixel(g,35,12,'e');
  balrogRect(g,36,16,5,2,'X');balrogPixel(g,38,16,'T');balrogPixel(g,40,16,'T');
  balrogRect(g,31,7,5,5,'X');balrogRect(g,32,7,3,5,'O');balrogPixel(g,33,7,'Y');

  const frontY=alt?21:24,backY=alt?25:22;
  balrogLine(g,28,20,39,frontY,'X',7);balrogLine(g,28,20,39,frontY,'B',3);
  balrogCircle(g,41,frontY,3,'X');balrogCircle(g,41,frontY,2,'b');balrogPixel(g,42,frontY-2,'O');
  balrogLine(g,17,20,9,backY,'X',6);balrogLine(g,17,20,9,backY,'B',3);
  balrogCircle(g,7,backY,3,'X');balrogCircle(g,7,backY,2,'b');
  if(!alt){
    balrogLine(g,24,28,35,34,'X',7);balrogLine(g,24,28,35,34,'D',4);
    balrogLine(g,21,29,11,36,'X',7);balrogLine(g,21,29,11,36,'B',4);
    balrogRect(g,32,35,11,3,'X');balrogRect(g,6,35,11,3,'X');
  }else{
    balrogLine(g,24,28,37,36,'X',7);balrogLine(g,24,28,37,36,'B',4);
    balrogLine(g,21,29,13,33,'X',7);balrogLine(g,21,29,13,33,'D',4);
    balrogRect(g,34,35,11,3,'X');balrogRect(g,7,34,12,3,'X');
  }
  balrogRect(g,15,27,17,4,'X');balrogRect(g,16,28,15,2,'M');
  balrogCrack(g,[[25,14],[23,19],[27,22],[23,26]]);
  balrogCrack(g,[[18,18],[20,21],[18,24]]);
  return balrogFinish(g);
}
const BALROG_BODY=[makeBalrogBodyFrameV3(0),makeBalrogBodyFrameV3(1),makeBalrogBodyFrameV3(2)];
const BALROG_BACK=[makeBalrogBackFrame(0),makeBalrogBackFrame(1)];
const BALROG_RUN=[makeBalrogRunFrameV3(0),makeBalrogRunFrameV3(1)];
const PAL_BOSS_BRUTE={
  'X':'#071008','G':'#397f22','g':'#245515','H':'#5aa232','h':'#77b54a',
  'S':'#b8bcc0','s':'#7f8589','D':'#4f5559','d':'#2b3033',
  'A':'#d0aa45','a':'#8d6a21','B':'#5b3517','b':'#301b0d',
  'M':'#e21470','m':'#8d124b','R':'#ff3026','r':'#9f1815',
  'T':'#f2eee1','Q':'#79776f','q':'#a8a59b','C':'#4d4a43'
};
const BRUTE_BODY_LEGACY=[['      XMMX      ','     XMmmMX     ','     XMmMX      ','    XGGGGGX     ','   XGRGGGRGX    ','   XGgGGGgGX    ','   XTGGgGGTX    ','  XXGGGGGGGXX   ',' XAAXGGGGGXAAX  ','XGGaXGgggGXaGGX ','XGgGXGgggGXGgGX ','XGgGXgBBBgXGgGX ','XGGGXgBBBgXGGGX ',' XTTX GgG XTTX  ','   XGgX XgGX    ','   XGgX XgGX    ','   XXX   XXX    '],['      XMMX      ','     XMmmMX     ','     XMmMX      ','    XGGGGGX     ','   XGRGGGRGX    ','   XGgGGGgGX    ','   XTGGgGGTX    ','  XXGGGGGGGXX   ',' XAAXGGGGGXAAX  ','XGGaXGgggGXaGGX ','XGgGXGgggGXGgGX ','XGgGXgBBBgXGgGX ',' XGGXgBBBgXGGX  ','  XTTXGgGXTTX   ','   XGgX XgGX    ','  XGgX   XgGX   ','  XXX     XXX   ']];
const BRUTE_W=40,BRUTE_H=40;
function bruteGrid(){return Array.from({length:BRUTE_H},()=>Array(BRUTE_W).fill(' '));}
function brutePixel(g,x,y,ch){if(y>=0&&y<BRUTE_H&&x>=0&&x<BRUTE_W)g[y][x]=ch;}
function bruteRect(g,x,y,w,h,ch){
  for(let yy=Math.max(0,y);yy<Math.min(BRUTE_H,y+h);yy++)
    for(let xx=Math.max(0,x);xx<Math.min(BRUTE_W,x+w);xx++)g[yy][xx]=ch;
}
function bruteCircle(g,cx,cy,r,ch){
  for(let y=Math.floor(cy-r);y<=Math.ceil(cy+r);y++)
    for(let x=Math.floor(cx-r);x<=Math.ceil(cx+r);x++)
      if((x-cx)*(x-cx)+(y-cy)*(y-cy)<=r*r)brutePixel(g,x,y,ch);
}
function bruteLine(g,x0,y0,x1,y1,ch,width=1){
  let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;
  while(true){
    if(width>1)bruteCircle(g,x0,y0,(width-1)/2,ch);else brutePixel(g,x0,y0,ch);
    if(x0===x1&&y0===y1)break;
    const e2=2*err;if(e2>=dy){err+=dy;x0+=sx;}if(e2<=dx){err+=dx;y0+=sy;}
  }
}
function brutePoly(g,points,ch){
  for(let y=0;y<BRUTE_H;y++)for(let x=0;x<BRUTE_W;x++){
    let inside=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[i],b=points[j];
      if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1]||1)+a[0]))inside=!inside;
    }
    if(inside)brutePixel(g,x,y,ch);
  }
}
function bruteFinish(g){return g.map(r=>r.join(''));}
function bruteMohawk(g,back=false){
  if(back){
    bruteRect(g,18,1,5,11,'X');bruteRect(g,19,2,3,10,'M');
    bruteRect(g,20,4,2,8,'m');brutePixel(g,19,2,'R');
  }else{
    brutePoly(g,[[16,7],[17,2],[20,0],[23,2],[24,7],[22,10],[17,10]],'X');
    brutePoly(g,[[17,7],[18,3],[20,2],[22,3],[23,7],[21,9],[18,9]],'M');
    bruteRect(g,19,3,2,6,'m');brutePixel(g,18,4,'R');
  }
}
function bruteHeadFront(g){
  brutePoly(g,[[13,8],[27,8],[30,12],[29,19],[25,23],[15,23],[11,19],[10,12]],'X');
  brutePoly(g,[[14,9],[26,9],[28,12],[27,19],[24,21],[16,21],[13,19],[12,12]],'G');
  bruteRect(g,13,13,5,3,'g');bruteRect(g,22,13,5,3,'g');
  bruteRect(g,14,13,3,2,'R');bruteRect(g,23,13,3,2,'R');
  brutePixel(g,15,13,'r');brutePixel(g,24,13,'r');
  bruteRect(g,18,15,4,3,'g');brutePixel(g,19,16,'X');brutePixel(g,21,16,'X');
  bruteRect(g,14,17,3,4,'T');bruteRect(g,25,17,3,4,'T');
  bruteRect(g,15,18,2,2,'S');bruteRect(g,25,18,2,2,'S');
  bruteRect(g,17,19,7,3,'g');bruteRect(g,18,20,5,2,'G');
}
function bruteArmorFront(g){
  // Peitoral de aço em três placas e acabamento dourado.
  brutePoly(g,[[10,18],[30,18],[33,23],[30,30],[25,33],[15,33],[10,30],[7,23]],'X');
  brutePoly(g,[[11,19],[29,19],[31,23],[29,29],[25,31],[15,31],[11,29],[9,23]],'S');
  brutePoly(g,[[12,20],[28,20],[29,23],[26,25],[14,25],[11,23]],'q');
  brutePoly(g,[[12,26],[28,26],[27,29],[24,31],[16,31],[13,29]],'s');
  bruteRect(g,10,30,20,3,'X');bruteRect(g,11,30,18,2,'A');
  bruteRect(g,14,31,12,4,'B');bruteRect(g,18,30,4,5,'a');
  bruteRect(g,19,31,2,3,'A');
}
function bruteShoulders(g){
  brutePoly(g,[[4,15],[9,12],[14,16],[13,23],[5,23],[2,20]],'X');
  brutePoly(g,[[36,15],[31,12],[26,16],[27,23],[35,23],[38,20]],'X');
  brutePoly(g,[[5,16],[9,14],[12,17],[11,21],[5,21],[4,19]],'S');
  brutePoly(g,[[35,16],[31,14],[28,17],[29,21],[35,21],[36,19]],'S');
  brutePoly(g,[[6,16],[9,15],[10,17],[7,19],[5,19]],'q');
  brutePoly(g,[[34,16],[31,15],[30,17],[33,19],[35,19]],'q');
  bruteRect(g,4,21,9,2,'A');bruteRect(g,27,21,9,2,'A');
}
function makeBruteFrontFrame(step=0,pose='idle'){
  const g=bruteGrid(),lift=step===1?1:0;
  // Pernas grossas, mas separadas e com passada legível.
  brutePoly(g,[[13,31-lift],[20,31-lift],[20,39],[10,39],[10,36]],'X');
  brutePoly(g,[[22,31+lift],[29,31+lift],[31,36],[30,39],[21,39]],'X');
  bruteRect(g,13,32-lift,5,6,'G');bruteRect(g,23,32+lift,5,6,'G');
  bruteRect(g,10,37,10,3,'X');bruteRect(g,21,37,10,3,'X');
  bruteRect(g,12,37,7,2,'H');bruteRect(g,22,37,7,2,'H');
  brutePixel(g,15,34-lift,'g');brutePixel(g,26,35+lift,'g');

  bruteArmorFront(g);bruteShoulders(g);
  if(pose==='lift'){
    // Braços levantam a rocha sobre a cabeça.
    bruteLine(g,8,20,11,8,'X',7);bruteLine(g,32,20,29,8,'X',7);
    bruteLine(g,8,20,11,8,'G',4);bruteLine(g,32,20,29,8,'G',4);
    bruteRect(g,7,17,6,2,'s');bruteRect(g,27,17,6,2,'s');
    bruteCircle(g,12,7,3,'X');bruteCircle(g,28,7,3,'X');
    bruteCircle(g,12,7,2,'H');bruteCircle(g,28,7,2,'H');
    bruteCircle(g,20,3,7,'X');bruteCircle(g,20,3,6,'Q');
    bruteCircle(g,18,1,2,'q');bruteRect(g,20,4,4,2,'C');
  }else{
    bruteLine(g,8,21,7,31,'X',7);bruteLine(g,32,21,33,31,'X',7);
    bruteLine(g,8,21,7,31,'G',4);bruteLine(g,32,21,33,31,'G',4);
    bruteRect(g,4,25,7,3,'X');bruteRect(g,29,25,7,3,'X');
    bruteRect(g,5,25,6,2,'s');bruteRect(g,29,25,6,2,'s');
    bruteCircle(g,7,32,4,'X');bruteCircle(g,33,32,4,'X');
    bruteCircle(g,7,32,3,'H');bruteCircle(g,33,32,3,'H');
  }
  bruteHeadFront(g);bruteMohawk(g,false);
  return bruteFinish(g);
}
function makeBruteBackFrame(step=0){
  const g=bruteGrid(),lift=step===1?1:0;
  brutePoly(g,[[13,31-lift],[20,31-lift],[20,39],[10,39],[10,36]],'X');
  brutePoly(g,[[22,31+lift],[29,31+lift],[31,36],[30,39],[21,39]],'X');
  bruteRect(g,13,32-lift,5,6,'G');bruteRect(g,23,32+lift,5,6,'G');
  bruteRect(g,10,37,10,3,'X');bruteRect(g,21,37,10,3,'X');
  bruteRect(g,12,37,7,2,'H');bruteRect(g,22,37,7,2,'H');
  // Nuca, moicano traseiro e placas das costas.
  brutePoly(g,[[13,8],[27,8],[30,13],[28,21],[24,23],[16,23],[12,20],[10,13]],'X');
  brutePoly(g,[[14,9],[26,9],[28,13],[27,19],[24,21],[16,21],[13,19],[12,13]],'G');
  bruteMohawk(g,true);
  brutePoly(g,[[10,18],[30,18],[32,23],[29,31],[11,31],[8,23]],'X');
  brutePoly(g,[[11,19],[29,19],[30,23],[28,29],[25,31],[15,31],[12,29],[10,23]],'S');
  brutePoly(g,[[12,20],[28,20],[29,23],[26,25],[14,25],[11,23]],'q');
  brutePoly(g,[[13,26],[27,26],[26,29],[14,29]],'s');
  bruteShoulders(g);
  bruteLine(g,8,21,7,31,'X',7);bruteLine(g,32,21,33,31,'X',7);
  bruteLine(g,8,21,7,31,'G',4);bruteLine(g,32,21,33,31,'G',4);
  bruteRect(g,4,25,7,3,'s');bruteRect(g,29,25,7,3,'s');
  bruteCircle(g,7,32,4,'X');bruteCircle(g,33,32,4,'X');
  bruteCircle(g,7,32,3,'H');bruteCircle(g,33,32,3,'H');
  bruteRect(g,10,30,20,3,'X');bruteRect(g,11,30,18,2,'A');
  bruteRect(g,14,31,12,4,'B');bruteRect(g,19,30,2,4,'a');
  return bruteFinish(g);
}
function makeBruteSideFrame(step=0,throwing=false){
  const g=bruteGrid(),alt=step===1;
  // Corpo e cabeça projetados para a direção da marcha.
  brutePoly(g,[[12,17],[27,16],[32,22],[29,31],[14,32],[9,27],[8,21]],'X');
  brutePoly(g,[[13,18],[26,18],[30,22],[27,29],[15,30],[11,27],[10,22]],'S');
  brutePoly(g,[[12,19],[25,18],[28,21],[25,24],[12,24],[10,22]],'q');
  bruteRect(g,12,29,17,3,'A');bruteRect(g,15,30,11,4,'B');bruteRect(g,19,29,3,4,'a');
  brutePoly(g,[[9,8],[24,8],[29,12],[27,20],[22,23],[12,21],[8,17],[7,12]],'X');
  brutePoly(g,[[10,9],[23,9],[27,12],[25,18],[21,21],[13,20],[9,16],[9,12]],'G');
  bruteRect(g,22,12,4,3,'g');bruteRect(g,23,12,3,2,'R');brutePixel(g,24,12,'r');
  bruteRect(g,24,16,4,4,'T');bruteRect(g,25,16,2,2,'S');
  brutePoly(g,[[11,8],[12,3],[16,1],[20,4],[23,8],[20,10],[14,9]],'X');
  brutePoly(g,[[12,8],[13,4],[16,3],[19,5],[21,8],[19,9],[14,8]],'M');
  brutePoly(g,[[22,16],[30,14],[34,18],[32,23],[25,23]],'X');
  brutePoly(g,[[23,17],[29,16],[32,18],[30,21],[25,21]],'S');
  bruteRect(g,27,21,6,2,'A');

  const handY=throwing?20:(alt?24:27);
  if(throwing){
    bruteLine(g,26,21,37,handY,'X',7);bruteLine(g,26,21,37,handY,'G',4);
    bruteCircle(g,38,handY,3,'X');bruteCircle(g,38,handY,2,'H');
    bruteLine(g,14,22,7,27,'X',7);bruteLine(g,14,22,7,27,'G',4);
  }else{
    bruteLine(g,25,21,32,handY,'X',7);bruteLine(g,25,21,32,handY,'G',4);
    bruteCircle(g,34,handY,3,'X');bruteCircle(g,34,handY,2,'H');
    bruteLine(g,13,22,7,alt?27:24,'X',7);bruteLine(g,13,22,7,alt?27:24,'G',4);
    bruteCircle(g,6,alt?28:25,3,'X');bruteCircle(g,6,alt?28:25,2,'H');
  }
  if(!alt){
    bruteLine(g,18,31,29,37,'X',8);bruteLine(g,18,31,29,37,'G',5);
    bruteLine(g,17,32,8,38,'X',8);bruteLine(g,17,32,8,38,'H',5);
    bruteRect(g,26,37,11,3,'X');bruteRect(g,4,37,11,3,'X');
  }else{
    bruteLine(g,20,31,33,38,'X',8);bruteLine(g,20,31,33,38,'H',5);
    bruteLine(g,17,32,10,35,'X',8);bruteLine(g,17,32,10,35,'G',5);
    bruteRect(g,30,37,9,3,'X');bruteRect(g,5,35,12,3,'X');
  }
  return bruteFinish(g);
}
function makeBruteSideFrameV2(step=0,throwing=false){
  const g=bruteGrid(),alt=step===1;
  // Passos curtos e pesados como na referência, sem esticar as pernas.
  const frontLift=alt?1:0,backLift=alt?0:1;
  brutePoly(g,[[12,30-frontLift],[21,30-frontLift],[22,38],[19,40],[8,40],[8,36]],'X');
  brutePoly(g,[[23,31-backLift],[31,31-backLift],[34,36],[33,39],[22,39]],'X');
  bruteRect(g,12,31-frontLift,7,7,'G');bruteRect(g,24,32-backLift,6,6,'g');
  bruteRect(g,8,37,13,3,'X');bruteRect(g,10,37,10,2,'H');
  bruteRect(g,22,37,13,3,'X');bruteRect(g,23,37,10,2,'G');

  // Barriga e peitoral mantêm o mesmo peso da vista frontal.
  brutePoly(g,[[11,17],[29,17],[34,22],[32,30],[28,34],[14,34],[9,30],[7,23]],'X');
  brutePoly(g,[[12,18],[28,18],[32,22],[30,29],[27,32],[15,32],[11,29],[9,23]],'S');
  brutePoly(g,[[11,19],[27,19],[30,22],[27,25],[12,25],[9,23]],'q');
  brutePoly(g,[[12,26],[30,26],[29,30],[26,32],[14,31],[11,29]],'s');
  bruteRect(g,10,30,21,3,'X');bruteRect(g,11,30,19,2,'A');
  bruteRect(g,14,31,13,4,'B');bruteRect(g,18,30,4,5,'a');bruteRect(g,19,31,2,3,'A');

  // Cabeça grande, inclinada e com focinho projetado.
  brutePoly(g,[[8,7],[23,6],[29,10],[31,15],[28,21],[23,24],[12,23],[7,19],[5,13]],'X');
  brutePoly(g,[[9,8],[22,8],[27,10],[29,14],[27,19],[22,22],[13,21],[9,18],[7,13]],'G');
  bruteRect(g,23,12,5,4,'g');bruteRect(g,24,12,3,2,'R');brutePixel(g,25,12,'r');
  bruteRect(g,25,17,5,4,'T');bruteRect(g,26,17,3,2,'S');
  bruteRect(g,20,17,7,4,'g');bruteRect(g,22,19,5,2,'H');
  brutePixel(g,22,16,'X');
  // Moicano acompanha a curva do crânio.
  brutePoly(g,[[9,9],[10,4],[13,1],[18,1],[23,4],[27,8],[24,10],[18,8],[13,7]],'X');
  brutePoly(g,[[10,8],[11,5],[14,3],[18,3],[22,5],[25,8],[23,9],[18,7],[13,6]],'M');
  bruteRect(g,12,4,5,2,'m');brutePixel(g,13,4,'R');

  // A ombreira fica atrás da cabeça, como na referência, e não cobre o focinho.
  brutePoly(g,[[4,17],[9,14],[15,18],[14,24],[6,24],[2,21]],'X');
  brutePoly(g,[[5,18],[9,16],[13,18],[12,22],[6,22],[4,20]],'S');
  brutePoly(g,[[6,18],[9,17],[11,19],[8,21],[5,20]],'q');
  bruteRect(g,4,22,9,2,'A');

  if(throwing){
    // O braço da frente mira e empurra a pedra para fora.
    bruteLine(g,25,23,36,21,'X',8);bruteLine(g,25,23,36,21,'G',5);
    bruteRect(g,27,20,7,3,'s');
    bruteCircle(g,38,21,4,'X');bruteCircle(g,38,21,3,'H');
    bruteLine(g,11,23,7,30,'X',7);bruteLine(g,11,23,7,30,'G',4);
    bruteCircle(g,6,31,3,'X');bruteCircle(g,6,31,2,'H');
  }else{
    // Braços pendem pesados, com cotovelo e bracelete separados.
    bruteLine(g,27,22,31,31,'X',8);bruteLine(g,27,22,31,31,'G',5);
    bruteRect(g,28,26,5,5,'X');bruteRect(g,29,27,3,3,'s');
    bruteCircle(g,31,33,4,'X');bruteCircle(g,31,33,3,'H');
    bruteLine(g,11,22,7,30,'X',7);bruteLine(g,11,22,7,30,'g',4);
    bruteRect(g,5,26,7,3,'s');bruteCircle(g,6,32,3,'X');bruteCircle(g,6,32,2,'G');
  }
  return bruteFinish(g);
}
const BRUTE_BODY=[makeBruteFrontFrame(0),makeBruteFrontFrame(1)];
const BRUTE_BACK=[makeBruteBackFrame(0),makeBruteBackFrame(1)];
const BRUTE_RUN=[makeBruteSideFrameV2(0),makeBruteSideFrameV2(1)];
const BRUTE_ROCK_LIFT=makeBruteFrontFrame(0,'lift');
const BRUTE_ROCK_THROW=makeBruteSideFrameV2(0,true);
function drawBossGrid(frame, pal, x, y, px, flipX=false){
  const Wd=frame.reduce((max,row)=>Math.max(max,row.length),0), Hd=frame.length;
  const ox=Math.round(x-Wd*px/2), oy=Math.round(y-Hd*px/2);
  for(let r=0;r<Hd;r++){ const row=frame[r];
    for(let cc=0;cc<Wd;cc++){ const src=flipX?Wd-1-cc:cc; const ch=row[src]||' '; if(ch===' ')continue;
      const col=pal[ch]; if(!col)continue;
      ctx.fillStyle=col; ctx.fillRect(ox+cc*px, oy+r*px, px, px);
    }
  }
}

// ═══ Rei Cadáver — sprite exclusivo desenhado manualmente em JavaScript ═══
// Mantém os esqueletos comuns intactos. O chefe usa coroa, capa, armadura e
// três ciclos direcionais próprios, inspirados nas referências do usuário.
const PAL_SKELETON_KING={
  'X':'#0b0d10',
  'W':'#f1eee1','w':'#c8c3b1','q':'#918d80',
  'K':'#15161a','E':'#ff2418','e':'#ff8a62',
  'Y':'#ffc400','y':'#ffe568','G':'#8f6200','V':'#d62216',
  'H':'#9a6418','h':'#cf8d28',
  'A':'#3e4751','a':'#6e7883','S':'#dce2e8','s':'#9aa4af',
  'D':'#42060b','R':'#9e0d18','r':'#e02932',
  'P':'#67ff48','p':'#229a2b',
};
const SKING_W=36, SKING_H=32;
function skingGrid(h=SKING_H){
  return Array.from({length:h},()=>Array(SKING_W).fill(' '));
}
function skingRect(g,x,y,w,h,ch){
  for(let yy=Math.max(0,y);yy<Math.min(g.length,y+h);yy++)
    for(let xx=Math.max(0,x);xx<Math.min(SKING_W,x+w);xx++) g[yy][xx]=ch;
}
function skingPixel(g,x,y,ch){ if(y>=0&&y<g.length&&x>=0&&x<SKING_W) g[y][x]=ch; }
function skingFinish(g){ return g.map(row=>row.join('')); }

function skingCrown(g,x=7,y=0,w=22){
  // Coroa larga com cinco pontas, contorno escuro, brilho e rubi central.
  skingRect(g,x,y+4,w,5,'X');
  [0,5,10,15,19].forEach((off,i)=>{
    const ph=i===2?6:i%2===0?5:4;
    skingRect(g,x+off,y+5-ph,4,ph+2,'X');
    skingRect(g,x+off+1,y+6-ph,2,ph,'Y');
    skingPixel(g,x+off+1,y+6-ph,'y');
  });
  skingRect(g,x+1,y+5,w-2,3,'Y');
  skingRect(g,x+2,y+5,w-4,1,'y');
  skingRect(g,x+Math.floor(w/2)-2,y+5,4,3,'V');
  skingRect(g,x+Math.floor(w/2)-1,y+5,2,1,'e');
  skingRect(g,x+1,y+8,w-2,1,'G');
}

function skingSkullFront(g,x=8,y=8){
  skingRect(g,x,y,20,11,'X');
  skingRect(g,x+1,y+1,18,8,'W');
  skingRect(g,x+2,y+1,3,2,'w');
  skingRect(g,x+15,y+1,3,2,'w');
  // Recortes arredondados do crânio.
  [[x,y],[x+19,y],[x,y+1],[x+19,y+1],[x,y+9],[x+19,y+9]].forEach(p=>skingPixel(g,p[0],p[1],' '));
  // Órbitas profundas e olhos vermelhos.
  skingRect(g,x+3,y+4,5,3,'K'); skingRect(g,x+12,y+4,5,3,'K');
  skingRect(g,x+5,y+5,2,2,'E'); skingRect(g,x+13,y+5,2,2,'E');
  skingPixel(g,x+5,y+5,'e'); skingPixel(g,x+13,y+5,'e');
  skingRect(g,x+9,y+6,2,3,'K');
  // Maxilar separado, dentes e articulação.
  skingRect(g,x+4,y+9,12,4,'X');
  skingRect(g,x+5,y+9,10,2,'W');
  [6,9,12].forEach(dx=>skingRect(g,x+dx,y+10,1,2,'K'));
  skingRect(g,x+7,y+12,2,2,'W'); skingRect(g,x+11,y+12,2,2,'W');
}

function skingCapeFront(g){
  // Capa pesada atrás do corpo, com bordas irregulares como na referência.
  skingRect(g,3,15,7,12,'D'); skingRect(g,26,15,7,12,'D');
  skingRect(g,4,16,7,13,'R'); skingRect(g,25,16,7,13,'R');
  skingRect(g,5,18,6,12,'r'); skingRect(g,25,18,6,12,'r');
  skingRect(g,3,25,5,5,'R'); skingRect(g,28,25,5,5,'R');
  skingPixel(g,4,29,'D'); skingPixel(g,31,29,'D');
}

function makeSkeletonKingFront(step=0,cast=false,kneel=false){
  const g=skingGrid();
  skingCapeFront(g);
  // Pernas e botas, deslocadas quadro a quadro.
  const ly=kneel?28:26, lx=step===1?10:12, rx=step===2?22:20;
  skingRect(g,lx,ly,5,4,'X'); skingRect(g,lx+1,ly,2,3,'W');
  skingRect(g,rx,ly,5,4,'X'); skingRect(g,rx+2,ly,2,3,'W');
  skingRect(g,lx-1,ly+3,6,3,'X'); skingRect(g,rx,ly+3,6,3,'X');
  skingRect(g,lx,ly+3,4,1,'w'); skingRect(g,rx+1,ly+3,4,1,'w');
  // Túnica preta, cinturão metálico e rubi frontal.
  skingRect(g,10,18,16,10,'X');
  skingRect(g,11,19,14,7,'K');
  skingRect(g,11,24,14,3,'A'); skingRect(g,13,24,10,1,'a');
  skingRect(g,17,24,3,3,'V'); skingPixel(g,18,24,'e');
  // Ombreiras de couro.
  skingRect(g,5,17,8,4,'X'); skingRect(g,23,17,8,4,'X');
  skingRect(g,6,18,7,2,'H'); skingRect(g,23,18,7,2,'H');
  skingRect(g,7,18,2,1,'h'); skingRect(g,24,18,2,1,'h');
  // Coluna e caixa torácica.
  skingRect(g,17,18,3,7,'W');
  [19,21,23].forEach((yy,i)=>{
    skingRect(g,12+i,yy,6-i,1,'W');
    skingRect(g,19,yy,6-i,1,'W');
  });
  skingRect(g,13,20,2,4,'w'); skingRect(g,22,20,2,4,'w');
  // Braços ossudos; ao invocar, o braço direito se ergue.
  skingRect(g,7,20,3,7,'X'); skingRect(g,8,20,1,6,'W');
  if(cast){
    skingRect(g,27,11,3,11,'X'); skingRect(g,28,12,1,9,'W');
    skingRect(g,26,10,5,3,'X'); skingRect(g,27,10,3,1,'W');
  }else{
    skingRect(g,26,20,3,7,'X'); skingRect(g,27,20,1,6,'W');
    skingRect(g,26,26,4,3,'X'); skingRect(g,27,26,2,1,'W');
  }
  skingCrown(g); skingSkullFront(g);
  return skingFinish(g);
}

function makeSkeletonKingBack(step=0){
  const g=skingGrid();
  // Capa central vista por trás, com duas dobras vermelhas.
  skingRect(g,5,14,26,15,'D');
  skingRect(g,6,15,24,14,'R');
  skingRect(g,8,16,8,13,'r'); skingRect(g,20,16,8,13,'r');
  skingRect(g,15,18,6,12,'D');
  skingPixel(g,6,29,' '); skingPixel(g,29,29,' ');
  // Pernas.
  const lx=step===1?10:12, rx=step===2?22:20;
  skingRect(g,lx,26,5,5,'X'); skingRect(g,lx+1,26,2,3,'W');
  skingRect(g,rx,26,5,5,'X'); skingRect(g,rx+2,26,2,3,'W');
  // Costas da armadura.
  skingRect(g,10,17,16,9,'X'); skingRect(g,11,18,14,7,'A');
  skingRect(g,13,19,10,5,'a'); skingRect(g,16,19,4,5,'S');
  skingRect(g,5,17,8,4,'X'); skingRect(g,23,17,8,4,'X');
  skingRect(g,6,18,7,2,'H'); skingRect(g,23,18,7,2,'H');
  // Crânio liso por trás.
  skingRect(g,8,8,20,11,'X'); skingRect(g,9,9,18,9,'W');
  skingRect(g,10,10,3,2,'w'); skingRect(g,23,10,3,2,'w');
  skingRect(g,12,17,12,3,'X'); skingRect(g,14,17,8,2,'w');
  skingCrown(g);
  return skingFinish(g);
}

function makeSkeletonKingSide(step=0,attack=false){
  const g=skingGrid();
  // Capa longa projetada para trás.
  skingRect(g,3,15,13,12,'D'); skingRect(g,4,16,12,13,'R');
  skingRect(g,5,18,10,12,'r'); skingRect(g,3,25,7,5,'R');
  // Pernas em passada lateral.
  const front=step===1?23:21, back=step===2?12:14;
  skingRect(g,back,26,5,4,'X'); skingRect(g,back+1,26,2,3,'W');
  skingRect(g,front,26,5,4,'X'); skingRect(g,front+1,26,2,3,'W');
  skingRect(g,back-1,29,6,3,'X'); skingRect(g,front,29,7,3,'X');
  skingRect(g,front+1,29,5,1,'w');
  // Tronco inclinado e ombreira.
  skingRect(g,12,18,14,9,'X'); skingRect(g,13,19,12,7,'K');
  skingRect(g,14,24,11,3,'A'); skingRect(g,20,24,3,3,'V');
  skingRect(g,9,17,8,4,'X'); skingRect(g,10,18,7,2,'H');
  skingRect(g,16,18,3,7,'W');
  skingRect(g,18,20,6,1,'W'); skingRect(g,18,22,5,1,'W');
  // Braço da espada avança no quadro de ataque.
  if(attack){
    skingRect(g,23,19,9,3,'X'); skingRect(g,24,20,7,1,'W');
    skingRect(g,30,18,5,4,'X'); skingRect(g,31,19,3,2,'W');
  }else{
    skingRect(g,24,20,4,7,'X'); skingRect(g,25,20,2,6,'W');
    skingRect(g,26,25,5,3,'X'); skingRect(g,27,25,3,1,'W');
  }
  // Crânio de perfil, órbita e mandíbula saliente.
  skingRect(g,11,8,19,11,'X'); skingRect(g,12,9,17,8,'W');
  skingRect(g,27,12,5,5,'X'); skingRect(g,27,13,4,3,'W');
  skingRect(g,21,12,5,3,'K'); skingRect(g,23,13,2,2,'E'); skingPixel(g,23,13,'e');
  skingRect(g,25,16,7,4,'X'); skingRect(g,26,16,5,2,'W');
  skingRect(g,18,17,8,3,'X'); skingRect(g,19,17,6,2,'W');
  skingCrown(g,10,0,22);
  return skingFinish(g);
}

function makeSkeletonKingFallen(){
  const g=skingGrid(16);
  // Corpo tombado e achatado como no quadro de ressurreição da referência.
  skingRect(g,2,10,30,4,'X'); skingRect(g,4,9,10,3,'R');
  skingRect(g,11,8,12,5,'W'); skingRect(g,14,10,4,2,'K');
  skingRect(g,20,7,12,4,'X'); skingRect(g,21,8,10,2,'A');
  skingRect(g,1,13,34,2,'D');
  skingRect(g,4,5,13,4,'X'); skingRect(g,5,6,11,2,'Y');
  skingRect(g,10,6,3,2,'V');
  return skingFinish(g);
}

function makeSkeletonKingKneel(step=0){
  const source=makeSkeletonKingFront(step).map(row=>row.split(''));
  const g=skingGrid();
  // Abaixa tronco, cabeça e capa; as pernas ficam dobradas junto ao chão.
  for(let y=0;y<27;y++) for(let x=0;x<SKING_W;x++) if(source[y][x]!==' ') g[y+3][x]=source[y][x];
  skingRect(g,9,28,8,3,'X'); skingRect(g,11,28,4,1,'W');
  skingRect(g,20,28,8,3,'X'); skingRect(g,22,28,4,1,'W');
  skingRect(g,7,30,11,2,'X'); skingRect(g,19,30,11,2,'X');
  skingRect(g,9,30,7,1,'w'); skingRect(g,21,30,7,1,'w');
  return skingFinish(g);
}

const SKING_DOWN=[makeSkeletonKingFront(0),makeSkeletonKingFront(1),makeSkeletonKingFront(2)];
const SKING_UP=[makeSkeletonKingBack(0),makeSkeletonKingBack(1),makeSkeletonKingBack(2)];
const SKING_SIDE=[makeSkeletonKingSide(0),makeSkeletonKingSide(1),makeSkeletonKingSide(2)];
const SKING_ATTACK=[makeSkeletonKingSide(0,true),makeSkeletonKingSide(1,true),makeSkeletonKingSide(2,true)];
const SKING_CAST=[makeSkeletonKingFront(0,true),makeSkeletonKingFront(1,true),makeSkeletonKingFront(2,true)];
const SKING_KNEEL=[makeSkeletonKingKneel(0),makeSkeletonKingKneel(1),makeSkeletonKingKneel(2)];
const SKING_FALLEN=[makeSkeletonKingFallen(),makeSkeletonKingFallen(),makeSkeletonKingFallen()];

function drawSkeletonKingSword(b,groundY,t){
  if(b.swordBoomerang) return;
  const side=b.dir==='left'?-1:1;
  let holdX=b.x-59, holdY=groundY-48, angle=-0.28;
  if(b.dir==='up'){ holdX=b.x+48; holdY=groundY-56; angle=0.56; }
  if(b.dir==='left'||b.dir==='right'){
    holdX=b.x+side*57; holdY=groundY-51; angle=side*0.26;
  }
  if(b.summonAnim>0){ holdX=b.x+52; holdY=groundY-69; angle=0; }
  if(b.resurrectAnim>800){ holdX=b.x-68; holdY=groundY-7; angle=Math.PI/2; }
  if(b.isSpinning){
    const r=72, a=b.axeAngle;
    holdX=b.x+Math.cos(a)*r; holdY=b.y+Math.sin(a)*r;
    angle=a+Math.PI/2;
  }
  ctx.save();
  ctx.translate(Math.round(holdX),Math.round(holdY));
  ctx.rotate(angle);
  // Espada larga pixel-art: proporções grandes e guarda dourada da referência.
  ctx.fillStyle='#0b0d10'; ctx.fillRect(-9,-61,18,75);
  ctx.fillRect(-6,-66,12,5);
  ctx.fillStyle='#aeb6c2'; ctx.fillRect(-6,-59,12,65);
  ctx.fillStyle='#f5f7fb'; ctx.fillRect(-5,-58,5,59);
  ctx.fillStyle='#d6dce5'; ctx.fillRect(0,-56,4,58);
  ctx.fillStyle='#ffffff'; ctx.fillRect(-4,-57,2,49);
  ctx.fillStyle='#0b0d10'; ctx.fillRect(-19,5,38,11);
  ctx.fillStyle='#ffc400'; ctx.fillRect(-16,8,32,6);
  ctx.fillStyle='#ffe568'; ctx.fillRect(-13,8,18,2);
  ctx.fillStyle='#0b0d10'; ctx.fillRect(-6,15,12,29);
  ctx.fillStyle='#8b5819'; ctx.fillRect(-3,17,6,21);
  ctx.fillStyle='#ffc400'; ctx.fillRect(-6,38,12,7);
  ctx.restore();
}

function drawSkeletonBoomerangSword(sw,t){
  if(!sw) return;
  ctx.save();
  ctx.translate(Math.round(sw.x),Math.round(sw.y));
  ctx.rotate(sw.angle);
  // Rastro em blocos para manter o mesmo pixel art do chefe.
  ctx.globalAlpha=0.42;
  ctx.fillStyle=sw.state==='return'?'#b74cff':'#ff3a2c';
  for(let i=1;i<=4;i++)ctx.fillRect(-8-i*11,-3+(i%2)*4,8,4);
  ctx.globalAlpha=1;
  ctx.scale(0.58,0.58);
  ctx.fillStyle='#0b0d10';ctx.fillRect(-9,-61,18,75);ctx.fillRect(-6,-66,12,5);
  ctx.fillStyle='#aeb6c2';ctx.fillRect(-6,-59,12,65);
  ctx.fillStyle='#f5f7fb';ctx.fillRect(-5,-58,5,59);
  ctx.fillStyle='#d6dce5';ctx.fillRect(0,-56,4,58);
  ctx.fillStyle='#ffffff';ctx.fillRect(-4,-57,2,49);
  ctx.fillStyle='#0b0d10';ctx.fillRect(-19,5,38,11);
  ctx.fillStyle='#ffc400';ctx.fillRect(-16,8,32,6);
  ctx.fillStyle='#ffe568';ctx.fillRect(-13,8,18,2);
  ctx.fillStyle='#0b0d10';ctx.fillRect(-6,15,12,29);
  ctx.fillStyle='#8b5819';ctx.fillRect(-3,17,6,21);
  ctx.fillStyle='#ffc400';ctx.fillRect(-6,38,12,7);
  ctx.restore();
}

function drawSkeletonKingMagic(b,t){
  const active=b.summonAnim>0||b.resurrectAnim>0||b.resurrected;
  if(!active) return;
  const green=b.summonAnim>0||b.resurrectAnim>0;
  const c1=green?'#67ff48':'#b74cff', c2=green?'#229a2b':'#6720aa';
  const strength=b.summonAnim>0?Math.min(1,b.summonAnim/280):b.resurrectAnim>0?Math.min(1,b.resurrectAnim/420):0.35;
  ctx.save();
  ctx.globalAlpha=0.18+strength*0.22;
  const aura=ctx.createRadialGradient(b.x,b.y,5,b.x,b.y,72);
  aura.addColorStop(0,c1); aura.addColorStop(0.55,c2); aura.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=aura; ctx.fillRect(b.x-76,b.y-86,152,160);
  for(let i=0;i<12;i++){
    const phase=((t*0.0007)+i/12)%1;
    const px=b.x-48+(i*37%96);
    const py=b.y+38-phase*132;
    ctx.globalAlpha=(1-phase)*(0.25+strength*0.55);
    ctx.fillStyle=i%3===0?'#d7ffb8':c1;
    const sz=i%4===0?5:3;
    ctx.fillRect(Math.round(px),Math.round(py),sz,sz);
  }
  ctx.globalAlpha=0.5+strength*0.3;
  ctx.strokeStyle=c1; ctx.lineWidth=3;
  ctx.beginPath(); ctx.ellipse(b.x,b.y+35,55,17,0,0,Math.PI*2); ctx.stroke();
  ctx.restore();
}

// BOSS: SKELETON KING (Onda 5) — Rei Cadáver
// ═══════════════════════════════════════════════════════
class BossSkeletonKing {
  constructor(wave){
    this.x=W/2; this.y=240; this.wave=wave;
    this.hp=1000+wave*160; this.maxHp=this.hp;
    this.speed=28+wave*1.5; this.damage=28+wave*3;
    this.radius=36; this.xpVal=80+wave*15;
    this.dead=false; this.frameIdx=0; this.frameTick=0; this.dir='down';
    this.scale=1.9; this.phase=Math.random()*Math.PI*2;
    this.flashTimer=0; this.type='boss_skel_king';
    this.summonAnim=0; this.resurrectAnim=0;
    // Phase 1 abilities
    this.summonCd=10000; this.summonTimer=6500;
    this.spinCd=8000; this.spinTimer=6000;
    this.isSpinning=false; this.spinDur=0; this.spinRadius=0;
    this.spinWarning=false; this.spinWarnTimer=0;
    this.swordBoomerang=null;
    // Phase 2 (resurrection)
    this.resurrected=false; this.phase2Triggered=false;
    this.axeAngle=0;
  }
  update(dt,px,py){
    // Phase 2 trigger
    if(!this.phase2Triggered && this.hp<=0){
      this.phase2Triggered=true;
      this.resurrected=true;
      this.hp=Math.round(this.maxHp*0.3);
      this.speed*=1.5;
      this.flashTimer=800;
      this.resurrectAnim=1200;
      spawnLevelUpNotice(this.x,this.y-50,'💀 RESSURREIÇÃO! 💀',0);
      spawnParts(this.x,this.y,'#aabbff',20,80);
      return;
    }
    if(this.hp<=0&&this.resurrected){ this.dead=true; this._dropLoot(); return; }
    this._updateBoomerang(dt);
    // Move toward player
    const dx=px-this.x, dy=py-this.y, d=Math.hypot(dx,dy);
    if(Math.abs(dx)>Math.abs(dy)) this.dir=dx<0?'left':'right';
    else this.dir=dy<0?'up':'down';
    if(d>1&&!this.isSpinning){ this.x+=(dx/d)*this.speed*dt; this.y+=(dy/d)*this.speed*dt; }
    this.x=Math.max(36,Math.min(W-36,this.x)); this.y=Math.max(205,Math.min(H-36,this.y));
    // Summoning ability
    this.summonTimer-=dt*1000;
    if(this.summonTimer<=0){ this.summonTimer=this.summonCd; this._summonMinions(); }
    // Spin warning
    this.spinTimer-=dt*1000;
    if(this.spinTimer<=0&&!this.isSpinning&&!this.spinWarning){
      this.spinWarning=true; this.spinWarnTimer=1200;
      spawnLevelUpNotice(this.x,this.y-40,'⚠ GIRO MORTAL!',0);
    }
    if(this.spinWarning){
      this.spinWarnTimer-=dt*1000;
      if(this.spinWarnTimer<=0){ this.spinWarning=false; this.isSpinning=true; this.spinDur=1200; this.spinTimer=this.spinCd; this.spinRadius=85; }
    }
    if(this.isSpinning){
      this.spinDur-=dt*1000; this.axeAngle+=dt*10;
      if(this.spinDur<=0){
        this.isSpinning=false;
        const allPl=[player,...(gameMode===2&&player2&&!player2.dead?[player2]:[])].filter(p=>!p.dead);
        for(const pl of allPl) if(Math.hypot(pl.x-this.x,pl.y-this.y)<this.spinRadius) pl.takeDmg(this.damage*0.9);
        spawnParts(this.x,this.y,'#aabbff',16,75);
        this._throwBoomerang(allPl);
      }
    } else { this.axeAngle+=dt*1.8; }
    this.frameTick+=dt*1000; if(this.frameTick>160){this.frameTick=0;this.frameIdx=(this.frameIdx+1)%3;}
    if(this.flashTimer>0) this.flashTimer-=dt*1000;
    if(this.summonAnim>0) this.summonAnim-=dt*1000;
    if(this.resurrectAnim>0) this.resurrectAnim-=dt*1000;
  }
  _throwBoomerang(allPl){
    if(this.swordBoomerang||!allPl||!allPl.length) return;
    let target=allPl[0],best=Math.hypot(target.x-this.x,target.y-this.y);
    for(const pl of allPl){
      const d=Math.hypot(pl.x-this.x,pl.y-this.y);
      if(d<best){best=d;target=pl;}
    }
    const angle=Math.atan2(target.y-this.y,target.x-this.x);
    this.swordBoomerang={
      x:this.x,y:this.y-9,vx:Math.cos(angle)*390,vy:Math.sin(angle)*390,
      state:'out',outTimer:720,angle:angle+Math.PI/2,hitPlayers:new Set()
    };
    spawnLevelUpNotice(this.x,this.y-48,'ESPADA BUMERANGUE!',0);
  }
  _updateBoomerang(dt){
    const sw=this.swordBoomerang;
    if(!sw) return;
    sw.angle+=dt*12;
    if(sw.state==='out'){
      sw.x+=sw.vx*dt;sw.y+=sw.vy*dt;sw.outTimer-=dt*1000;
      if(sw.outTimer<=0||sw.x<-70||sw.x>W+70||sw.y<150||sw.y>H+70)sw.state='return';
    }else{
      const dx=this.x-sw.x,dy=this.y-9-sw.y,d=Math.hypot(dx,dy);
      if(d<24){this.swordBoomerang=null;spawnParts(this.x,this.y,'#ffc400',6,30);return;}
      sw.x+=dx/d*470*dt;sw.y+=dy/d*470*dt;
    }
    const allPl=[player,...(gameMode===2&&player2&&!player2.dead?[player2]:[])].filter(p=>!p.dead);
    for(const pl of allPl){
      const key=pl===player2?'p2':'p1';
      if(!sw.hitPlayers.has(key)&&Math.hypot(pl.x-sw.x,pl.y-sw.y)<pl.radius+20){
        sw.hitPlayers.add(key);pl.takeDmg(this.damage*0.75);
        spawnParts(sw.x,sw.y,'#f5f7fb',8,38);
      }
    }
  }
  _summonMinions(){
    this.summonAnim=850;
    spawnLevelUpNotice(this.x,this.y-38,'💀 INVOCAÇÃO!',0);
    for(let i=0;i<8;i++){
      const ang=i*Math.PI*2/8;
      const e=new Enemy(this.x+Math.cos(ang)*80,this.y+Math.sin(ang)*80,wave,'archer_skeleton');
      e.hp=Math.round(e.maxHp*0.6); e.maxHp=e.hp;
      enemies.push(e);
    }
    spawnParts(this.x,this.y,'#d0d0ff',12,60);
  }
  takeDmg(a){ if(this.phase2Triggered&&!this.resurrected) return; this.hp-=a; this.flashTimer=100; spawnParts(this.x,this.y,'#d0c8e0',4,35); }
  _dropLoot(){
    kills+=6;
    for(let i=0;i<8;i++) spawnCoin(this.x+(Math.random()-0.5)*50,this.y+(Math.random()-0.5)*30,Math.floor(this.xpVal/8));
    const bossLoot=['semente_trigo','semente_tomate','semente_erva','madeira','pedra'];
    for(let bi=0;bi<5;bi++){ const it=bossLoot[Math.floor(Math.random()*bossLoot.length)]; globalInventory[it]=(globalInventory[it]||0)+1; spawnLootFlyAnim(this.x+(Math.random()-0.5)*40,this.y,it); }
    showInvNotif('Rei Cadáver derrotado! +5 itens!'); savePersistentData();
    spawnParts(this.x,this.y,'#aabbff',25,90);
    triggerScreenShake(18, 550);
  }
  draw(t){
    const groundY=this.y+this.radius*0.82;
    ctx.fillStyle='rgba(0,0,0,0.34)'; ctx.beginPath(); ctx.ellipse(this.x,groundY+3,this.radius*1.25,this.radius*0.34,0,0,Math.PI*2); ctx.fill();
    const pulse=0.7+0.3*Math.sin(t*0.004+this.phase);
    const ag=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,65*pulse);
    ag.addColorStop(0,this.resurrected?'rgba(200,100,255,0.25)':'rgba(160,180,255,0.22)'); ag.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=ag; ctx.fillRect(this.x-70,this.y-70,140,140);
    drawSkeletonKingMagic(this,t);
    // Spin warning circle
    if(this.spinWarning){ const wa=this.spinWarnTimer/1200; ctx.save(); ctx.globalAlpha=0.3+0.3*(1-wa); ctx.strokeStyle='#ff2200'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(this.x,this.y,this.spinRadius||85,0,Math.PI*2); ctx.stroke(); ctx.restore(); }
    if(this.isSpinning){
      ctx.save();
      ctx.globalAlpha=0.68; ctx.lineCap='square';
      for(let i=0;i<3;i++){
        const a=this.axeAngle+i*Math.PI*0.66;
        ctx.strokeStyle=i===1?'#ffffff':'#ff3a2c';
        ctx.lineWidth=i===1?4:7;
        ctx.beginPath(); ctx.arc(this.x,this.y,70+i*5,a,a+1.18); ctx.stroke();
      }
      ctx.restore();
    }
    if(this.flashTimer>0){ ctx.save(); ctx.globalAlpha=this.flashTimer/800*0.7; ctx.fillStyle=this.resurrected?'#cc44ff':'#bbccff'; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    // Corpo manual em alta resolução: caminhada, ataque, invocação e ressurreição.
    let sprites=SKING_DOWN, flip=false;
    if(this.resurrectAnim>800) sprites=SKING_FALLEN;
    else if(this.resurrectAnim>400) sprites=SKING_KNEEL;
    else if(this.summonAnim>0) sprites=SKING_CAST;
    else if(this.isSpinning){ sprites=SKING_ATTACK; flip=this.dir==='left'; }
    else if(this.dir==='up') sprites=SKING_UP;
    else if(this.dir==='left'||this.dir==='right'){ sprites=SKING_SIDE; flip=this.dir==='left'; }
    drawSpriteAt(sprites[this.frameIdx%3],PAL_SKELETON_KING,this.x,groundY,flip,this.scale);
    drawSkeletonKingSword(this,groundY,t);
    drawSkeletonBoomerangSword(this.swordBoomerang,t);
    const spriteTop=groundY-SKING_H*Math.round(PX*this.scale);
    drawHPBar(this.x,spriteTop-15,this.hp/this.maxHp,104);
    ctx.fillStyle=this.resurrected?'#cc44ff':'#aabbff'; ctx.font='bold 9px Courier New'; ctx.textAlign='center';
    ctx.fillText(this.resurrected?'💀 REI CADÁVER [RESSURRETO]':'💀 REI CADÁVER',this.x,spriteTop-20); ctx.textAlign='left';
  }
}

// ═══════════════════════════════════════════════════════
// BOSS: ARACNE ANCESTRAL (Onda 10) — Broodmother Spider
// ═══════════════════════════════════════════════════════
const PAL_ARACNE_ANCESTRAL={
  'X':'#090611','K':'#120a1d','D':'#20102f',
  'P':'#3b1b57','p':'#5d2b80','L':'#8742a7','l':'#b05bd0',
  'H':'#ff65aa','h':'#ff9ccc','E':'#ff2b1c','e':'#ff8b35','Y':'#ffd34c',
  'W':'#e8e5ef','w':'#a7a0b3','G':'#82ff45','g':'#3aa328',
};
const ARACNE_W=46, ARACNE_H=28;
function aracneGrid(){ return Array.from({length:ARACNE_H},()=>Array(ARACNE_W).fill(' ')); }
function aracneRect(g,x,y,w,h,ch){
  for(let yy=Math.max(0,y);yy<Math.min(ARACNE_H,y+h);yy++)
    for(let xx=Math.max(0,x);xx<Math.min(ARACNE_W,x+w);xx++) g[yy][xx]=ch;
}
function aracnePixel(g,x,y,ch){ if(y>=0&&y<ARACNE_H&&x>=0&&x<ARACNE_W) g[y][x]=ch; }
function aracneOval(g,cx,cy,rx,ry,ch){
  for(let y=-ry;y<=ry;y++){
    const span=Math.floor(rx*Math.sqrt(Math.max(0,1-(y*y)/(ry*ry))));
    aracneRect(g,cx-span,cy+y,span*2+1,1,ch);
  }
}
function aracneLine(g,x0,y0,x1,y1,ch,thick=1){
  let dx=Math.abs(x1-x0), sx=x0<x1?1:-1, dy=-Math.abs(y1-y0), sy=y0<y1?1:-1, err=dx+dy;
  while(true){
    aracneRect(g,x0-Math.floor(thick/2),y0-Math.floor(thick/2),thick,thick,ch);
    if(x0===x1&&y0===y1) break;
    const e2=2*err; if(e2>=dy){err+=dy;x0+=sx;} if(e2<=dx){err+=dx;y0+=sy;}
  }
}
function aracneLeg(g,points){
  for(let i=0;i<points.length-1;i++) aracneLine(g,points[i][0],points[i][1],points[i+1][0],points[i+1][1],'X',4);
  for(let i=0;i<points.length-1;i++) aracneLine(g,points[i][0],points[i][1],points[i+1][0],points[i+1][1],i%2?'p':'P',2);
  for(const [x,y] of points.slice(1,-1)){ aracneRect(g,x-2,y-2,4,4,'X'); aracneRect(g,x-1,y-1,2,2,'L'); }
}
function aracneSkullMark(g,cx,cy){
  aracneRect(g,cx-5,cy-3,10,7,'H');
  aracneRect(g,cx-3,cy+4,6,3,'H');
  aracneRect(g,cx-4,cy-2,2,2,'h');
  aracneRect(g,cx+2,cy-2,2,2,'h');
  aracneRect(g,cx-3,cy,2,2,'P');
  aracneRect(g,cx+1,cy,2,2,'P');
  aracnePixel(g,cx,cy+2,'P');
  aracnePixel(g,cx-2,cy+5,'P'); aracnePixel(g,cx+1,cy+5,'P');
}
function aracneEyes(g,cx,cy){
  [[-6,-2,2],[-1,-3,2],[4,-2,2],[-7,2,2],[-2,2,3],[4,2,3]].forEach(([dx,dy,s],i)=>{
    aracneRect(g,cx+dx,cy+dy,s,s,'E');
    aracnePixel(g,cx+dx,cy+dy,i%2?'e':'Y');
  });
}
function makeAracneFront(step=0,crouch=false){
  const g=aracneGrid();
  const bodyY=crouch?18:17;
  const shift=step===1?1:step===2?-1:0;
  const left=[
    [[15,15],[9,7+shift],[3,6],[1,10]],
    [[13,17],[7,13-shift],[1,14],[1,18]],
    [[13,19],[7,20+shift],[2,24],[1,27]],
    [[15,21],[10,24-shift],[8,27],[7,27]],
  ];
  const right=left.map(path=>path.map(([x,y])=>[ARACNE_W-1-x,y]));
  if(crouch){
    left.forEach((path,i)=>path.forEach((p,j)=>{ if(j>0){p[0]+=3;p[1]=Math.min(27,p[1]+(j===1?3:1));} }));
    right.forEach((path,i)=>path.forEach((p,j)=>{ if(j>0){p[0]-=3;p[1]=Math.min(27,p[1]+(j===1?3:1));} }));
  }
  [...left,...right].forEach(path=>aracneLeg(g,path));
  // Abdômen largo e blindado.
  aracneOval(g,23,bodyY,14,9,'X');
  aracneOval(g,23,bodyY,12,7,'P');
  aracneOval(g,20,bodyY-2,8,5,'p');
  aracneRect(g,13,bodyY-3,3,6,'L');
  aracnePixel(g,15,bodyY-4,'l');
  aracneSkullMark(g,23,bodyY);
  // Cabeça separada, baixa e ameaçadora.
  const headY=crouch?10:8;
  aracneOval(g,23,headY,9,7,'X');
  aracneOval(g,23,headY,7,5,'D');
  aracneRect(g,18,headY-3,8,2,'K');
  aracneEyes(g,23,headY);
  // Presas e gota de veneno.
  aracneRect(g,19,headY+5,3,3,'X'); aracneRect(g,25,headY+5,3,3,'X');
  aracnePixel(g,20,headY+6,'W'); aracnePixel(g,26,headY+6,'W');
  aracnePixel(g,27,headY+7,'G');
  return g.map(row=>row.join(''));
}
function makeAracneBack(step=0){
  const g=aracneGrid();
  const shift=step===1?1:step===2?-1:0;
  const left=[
    [[15,15],[9,7+shift],[3,6],[1,10]],
    [[13,17],[7,13-shift],[1,14],[1,18]],
    [[13,19],[7,20+shift],[2,24],[1,27]],
    [[15,21],[10,24-shift],[8,27],[7,27]],
  ];
  const right=left.map(path=>path.map(([x,y])=>[ARACNE_W-1-x,y]));
  [...left,...right].forEach(path=>aracneLeg(g,path));
  aracneOval(g,23,17,14,9,'X'); aracneOval(g,23,17,12,7,'P');
  aracneOval(g,20,15,8,5,'p'); aracneRect(g,13,14,3,6,'L');
  aracneSkullMark(g,23,17);
  aracneOval(g,23,8,9,7,'X'); aracneOval(g,23,8,7,5,'D');
  aracneRect(g,18,5,8,2,'P'); aracnePixel(g,20,4,'L'); aracnePixel(g,19,5,'l');
  return g.map(row=>row.join(''));
}
function makeAracneSide(step=0){
  const g=aracneGrid();
  const shift=step===1?1:step===2?-1:0;
  [
    [[17,15],[11,7+shift],[5,7],[2,11]],
    [[15,17],[8,14-shift],[2,16],[1,20]],
    [[16,20],[9,22+shift],[4,26],[2,27]],
    [[26,16],[31,10-shift],[38,9],[43,13]],
    [[27,19],[33,17+shift],[40,19],[44,23]],
    [[26,21],[33,23-shift],[39,27],[43,27]],
  ].forEach(path=>aracneLeg(g,path));
  aracneOval(g,16,17,13,8,'X'); aracneOval(g,16,17,11,6,'P');
  aracneOval(g,13,15,7,4,'p'); aracneSkullMark(g,15,17);
  aracneOval(g,30,11,8,7,'X'); aracneOval(g,30,11,6,5,'D');
  aracneRect(g,34,10,5,4,'X'); aracneRect(g,34,11,4,2,'D');
  aracneEyes(g,31,10);
  aracnePixel(g,37,14,'W'); aracnePixel(g,38,15,'G');
  return g.map(row=>row.join(''));
}
const ARACNE_FRONT=[makeAracneFront(0),makeAracneFront(1),makeAracneFront(2)];
const ARACNE_BACK=[makeAracneBack(0),makeAracneBack(1),makeAracneBack(2)];
const ARACNE_SIDE=[makeAracneSide(0),makeAracneSide(1),makeAracneSide(2)];
const ARACNE_CROUCH=[makeAracneFront(0,true),makeAracneFront(1,true),makeAracneFront(2,true)];

function drawAracneEgg(eg,t){
  const pct=1-(eg.timer/eg.maxTimer), pulse=0.75+0.25*Math.sin(t*0.008+eg.x);
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.38)'; ctx.fillRect(Math.round(eg.x-12),Math.round(eg.y+5),24,5);
  ctx.fillStyle='#090611'; ctx.fillRect(Math.round(eg.x-10),Math.round(eg.y-10),20,17);
  ctx.fillStyle='#3b1b57'; ctx.fillRect(Math.round(eg.x-8),Math.round(eg.y-12),16,18);
  ctx.fillStyle='#8742a7'; ctx.fillRect(Math.round(eg.x-6),Math.round(eg.y-10),7,7);
  ctx.fillStyle='#b05bd0'; ctx.fillRect(Math.round(eg.x-5),Math.round(eg.y-9),3,3);
  ctx.fillStyle=pct>0.7?'#82ff45':'#5d2b80';
  ctx.globalAlpha=pulse; ctx.fillRect(Math.round(eg.x+3),Math.round(eg.y-5),4,6);
  ctx.globalAlpha=1; ctx.strokeStyle=pct>0.7?'#82ff45':'#8742a7'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(eg.x,eg.y,15,-Math.PI/2,-Math.PI/2+Math.PI*2*pct); ctx.stroke();
  ctx.restore();
}
function drawAracneWebCone(b,x,y,t){
  const radius=b.webRange||300, spread=0.7;
  ctx.save();
  ctx.globalAlpha=0.16; ctx.fillStyle='#bcecff';
  ctx.beginPath(); ctx.moveTo(x,y-10); ctx.arc(x,y-10,radius,b.coneAngle-spread,b.coneAngle+spread); ctx.closePath(); ctx.fill();
  ctx.globalAlpha=0.7; ctx.strokeStyle='#d9f4ff'; ctx.lineWidth=2;
  for(let i=0;i<=7;i++){
    const a=b.coneAngle-spread+(spread*2)*(i/7);
    ctx.beginPath(); ctx.moveTo(x,y-10); ctx.lineTo(x+Math.cos(a)*radius,y-10+Math.sin(a)*radius); ctx.stroke();
  }
  [55,110,170,230,285].filter(r=>r<radius).forEach((r,ri)=>{
    ctx.globalAlpha=0.5-ri*0.06; ctx.beginPath(); ctx.arc(x,y-10,r,b.coneAngle-spread,b.coneAngle+spread); ctx.stroke();
  });
  for(let i=0;i<16;i++){
    const a=b.coneAngle-spread+(spread*2)*((i*7%17)/16), r=35+(i*41%155);
    ctx.fillStyle=i%3===0?'#ffffff':'#9ddcff'; ctx.globalAlpha=0.45;
    ctx.fillRect(Math.round(x+Math.cos(a)*r),Math.round(y-10+Math.sin(a)*r),3,3);
  }
  ctx.restore();
}
function drawAracneAncestralBoss(b,t){
  let drawX=b.x, drawY=b.y, sprites=ARACNE_FRONT, flip=false;
  const ps=Math.round(PX*b.scale);
  // Durante o salto, o corpo percorre visualmente um arco até a sombra do alvo.
  if(b.jumpState==='jumping'){
    const p=Math.max(0,Math.min(1,1-b.jumpAirTimer/1200));
    drawX=b.jumpStart.x+(b.jumpTarget.x-b.jumpStart.x)*p;
    drawY=b.jumpStart.y+(b.jumpTarget.y-b.jumpStart.y)*p-Math.sin(p*Math.PI)*105;
    sprites=ARACNE_CROUCH;
  }else if(b.jumpState==='jumpWind'||b.jumpState==='landing') sprites=ARACNE_CROUCH;
  else if(b.dir==='up') sprites=ARACNE_BACK;
  else if(b.dir==='left'||b.dir==='right'){ sprites=ARACNE_SIDE; flip=b.dir==='left'; }

  // Sombra do corpo e alvo do salto.
  ctx.fillStyle='rgba(0,0,0,0.38)'; ctx.beginPath(); ctx.ellipse(drawX,drawY+31,66,17,0,0,Math.PI*2); ctx.fill();
  if(b.jumpState==='jumping'||b.jumpState==='jumpWind'){
    ctx.save(); ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.ellipse(b.jumpShadowX,b.jumpShadowY,80,30,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#ff5b25'; ctx.lineWidth=3; ctx.stroke(); ctx.restore();
  }
  if(b.jumpState==='landing'){
    const p=1-b.jumpLandTimer/400;
    ctx.save(); ctx.globalAlpha=1-p; ctx.strokeStyle='#ffd34c'; ctx.lineWidth=5;
    ctx.beginPath(); ctx.ellipse(b.x,b.y+20,45+p*85,13+p*25,0,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle='#ff5b25'; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(b.x,b.y+20,25+p*120,8+p*34,0,0,Math.PI*2); ctx.stroke(); ctx.restore();
  }
  const aura=ctx.createRadialGradient(drawX,drawY,5,drawX,drawY,80);
  aura.addColorStop(0,'rgba(135,66,167,0.23)'); aura.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=aura; ctx.fillRect(drawX-85,drawY-85,170,170);
  if(b.isConing) drawAracneWebCone(b,drawX,drawY,t);
  drawSpriteAt(sprites[b.frameIdx%3],PAL_ARACNE_ANCESTRAL,drawX,drawY+34,flip,b.scale);
  for(const eg of b.eggs){ if(!eg.hatched){ drawAracneEgg(eg,t); eg.drawn=true; } else eg.drawn=true; }
  if(b.flashTimer>0){ ctx.save(); ctx.globalAlpha=b.flashTimer/100*0.5; ctx.fillStyle='#b05bd0'; ctx.beginPath(); ctx.arc(drawX,drawY,b.radius,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  const spriteTop=drawY+34-ARACNE_H*ps;
  drawHPBar(drawX,spriteTop-15,b.hp/b.maxHp,112);
  ctx.fillStyle='#cc66ff'; ctx.font='bold 9px Courier New'; ctx.textAlign='center';
  ctx.fillText('🕷 ARACNE ANCESTRAL',drawX,spriteTop-20); ctx.textAlign='left';
}

class BossAracne {
  constructor(wave){
    this.x=W/2; this.y=250; this.wave=wave;
    this.hp=1050+wave*135; this.maxHp=this.hp;
    this.speed=26+wave*1.2; this.damage=30+wave*3;
    this.radius=40; this.xpVal=100+wave*18;
    this.dead=false; this.frameIdx=0; this.frameTick=0; this.dir='down';
    this.scale=1.5; this.phase=Math.random()*Math.PI*2;
    this.flashTimer=0; this.type='boss_aracne';
    this.eggCd=9000; this.eggTimer=5000;
    this.jumpCd=10000; this.jumpTimer=7000;
    this.jumpState='ground'; this.jumpTarget={x:0,y:0}; this.jumpStart={x:this.x,y:this.y}; this.jumpShadowX=0; this.jumpShadowY=0;
    this.jumpWindTimer=0; this.jumpAirTimer=0; this.jumpLandTimer=0;
    this.jumpAttempts=0; this.jumpHit=false;
    this.coneCd=7000; this.coneTimer=4000;
    this.coneAngle=0; this.isConing=false; this.coneDur=0; this.webRange=300;
    this.eggs=[];
  }
  update(dt,px,py){
    if(this.hp<=0){ this.dead=true; this._dropLoot(); return; }
    if(this.jumpState==='ground'){
      const dx=px-this.x, dy=py-this.y, d=Math.hypot(dx,dy);
      if(Math.abs(dx)>Math.abs(dy)) this.dir=dx<0?'left':'right';
      else this.dir=dy<0?'up':'down';
      if(d>1){ this.x+=(dx/d)*this.speed*dt; this.y+=(dy/d)*this.speed*dt; }
      this.x=Math.max(40,Math.min(W-40,this.x)); this.y=Math.max(205,Math.min(H-40,this.y));
    }
    // Eggs
    this.eggTimer-=dt*1000;
    if(this.eggTimer<=0){ this.eggTimer=this.eggCd; this._spawnEggs(px,py); }
    // Update eggs
    for(const eg of this.eggs){
      eg.timer-=dt*1000;
      if(eg.timer<=0&&!eg.hatched){ eg.hatched=true; spawnParts(eg.x,eg.y,'#888840',8,35); for(let i=0;i<2;i++){ const sp=new Enemy(eg.x+(Math.random()-0.5)*20,eg.y,wave,'spitting_spider'); sp.speed*=1.4; enemies.push(sp); } }
    }
    this.eggs=this.eggs.filter(eg=>!eg.hatched||eg.drawn);
    // Jump — dt-based state machine (no setTimeout!)
    this.jumpTimer-=dt*1000;
    if(this.jumpTimer<=0&&this.jumpState==='ground'){
      this.jumpState='jumpWind'; this.jumpWindTimer=300;
      this.jumpAttempts=1; this.jumpHit=false;
      this.jumpStart={x:this.x,y:this.y};
      this.jumpTarget={x:px,y:py}; this.jumpShadowX=px; this.jumpShadowY=py;
      this.jumpTimer=this.jumpCd;
      spawnParts(this.x,this.y,'#888840',8,40);
    }
    if(this.jumpState==='jumpWind'){
      this.jumpWindTimer-=dt*1000;
      if(this.jumpWindTimer<=0){
        this.jumpState='jumping'; this.jumpAirTimer=1200;
      }
    }
    if(this.jumpState==='jumping'){
      this.jumpAirTimer-=dt*1000;
      if(this.jumpAirTimer<=0){
        this.x=Math.max(40,Math.min(W-40,this.jumpTarget.x));
        this.y=Math.max(205,Math.min(H-40,this.jumpTarget.y));
        this.jumpState='landing'; this.jumpLandTimer=400;
        const allPl=[player,...(gameMode===2&&player2&&!player2.dead?[player2]:[])].filter(p=>!p.dead);
        this.jumpHit=false;
        for(const pl of allPl){
          if(Math.hypot(pl.x-this.jumpTarget.x,pl.y-this.jumpTarget.y)<80){
            this.jumpHit=true;pl.takeDmg(this.damage*1.2);
          }
        }
        spawnParts(this.x,this.y,'#888840',16,70);
      }
    }
    if(this.jumpState==='landing'){
      this.jumpLandTimer-=dt*1000;
      if(this.jumpLandTimer<=0){
        if(!this.jumpHit&&this.jumpAttempts<2){
          this.jumpAttempts++;
          this.jumpState='jumpWind';this.jumpWindTimer=240;
          this.jumpStart={x:this.x,y:this.y};
          this.jumpTarget={x:px,y:py};this.jumpShadowX=px;this.jumpShadowY=py;
          spawnLevelUpNotice(this.x,this.y-50,'SEGUNDO SALTO!',0);
        }else this.jumpState='ground';
      }
    }
    // Cone web
    this.coneTimer-=dt*1000;
    if(this.coneTimer<=0&&!this.isConing){ this.coneTimer=this.coneCd; this.isConing=true; this.coneDur=700; this.coneAngle=Math.atan2(py-this.y,px-this.x); spawnLevelUpNotice(this.x,this.y-50,'🕸 TEIA CÔNICA!',0); }
    if(this.isConing){
      this.coneDur-=dt*1000;
      if(this.coneDur<=0){
        this.isConing=false;
        const allPl=[player,...(gameMode===2&&player2&&!player2.dead?[player2]:[])].filter(p=>!p.dead);
        for(const pl of allPl){
          const ang=Math.atan2(pl.y-this.y,pl.x-this.x);let diff=ang-this.coneAngle;
          while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
          if(Math.abs(diff)<0.7&&Math.hypot(pl.x-this.x,pl.y-this.y)<this.webRange){
            pl.webbed=true;pl.webbedTimer=2500;
            pl.slowed=true;pl.slowTimer=2500;
            spawnParts(pl.x,pl.y,'#d9f4ff',12,46);
          }
        }
      }
    }
    this.frameTick+=dt*1000; if(this.frameTick>160){this.frameTick=0;this.frameIdx=(this.frameIdx+1)%3;}
    if(this.flashTimer>0) this.flashTimer-=dt*1000;
  }
  _spawnEggs(px,py){
    spawnLevelUpNotice(this.x,this.y-50,'🥚 OVOS!',0);
    for(let i=0;i<3;i++){
      const ex=100+Math.random()*(W-200), ey=230+Math.random()*(H-260);
      this.eggs.push({x:ex,y:ey,timer:5000,hatched:false,drawn:false,maxTimer:5000});
      spawnParts(ex,ey,'#888840',5,25);
    }
  }
  takeDmg(a){ this.hp-=a; this.flashTimer=100; spawnParts(this.x,this.y,'#888840',4,35); }
  _dropLoot(){ kills+=8; for(let i=0;i<10;i++) spawnCoin(this.x+(Math.random()-0.5)*60,this.y+(Math.random()-0.5)*35,Math.floor(this.xpVal/10)); const bl=['semente_erva','semente_tomate','madeira','pedra']; for(let bi=0;bi<5;bi++){const it=bl[Math.floor(Math.random()*bl.length)];globalInventory[it]=(globalInventory[it]||0)+1;spawnLootFlyAnim(this.x+(Math.random()-0.5)*40,this.y,it);} showInvNotif('Aracne Ancestral derrotada!'); savePersistentData(); spawnParts(this.x,this.y,'#888840',22,90); triggerScreenShake(16,480); }
  draw(t){
    drawAracneAncestralBoss(this,t);
    return;
    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.x,this.y+this.radius*0.6,this.radius*1.4,this.radius*0.4,0,0,Math.PI*2); ctx.fill();
    // Jump shadow on ground target
    if(this.jumpState==='jumping'||this.jumpState==='jumpWind'){
      ctx.save(); ctx.globalAlpha=0.5+(this.jumpState==='jumpWind'?0:0);
      ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.ellipse(this.jumpShadowX,this.jumpShadowY,80,30,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#ff2200'; ctx.lineWidth=3; ctx.stroke(); ctx.restore();
      if(this.jumpState==='jumping') return; // Boss is in the air — invisible
    }
    // Aura
    const ag=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,70);
    ag.addColorStop(0,'rgba(30,30,10,0.3)'); ag.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=ag; ctx.fillRect(this.x-72,this.y-72,144,144);
    // Cone web visual
    if(this.isConing){ ctx.save(); ctx.globalAlpha=0.45; ctx.fillStyle='#888850'; ctx.beginPath(); ctx.moveTo(this.x,this.y); ctx.arc(this.x,this.y,200,this.coneAngle-0.7,this.coneAngle+0.7); ctx.closePath(); ctx.fill(); ctx.restore(); }
    // Body — Broodmother detalhada (contorno escuro + carapaça roxa + marca vermelha)
    const sc=this.scale/2.8, ox=this.x, oy=this.y, fi=this.frameIdx;
    const breathe=1+0.03*Math.sin(t*0.004+this.phase);
    // Pernas articuladas (atrás do corpo, com juntas e sombra)
    [[-1,-1],[-1,0],[-1,1],[-1,2],[1,-1],[1,0],[1,1],[1,2]].forEach(([side,row],li)=>{
      const lx=ox+side*14*sc, ly=oy+row*7*sc-4*sc;
      const kick=(fi+(li%2))*((li%2===0)?1:-1);
      const ex=ox+side*(40+kick*6)*sc, ey=oy+row*11*sc+(li%2===fi?5:-5)*sc+6*sc;
      const mx=(lx+ex)/2+side*7*sc, my=(ly+ey)/2-12*sc;
      // contorno
      ctx.strokeStyle='#0d0a12'; ctx.lineWidth=Math.max(3,4.6*sc); ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(mx,my); ctx.lineTo(ex,ey); ctx.stroke();
      // interior da perna
      ctx.strokeStyle='#1c1226'; ctx.lineWidth=Math.max(1.5,2.4*sc);
      ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(mx,my); ctx.lineTo(ex,ey); ctx.stroke();
      // junta brilhante
      ctx.fillStyle='#4a2a66'; ctx.beginPath(); ctx.arc(mx,my,2.2*sc,0,Math.PI*2); ctx.fill();
    });
    // Abdômen (contorno + carapaça + ampulheta vermelha)
    ctx.fillStyle='#0d0a12'; ctx.beginPath(); ctx.ellipse(ox,oy+2*sc,24*sc*breathe,20*sc*breathe,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#3a1a55'; ctx.beginPath(); ctx.ellipse(ox,oy+1*sc,21*sc*breathe,17*sc*breathe,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#5a2a7a'; ctx.beginPath(); ctx.ellipse(ox-4*sc,oy-3*sc,13*sc,10*sc,0,0,Math.PI*2); ctx.fill();
    // ampulheta
    // ── Marca de CAVEIRA no abdômen ──
    ctx.fillStyle='#ff5a8a';
    ctx.fillRect(ox-5*sc,oy-6*sc,10*sc,7*sc);                      // crânio
    ctx.fillRect(ox-3.5*sc,oy+1*sc,7*sc,3*sc);                     // mandíbula
    ctx.fillStyle='#3a1a55';
    ctx.fillRect(ox-3.5*sc,oy-4*sc,2.4*sc,2.6*sc);                 // olho esq
    ctx.fillRect(ox+1.1*sc,oy-4*sc,2.4*sc,2.6*sc);                 // olho dir
    ctx.fillRect(ox-0.8*sc,oy-1.2*sc,1.6*sc,1.6*sc);               // nariz
    ctx.fillRect(ox-2.4*sc,oy+2.4*sc,1.2*sc,1.6*sc);               // dentes
    ctx.fillRect(ox+1.2*sc,oy+2.4*sc,1.2*sc,1.6*sc);
    // fio de teia pendurado (tracejado)
    ctx.save(); ctx.strokeStyle='rgba(240,240,255,0.5)'; ctx.lineWidth=1.6; ctx.setLineDash([4,6]);
    ctx.beginPath(); ctx.moveTo(ox,oy-70*sc); ctx.lineTo(ox,oy-34*sc); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    // cerdas no abdômen
    ctx.strokeStyle='#0d0a12'; ctx.lineWidth=1.4;
    for(let h=0;h<7;h++){ const ha=Math.PI*0.9+h*0.22; ctx.beginPath();
      ctx.moveTo(ox+Math.cos(ha)*22*sc,oy+2*sc+Math.sin(ha)*18*sc);
      ctx.lineTo(ox+Math.cos(ha)*27*sc,oy+2*sc+Math.sin(ha)*23*sc); ctx.stroke(); }
    // Cefalotórax (cabeça)
    ctx.fillStyle='#0d0a12'; ctx.beginPath(); ctx.ellipse(ox,oy-22*sc,17*sc,15*sc,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#26202e'; ctx.beginPath(); ctx.ellipse(ox,oy-23*sc,14*sc,12*sc,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#332a42'; ctx.beginPath(); ctx.ellipse(ox-3*sc,oy-26*sc,8*sc,6*sc,0,0,Math.PI*2); ctx.fill();
    // 6 olhos vermelhos brilhantes (2 grandes + 4 pequenos)
    const eyeGlow=0.7+0.3*Math.sin(t*0.006+this.phase);
    [[-6,-2,3.4],[6,-2,3.4],[-11,-6,2],[11,-6,2],[-4,-9,1.8],[4,-9,1.8]].forEach(([ex,ey,er])=>{
      const gx=ox+ex*sc, gy=oy-22*sc+ey*sc;
      const eg=ctx.createRadialGradient(gx,gy,0,gx,gy,er*2.2*sc);
      eg.addColorStop(0,`rgba(255,40,20,${eyeGlow})`); eg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(gx,gy,er*2.2*sc,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ff2412'; ctx.beginPath(); ctx.arc(gx,gy,er*sc,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ff9d70'; ctx.beginPath(); ctx.arc(gx-er*0.3*sc,gy-er*0.3*sc,er*0.4*sc,0,Math.PI*2); ctx.fill();
    });
    // Quelíceras (presas)
    ctx.fillStyle='#d8d0e0';
    ctx.beginPath(); ctx.moveTo(ox-5*sc,oy-12*sc); ctx.lineTo(ox-7*sc,oy-5*sc); ctx.lineTo(ox-2*sc,oy-10*sc); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(ox+5*sc,oy-12*sc); ctx.lineTo(ox+7*sc,oy-5*sc); ctx.lineTo(ox+2*sc,oy-10*sc); ctx.closePath(); ctx.fill();
    // gota de veneno
    ctx.fillStyle=`rgba(150,255,60,${0.6*eyeGlow})`;
    ctx.beginPath(); ctx.arc(ox-7*sc,oy-4*sc,1.6*sc,0,Math.PI*2); ctx.fill();
    // Eggs on field
    for(const eg of this.eggs){
      if(!eg.hatched){ const pct=1-(eg.timer/eg.maxTimer); ctx.save(); ctx.globalAlpha=0.9; ctx.fillStyle='#888840'; ctx.beginPath(); ctx.ellipse(eg.x,eg.y,12,9,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#aaaa60'; ctx.beginPath(); ctx.ellipse(eg.x-4,eg.y-3,5,4,0,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=pct>0.7?'#ff3300':'#888840'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(eg.x,eg.y,14,0,Math.PI*2*pct); ctx.stroke(); ctx.restore(); eg.drawn=true; } else { eg.drawn=true; }
    }
    if(this.flashTimer>0){ ctx.save(); ctx.globalAlpha=this.flashTimer/100*0.5; ctx.fillStyle='#888840'; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    drawHPBar(this.x,this.y-this.radius*this.scale-20,this.hp/this.maxHp,95);
    ctx.fillStyle='#cc66ff'; ctx.font='bold 9px Courier New'; ctx.textAlign='center';
    ctx.fillText('🕷 ARACNE ANCESTRAL',this.x,this.y-this.radius*this.scale-24); ctx.textAlign='left';
  }
}

// ═══════════════════════════════════════════════════════
// BOSS: FROST BEHEMOTH (Onda 15) — Gigante de Gelo
// ═══════════════════════════════════════════════════════
const PAL_FROST_GIANT={
  'X':'#031126','K':'#061b33','D':'#092b4c','N':'#0d4169',
  'B':'#11618e','b':'#1687b9','C':'#20bce8','c':'#5adcf6',
  'I':'#9cecff','W':'#ebfcff','A':'#315d7d','a':'#6fa4bd',
  'G':'#51f1ff','g':'#0d718d','H':'#ccefff',
};
const FROST_GIANT_W=48, FROST_GIANT_H=38;
function frostGrid(){ return Array.from({length:FROST_GIANT_H},()=>Array(FROST_GIANT_W).fill(' ')); }
function frostRect(g,x,y,w,h,ch){
  for(let yy=Math.max(0,y);yy<Math.min(FROST_GIANT_H,y+h);yy++)
    for(let xx=Math.max(0,x);xx<Math.min(FROST_GIANT_W,x+w);xx++) g[yy][xx]=ch;
}
function frostPixel(g,x,y,ch){ if(y>=0&&y<FROST_GIANT_H&&x>=0&&x<FROST_GIANT_W) g[y][x]=ch; }
function frostLine(g,x0,y0,x1,y1,ch,thick=1){
  let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;
  while(true){
    frostRect(g,x0-Math.floor(thick/2),y0-Math.floor(thick/2),thick,thick,ch);
    if(x0===x1&&y0===y1) break;
    const e2=2*err;if(e2>=dy){err+=dy;x0+=sx;}if(e2<=dx){err+=dx;y0+=sy;}
  }
}
function frostBand(g,y,x,w,ch,h=1){ frostRect(g,x,y,w,h,ch); }
function frostHornsFront(g){
  const left=[[17,12],[12,12],[8,10],[5,7],[4,3],[4,0]];
  const right=left.map(([x,y])=>[FROST_GIANT_W-1-x,y]);
  [left,right].forEach(points=>{
    for(let i=0;i<points.length-1;i++) frostLine(g,points[i][0],points[i][1],points[i+1][0],points[i+1][1],'X',7);
    for(let i=0;i<points.length-1;i++) frostLine(g,points[i][0],points[i][1],points[i+1][0],points[i+1][1],i<2?'c':'W',3);
  });
}
function frostCore(g,cx=24,cy=23){
  // Núcleo oval e profundo, como a grande placa luminosa da referência.
  frostBand(g,cy-8,cx-6,12,'X',2);
  frostBand(g,cy-6,cx-8,16,'X',3);
  frostBand(g,cy-3,cx-9,18,'X',7);
  frostBand(g,cy+4,cx-8,16,'X',3);
  frostBand(g,cy+7,cx-6,12,'X',2);
  frostBand(g,cy-7,cx-5,10,'B',2);
  frostBand(g,cy-5,cx-7,14,'b',3);
  frostBand(g,cy-2,cx-8,16,'C',6);
  frostBand(g,cy+4,cx-7,14,'b',2);
  frostBand(g,cy+6,cx-5,10,'B',2);
  frostBand(g,cy-4,cx-4,8,'c',8);
  frostBand(g,cy-2,cx-3,6,'I',5);
  frostBand(g,cy-2,cx-2,4,'W',2);
  frostRect(g,cx-7,cy+3,3,2,'g');
}
function makeFrostGiantFront(step=0,cast=false){
  const g=frostGrid();
  // Pés curtos e pesados, com três posições de passada.
  const lx=step===1?9:11, rx=step===2?29:27;
  frostRect(g,lx,29,11,7,'X'); frostRect(g,lx+2,29,7,5,'N');
  frostRect(g,rx,29,11,7,'X'); frostRect(g,rx+2,29,7,5,'N');
  frostRect(g,lx-1,34,12,4,'X'); frostRect(g,rx,34,12,4,'X');
  frostRect(g,lx+1,34,8,2,'c'); frostRect(g,rx+2,34,8,2,'c');
  frostRect(g,lx+2,31,3,2,'b'); frostRect(g,rx+3,31,3,2,'b');

  // Corpo arredondado por faixas; a base fica quase quadrada como a referência.
  frostBand(g,13,10,28,'X',2); frostBand(g,15,8,32,'X',3);
  frostBand(g,18,7,34,'X',8); frostBand(g,26,8,32,'X',4);
  frostBand(g,30,10,28,'X',3);
  frostBand(g,14,12,24,'D',2); frostBand(g,16,10,28,'D',3);
  frostBand(g,19,9,30,'N',7); frostBand(g,26,10,28,'D',4);
  frostBand(g,30,12,24,'N',2);
  frostRect(g,10,17,5,11,'B'); frostRect(g,33,17,5,11,'B');
  frostRect(g,12,18,3,7,'b'); frostRect(g,33,18,3,7,'b');
  frostCore(g,24,23);

  // Braços e manoplas grandes, com a placa azul-clara na frente.
  if(cast){
    frostBand(g,1,1,12,'X',5); frostBand(g,5,2,13,'X',15);
    frostBand(g,1,35,12,'X',5); frostBand(g,5,33,13,'X',15);
    frostRect(g,3,3,8,14,'N'); frostRect(g,37,3,8,14,'N');
    frostRect(g,4,4,6,7,'b'); frostRect(g,38,4,6,7,'b');
    frostRect(g,5,4,4,5,'I'); frostRect(g,39,4,4,5,'I');
    frostRect(g,2,14,12,7,'B'); frostRect(g,34,14,12,7,'B');
  }else{
    frostBand(g,14,2,13,'X',7); frostBand(g,21,0,15,'X',11);
    frostBand(g,14,33,13,'X',7); frostBand(g,21,33,15,'X',11);
    frostRect(g,4,15,10,14,'N'); frostRect(g,34,15,10,14,'N');
    frostRect(g,2,23,11,7,'B'); frostRect(g,35,23,11,7,'B');
    frostRect(g,4,23,7,5,'b'); frostRect(g,37,23,7,5,'b');
    frostRect(g,5,24,4,3,'I'); frostRect(g,39,24,4,3,'I');
    frostPixel(g,5,24,'W'); frostPixel(g,39,24,'W');
  }

  // Cristais de ombro inclinados para fora.
  frostLine(g,11,18,5,12,'X',6); frostLine(g,11,18,5,12,'I',3); frostPixel(g,4,11,'W');
  frostLine(g,36,18,42,12,'X',6); frostLine(g,36,18,42,12,'I',3); frostPixel(g,43,11,'W');

  // Chifres enormes em U e elmo abaulado.
  frostHornsFront(g);
  frostBand(g,3,18,12,'X',2); frostBand(g,5,14,20,'X',2);
  frostBand(g,7,11,26,'X',3); frostBand(g,10,9,30,'X',4);
  frostBand(g,14,11,26,'X',3);
  frostBand(g,4,19,10,'B',2); frostBand(g,6,15,18,'N',2);
  frostBand(g,8,12,24,'D',3); frostBand(g,11,11,26,'K',3);
  frostBand(g,14,13,22,'D',2);
  frostRect(g,20,4,8,4,'b'); frostRect(g,22,4,4,3,'c');
  frostRect(g,13,11,7,3,'N'); frostRect(g,28,11,7,3,'N');
  frostRect(g,15,12,3,2,'G'); frostRect(g,30,12,3,2,'G');
  frostPixel(g,15,12,'W'); frostPixel(g,30,12,'W');
  frostRect(g,22,12,4,3,'B'); frostRect(g,23,12,2,2,'c');
  return g.map(row=>row.join(''));
}
function makeFrostGiantBack(step=0){
  const g=makeFrostGiantFront(step,false).map(row=>row.split(''));
  // Costas sem visor: placas sobrepostas e um cristal central.
  frostBand(g,8,12,24,'D',3); frostBand(g,11,11,26,'N',4);
  frostBand(g,15,13,22,'D',2);
  frostRect(g,18,8,12,6,'B'); frostRect(g,20,8,8,4,'b');
  frostRect(g,22,8,4,3,'c');
  frostRect(g,14,18,20,11,'D');
  frostRect(g,16,19,16,9,'B');
  frostRect(g,19,20,10,7,'b');
  frostRect(g,21,20,6,5,'C');
  frostRect(g,23,20,2,3,'I');
  return g.map(row=>row.join(''));
}
function makeFrostGiantSide(step=0){
  const g=frostGrid();
  const back=step===2?9:11, front=step===1?29:27;
  frostRect(g,back,29,11,7,'X'); frostRect(g,back+2,29,7,5,'N');
  frostRect(g,front,29,11,7,'X'); frostRect(g,front+2,29,7,5,'N');
  frostRect(g,back-1,34,12,4,'X'); frostRect(g,front,34,12,4,'X');
  frostRect(g,back+1,34,8,2,'c'); frostRect(g,front+2,34,8,2,'c');

  // Grande corcova traseira e tronco lateral arredondado.
  frostBand(g,11,8,27,'X',3); frostBand(g,14,5,33,'X',4);
  frostBand(g,18,3,37,'X',8); frostBand(g,26,6,34,'X',5);
  frostBand(g,31,9,29,'X',2);
  frostBand(g,12,10,23,'D',3); frostBand(g,15,7,29,'N',4);
  frostBand(g,19,5,33,'D',7); frostBand(g,26,8,30,'N',4);
  frostRect(g,7,17,13,12,'B'); frostRect(g,9,18,9,9,'b');
  frostRect(g,10,19,5,5,'c');
  frostCore(g,26,23);

  // Ombro traseiro e manopla frontal muito volumosa.
  frostLine(g,15,18,9,12,'X',7); frostLine(g,15,18,9,12,'I',3);
  frostBand(g,15,31,13,'X',7); frostBand(g,22,30,16,'X',11);
  frostRect(g,33,16,9,13,'N'); frostRect(g,32,23,13,7,'B');
  frostRect(g,35,23,8,5,'b'); frostRect(g,37,24,4,3,'I');

  // Elmo de perfil: cúpula longa, focinho e dois chifres curvados.
  frostBand(g,4,20,12,'X',2); frostBand(g,6,16,20,'X',3);
  frostBand(g,9,13,26,'X',4); frostBand(g,13,14,27,'X',4);
  frostBand(g,5,21,10,'B',2); frostBand(g,7,17,18,'N',3);
  frostBand(g,10,15,23,'D',3); frostBand(g,13,17,22,'K',3);
  frostRect(g,31,12,11,5,'X'); frostRect(g,32,13,8,3,'B');
  frostRect(g,33,13,3,2,'G'); frostPixel(g,33,13,'W');
  frostLine(g,19,10,13,7,'X',7); frostLine(g,13,7,11,1,'X',7);
  frostLine(g,19,10,13,7,'c',3); frostLine(g,13,7,11,1,'W',3);
  frostLine(g,31,9,38,6,'X',7); frostLine(g,38,6,39,0,'X',7);
  frostLine(g,31,9,38,6,'c',3); frostLine(g,38,6,39,0,'W',3);
  frostRect(g,23,5,7,3,'b'); frostRect(g,25,5,3,2,'c');
  return g.map(row=>row.join(''));
}
const FROST_GIANT_FRONT=[makeFrostGiantFront(0),makeFrostGiantFront(1),makeFrostGiantFront(2)];
const FROST_GIANT_BACK=[makeFrostGiantBack(0),makeFrostGiantBack(1),makeFrostGiantBack(2)];
const FROST_GIANT_SIDE=[makeFrostGiantSide(0),makeFrostGiantSide(1),makeFrostGiantSide(2)];
const FROST_GIANT_CAST=[makeFrostGiantFront(0,true),makeFrostGiantFront(1,true),makeFrostGiantFront(2,true)];

function drawFrostGiantBoss(b,t){
  const x=b.x,y=b.y,bob=Math.sin(t*0.0035+b.phase)*2;
  // Avisos e raios ativos da erupção.
  for(const il of b.iceLines){
    if(il.active){
      ctx.save(); ctx.globalAlpha=Math.max(0,Math.min(1,(il.life+800)/1600));
      ctx.shadowBlur=20; ctx.shadowColor='#4ee9ff'; ctx.strokeStyle='#bcefff'; ctx.lineWidth=7;
      ctx.beginPath(); ctx.moveTo(il.x1,il.y1); ctx.lineTo(il.x2,il.y2); ctx.stroke();
      ctx.shadowBlur=0; ctx.strokeStyle='#23bce8'; ctx.lineWidth=3; ctx.stroke();
      const dx=il.x2-il.x1,dy=il.y2-il.y1,len=Math.hypot(dx,dy)||1;
      for(let d=45;d<len;d+=62){
        const px=il.x1+dx*d/len,py=il.y1+dy*d/len;
        ctx.fillStyle='#ecfbff';ctx.fillRect(Math.round(px-3),Math.round(py-8),6,16);
        ctx.fillStyle='#23bce8';ctx.fillRect(Math.round(px-6),Math.round(py-3),12,6);
      }
      ctx.restore();
    }else{
      const blink=0.45+0.35*Math.sin(t*0.009);
      ctx.save();ctx.globalAlpha=blink;ctx.setLineDash([10,8]);ctx.strokeStyle='#ffb52e';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(il.x1,il.y1);ctx.lineTo(il.x2,il.y2);ctx.stroke();ctx.restore();
    }
  }
  // Nevasca com vento horizontal e flocos pixelados.
  if(b.blizzardActive){
    ctx.save();ctx.globalAlpha=0.12;ctx.fillStyle='#bcefff';ctx.fillRect(0,0,W,H);
    for(let i=0;i<45;i++){
      const sx=((i*97+t*0.22*b.blizzardDir)% (W+160))-80;
      const sy=190+(i*53%Math.max(1,H-205));
      ctx.globalAlpha=0.25+(i%4)*0.12;ctx.fillStyle=i%3===0?'#ffffff':'#72e8ff';
      ctx.fillRect(Math.round(sx),Math.round(sy),i%5===0?8:4,3);
      ctx.fillRect(Math.round(sx+2),Math.round(sy-2),3,7);
    }
    ctx.restore();
  }
  ctx.fillStyle='rgba(0,0,0,0.42)';ctx.beginPath();ctx.ellipse(x,y+39,70,17,0,0,Math.PI*2);ctx.fill();
  const aura=ctx.createRadialGradient(x,y,4,x,y,90);
  aura.addColorStop(0,'rgba(78,233,255,0.25)');aura.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=aura;ctx.fillRect(x-95,y-95,190,190);
  // Escudo esférico: o segundo estágio é mais brilhante e pulsa.
  if(b.shieldActive){
    const pulse=0.82+0.18*Math.sin(t*0.006),r=b.shieldPhase==='half'?82:77;
    ctx.save();ctx.globalAlpha=0.09;ctx.fillStyle='#72e8ff';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=0.58+0.22*pulse;ctx.strokeStyle=b.shieldPhase==='half'?'#ecfbff':'#72e8ff';ctx.lineWidth=b.shieldPhase==='half'?7:5;
    ctx.shadowBlur=22;ctx.shadowColor='#4ee9ff';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
    ctx.shadowBlur=0;ctx.lineWidth=1.5;ctx.globalAlpha=0.25;
    for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);ctx.stroke();}
    for(let i=0;i<5;i++){
      const a=t*0.0018+i*1.26,px=x+Math.cos(a)*(r+9),py=y+Math.sin(a)*(r+9);
      ctx.globalAlpha=0.5;ctx.fillStyle='#bcefff';ctx.fillRect(Math.round(px-2),Math.round(py-7),4,14);ctx.fillRect(Math.round(px-7),Math.round(py-2),14,4);
    }
    ctx.restore();
  }
  let sprites=b.eruptionAnim>0?FROST_GIANT_CAST:FROST_GIANT_FRONT,flip=false;
  if(b.eruptionAnim<=0&&b.dir==='up')sprites=FROST_GIANT_BACK;
  else if(b.eruptionAnim<=0&&(b.dir==='left'||b.dir==='right')){sprites=FROST_GIANT_SIDE;flip=b.dir==='left';}
  drawSpriteAt(sprites[b.frameIdx%3],PAL_FROST_GIANT,x,y+42+bob,flip,b.scale);
  // Núcleo glacial pulsante.
  const core=ctx.createRadialGradient(x,y+8+bob,1,x,y+8+bob,22);
  core.addColorStop(0,'rgba(236,251,255,0.85)');core.addColorStop(0.45,'rgba(78,233,255,0.35)');core.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=core;ctx.beginPath();ctx.arc(x,y+8+bob,22,0,Math.PI*2);ctx.fill();
  if(b.flashTimer>0){ctx.save();ctx.globalAlpha=b.flashTimer/100*0.5;ctx.fillStyle='#bcefff';ctx.beginPath();ctx.arc(x,y,b.radius,0,Math.PI*2);ctx.fill();ctx.restore();}
  const spriteTop=y+42-FROST_GIANT_H*Math.round(PX*b.scale);
  if(b.shieldActive){
    drawHPBar(x,spriteTop-29,b.shieldHp/b.shieldMax,90);
    ctx.fillStyle='#72e8ff';ctx.font='7px Courier New';ctx.textAlign='center';
    ctx.fillText(b.shieldPhase==='half'?'BARREIRA 1000':'ESCUDO 2000',x,spriteTop-33);
  }
  drawHPBar(x,spriteTop-15,b.hp/b.maxHp,112);
  ctx.fillStyle='#88ddff';ctx.font='bold 9px Courier New';ctx.textAlign='center';
  ctx.fillText('❄ GIGANTE DE GELO',x,spriteTop-20);ctx.textAlign='left';
}

class BossFrostBehemoth {
  constructor(wave){
    this.x=W/2; this.y=250; this.wave=wave;
    this.hp=1600+wave*165; this.maxHp=this.hp;
    this.speed=18+wave*0.8; this.damage=38+wave*4;
    this.radius=48; this.xpVal=130+wave*22;
    this.dead=false; this.frameIdx=0; this.frameTick=0; this.dir='down';
    this.isMoving=false; this.facing=1; this.facingY=1; this.moveDx=0; this.moveDy=0;
    this.scale=1.5; this.phase=Math.random()*Math.PI*2;
    this.flashTimer=0; this.type='boss_frost';
    this.shieldHp=2000; this.shieldMax=2000; this.shieldActive=true;
    this.halfShieldTriggered=false; this.shieldPhase='initial';
    this.iceLineCd=8000; this.iceLineTimer=5000;
    this.iceLines=[]; this.eruptionHitPlayers=new Set();
    this.eruptionAnim=0;
    this.blizzardCd=12000; this.blizzardTimer=9000;
    this.blizzardActive=false; this.blizzardDur=0; this.blizzardDir=0;
    this.pushForce=0;
  }
  update(dt,px,py){
    if(this.hp<=0){ this.dead=true; this._dropLoot(); return; }
    // Shield regenerates HP while active
    if(this.shieldActive){
      this.hp=Math.min(this.maxHp,this.hp+18*dt);
    }
    const dx=px-this.x, dy=py-this.y, d=Math.hypot(dx,dy);
    if(Math.abs(dx)>Math.abs(dy)) this.dir=dx<0?'left':'right';
    else this.dir=dy<0?'up':'down';
    if(d>1){ this.x+=(dx/d)*this.speed*dt; this.y+=(dy/d)*this.speed*dt; }
    this.x=Math.max(48,Math.min(W-48,this.x)); this.y=Math.max(210,Math.min(H-48,this.y));
    // Ice spike lines
    this.iceLineTimer-=dt*1000;
    if(this.iceLineTimer<=0){ this.iceLineTimer=this.iceLineCd; this._spawnIceLines(); }
    for(const il of this.iceLines){ il.life-=dt*1000; il.active=il.life<il.warnTime; }
    this.iceLines=this.iceLines.filter(il=>il.life>-800);
    // Deal ice line damage — continuous while active (check every frame)
    for(const il of this.iceLines){
      if(!il.active) continue;
      const allPl=[player,...(gameMode===2&&player2&&!player2.dead?[player2]:[])].filter(p=>!p.dead);
      for(const pl of allPl){
        const playerKey=pl===player2?'p2':'p1';
        if(this.eruptionHitPlayers.has(playerKey)) continue;
        const dx=il.x2-il.x1, dy=il.y2-il.y1, len2=dx*dx+dy*dy;
        const t2=len2>0?((pl.x-il.x1)*dx+(pl.y-il.y1)*dy)/len2:0;
        const cx=il.x1+dx*Math.max(0,Math.min(1,t2));
        const cy=il.y1+dy*Math.max(0,Math.min(1,t2));
        if(Math.hypot(pl.x-cx,pl.y-cy)<28){
          pl.takeDmg(this.damage*0.6);
          pl.frozen=true; pl.frozenTimer=1000; pl.freezeFx='iceCube';
          this.eruptionHitPlayers.add(playerKey);
          spawnParts(pl.x,pl.y,'#88eeff',6,40);
        }
      }
    }
    // Blizzard push
    this.blizzardTimer-=dt*1000;
    if(this.blizzardTimer<=0&&!this.blizzardActive){ this.blizzardTimer=this.blizzardCd; this.blizzardActive=true; this.blizzardDur=4000; this.blizzardDir=Math.random()<0.5?1:-1; spawnLevelUpNotice(W/2,H/2-40,'❄ NEVASCA!',0); }
    if(this.blizzardActive){
      this.blizzardDur-=dt*1000;
      const allPl=[player,...(gameMode===2&&player2&&!player2.dead?[player2]:[])].filter(p=>!p.dead);
      for(const pl of allPl){ pl.x+=this.blizzardDir*60*dt*getCampaignShopKnockbackMultiplier(pl); pl.x=Math.max(16,Math.min(W-16,pl.x)); }
      if(this.blizzardDur<=0){
        this.blizzardActive=false;
        for(const pl of allPl){
          pl.frozen=true; pl.frozenTimer=600; pl.freezeFx='iceCube';
          spawnParts(pl.x,pl.y,'#bdefff',8,36);
        }
        spawnLevelUpNotice(W/2,H/2-40,'❄ FRIO FINAL — 0,6s!',0);
      }
    }
    this.frameTick+=dt*1000; if(this.frameTick>180){this.frameTick=0;this.frameIdx=(this.frameIdx+1)%3;}
    if(this.eruptionAnim>0) this.eruptionAnim-=dt*1000;
    if(this.flashTimer>0) this.flashTimer-=dt*1000;
  }
  _spawnIceLines(){
    this.eruptionHitPlayers.clear();
    this.eruptionAnim=2200;
    spawnLevelUpNotice(this.x,this.y-60,'❄ ERUPÇÃO GLACIAL — DESVIE!',0);
    spawnParts(this.x,this.y,'#88ddff',10,60);
    const angles=[0,Math.PI/3,Math.PI*2/3];
    for(const a of angles){
      this.iceLines.push({x1:this.x,y1:this.y,x2:this.x+Math.cos(a)*W,y2:this.y+Math.sin(a)*H,life:2200,warnTime:1600,active:false,damaged:false});
      this.iceLines.push({x1:this.x,y1:this.y,x2:this.x+Math.cos(a+Math.PI)*W,y2:this.y+Math.sin(a+Math.PI)*H,life:2200,warnTime:1600,active:false,damaged:false});
    }
  }
  takeDmg(a){
    if(this.shieldActive){
      this.shieldHp-=a;
      if(this.shieldHp<=0){
        this.shieldHp=0; this.shieldActive=false;
        spawnLevelUpNotice(this.x,this.y-60,'🛡 ESCUDO DESTRUÍDO!',0);
        spawnParts(this.x,this.y,'#88ddff',20,80);
      }
      return;
    }
    const hpBefore=this.hp, halfHp=this.maxHp*0.5;
    this.hp-=a;
    if(!this.halfShieldTriggered&&hpBefore>halfHp&&this.hp<=halfHp){
      this.hp=halfHp;
      this.halfShieldTriggered=true; this.shieldPhase='half';
      this.shieldHp=1000; this.shieldMax=1000; this.shieldActive=true;
      spawnLevelUpNotice(this.x,this.y-65,'🛡 BARREIRA GLACIAL — 1000!',0);
      spawnParts(this.x,this.y,'#bdefff',28,95);
      triggerScreenShake(10,320);
    }
    this.flashTimer=100; spawnParts(this.x,this.y,'#88ccff',4,35);
  }
  _dropLoot(){ kills+=10; for(let i=0;i<12;i++) spawnCoin(this.x+(Math.random()-0.5)*70,this.y+(Math.random()-0.5)*40,Math.floor(this.xpVal/12)); const bl=['semente_erva','pedra','madeira']; for(let bi=0;bi<6;bi++){const it=bl[Math.floor(Math.random()*bl.length)];globalInventory[it]=(globalInventory[it]||0)+1;spawnLootFlyAnim(this.x+(Math.random()-0.5)*40,this.y,it);} showInvNotif('Gigante de Gelo derrotado! +6 itens!'); savePersistentData(); spawnParts(this.x,this.y,'#88ddff',28,100); triggerScreenShake(20,600); }
  draw(t){
    drawFrostGiantBoss(this,t);
    return;
    const x=this.x, y=this.y, sc=this.scale/2.8;
    const pulse=0.6+0.4*Math.sin(t*0.003+this.phase);
    const iceGlow=0.5+0.3*Math.sin(t*0.004+this.phase);

    // Ground shadow
    ctx.fillStyle='rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(x,y+this.radius*0.65,this.radius*1.6,this.radius*0.42,0,0,Math.PI*2); ctx.fill();

    // Ice spike lines on ground — warn phase = dashed pulse, active = solid beam
    for(const il of this.iceLines){
      const lifeProgress = il.life / 2200;
      if(il.active){
        // ACTIVE — full bright beam with glow
        ctx.save();
        ctx.shadowBlur=28; ctx.shadowColor='#00eeff';
        ctx.strokeStyle='#ffffff'; ctx.lineWidth=6;
        ctx.globalAlpha=0.95;
        ctx.beginPath(); ctx.moveTo(il.x1,il.y1); ctx.lineTo(il.x2,il.y2); ctx.stroke();
        ctx.shadowBlur=14; ctx.shadowColor='#88eeff';
        ctx.strokeStyle='#88eeff'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(il.x1,il.y1); ctx.lineTo(il.x2,il.y2); ctx.stroke();
        ctx.shadowBlur=0; ctx.restore();
      } else {
        // WARNING PHASE — dashed, pulsing orange/yellow to signal danger
        const warnProg = 1 - (il.life / 2200); // 0→1 as warn approaches
        const blink = Math.sin(t * 0.008) > 0;  // sincronizado com o frame, não Date.now()
        if(!blink) continue; // flash on/off
        ctx.save();
        ctx.setLineDash([12,8]);
        ctx.strokeStyle=`rgba(255,${200-Math.floor(warnProg*150)},0,${0.5+0.4*warnProg})`;
        ctx.lineWidth=3+warnProg*2;
        ctx.beginPath(); ctx.moveTo(il.x1,il.y1); ctx.lineTo(il.x2,il.y2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    // Blizzard overlay — renderizado como camada sutil (sem piscar)
    if(this.blizzardActive){
      const blizAlpha = 0.10 + 0.05*Math.sin(t*0.003); // respira suave, não pisca
      ctx.save(); ctx.globalAlpha=blizAlpha;
      ctx.fillStyle='#aaddff'; ctx.fillRect(0,0,W,H);
      ctx.restore();
    }

    // Outer aura — cold blue
    const ag=ctx.createRadialGradient(x,y,5,x,y,75*pulse);
    ag.addColorStop(0,'rgba(100,180,255,0.22)');
    ag.addColorStop(0.5,'rgba(60,120,220,0.08)');
    ag.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=ag; ctx.fillRect(x-80,y-80,160,160);

    // Ice crystal shards orbiting body
    for(let i=0;i<6;i++){
      const ang=t*0.002+i*Math.PI/3;
      const r=38*sc, sx=x+Math.cos(ang)*r, sy=y+Math.sin(ang)*r*0.6;
      ctx.save(); ctx.translate(sx,sy); ctx.rotate(ang+Math.PI/4);
      ctx.fillStyle=`rgba(160,220,255,${0.55+0.3*Math.sin(t*0.006+i)})`;
      ctx.fillRect(-3,-9,6,18);
      ctx.fillStyle='rgba(220,245,255,0.8)';
      ctx.fillRect(-2,-7,4,12);
      ctx.restore();
    }

    // Shield
    if(this.shieldActive){
      const shPct=this.shieldHp/this.shieldMax;
      ctx.save(); ctx.globalAlpha=0.25+0.15*Math.sin(t*0.006);
      ctx.strokeStyle='#aaddff'; ctx.lineWidth=6;
      ctx.shadowBlur=18; ctx.shadowColor='#88ccff';
      ctx.beginPath(); ctx.arc(x,y,52*sc,0,Math.PI*2); ctx.stroke();
      // Hex pattern on shield
      for(let i=0;i<6;i++){
        const ha=i*Math.PI/3; ctx.strokeStyle='rgba(180,240,255,0.3)'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+Math.cos(ha)*48*sc,y+Math.sin(ha)*48*sc); ctx.stroke();
      }
      ctx.shadowBlur=0; ctx.restore();
      drawHPBar(x,y-this.radius*this.scale/1.4-32,shPct,70);
      ctx.fillStyle='#88ddff'; ctx.font='7px Courier New'; ctx.textAlign='center';
      ctx.fillText('ESCUDO DE GELO',x,y-this.radius*this.scale/1.4-36); ctx.textAlign='left';
    }

    // ── Corpo NOVO: sprite pixel-art (reformulado do zero) ──
    const bob=Math.sin(t*0.0035+this.phase)*3;
    const px=Math.max(3,Math.round(4.6*sc));
    const frame=(Math.floor(t/260)%2)?FROST_BODY[1]:FROST_BODY[0];
    drawBossGrid(frame, PAL_BOSS_FROST, x, y+bob-2*sc, px);
    // Núcleo de gelo pulsante no peito
    const coreG=ctx.createRadialGradient(x,y+bob+1*sc,2,x,y+bob+1*sc,9*sc);
    coreG.addColorStop(0,`rgba(120,235,255,${0.55*iceGlow})`);
    coreG.addColorStop(1,'rgba(60,140,220,0)');
    ctx.fillStyle=coreG; ctx.beginPath(); ctx.arc(x,y+bob+1*sc,9*sc,0,Math.PI*2); ctx.fill();
    // Cristais flutuando nos ombros
    for(let k2=0;k2<2;k2++){
      const kx2=x+(k2?1:-1)*13*sc, ky2=y+bob-9*sc+Math.sin(t*0.005+k2*2)*2.5;
      ctx.fillStyle=`rgba(160,235,255,${0.6+0.3*Math.sin(t*0.006+k2)})`;
      ctx.beginPath(); ctx.moveTo(kx2,ky2-5*sc); ctx.lineTo(kx2-2.4*sc,ky2); ctx.lineTo(kx2,ky2+5*sc); ctx.lineTo(kx2+2.4*sc,ky2); ctx.closePath(); ctx.fill();
    }
    // Respiração congelante
    for(let f2=0;f2<4;f2++){
      const fp=((t*0.0006)+f2*0.25)%1;
      ctx.globalAlpha=(1-fp)*0.28;
      ctx.fillStyle='#cfeeff';
      ctx.beginPath(); ctx.arc(x+(f2%2?6:-6)*sc*fp*2, y+bob-4*sc+fp*16, 1.8+fp*3.2, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
    if(this.flashTimer>0){ ctx.save(); ctx.globalAlpha=this.flashTimer/100*0.5; ctx.fillStyle='#aaddff'; ctx.beginPath(); ctx.arc(x,y,this.radius,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    drawHPBar(x,y-this.radius*this.scale/1.4-18,this.hp/this.maxHp,98);
    ctx.fillStyle='#88ddff'; ctx.font='bold 9px Courier New'; ctx.textAlign='center';
    ctx.fillText('❄ GIGANTE DE GELO',x,y-this.radius*this.scale/1.4-22); ctx.textAlign='left';
  }
}

// ═══════════════════════════════════════════════════════
// BOSS: SANDWORM ABISSAL (Onda 20)
// ═══════════════════════════════════════════════════════
const PAL_DEVOURER={
  'X':'#130b05','D':'#321609','B':'#6b2d08','O':'#b85c08',
  'G':'#e99b05','Y':'#ffd22b','H':'#fff09a','W':'#fff3c2',
  'R':'#4b0805','r':'#9e170a','T':'#d8a26b','A':'#477900',
  'a':'#91d51c','L':'#d8ff39'
};
const DEVOURER_W=42,DEVOURER_H=34;
function devGrid(){return Array.from({length:DEVOURER_H},()=>Array(DEVOURER_W).fill(' '));}
function devPixel(g,x,y,ch){if(y>=0&&y<g.length&&x>=0&&x<g[0].length)g[y][x]=ch;}
function devCircle(g,cx,cy,rx,ry,ch){
  for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){
    if(((x-cx)*(x-cx))/(rx*rx)+((y-cy)*(y-cy))/(ry*ry)<=1)devPixel(g,x,y,ch);
  }
}
function devLine(g,x0,y0,x1,y1,ch,w=1){
  const dx=x1-x0,dy=y1-y0,n=Math.max(Math.abs(dx),Math.abs(dy),1);
  for(let i=0;i<=n;i++){
    const x=Math.round(x0+dx*i/n),y=Math.round(y0+dy*i/n);
    for(let oy=-w;oy<=w;oy++)for(let ox=-w;ox<=w;ox++)devPixel(g,x+ox,y+oy,ch);
  }
}
function makeDevourerIcon(frame=0){
  const g=devGrid(),bob=frame===1?1:0;
  // Cauda curvada e segmentada, como a referência.
  [[8,8,6,5],[14,6,6,5],[20,7,6,5],[26,10,6,5],[29,15,6,5]].forEach(([x,y,rx,ry],i)=>{
    devCircle(g,x,y+bob,rx+1,ry+1,'X');devCircle(g,x,y+bob,rx,ry,i%2?'G':'O');
    devCircle(g,x-1,y-1+bob,rx-2,Math.max(1,ry-2),'Y');
    devPixel(g,x-1,y-2+bob,'H');
    devLine(g,x+rx-1,y-ry+1+bob,x+rx+1,y+ry-1+bob,'D',0);
  });
  // Espinhos dorsais.
  [[7,3],[14,1],[21,2],[27,5],[31,10]].forEach(([x,y])=>{
    devLine(g,x,y+bob,x,y-3+bob,'X',1);devLine(g,x,y-1+bob,x,y-3+bob,'T',0);
  });
  // Cabeça frontal, anel dourado e boca circular.
  devCircle(g,21,23+bob,14,11,'X');devCircle(g,21,22+bob,13,11,'B');
  devCircle(g,21,22+bob,12,10,'G');devCircle(g,21,22+bob,9,8,'W');
  devCircle(g,21,22+bob,7,7,'R');devCircle(g,21,22+bob,5,5,'X');
  // Duas presas laterais.
  devLine(g,10,20+bob,7,26+bob,'W',1);devLine(g,32,20+bob,35,26+bob,'W',1);
  // Coroa de dentes.
  for(let i=0;i<12;i++){
    const a=i*Math.PI*2/12,x=Math.round(21+Math.cos(a)*7),y=Math.round(22+bob+Math.sin(a)*6);
    devPixel(g,x,y,'W');
    devPixel(g,Math.round(21+Math.cos(a)*5.5),Math.round(22+bob+Math.sin(a)*4.5),'T');
  }
  // Baba ácida.
  devPixel(g,15,30+bob,'A');devPixel(g,16,31+bob,'a');devPixel(g,27,30+bob,'A');devPixel(g,26,31+bob,'L');
  return g.map(row=>row.join(''));
}
const DEVOURER_ICON=[makeDevourerIcon(0),makeDevourerIcon(1),makeDevourerIcon(0)];

function devGridSize(w,h){return Array.from({length:h},()=>Array(w).fill(' '));}
function devRect(g,x,y,w,h,ch){
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)devPixel(g,xx,yy,ch);
}
function makeDevourerHeadFrame(frame=0){
  const g=devGridSize(34,30),cx=17,cy=16+(frame===1?1:0);
  // Cabeca blindada frontal, com o mesmo anel dourado e a boca da referencia.
  devCircle(g,cx,cy,15,12,'X');devCircle(g,cx,cy,14,11,'B');
  devCircle(g,cx,cy-1,13,10,'G');devCircle(g,cx-1,cy-2,11,8,'Y');
  devRect(g,8,cy-8,7,2,'H');devRect(g,19,cy-7,5,2,'H');
  // Cavidade e gengiva acompanham o ciclo de mordida.
  const mouthRy=frame===1?8:7;
  devCircle(g,cx,cy+1,10,mouthRy+1,'X');devCircle(g,cx,cy+1,9,mouthRy,'r');
  devCircle(g,cx,cy+2,6,Math.max(4,mouthRy-2),'R');devCircle(g,cx,cy+2,4,Math.max(3,mouthRy-3),'X');
  for(let i=0;i<12;i++){
    const a=i*Math.PI*2/12,r=8.1;
    const tx=Math.round(cx+Math.cos(a)*r),ty=Math.round(cy+1+Math.sin(a)*(mouthRy-1));
    devPixel(g,tx,ty,'W');
    devPixel(g,Math.round(cx+Math.cos(a)*6.2),Math.round(cy+1+Math.sin(a)*(mouthRy-2)),'T');
  }
  // Presas laterais e baba acida oscilante.
  devLine(g,6,cy-2,3,cy+6,'X',1);devLine(g,6,cy-2,4,cy+5,'W',0);
  devLine(g,28,cy-2,31,cy+6,'X',1);devLine(g,28,cy-2,30,cy+5,'W',0);
  devRect(g,9,cy+8,3,2,'A');devRect(g,22,cy+8,3,2,'A');
  devRect(g,10,cy+10,2,frame===1?4:2,'a');devRect(g,23,cy+10,2,frame===1?2:4,'L');
  return g.map(row=>row.join(''));
}
function makeDevourerSegmentFrame(frame=0){
  const g=devGridSize(20,18),cx=10,cy=11+(frame===1?1:0);
  devCircle(g,cx,cy,9,6,'X');devCircle(g,cx,cy,8,5,'O');
  devCircle(g,cx-1,cy-1,7,4,'G');devCircle(g,cx-2,cy-2,5,2,'Y');
  devRect(g,4+(frame===2?1:0),cy-4,5,2,'H');
  devRect(g,15,cy-4,2,8,'B');devRect(g,16,cy-3,1,6,'D');
  // Espinho dorsal articulado.
  devLine(g,9,cy-5,10+(frame===1?1:-1),1,'X',1);
  devLine(g,10,cy-6,10+(frame===1?1:-1),2,'T',0);
  return g.map(row=>row.join(''));
}
const DEVOURER_HEAD_FRAMES=[
  makeDevourerHeadFrame(0),makeDevourerHeadFrame(1),makeDevourerHeadFrame(2)
];
const DEVOURER_SEGMENT_FRAMES=[
  makeDevourerSegmentFrame(0),makeDevourerSegmentFrame(1),makeDevourerSegmentFrame(2)
];

function drawDevourerSpriteCentered(sprite,x,y,scale=1,angle=0,flipX=false){
  const rows=sprite.length,cols=sprite[0].length,ps=Math.max(1,Math.round(PX*scale));
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(angle);
  const offX=Math.round(-cols*ps/2),offY=Math.round(-rows*ps/2);
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const ch=sprite[r][flipX?cols-1-c:c],color=PAL_DEVOURER[ch];
    if(!color)continue;
    ctx.fillStyle=color;ctx.fillRect(offX+c*ps,offY+r*ps,ps,ps);
  }
  ctx.restore();
}

function drawDevourerAcidPuddle(ap,t){
  const wobble=Math.round(Math.sin(t*0.006+ap.x*0.02)*2);
  ctx.save();ctx.translate(Math.round(ap.x),Math.round(ap.y));ctx.globalAlpha=0.9;
  const bands=[.48,.78,.94,1,.94,.76,.45];
  for(let y=0;y<bands.length;y++){
    const span=Math.round((ap.r+5)*bands[y]/4)*4;
    ctx.fillStyle='#142000';ctx.fillRect(-span,-12+y*4,span*2,5);
  }
  for(let y=0;y<bands.length-1;y++){
    const span=Math.round((ap.r-3)*bands[y]/4)*4;
    ctx.fillStyle=y<2?'#91d51c':'#477900';ctx.fillRect(-span,-10+y*4,span*2,4);
  }
  ctx.fillStyle='#d8ff39';ctx.fillRect(-ap.r*.45,-8,13,4);ctx.fillRect(-ap.r*.28,-12,5,4);
  for(let i=0;i<4;i++){
    const bx=-ap.r*0.55+i*ap.r*0.37,by=-5-Math.abs(Math.sin(t*0.008+i))*8;
    ctx.fillStyle=i%2?'#d8ff39':'#73b80d';ctx.fillRect(Math.round(bx/4)*4,Math.round((by+wobble)/4)*4,5,5);
  }
  ctx.restore();
}
function drawDevourerSinkhole(sh,t){
  ctx.save();ctx.translate(Math.round(sh.x),Math.round(sh.y));
  const vr=Math.min(132,(sh.range||300)*0.42),bands=[.36,.66,.86,.97,1,.97,.86,.66,.36];
  for(let y=0;y<bands.length;y++){
    const span=Math.round(vr*bands[y]/5)*5;
    ctx.fillStyle=y===4?'#120803':'rgba(28,13,5,.84)';
    ctx.fillRect(-span,-20+y*5,span*2,6);
  }
  for(let a=0;a<Math.PI*5.3;a+=0.16){
    const r=5+a*(vr/17),x=Math.round(Math.cos(a+t*0.0018)*r/5)*5,y=Math.round(Math.sin(a+t*0.0018)*r*.42/5)*5;
    ctx.fillStyle=a%0.7<0.35?'#a06b2b':'#5d3516';ctx.fillRect(x-4,y-3,9,6);
  }
  // Espinhos de pedra que surgem no fim do redemoinho.
  const strength=Math.max(0,Math.min(1,(3200-sh.timer)/1000));
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4+t*0.0002,r=vr*.64+12*(i%2),x=Math.round(Math.cos(a)*r/4)*4,y=Math.round(Math.sin(a)*r*.43/4)*4;
    const h=Math.round((8+17*strength)/4)*4;
    ctx.fillStyle='#1c0d06';ctx.fillRect(x-7,y-h,14,h+6);
    ctx.fillStyle='#8c5423';ctx.fillRect(x-3,y-h+4,6,h-2);
  }
  ctx.restore();
}
function drawDevourerBoss(b,t){
  for(const ap of b.acidPuddles)drawDevourerAcidPuddle(ap,t);
  if(b.sinkhole)drawDevourerSinkhole(b.sinkhole,t);
  for(const shot of b.acidShots||[]){
    ctx.save();ctx.translate(Math.round(shot.x),Math.round(shot.y));
    ctx.fillStyle='#142000';ctx.fillRect(-10,-8,20,16);
    ctx.fillStyle='#477900';ctx.fillRect(-7,-6,14,12);
    ctx.fillStyle='#91d51c';ctx.fillRect(-5,-5,8,8);
    ctx.fillStyle='#d8ff39';ctx.fillRect(-3,-4,4,4);
    const a=Math.atan2(shot.vy,shot.vx);ctx.rotate(a);ctx.globalAlpha=.55;
    for(let i=1;i<=3;i++){ctx.fillStyle=i%2?'#91d51c':'#477900';ctx.fillRect(-10-i*8,-2+(i%2)*3,6,5);}
    ctx.restore();
  }
  const diving=b.diveState==='diving',frame=b.frameIdx%DEVOURER_HEAD_FRAMES.length;
  const dirX=diving?b.diveVx:(b.bodySegments[1]?b.x-b.bodySegments[1].x:1);
  const dirY=diving?b.diveVy:(b.bodySegments[1]?b.y-b.bodySegments[1].y:0);
  const heading=Math.atan2(dirY,dirX),waveAmp=diving?7:4;
  if(diving){
    ctx.save();ctx.globalAlpha=.64;
    const nx=Math.cos(heading),ny=Math.sin(heading),px=-ny,py=nx;
    for(let i=1;i<=7;i++){
      const bx=b.x-nx*(45+i*15),by=b.y-ny*(45+i*15),side=(i%3-1)*12;
      ctx.fillStyle=i%2?'#ffd22b':'#b85c08';
      ctx.fillRect(Math.round(bx+px*side)-10,Math.round(by+py*side)-2,20,4);
    }
    ctx.restore();
  }
  // Sombra acompanha todo o corpo para que nenhum segmento pareça flutuar.
  ctx.save();ctx.globalAlpha=.32;ctx.fillStyle='#000';
  for(let i=b.bodySegments.length-1;i>=0;i--){
    const seg=b.bodySegments[i],tail=1-i/(b.bodySegments.length+2);
    ctx.fillRect(Math.round(seg.x-24*tail),Math.round(seg.y+24),Math.round(48*tail),7);
  }
  ctx.restore();
  // Corpo articulado: cada placa segue a anterior e ainda ondula perpendicularmente.
  for(let i=b.bodySegments.length-1;i>=1;i--){
    const seg=b.bodySegments[i],prev=b.bodySegments[i-1];
    const a=Math.atan2(prev.y-seg.y,prev.x-seg.x),wave=Math.sin(t*(diving?.014:.009)-i*.86+b.phase)*waveAmp;
    const sx=seg.x-Math.sin(a)*wave,sy=seg.y+Math.cos(a)*wave;
    const taper=Math.max(.68,1.08-i*.047),segFrame=(frame+i)%DEVOURER_SEGMENT_FRAMES.length;
    drawDevourerSpriteCentered(DEVOURER_SEGMENT_FRAMES[segFrame],sx,sy,taper,a,Math.cos(a)<0);
  }
  // A cabeca mastiga e balanca; no dash todo o conjunto inclina na direcao da investida.
  const headBob=diving?Math.sin(t*.022+b.phase)*3:Math.sin(t*.008+b.phase)*2;
  const headAngle=diving?Math.max(-.28,Math.min(.28,heading*.18)):Math.sin(t*.006+b.phase)*.045;
  drawDevourerSpriteCentered(DEVOURER_HEAD_FRAMES[frame],b.x,b.y+headBob,diving?1.45:1.5,headAngle,dirX<0);
  if(b.flashTimer>0){ctx.save();ctx.globalAlpha=b.flashTimer/100*.55;ctx.fillStyle='#fff09a';ctx.beginPath();ctx.arc(b.x,b.y,44,0,Math.PI*2);ctx.fill();ctx.restore();}
  const spriteTop=Math.min(b.y-48,...b.bodySegments.map(seg=>seg.y-35));
  drawHPBar(b.x,spriteTop-15,b.hp/b.maxHp,104);
  ctx.fillStyle='#ffd22b';ctx.font='bold 9px Courier New';ctx.textAlign='center';
  ctx.fillText('VERME DEVORADOR',b.x,spriteTop-20);ctx.textAlign='left';
}

class BossSandworm {
  constructor(wave){
    this.x=W/2; this.y=H/2; this.wave=wave;
    this.hp=2200+wave*205; this.maxHp=this.hp; // BALANCE v5
    this.speed=30+wave*1; this.damage=42+wave*4;
    this.radius=44; this.xpVal=160+wave*25;
    this.dead=false; this.frameIdx=0; this.frameTick=0;
    this.scale=1.75; this.phase=Math.random()*Math.PI*2;
    this.flashTimer=0; this.type='boss_sandworm';
    this.sinkholeCd=10000; this.sinkholeTimer=6000; this.sinkhole=null; this.sinkholeRange=300;
    this.acidCd=8000; this.acidTimer=4000; this.acidPuddles=[];
    this.acidSpitCd=4500;this.acidSpitTimer=2500;this.acidShots=[];
    this.diveCd=10000; this.diveTimer=5000;this.diveDamageMult=0.5;this.diveHitPlayers=new Set();
    this.diveState='ground'; this.diveCount=0; this.diveTargets=[];this.divePassTimer=0;
    this.diveVx=0; this.diveVy=0;
    this.bodySegments=[];
    for(let i=0;i<9;i++) this.bodySegments.push({x:this.x-i*20,y:this.y});
  }
  update(dt,px,py){
    if(this.hp<=0){ this.dead=true; this._dropLoot(); return; }
    // Cuspe ácido não teleguiado. Ao atingir ou perder força, vira uma poça temporária.
    for(const shot of this.acidShots){
      shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.life-=dt*1000;
      let impact=shot.life<=0||shot.x<-20||shot.x>W+20||shot.y<185||shot.y>H+20;
      const allPl=[player,...(gameMode===2&&player2&&!player2.dead?[player2]:[])].filter(p=>!p.dead);
      for(const pl of allPl){
        if(!impact&&Math.hypot(pl.x-shot.x,pl.y-shot.y)<pl.radius+shot.r){
          pl.takeDmg(this.damage*0.35);impact=true;
        }
      }
      if(impact&&!shot.dead){
        shot.dead=true;this.acidPuddles.push({x:shot.x,y:shot.y,r:28,timer:4200,toxic:true,acid:true});
        spawnParts(shot.x,shot.y,'#91d51c',10,42);
      }
    }
    this.acidShots=this.acidShots.filter(shot=>!shot.dead);
    // Dive state
    if(this.diveState==='diving'){
      this.x+=this.diveVx*dt; this.y+=this.diveVy*dt;
      this.divePassTimer-=dt*1000;
      if(this.divePassTimer<=0||this.x<-80||this.x>W+80||this.y<160||this.y>H+80){
        this.diveCount--;
        if(this.diveCount>0){
          const allPl=[player,...(gameMode===2&&player2&&!player2.dead?[player2]:[])].filter(p=>!p.dead);
          const tgt=allPl[Math.floor(Math.random()*allPl.length)]||{x:W/2,y:H/2};
          this._beginDivePass(tgt,true);
        }
        else {
          const lastAngle=Math.atan2(this.diveVy,this.diveVx);
          this.diveState='ground'; this.x=Math.max(44,Math.min(W-44,this.x)); this.y=Math.max(210,Math.min(H-44,this.y));
          this._resetBodyTrail(lastAngle);
        }
      }
      // Damage player if close during dive
      const allPl=[player,...(gameMode===2&&player2&&!player2.dead?[player2]:[])].filter(p=>!p.dead);
      for(const pl of allPl){
        const key=pl===player2?'p2':'p1';
        if(!this.diveHitPlayers.has(key)&&Math.hypot(pl.x-this.x,pl.y-this.y)<this.radius+pl.radius){
          this.diveHitPlayers.add(key);pl.takeDmg(this.damage*this.diveDamageMult);spawnParts(this.x,this.y,'#c8a840',8,50);
        }
      }
      this._updateBodyTrail(dt);
      this.frameTick+=dt*1000; if(this.frameTick>100){this.frameTick=0;this.frameIdx=(this.frameIdx+1)%3;}
      return;
    }
    // Normal movement
    const dx=px-this.x, dy=py-this.y, d=Math.hypot(dx,dy);
    if(d>1){ this.x+=(dx/d)*this.speed*dt; this.y+=(dy/d)*this.speed*dt; }
    this.x=Math.max(44,Math.min(W-44,this.x)); this.y=Math.max(210,Math.min(H-44,this.y));
    // Sinkhole
    this.sinkholeTimer-=dt*1000;
    if(this.sinkholeTimer<=0){ this.sinkholeTimer=this.sinkholeCd; this.sinkhole={x:W/2,y:H/2,power:40,timer:3200,range:this.sinkholeRange}; spawnLevelUpNotice(W/2,H/2-50,'🌀 SUMIDOURO!',0); }
    if(this.sinkhole){
      this.sinkhole.timer-=dt*1000;
      const allPl=[player,...(gameMode===2&&player2&&!player2.dead?[player2]:[])].filter(p=>!p.dead);
      for(const pl of allPl){
        const sd=Math.hypot(pl.x-this.sinkhole.x,pl.y-this.sinkhole.y);
        if(sd<this.sinkholeRange){ const ang=Math.atan2(this.sinkhole.y-pl.y,this.sinkhole.x-pl.x),knock=getCampaignShopKnockbackMultiplier(pl); pl.x+=Math.cos(ang)*this.sinkhole.power*dt*knock; pl.y+=Math.sin(ang)*this.sinkhole.power*dt*knock; if(sd<40) pl.takeDmg(this.damage*0.08); }
      }
      if(this.sinkhole.timer<=0) this.sinkhole=null;
    }
    // Acid puddles
    this.acidTimer-=dt*1000;
    if(this.acidTimer<=0){ this.acidTimer=this.acidCd; for(let i=0;i<3;i++){ this.acidPuddles.push({x:100+Math.random()*(W-200),y:230+Math.random()*(H-260),r:35,timer:5200,toxic:true,acid:true}); } spawnLevelUpNotice(this.x,this.y-60,'☠ CHUVA ÁCIDA!',0); }
    for(const ap of this.acidPuddles){
      ap.timer-=dt*1000;
      const allPl=[player,...(gameMode===2&&player2&&!player2.dead?[player2]:[])].filter(p=>!p.dead);
      for(const pl of allPl) if(Math.hypot(pl.x-ap.x,pl.y-ap.y)<ap.r+pl.radius){ pl.takeDmg(this.damage*0.012); }
    }
    this.acidPuddles=this.acidPuddles.filter(ap=>ap.timer>0);
    // Cuspe ácido adicional entre as chuvas.
    this.acidSpitTimer-=dt*1000;
    if(this.acidSpitTimer<=0){
      this.acidSpitTimer=this.acidSpitCd;
      const a=Math.atan2(py-this.y,px-this.x),speed=285;
      this.acidShots.push({x:this.x,y:this.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:10,life:2400,dead:false});
      spawnLevelUpNotice(this.x,this.y-55,'CUSPE ÁCIDO!',0);
    }
    // Triple dive
    this.diveTimer-=dt*1000;
    if(this.diveTimer<=0&&this.diveState==='ground'){
      this.diveTimer=this.diveCd;this.diveCount=3;this.diveHitPlayers.clear();
      const allPl=[player,...(gameMode===2&&player2&&!player2.dead?[player2]:[])].filter(p=>!p.dead);
      this.diveTargets=allPl.map(p=>({x:p.x,y:p.y}));
      this.diveState='diving';this._beginDivePass(this.diveTargets.shift()||{x:px,y:py},false);
      spawnLevelUpNotice(this.x,this.y-60,'🌊 MERGULHO TRIPLO!',0);
    }
    this._updateBodyTrail(dt);
    this.frameTick+=dt*1000; if(this.frameTick>140){this.frameTick=0;this.frameIdx=(this.frameIdx+1)%3;}
    if(this.flashTimer>0) this.flashTimer-=dt*1000;
  }
  _updateBodyTrail(dt){
    if(!this.bodySegments.length)return;
    this.bodySegments[0].x=this.x;this.bodySegments[0].y=this.y;
    const follow=Math.min(1,dt*(this.diveState==='diving'?24:15)),spacing=20;
    for(let i=1;i<this.bodySegments.length;i++){
      const prev=this.bodySegments[i-1],cur=this.bodySegments[i];
      const dx=prev.x-cur.x,dy=prev.y-cur.y,d=Math.hypot(dx,dy)||1;
      const tx=prev.x-dx/d*spacing,ty=prev.y-dy/d*spacing;
      cur.x+=(tx-cur.x)*follow;cur.y+=(ty-cur.y)*follow;
    }
  }
  _resetBodyTrail(angle=0){
    const spacing=20,nx=Math.cos(angle),ny=Math.sin(angle);
    for(let i=0;i<this.bodySegments.length;i++){
      this.bodySegments[i].x=this.x-nx*spacing*i;
      this.bodySegments[i].y=this.y-ny*spacing*i;
    }
  }
  _beginDivePass(target,respawn){
    if(respawn){
      const fromLeft=Math.random()<.5;
      this.x=fromLeft?-70:W+70;
      this.y=Math.max(220,Math.min(H-50,target.y+(Math.random()-.5)*80));
    }
    const angle=Math.atan2(target.y-this.y,target.x-this.x);
    this.diveVx=Math.cos(angle)*650;this.diveVy=Math.sin(angle)*650;
    this.divePassTimer=1400;this._resetBodyTrail(angle);
  }
  takeDmg(a){ this.hp-=a; this.flashTimer=100; spawnParts(this.x,this.y,'#c8a840',4,35); }
  _dropLoot(){ kills+=12; for(let i=0;i<14;i++) spawnCoin(this.x+(Math.random()-0.5)*80,this.y+(Math.random()-0.5)*45,Math.floor(this.xpVal/14)); const bl=['semente_erva','pedra','madeira','semente_tomate']; for(let bi=0;bi<7;bi++){const it=bl[Math.floor(Math.random()*bl.length)];globalInventory[it]=(globalInventory[it]||0)+1;spawnLootFlyAnim(this.x+(Math.random()-0.5)*50,this.y,it);} showInvNotif('Verme Devorador derrotado! +7 itens!'); savePersistentData(); spawnParts(this.x,this.y,'#c8a840',30,110); triggerScreenShake(22,650); }
  draw(t){
    drawDevourerBoss(this,t);
    return;
    const x=this.x, y=this.y;
    const pulse=0.7+0.3*Math.sin(t*0.005+this.phase);

    // Acid puddles
    for(const ap of this.acidPuddles){
      ctx.save(); ctx.globalAlpha=0.6;
      const ag=ctx.createRadialGradient(ap.x,ap.y,0,ap.x,ap.y,ap.r);
      ag.addColorStop(0,'rgba(80,220,20,0.85)'); ag.addColorStop(0.6,'rgba(40,160,10,0.4)'); ag.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=ag; ctx.beginPath(); ctx.ellipse(ap.x,ap.y,ap.r,ap.r*0.55,0,0,Math.PI*2); ctx.fill();
      // Bubbles
      ctx.globalAlpha=0.5; ctx.fillStyle='#aeff44';
      for(let b=0;b<3;b++) ctx.beginPath(), ctx.arc(ap.x+(b-1)*8,ap.y-3+Math.sin(t*0.008+b)*3,3,0,Math.PI*2), ctx.fill();
      ctx.restore();
    }
    // Sinkhole
    if(this.sinkhole){
      ctx.save(); ctx.globalAlpha=0.5+0.2*Math.sin(t*0.01);
      for(let i=4;i>0;i--){ ctx.strokeStyle=`rgba(200,160,60,${0.28*i})`; ctx.lineWidth=i*2.5; ctx.beginPath(); ctx.arc(this.sinkhole.x,this.sinkhole.y,220-i*20,0,Math.PI*2); ctx.stroke(); }
      ctx.restore();
    }

    // Body segments — detailed armored worm
    for(let i=this.bodySegments.length-1;i>=0;i--){
      const seg=this.bodySegments[i];
      const segR=Math.max(7,20-i*1.4);
      const segPulse=0.85+0.15*Math.sin(t*0.006+i*0.4);
      // Segment shadow
      ctx.fillStyle='rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(seg.x+2,seg.y+3,segR*0.9,segR*0.55,0,0,Math.PI*2); ctx.fill();
      // Outer ring
      ctx.fillStyle=i%2===0?'#8a6010':'#aa7820';
      ctx.beginPath(); ctx.ellipse(seg.x,seg.y,segR,segR*0.7,0,0,Math.PI*2); ctx.fill();
      // Inner highlight
      ctx.fillStyle=i%2===0?'#bb9030':'#ddaa40';
      ctx.beginPath(); ctx.ellipse(seg.x-segR*0.15,seg.y-segR*0.15,segR*0.7,segR*0.5,0,0,Math.PI*2); ctx.fill();
      // Spine ridge
      ctx.fillStyle='#553008';
      ctx.beginPath(); ctx.ellipse(seg.x,seg.y-segR*0.35,segR*0.25,segR*0.18,0,0,Math.PI*2); ctx.fill();
      // Glow veins (acid inside)
      if(i%3===0){
        ctx.save(); ctx.globalAlpha=0.25*segPulse;
        ctx.fillStyle='#88ff22';
        ctx.beginPath(); ctx.ellipse(seg.x,seg.y,segR*0.4,segR*0.28,0,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
    }

    // Ground shadow for head
    ctx.fillStyle='rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(x+3,y+5,28,10,0,0,Math.PI*2); ctx.fill();

    // Outer aura — toxic green
    const hAura=ctx.createRadialGradient(x,y,8,x,y,60*pulse);
    hAura.addColorStop(0,'rgba(80,200,20,0.2)'); hAura.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=hAura; ctx.fillRect(x-65,y-65,130,130);

    // Head — massive armored mouth
    // Contorno escuro (coesão com o estilo novo)
    ctx.fillStyle='#2a1804';
    ctx.beginPath(); ctx.ellipse(x,y+8,22.5,16.5,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x,y-4,28.5,24.5,0,0,Math.PI*2); ctx.fill();
    // Neck
    ctx.fillStyle='#553008'; ctx.beginPath(); ctx.ellipse(x,y+8,20,14,0,0,Math.PI*2); ctx.fill();
    // Head body
    ctx.fillStyle='#8a6010'; ctx.beginPath(); ctx.ellipse(x,y-4,26,22,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#bb8820'; ctx.beginPath(); ctx.ellipse(x-2,y-6,22,19,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ddaa30'; ctx.beginPath(); ctx.ellipse(x-3,y-8,17,14,0,0,Math.PI*2); ctx.fill();
    // Armored plates on head
    for(let p2=0;p2<3;p2++){
      const pa=p2*0.7-0.7;
      ctx.fillStyle='#664410'; ctx.beginPath();
      ctx.ellipse(x+Math.cos(pa)*14,y-6+Math.sin(pa)*8,8,5,pa,0,Math.PI*2); ctx.fill();
    }
    // Toxic mandibles
    ctx.fillStyle='#336610';
    ctx.beginPath(); ctx.moveTo(x-12,y+4); ctx.lineTo(x-22,y+16); ctx.lineTo(x-8,y+10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+12,y+4); ctx.lineTo(x+22,y+16); ctx.lineTo(x+8,y+10); ctx.fill();
    ctx.fillStyle='#55aa20';
    ctx.beginPath(); ctx.moveTo(x-10,y+5); ctx.lineTo(x-18,y+14); ctx.lineTo(x-7,y+9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+10,y+5); ctx.lineTo(x+18,y+14); ctx.lineTo(x+7,y+9); ctx.fill();
    // Mandible tips (acid drip)
    ctx.fillStyle=`rgba(100,255,30,${0.7*pulse})`;
    ctx.beginPath(); ctx.arc(x-18,y+15,3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+18,y+15,3,0,Math.PI*2); ctx.fill();
    // Forehead ridge
    ctx.fillStyle='#553008';
    ctx.beginPath(); ctx.moveTo(x-10,y-18); ctx.lineTo(x,y-26); ctx.lineTo(x+10,y-18); ctx.fill();
    ctx.fillStyle='#664010';
    ctx.beginPath(); ctx.moveTo(x-7,y-18); ctx.lineTo(x,y-23); ctx.lineTo(x+7,y-18); ctx.fill();
    // Eyes — glowing red
    [[x-9,y-10],[x+9,y-10]].forEach(([ex,ey])=>{
      const eg=ctx.createRadialGradient(ex,ey,0,ex,ey,7);
      eg.addColorStop(0,'rgba(255,50,0,0.95)'); eg.addColorStop(0.5,'rgba(200,30,0,0.6)'); eg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(ex,ey,7,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ffaa00'; ctx.beginPath(); ctx.arc(ex,ey,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(ex-1,ey-1,1.5,0,Math.PI*2); ctx.fill();
    });
    // Acid drip from mouth
    for(let d=0;d<3;d++){
      const da=(((t*0.04)+d*30)%40)/40;
      ctx.save(); ctx.globalAlpha=(1-da)*0.8;
      ctx.fillStyle='#88ff22';
      ctx.beginPath(); ctx.arc(x+(d-1)*8,y+8+da*12,2.5,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    if(this.flashTimer>0){ ctx.save(); ctx.globalAlpha=this.flashTimer/100*0.5; ctx.fillStyle='#88ff44'; ctx.beginPath(); ctx.arc(x,y,this.radius,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    drawHPBar(x,y-this.radius*1.8-18,this.hp/this.maxHp,100);
    ctx.fillStyle='#aeff44'; ctx.font='bold 9px Courier New'; ctx.textAlign='center';
    ctx.fillText('🪱 VERME DEVORADOR',x,y-this.radius*1.8-22); ctx.textAlign='left';
  }
}

// ═══════════════════════════════════════════════════════
// BOSS: BALROG (Onda 25) — Arauto das Cinzas
// ═══════════════════════════════════════════════════════
class BossBalrog {
  constructor(wave){
    this.x=W/2; this.y=260; this.wave=wave;
    this.hp=3500+wave*260; this.maxHp=this.hp; // BALANCE v5
    this.speed=22+wave*0.8; this.damage=50+wave*5;
    this.radius=50; this.xpVal=220+wave*30;
    this.dead=false; this.frameIdx=0; this.frameTick=0;
    this.scale=3; this.phase=Math.random()*Math.PI*2;
    this.flashTimer=0; this.type='boss_balrog';
    this.whipCd=5000; this.whipTimer=3000; this.whipAnim=0; this.whipSide=1;
    this.meteorCd=10000; this.meteorTimer=6000; this.meteors=[];
    this.phase2=false; this.fireTrail=[];
    this.wingAnim=0; this.roarTimer=0;
    this.isMoving=false; this.facing=1; this.facingY=1;
    this.moveDx=0; this.moveDy=0;
  }
  update(dt,px,py){
    if(this.hp<=0){ this.dead=true; this._dropLoot(); return; }
    // Phase 2 trigger at 30% HP
    if(!this.phase2&&this.hp<this.maxHp*0.3){
      this.phase2=true; this.speed*=2; spawnLevelUpNotice(W/2,H/2-40,'💥 FÚRIA DESPERTA!',0); spawnParts(this.x,this.y,'#ff4400',25,100); this.roarTimer=800;
    }
    // Move
    const dx=px-this.x, dy=py-this.y, d=Math.hypot(dx,dy);
    this.isMoving=d>3;
    this.moveDx=dx; this.moveDy=dy;
    if(d>1){
      this.x+=(dx/d)*this.speed*dt; this.y+=(dy/d)*this.speed*dt;
      if(Math.abs(dx)>2)this.facing=dx<0?-1:1;
      if(Math.abs(dy)>2)this.facingY=dy<0?-1:1;
    }
    this.x=Math.max(50,Math.min(W-50,this.x)); this.y=Math.max(215,Math.min(H-50,this.y));
    // Fire trail in phase 2
    if(this.phase2){ this.fireTrail.push({x:this.x,y:this.y,timer:3000}); }
    for(const ft of this.fireTrail){ ft.timer-=dt*1000; const allPl=[player,...(gameMode===2&&player2&&!player2.dead?[player2]:[])].filter(p=>!p.dead); for(const pl of allPl) if(Math.hypot(pl.x-ft.x,pl.y-ft.y)<28) pl.takeDmg(this.damage*0.012); }
    this.fireTrail=this.fireTrail.filter(ft=>ft.timer>0);
    // Whip attack
    this.whipTimer-=dt*1000;
    if(this.whipTimer<=0){ this.whipTimer=this.whipCd; this.whipAnim=600; this.whipSide=px<this.x?1:-1; const sweepX=this.x+this.whipSide*W*0.5; const allPl=[player,...(gameMode===2&&player2&&!player2.dead?[player2]:[])].filter(p=>!p.dead); for(const pl of allPl){ if((this.whipSide===1&&pl.x>this.x-50)||(this.whipSide===-1&&pl.x<this.x+50)) { if(Math.abs(pl.y-this.y)<110) pl.takeDmg(this.damage*1.5); } } spawnLevelUpNotice(this.x,this.y-60,'🔥 CHICOTE INFERNAL!',0); spawnParts(this.x+this.whipSide*150,this.y,'#ff4400',15,70); }
    if(this.whipAnim>0) this.whipAnim-=dt*1000;
    // Meteor
    this.meteorTimer-=dt*1000;
    if(this.meteorTimer<=0){ this.meteorTimer=this.meteorCd; spawnLevelUpNotice(this.x,this.y-60,'☄ METEORO!',0); for(let i=0;i<5;i++) this.meteors.push({x:80+Math.random()*(W-160),y:230+Math.random()*(H-270),warnTimer:2000,active:false}); }
    for(const m of this.meteors){ m.warnTimer-=dt*1000; if(m.warnTimer<=0&&!m.active){ m.active=true; spawnParts(m.x,m.y,'#ff4400',20,80); const allPl=[player,...(gameMode===2&&player2&&!player2.dead?[player2]:[])].filter(p=>!p.dead); for(const pl of allPl) if(Math.hypot(pl.x-m.x,pl.y-m.y)<70) pl.takeDmg(this.damage*1.8); } }
    this.meteors=this.meteors.filter(m=>!(m.active&&m.warnTimer<-500));
    this.wingAnim+=dt*3; if(this.roarTimer>0) this.roarTimer-=dt*1000;
    this.frameTick+=dt*1000; if(this.frameTick>150){this.frameTick=0;this.frameIdx=(this.frameIdx+1)%3;}
    if(this.flashTimer>0) this.flashTimer-=dt*1000;
  }
  takeDmg(a){ this.hp-=a; this.flashTimer=120; spawnParts(this.x,this.y,'#ff4400',5,40); }
  _dropLoot(){ kills+=20; for(let i=0;i<18;i++) spawnCoin(this.x+(Math.random()-0.5)*100,this.y+(Math.random()-0.5)*55,Math.floor(this.xpVal/18)); const bl=['semente_erva','pedra','madeira','semente_tomate','semente_trigo']; for(let bi=0;bi<10;bi++){const it=bl[Math.floor(Math.random()*bl.length)];globalInventory[it]=(globalInventory[it]||0)+1;spawnLootFlyAnim(this.x+(Math.random()-0.5)*60,this.y,it);} showInvNotif('BALROG DERROTADO! +10 itens!'); savePersistentData(); spawnParts(this.x,this.y,'#ff4400',40,120); spawnParts(this.x,this.y,'#ffcc00',20,80); triggerScreenShake(28, 800); }
  draw(t){
    const x=this.x, y=this.y;
    const glow=0.7+0.3*Math.sin(t*0.006+this.phase);
    const ws=Math.sin(this.wingAnim);

    // Fire trail
    for(const ft of this.fireTrail){
      const a=ft.timer/3000;
      ctx.save(); ctx.globalAlpha=a*0.65;
      const fg=ctx.createRadialGradient(ft.x,ft.y,0,ft.x,ft.y,26);
      fg.addColorStop(0,'rgba(255,120,0,0.9)'); fg.addColorStop(0.5,'rgba(200,40,0,0.4)'); fg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=fg; ctx.fillRect(ft.x-28,ft.y-28,56,56);
      ctx.restore();
    }
    // Meteor warnings
    for(const m of this.meteors){
      if(!m.active){
        const p2=1-m.warnTimer/2000;
        ctx.save(); ctx.globalAlpha=0.3+0.4*p2;
        ctx.strokeStyle='#ff2200'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(m.x,m.y,70,0,Math.PI*2); ctx.stroke();
        ctx.globalAlpha=p2*0.18; ctx.fillStyle='#ff4400';
        ctx.beginPath(); ctx.arc(m.x,m.y,70,0,Math.PI*2); ctx.fill();
        ctx.restore();
      } else {
        const impact=Math.max(0,Math.min(1,-m.warnTimer/500));
        ctx.save();
        ctx.globalAlpha=1-impact*.7;
        // Coluna pixelada do meteoro e núcleo em brasa.
        for(let i=0;i<6;i++){
          const yy=m.y-82+i*11+impact*64;
          ctx.fillStyle=i<2?'#ffe06a':i<4?'#ff8e24':'#c72a0b';
          ctx.fillRect(Math.round((m.x+(i%2?4:-5))/4)*4,Math.round(yy/4)*4,8,12);
        }
        ctx.fillStyle='#080403';ctx.fillRect(m.x-12,m.y-12,24,24);
        ctx.fillStyle='#6b2b18';ctx.fillRect(m.x-9,m.y-9,18,18);
        ctx.fillStyle='#ff6411';ctx.fillRect(m.x-5,m.y-7,9,9);
        ctx.strokeStyle='#ff8e24';ctx.lineWidth=5+impact*8;
        ctx.beginPath();ctx.arc(m.x,m.y,18+impact*52,0,Math.PI*2);ctx.stroke();
        ctx.restore();
      }
    }

    // Ground shadow
    ctx.fillStyle='rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(x,y+this.radius*0.75,this.radius*1.7,this.radius*0.44,0,0,Math.PI*2); ctx.fill();

    // Outer fire aura
    const bg=ctx.createRadialGradient(x,y,10,x,y,90*glow);
    bg.addColorStop(0,this.phase2?'rgba(255,0,0,0.3)':'rgba(255,80,0,0.25)');
    bg.addColorStop(0.5,'rgba(180,30,0,0.1)');
    bg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=bg; ctx.fillRect(x-95,y-95,190,190);

    // ── Corpo NOVO: sprite pixel-art (reformulado do zero) ──
    const bodyY=y-20;
    const scB=this.radius/50;
    const pxB=3;
    let frameB=BALROG_BODY[0],flipB=false;
    if(this.whipAnim>0){
      frameB=BALROG_BODY[2];
    }else if(this.isMoving&&Math.abs(this.moveDy)>Math.abs(this.moveDx)*1.15){
      frameB=this.facingY<0?BALROG_BACK[this.frameIdx%2]:BALROG_BODY[this.frameIdx%2];
    }else if(this.isMoving){
      frameB=BALROG_RUN[this.frameIdx%2];
      flipB=this.facing<0;
    }
    // fúria (fase 2): tinge o corpo de vermelho por trás
    if(this.phase2){
      ctx.save(); ctx.globalAlpha=0.35+0.2*Math.sin(t*0.01);
      ctx.fillStyle='#ff2200'; ctx.beginPath(); ctx.arc(x,bodyY,45,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    if(this.isMoving&&this.phase2){
      ctx.save();ctx.globalAlpha=.3;ctx.fillStyle='#ff6411';
      const trailDir=this.facing>0?-1:1;
      for(let s=0;s<4;s++)ctx.fillRect(x+trailDir*(42+s*13),y-22+s*7,22-s*3,4);
      ctx.restore();
    }
    drawBossGrid(frameB, PAL_BOSS_BALROG, x, bodyY, pxB, flipB);
    // Chamas subindo da juba
    for(let f3=0;f3<7;f3++){
      const fp=((t*0.0009)+f3*0.14)%1;
      const fx3=x+((f3*17)%29-14)*pxB*0.55+Math.sin(t*0.006+f3*2)*3;
      ctx.globalAlpha=(1-fp)*0.6;
      ctx.fillStyle=f3%3===0?'#ffd21a':f3%3===1?'#ff7a1a':'#e03010';
      const fs=(2.6+ (1-fp)*2.6)*scB;
      ctx.fillRect(fx3-fs/2, bodyY-18*pxB-fp*24, fs, fs);
    }
    ctx.globalAlpha=1;
    // Brasas caindo dos punhos
    for(let f4=0;f4<3;f4++){
      const fp=((t*0.0007)+f4*0.33)%1;
      ctx.globalAlpha=(1-fp)*0.5;
      ctx.fillStyle='#ff9a20';
      ctx.fillRect(x+(f4%2?17:-17)*pxB-1, bodyY+8*pxB+fp*18, 3, 3);
    }
    ctx.globalAlpha=1;
    // ── Whip animation ──
    if(this.whipAnim>0){
      const wp=this.whipAnim/600;
      ctx.save(); ctx.globalAlpha=wp*0.9;
      ctx.strokeStyle='#ff4400'; ctx.lineWidth=6;
      ctx.shadowBlur=24; ctx.shadowColor='#ff2200';
      const wx=x+this.whipSide*W*0.55*wp;
      const wy=y+Math.sin(wp*Math.PI)*50;
      ctx.beginPath(); ctx.moveTo(x,y-5);
      ctx.quadraticCurveTo(x+this.whipSide*160*wp,y-20,wx,wy);
      ctx.stroke();
      // Whip tip fire
      ctx.fillStyle='#ffcc00'; ctx.beginPath(); ctx.arc(wx,wy,5*wp,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0; ctx.restore();
    }

    // ── Phase 2 rage ──
    if(this.phase2){
      ctx.save(); ctx.globalAlpha=0.2+0.15*Math.sin(t*0.015);
      const rage=ctx.createRadialGradient(x,y,15,x,y,this.radius+20);
      rage.addColorStop(0,'rgba(255,0,0,0.5)'); rage.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=rage; ctx.beginPath(); ctx.arc(x,y,this.radius+20,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    // Roar text
    if(this.roarTimer>0){
      ctx.save(); ctx.globalAlpha=this.roarTimer/800;
      ctx.fillStyle='#ff4400'; ctx.font=`bold ${Math.round(14+6*(1-this.roarTimer/800))}px Courier New`;
      ctx.textAlign='center'; ctx.fillText('GRAAAAH!',x,y-85); ctx.restore(); ctx.textAlign='left';
    }
    if(this.flashTimer>0){ ctx.save(); ctx.globalAlpha=this.flashTimer/120*0.55; ctx.fillStyle='#ff6600'; ctx.beginPath(); ctx.arc(x,y,this.radius,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    drawHPBar(x,y-this.radius*this.scale/2-26,this.hp/this.maxHp,104);
    ctx.fillStyle=this.phase2?'#ff2200':'#ff6600'; ctx.font='bold 9px Courier New'; ctx.textAlign='center';
    ctx.fillText(this.phase2?'🔥 BALROG [FÚRIA DESPERTA]':'🔥 BALROG, O ARAUTO',x,y-this.radius*this.scale/2-30); ctx.textAlign='left';
  }
}

// ═══════════════════════════════════════════════════════
// BOSS: BRUTAMONTES DA GUERRA (Onda 30 + Boss Rush)
// ═══════════════════════════════════════════════════════
class BossBrute {
  constructor(wave){
    this.x=W/2; this.y=230; this.wave=wave;
    this.hp=1800+wave*190; this.maxHp=this.hp;
    this.speed=30+wave; this.damage=32+wave*2.5;
    this.radius=42; this.xpVal=150+wave*22;
    this.dead=false; this.frameIdx=0; this.frameTick=0; this.dir='down';
    this.scale=3.0; this.phase=Math.random()*Math.PI*2; this.flashTimer=0;
    this.type='boss_brute';
    this.rockCd=4200; this.rockTimer=2600; this.rocks=[];
    this.rockWind=0; this.rockThrowAnim=0; this.rockAim={x:this.x,y:this.y};
    this.leapCd=9500; this.leapTimer=6500; this.leapState='ground';
    this.leapTarget={x:0,y:0}; this.leapWind=0; this.leapAir=0;
    this.leapChain=0; this.leapPebbles=[];
    this.enraged=false; this.impactTimer=0;
  }
  takeDmg(a){ this.hp-=a; this.flashTimer=100; spawnParts(this.x,this.y,'#7ab048',4,35); }
  update(dt,px,py){
    if(this.hp<=0){ this.dead=true; this._dropLoot(); return; }
    const ms=dt*1000;
    this.flashTimer=Math.max(0,this.flashTimer-ms);
    this.rockThrowAnim=Math.max(0,this.rockThrowAnim-ms);
    this.impactTimer=Math.max(0,this.impactTimer-ms);
    // Pedregulhos leves acompanham cada decolagem e impacto do salto triplo.
    for(const pb of this.leapPebbles){
      pb.x+=pb.vx*dt; pb.y+=pb.vy*dt; pb.z+=pb.vz*dt;
      pb.vz-=360*dt; pb.rot+=pb.spin*dt; pb.life-=ms;
      pb.vx*=Math.pow(0.22,dt); pb.vy*=Math.pow(0.22,dt);
      if(pb.z<0){
        pb.z=0;
        if(pb.bounces<1){pb.vz=Math.abs(pb.vz)*0.32;pb.bounces++;}
        else pb.vz=0;
      }
    }
    this.leapPebbles=this.leapPebbles.filter(pb=>pb.life>0);
    // ── ESPECIAL: Fúria abaixo de 40% ──
    if(!this.enraged && this.hp<this.maxHp*0.4){
      this.enraged=true; this.speed*=1.55; this.rockCd*=0.6; this.leapCd*=0.65;
      spawnLevelUpNotice(this.x,this.y-60,'💢 FÚRIA DO BRUTAMONTES!',0);
      spawnParts(this.x,this.y,'#ff3322',26,90); triggerScreenShake(12,400);
    }
    // ── ESPECIAL: Salto Esmagador Triplo ──
    if(this.leapState==='ground'){
      this.leapTimer-=ms;
      if(this.leapTimer<=0){
        this.leapChain=3;
        this.leapState='wind'; this.leapWind=700; this.leapTarget={x:px,y:py};
        spawnLevelUpNotice(this.x,this.y-58,'💥 SALTO TRIPLO!',0);
      }
    } else if(this.leapState==='wind'){
      this.leapWind-=ms;
      if(this.leapWind<=0){
        this._spawnLeapPebbles(9,0.72);
        this.leapState='air'; this.leapAir=560;
      }
    } else if(this.leapState==='air'){
      this.leapAir-=ms;
      if(this.leapAir<=0){
        this.x=this.leapTarget.x; this.y=this.leapTarget.y;
        this.impactTimer=650;
        const finalJump=this.leapChain===1;
        triggerScreenShake(finalJump?16:11,finalJump?500:320);
        spawnParts(this.x,this.y,'#8a6a3a',24,110); spawnParts(this.x,this.y,'#c8a04b',10,70);
        this._spawnLeapPebbles(finalJump?28:22,finalJump?1.25:1);
        const allP=[player,...(gameMode===2&&player2?[player2]:[])].filter(p=>p&&!p.dead);
        const hitRadius=finalJump?105:90;
        const hitMult=finalJump?1.35:0.9;
        for(const pl of allP){ if(Math.hypot(pl.x-this.x,pl.y-this.y)<hitRadius) pl.takeDmg(this.damage*hitMult); }
        this.leapChain--;
        if(this.leapChain>0){
          this.leapState='wind'; this.leapWind=280; this.leapTarget={x:px,y:py};
        }else{
          this.leapState='ground'; this.leapTimer=this.leapCd;
        }
      }
    }
    if(this.leapState!=='air'){
      const dx=px-this.x,dy=py-this.y,d=Math.hypot(dx,dy);
      this.moveDx=dx;this.moveDy=dy;
      if(Math.abs(dx)>2)this.facing=dx<0?-1:1;
      if(Math.abs(dy)>2)this.facingY=dy<0?-1:1;
      this.isMoving=d>34&&this.rockWind<=0&&this.leapState==='ground';
      if(this.isMoving){this.x+=dx/d*this.speed*dt;this.y+=dy/d*this.speed*dt;}

      // O arremesso possui preparação visível: ergue, mira e só então lança.
      if(this.rockWind>0){
        this.rockWind-=ms;
        if(this.rockWind<=0){
          const baseAngle=Math.atan2(this.rockAim.y-this.y,this.rockAim.x-this.x);
          const spreadAngles=[-0.24,0,0.24];
          for(let i=0;i<spreadAngles.length;i++){
            const a=baseAngle+spreadAngles[i];
            const side=(i-1)*12;
            this.rocks.push({
              x:this.x-Math.sin(baseAngle)*side,
              y:this.y-26+Math.cos(baseAngle)*side,
              vx:Math.cos(a)*3.25,vy:Math.sin(a)*3.25,
              r:16,life:3000,rot:i*0.7,damageMult:0.65
            });
          }
          this.rockThrowAnim=320;
          spawnParts(this.x,this.y-26,'#8a7a5a',12,42);
        }
      }else{
        this.rockTimer-=ms;
      }
      if(this.rockWind<=0&&this.rockTimer<=0&&d>140){
        this.rockTimer=this.rockCd;
        this.rockWind=650;this.rockAim={x:px,y:py};this.isMoving=false;
      }
      this.frameTick+=ms; if(this.frameTick>230){this.frameTick=0;this.frameIdx=(this.frameIdx+1)%2;}
    }
    // pedras voando
    for(const rk of this.rocks){
      rk.x+=rk.vx*dt*60; rk.y+=rk.vy*dt*60; rk.life-=ms; rk.rot+=dt*7;
      const allP=[player,...(gameMode===2&&player2?[player2]:[])].filter(p=>p&&!p.dead);
      for(const pl of allP){
        if(Math.hypot(pl.x-rk.x,pl.y-rk.y)<pl.radius+rk.r){ pl.takeDmg(this.damage*(rk.damageMult||0.8)); rk.life=0; spawnParts(rk.x,rk.y,'#8a7a5a',12,55); }
      }
    }
    this.rocks=this.rocks.filter(r=>r.life>0);
  }
  _dropLoot(){
    kills+=12; for(let i=0;i<14;i++) spawnCoin(this.x+(Math.random()-0.5)*80,this.y+(Math.random()-0.5)*45,Math.floor(this.xpVal/14));
    const bl=['semente_erva','pedra','madeira','semente_tomate'];
    for(let bi=0;bi<7;bi++){const it=bl[Math.floor(Math.random()*bl.length)];globalInventory[it]=(globalInventory[it]||0)+1;spawnLootFlyAnim(this.x+(Math.random()-0.5)*50,this.y,it);}
    showInvNotif('Brutamontes derrotado! +7 itens!'); savePersistentData();
    spawnParts(this.x,this.y,'#4a7a28',30,110); spawnParts(this.x,this.y,'#cc2266',14,80); triggerScreenShake(22,650);
  }
  draw(t){
    const pxs=Math.max(3,Math.round(this.scale));
    const gh=BRUTE_BODY[0].length*pxs, gw=BRUTE_W*pxs;
    const groundY=this.y+this.radius*0.55;                 // linha do chão (pés)
    const bob=Math.abs(Math.sin(t*0.005+this.phase))*1.5;  // passinho sutil
    const cy=groundY-gh/2-bob;                             // centro do grid (pés no chão)
    // sombra 3D sob os pés — acompanha o passo
    ctx.fillStyle='rgba(0,0,0,0.38)';
    ctx.beginPath(); ctx.ellipse(this.x,groundY+2,gw*0.42+bob,7+bob*0.5,0,0,Math.PI*2); ctx.fill();
    // marcador de aterrissagem do salto
    if(this.leapState==='wind'||this.leapState==='air'){
      ctx.save(); ctx.globalAlpha=0.55;
      ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(this.leapTarget.x,this.leapTarget.y,86,32,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#ff3322'; ctx.lineWidth=3; ctx.stroke(); ctx.restore();
      if(this.leapState==='air') { this._drawRocks(); return; } // no ar — invisível
    }
    // aura de fúria
    if(this.enraged){
      const ag=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,78);
      ag.addColorStop(0,`rgba(255,50,30,${0.14+0.07*Math.sin(t*0.008)})`); ag.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=ag; ctx.fillRect(this.x-80,this.y-80,160,160);
    }
    // O sprite muda de frente, costas e perfil conforme a direção real.
    let frame=BRUTE_BODY[this.frameIdx%2],flip=false;
    if(this.rockWind>320){
      frame=BRUTE_ROCK_LIFT;
    }else if(this.rockWind>0||this.rockThrowAnim>0){
      frame=BRUTE_ROCK_THROW;
      flip=this.rockAim.x<this.x;
    }else if(this.isMoving&&Math.abs(this.moveDy)>Math.abs(this.moveDx)*1.15){
      frame=this.facingY<0?BRUTE_BACK[this.frameIdx%2]:BRUTE_BODY[this.frameIdx%2];
    }else if(this.isMoving){
      frame=BRUTE_RUN[this.frameIdx%2];flip=this.facing<0;
    }
    if(this.impactTimer>0){
      const p=1-this.impactTimer/650;
      ctx.save();ctx.globalAlpha=(1-p)*.9;
      ctx.strokeStyle='#ff5038';ctx.lineWidth=4;
      for(let i=0;i<2;i++){ctx.beginPath();ctx.ellipse(this.x,groundY+3,28+p*(52+i*20),10+p*(20+i*7),0,0,Math.PI*2);ctx.stroke();}
      ctx.fillStyle='#8a6a3a';
      for(let i=0;i<9;i++){const a=i*Math.PI*2/9;ctx.fillRect(this.x+Math.cos(a)*(25+p*60)-3,groundY-Math.sin(a)*(8+p*25)-3,6,6);}
      ctx.restore();
    }
    if(this.flashTimer>0){
      ctx.save(); ctx.globalAlpha=0.85;
      drawBossGrid(frame, Object.fromEntries(Object.keys(PAL_BOSS_BRUTE).map(k=>[k,'#ffffff'])), this.x, cy, pxs,flip);
      ctx.restore();
    } else {
      drawBossGrid(frame, PAL_BOSS_BRUTE, this.x, cy, pxs,flip);
    }
    this._drawRocks();
    drawHPBar(this.x,groundY-gh-16,this.hp/this.maxHp,100);
    ctx.fillStyle=this.enraged?'#ff5544':'#7ab048'; ctx.font='bold 9px Courier New'; ctx.textAlign='center';
    ctx.fillText('🗿 BRUTAMONTES DA GUERRA',this.x,groundY-gh-20); ctx.textAlign='left';
  }
  _drawRocks(){
    for(const rk of this.rocks){
      ctx.save();
      const va=Math.atan2(rk.vy,rk.vx);
      const rr=rk.r||11;
      ctx.globalAlpha=.28;ctx.fillStyle='#a8a59b';
      for(let i=1;i<=5;i++)ctx.fillRect(rk.x-Math.cos(va)*i*(rr*.8)-rr*.3,rk.y-Math.sin(va)*i*(rr*.8)-rr*.22,rr*.6,rr*.44);
      ctx.globalAlpha=1;ctx.translate(rk.x,rk.y);ctx.rotate(rk.rot);
      ctx.fillStyle='#171815';ctx.fillRect(-rr,-rr*.82,rr*2,rr*1.64);
      ctx.fillStyle='#4d4a43';ctx.fillRect(-rr*.82,-rr*.7,rr*1.64,rr*1.4);
      ctx.fillStyle='#79776f';ctx.fillRect(-rr*.62,-rr*.54,rr*1.08,rr*.98);
      ctx.fillStyle='#a8a59b';ctx.fillRect(-rr*.48,-rr*.45,rr*.58,rr*.46);
      ctx.fillStyle='#312f2a';ctx.fillRect(rr*.22,rr*.18,rr*.42,rr*.3);
      ctx.restore();
    }
    for(const pb of this.leapPebbles){
      const alpha=Math.max(0,Math.min(1,pb.life/260));
      ctx.save();
      ctx.globalAlpha=alpha*0.25;
      ctx.fillStyle='#171815';
      ctx.beginPath();ctx.ellipse(pb.x,pb.y+2,pb.r*1.25,pb.r*0.5,0,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=alpha;
      ctx.translate(pb.x,pb.y-pb.z);ctx.rotate(pb.rot);
      ctx.fillStyle='#332d24';ctx.fillRect(-pb.r-1,-pb.r-1,pb.r*2+2,pb.r*2+2);
      ctx.fillStyle=pb.color;ctx.fillRect(-pb.r,-pb.r,pb.r*2,pb.r*2);
      ctx.fillStyle='#c0aa78';ctx.fillRect(-pb.r+1,-pb.r+1,Math.max(1,pb.r-1),Math.max(1,pb.r-1));
      ctx.restore();
    }
  }
  _spawnLeapPebbles(count,power=1){
    for(let i=0;i<count;i++){
      const a=Math.PI*2*i/count+(Math.random()-0.5)*0.22;
      const speed=(70+Math.random()*115)*power;
      this.leapPebbles.push({
        x:this.x+Math.cos(a)*10,y:this.y+Math.sin(a)*5,
        vx:Math.cos(a)*speed,vy:Math.sin(a)*speed*0.55,
        z:2+Math.random()*8,vz:(95+Math.random()*145)*power,
        r:2+Math.floor(Math.random()*3),rot:Math.random()*Math.PI*2,
        spin:(Math.random()-0.5)*11,life:760+Math.random()*520,
        bounces:0,color:Math.random()<0.35?'#8a6a3a':'#6b5a3d'
      });
    }
  }
}
