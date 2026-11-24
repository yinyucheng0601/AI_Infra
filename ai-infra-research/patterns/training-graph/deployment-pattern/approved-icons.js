/* Approved gallery device assets; original hw-* symbols remain untouched. */
(function(){
 const NS='http://www.w3.org/2000/svg',root=document.createElementNS(NS,'svg');
 root.setAttribute('width','0');root.setAttribute('height','0');root.style.cssText='position:absolute;width:0;height:0;overflow:hidden';root.setAttribute('aria-hidden','true');
 const defs=document.createElementNS(NS,'defs');root.append(defs);
 for(const type of ['cpu','npu','dpu','nic','sw']){
  const symbol=document.createElementNS(NS,'symbol'),height=type==='sw'?12:36;
  symbol.id='deployment-hw-'+type;symbol.setAttribute('viewBox','0 0 48 '+height);
  symbol.innerHTML=LingquDeviceGlyphsV2.draw(type);
  for(const asset of symbol.querySelectorAll('[data-user-glyph]')){
   asset.setAttribute('x','0');asset.setAttribute('y','0');asset.setAttribute('width','48');asset.setAttribute('height',height);
  }
  defs.append(symbol);
 }
 document.body.prepend(root);
})();
