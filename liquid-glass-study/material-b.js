// Screen-space slab approximation. Separate transmitted face and compressed
// sidewall rays; both sample the live DOM backdrop. No WebGL or fixed tint.
function renderB(el,v){
 const w=Math.round(el.clientWidth),h=Math.round(el.clientHeight),r=h/2,ss=3;
 const W=w*ss,H=h*ss,scale=Math.max(128,h*1.5),c=document.createElement('canvas');c.width=W;c.height=H;
 const ctx=c.getContext('2d'),face=ctx.createImageData(W,H),rim=ctx.createImageData(W,H),mask=ctx.createImageData(W,H),light=ctx.createImageData(W,H);
 const bezel=Math.min(h*.44,v.bezel*h/74),rimWidth=v.rimWidth*Math.sqrt(h/74),depth=v.depth*h/74;
 const faceGain=.23+1.15*Math.min(1,Math.pow(74/h,4));
 // Focus changes both the radial highlight width and its angular concentration.
 // Keep the approved default (28) as the width reference.
 const focus=Math.max(0,Math.min(100,v.power));
 const spread=Math.exp((28-focus)/45);
 const angularPower=.45+8*Math.pow(focus/100,1.5);
 // Do not encode a small face displacement against the much larger rim range:
 // the previous shared 285px range quantized face offsets to >1 CSS pixel.
 const faceScale=Math.max(8,Math.ceil(depth*(v.strength/60)*faceGain*2.5));
 for(let py=0;py<H;py++)for(let px=0;px<W;px++){
  const x=(px+.5)/ss,y=(py+.5)/ss,i=(py*W+px)*4,d=-sdf(x,y,w,h,r),e=.15;
  let gx=sdf(x+e,y,w,h,r)-sdf(x-e,y,w,h,r),gy=sdf(x,y+e,w,h,r)-sdf(x,y-e,w,h,r),n=Math.hypot(gx,gy)||1;gx/=n;gy/=n;
  let dx=0,dy=0,nx=0,ny=0,nz=1;
  if(d>0&&d<bezel){
   const t=d/bezel,q=1-t,slope=Math.pow(q,3)/Math.pow(Math.max(.0001,1-q**4),.75);
   nz=1/Math.sqrt(1+slope*slope);nx=gx*slope*nz;ny=gy*slope*nz;
   const eta=1/v.ior,f=eta*nz-Math.sqrt(1-eta*eta*(1-nz*nz)),tz=-eta+f*nz;
   const height=depth*(.28+.72*Math.pow(1-q**4,.25));
   const travel=height/Math.max(.1,-tz)*(v.strength/60)*faceGain;
   // feDisplacementMap is an inverse lookup (output -> source), not a forward
   // motion vector. Sample outward to contract the transmitted image at bevels.
   const entry=Math.min(1,d/2),fade=entry*entry*(3-2*entry);
   dx=-f*nx*travel*fade;dy=-f*ny*travel*fade;
  }
  function encode(img,a,b,range=scale){img.data.set([Math.round(127.5+a/range*255),Math.round(127.5+b/range*255),128,255],i)}
  encode(face,dx,dy,faceScale);
  const t=Math.max(0,Math.min(1,d/Math.max(1,rimWidth)));
  // The rim transports an interior strip to the narrow thickness band.
  const reach=Math.max(0,h*.45-d*.8);
  encode(rim,-gx*reach,-gy*reach);
  const aa=Math.min(1,Math.max(0,d*ss+.5));
  // Reserve the outer ~0.8 CSS px for the air/glass highlight. The coloured
  // thickness starts underneath it, rather than painting over the silhouette.
  const colourD=d-.85,colourGate=Math.max(0,Math.min(1,colourD*2));
  const band=(Math.exp(-Math.pow((colourD-rimWidth*.43)/(rimWidth*.36),2))+.16*Math.exp(-Math.pow((colourD-rimWidth*1.15)/(rimWidth*.30),2)))*aa*colourGate;
  mask.data.set([255,255,255,Math.round(255*Math.min(1,band)*v.rim/100)],i);
  const facing=-gx*.56-gy*.83;
  // A nearby upper-left area light also varies with position. Normal-only
  // lighting makes every pixel along a straight top edge equally bright.
  const lightDistance=Math.hypot(x+w*.12,y+h*.75);
  const nearDistance=Math.hypot(w*.12,h*.75);
  const lightFalloff=Math.pow(nearDistance/lightDistance,1.15);
  const edge=Math.exp(-Math.pow((d-.35)/(.30*Math.sqrt(spread)),2));
  const bevel=Math.exp(-Math.pow((d-rimWidth*.88)/(rimWidth*.65*spread),2));
  const soft=Math.exp(-Math.pow((d-rimWidth*1.4)/(rimWidth*1.6*spread),2));
  const directional=Math.pow(Math.max(0,facing),angularPower);
  const returnLight=Math.pow(Math.max(0,gx*.62+gy*.78),angularPower);
  const innerReflection=Math.exp(-Math.pow((d-rimWidth*1.7)/(rimWidth*1.2*spread),2));
  // No constant rim term: the highlight must disappear away from the light,
  // otherwise the entire silhouette becomes a white UI border in dark mode.
  const outerWhite=edge*.98*Math.pow(Math.max(0,facing),Math.max(2,angularPower))*v.shine*lightFalloff;
  const innerWhite=(bevel*(.24*directional+.22*returnLight)+soft*.07*directional+innerReflection*.13*returnLight)*v.shine*(h<100?.45:1)*lightFalloff;
  const white=outerWhite+innerWhite;
  const innerShade=Math.exp(-Math.pow((d-h*.085)/(h*.065),2))*.105*Math.max(0,facing);
  const dark=Math.exp(-Math.pow((d-rimWidth*.8)/1.0,2))*(.04+.14*Math.max(0,-facing))+innerShade;
  const a=Math.max(white,dark)*aa;
  const tone=white>=dark?255:35;
  light.data.set([tone,tone,tone,Math.round(Math.min(.9,a)*255)],i);
 }
 function url(img){ctx.putImageData(img,0,0);return c.toDataURL()}
 const fURL=url(face),rURL=url(rim),mURL=url(mask),lURL=url(light),id='glass-B';
 el.querySelector('.shine').style.backgroundImage=`url(${lURL})`;
 el.querySelector('.shine').style.backgroundSize='100% 100%';
 let svg=document.getElementById(id+'-svg');if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id=id+'-svg';svg.style.cssText='position:absolute;width:0;height:0;pointer-events:none';document.body.append(svg)}
 const img=(u,result)=>`<feImage href="${u}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="${result}"/>`;
 svg.innerHTML=`<filter id="${id}" color-interpolation-filters="sRGB" x="-30%" y="-100%" width="160%" height="300%">${img(fURL,'rawFaceMap')}<feGaussianBlur in="rawFaceMap" stdDeviation=".35" result="map"/><feDisplacementMap in="SourceGraphic" in2="map" scale="${v.strength===0?0:faceScale}" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="${Math.max(.22,v.blur)}" result="face"/><feMorphology in="SourceGraphic" operator="erode" radius="2" result="rimChroma"/><feGaussianBlur in="rimChroma" stdDeviation="1" result="rimBackdrop"/>${img(rURL,'rimMap')}<feDisplacementMap in="rimBackdrop" in2="rimMap" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="sideSample"/><feColorMatrix in="sideSample" type="saturate" values="1.3" result="rimColor"/>${img(mURL,'mask')}<feComposite in="rimColor" in2="mask" operator="in" result="side"/><feComposite in="side" in2="face" operator="over"/></filter>`;
 const filter=/Chrome/.test(navigator.userAgent)?`url(#${id})`:'blur(1px)';el.style.backdropFilter=filter;el.style.webkitBackdropFilter=filter;
}
