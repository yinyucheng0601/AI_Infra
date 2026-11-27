
(function(root){
const NS='http://www.w3.org/2000/svg';
function composeBoard(svg,detailed){
 svg.classList.add('physical-composition');svg.classList.toggle('physical-detail',detailed);
 const NS='http://www.w3.org/2000/svg',g=document.createElementNS(NS,'g');g.classList.add('physical-sections');
 const sections=[[-6,40,906,106,'Host 接入','CPU / PCIe'],[112,154,790,124,'计算互联','NPU Mesh'],[112,282,790,110,'交换网络','L1 / L2 Clos'],[46,401,856,42,'扩展互联','POD / SuperPOD'],[46,449,856,70,'框内互联','Board-to-Board']];
 g.innerHTML=sections.map(([x,y,w,h,title,sub])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/><text x="-116" y="${y+23}" class="physical-section-title">${title}</text><text x="-116" y="${y+40}" class="physical-section-sub">${sub}</text>`).join('');
 svg.insertBefore(g,svg.firstChild.nextSibling);
 const agg=document.createElementNS(NS,'g');agg.classList.add('physical-aggregate');
 agg.innerHTML='<rect class="aggregate-region" x="126" y="164" width="752" height="18" rx="4"/><text x="502" y="176" text-anchor="middle">Full Mesh · 7 × 4 · 拓扑聚合</text><rect class="aggregate-region" x="126" y="286" width="752" height="20" rx="4"/><text x="502" y="299" text-anchor="middle">Clos Fabric · 8 × 4 · 拓扑聚合</text>';
 for(let i=0;i<8;i++){const x=152+i*100;agg.insertAdjacentHTML('beforeend',`<line class="aggregate-physical" x1="${x}" y1="182" x2="${x}" y2="200"/><line class="aggregate-logical" x1="${x}" y1="269" x2="${x}" y2="286"/><line class="aggregate-physical" x1="${x}" y1="306" x2="${x}" y2="314"/>`);}
 svg.insertBefore(agg,svg.querySelector('.b-nodes'));
 // Expansion interfaces are destinations of the plane links, not extra switches.
 svg.querySelectorAll('.b-lbl-ub,.b-lbl-uboe,.b-bus.b-ub,.b-bus.b-uboe').forEach(n=>n.remove());
 svg.querySelectorAll('.b-out').forEach(n=>n.setAttribute('y2','401'));
 const ext=document.createElementNS(NS,'g');ext.classList.add('physical-expansion');
 ext.innerHTML='<rect x="60" y="401" width="410" height="42" rx="4"/><text x="265" y="426" text-anchor="middle" class="b-lbl-ub">Unified Bus → POD</text><rect x="498" y="401" width="402" height="42" rx="4"/><text x="699" y="426" text-anchor="middle" class="b-lbl-uboe">UBoE → SuperPOD</text>';
 svg.append(ext);
 svg.querySelectorAll('.b-lbl').forEach(n=>{if(/^(fullmesh|Clos|框内板间互联)/.test(n.textContent))n.remove();});
}

function board({boardIndex=0,focusSlot=0,onSelect=()=>{},mode='ep'}={}){
 const temp=document.createElementNS(NS,'g');temp.innerHTML=LingquPhysicalPattern.create({world:Math.max(16,(boardIndex+1)*8)}).board(boardIndex);const svg=temp.firstElementChild;
 svg.classList.add('lingqu-physical','lod1','lod2','near');svg.style.setProperty('--communication-color',mode==='ep'?'#FF9500':'#808080');
 composeBoard(svg,true);svg.setAttribute('viewBox','-140 0 1100 550');
 svg.querySelectorAll('use[href^="#hw-"]').forEach(n=>n.setAttribute('href',n.getAttribute('href').replace('#hw-','#deployment-hw-')));
 svg.querySelectorAll('.p-npu').forEach(rect=>{
  const rank=+rect.dataset.rank,slot=rank%8,g=rect.parentElement;const label=g.querySelector('.b-npul');if(label)label.textContent='NPU '+slot;g.classList.add('physical-rank',slot===focusSlot?'is-selected':'is-dim');g.dataset.rankId=rank;g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-pressed',String(slot===focusSlot));g.onclick=()=>onSelect(rank);g.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();onSelect(rank);}};
 });
 svg.querySelectorAll('.b-cpu,.b-nic,.b-dpu,.b-l1,.b-nsw,.b-swb').forEach(n=>{const active=n.matches('.b-cpu')?+n.dataset.cpu===Math.floor(focusSlot/4):n.matches('.b-nic')?+n.dataset.nic===Math.floor(focusSlot/2):false;n.classList.add(active?'device-active':'device-inactive');});
 svg.querySelectorAll('[data-n],[data-m]').forEach(n=>n.classList.add((n.dataset.n??n.dataset.m).split(',').map(Number).includes(focusSlot)?'is-hot':'is-cold'));
 svg.querySelectorAll('title').forEach(n=>n.remove());
 return svg;
}
root.LingquHardware={version:'1.0.0',composeBoard,board,applyCopper:applyEPCopper};
})(globalThis);
