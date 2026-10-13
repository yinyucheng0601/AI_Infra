/* Reused library primitives; adaptations and sources are recorded in GLYPH-SOURCES.md.
 * Connection geometry is preserved by translation/uniform scaling.
 */
(function(root){'use strict';
const shapes={
  "op": "<rect class=\"op outline\" x=\"30\" y=\"65\" width=\"260\" height=\"48\" rx=\"24\"/><text x=\"160\" y=\"89\" class=\"op-label\" text-anchor=\"middle\">Attention</text>",
  "comm": "<rect x=\"30\" y=\"65\" width=\"260\" height=\"46\" rx=\"23\" fill=\"#292929\"/><rect class=\"comm outline\" x=\"26\" y=\"61\" width=\"268\" height=\"54\" rx=\"27\"/><text x=\"160\" y=\"88\" class=\"op-label\" text-anchor=\"middle\">AllGather</text>",
  "matrix": "<rect x=\"67\" y=\"42\" width=\"186\" height=\"96\" fill=\"#111\" stroke=\"#B1EF6B\" stroke-opacity=\".5\"/><rect class=\"grid-cell\" x=\"70\" y=\"45\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.22\"/><rect class=\"grid-cell\" x=\"92.5\" y=\"45\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.6866666666666666\"/><rect class=\"grid-cell\" x=\"115\" y=\"45\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.42000000000000004\"/><rect class=\"grid-cell\" x=\"137.5\" y=\"45\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.8866666666666666\"/><rect class=\"grid-cell\" x=\"160\" y=\"45\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.62\"/><rect class=\"grid-cell\" x=\"182.5\" y=\"45\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.35333333333333333\"/><rect class=\"grid-cell\" x=\"205\" y=\"45\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.82\"/><rect class=\"grid-cell\" x=\"227.5\" y=\"45\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.5533333333333333\"/><rect class=\"grid-cell\" x=\"70\" y=\"67.5\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.62\"/><rect class=\"grid-cell\" x=\"92.5\" y=\"67.5\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.35333333333333333\"/><rect class=\"grid-cell\" x=\"115\" y=\"67.5\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.82\"/><rect class=\"grid-cell\" x=\"137.5\" y=\"67.5\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.5533333333333333\"/><rect class=\"grid-cell\" x=\"160\" y=\"67.5\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.2866666666666667\"/><rect class=\"grid-cell\" x=\"182.5\" y=\"67.5\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.7533333333333333\"/><rect class=\"grid-cell\" x=\"205\" y=\"67.5\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.4866666666666667\"/><rect class=\"grid-cell\" x=\"227.5\" y=\"67.5\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.22\"/><rect class=\"grid-cell\" x=\"70\" y=\"90\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.2866666666666667\"/><rect class=\"grid-cell\" x=\"92.5\" y=\"90\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.7533333333333333\"/><rect class=\"grid-cell\" x=\"115\" y=\"90\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.4866666666666667\"/><rect class=\"grid-cell\" x=\"137.5\" y=\"90\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.22\"/><rect class=\"grid-cell\" x=\"160\" y=\"90\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.6866666666666666\"/><rect class=\"grid-cell\" x=\"182.5\" y=\"90\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.42000000000000004\"/><rect class=\"grid-cell\" x=\"205\" y=\"90\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.8866666666666666\"/><rect class=\"grid-cell\" x=\"227.5\" y=\"90\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.62\"/><rect class=\"grid-cell\" x=\"70\" y=\"112.5\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.6866666666666666\"/><rect class=\"grid-cell\" x=\"92.5\" y=\"112.5\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.42000000000000004\"/><rect class=\"grid-cell\" x=\"115\" y=\"112.5\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.8866666666666666\"/><rect class=\"grid-cell\" x=\"137.5\" y=\"112.5\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.62\"/><rect class=\"grid-cell\" x=\"160\" y=\"112.5\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.35333333333333333\"/><rect class=\"grid-cell\" x=\"182.5\" y=\"112.5\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.82\"/><rect class=\"grid-cell\" x=\"205\" y=\"112.5\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.5533333333333333\"/><rect class=\"grid-cell\" x=\"227.5\" y=\"112.5\" width=\"20.5\" height=\"20.5\" fill=\"#B1EF6B\" opacity=\"0.2866666666666667\"/>",
  "add": "<circle cx=\"200\" cy=\"145\" r=\"24\" fill=\"#111\" stroke=\"#ddd\"/><path d=\"M192 145h16 M200 137v16\" stroke=\"#eee\" style=\"stroke-width:2\"/>"
};
const sources=[
  {
    "file": "system-op.svg",
    "sha256": "0fd9691aab69279b24e237992c21abe0c00ac83214b9331bcccc380f72bc4d70"
  },
  {
    "file": "system-add.svg",
    "sha256": "8ad09179868affec6a72403084f9096b0d7104717b51faf24eb4e4ef47fbe35d"
  },
  {
    "file": "data-2.svg",
    "sha256": "a458ab910b6766ae4ad6a2222dafa985621b7c3701c8770878490a24cae29931"
  }
];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const origin={op:[30,65],comm:[30,65],matrix:[67,42],add:[176,121]};
function draw(kind,x,y,label='',color='#B1EF6B',scale=1){
 let shape=shapes[kind];
 // Reuse the legend library's ir-op geometry (compiler guide op), in neutral gray.
 if(kind==='op')shape='<rect class="op outline" x="30" y="65" width="260" height="48" rx="24"/><circle cx="55" cy="89" r="12" fill="#080808"/><text x="55" y="90" text-anchor="middle" dominant-baseline="middle" style="font-size:15px;font-style:italic;fill:#ccc">ƒₓ</text><text x="174" y="89" class="op-label" text-anchor="middle">'+esc(label)+'</text>';
 if(kind==='comm')shape=shape.replace('<text x="160"','<circle cx="55" cy="88" r="12" fill="#080808"/><path d="M49 86H61L57 82 M61 90H49L53 94" fill="none" stroke="#eee" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><text x="174"').replace('>AllGather<','>'+esc(label)+'<');
 if(kind==='matrix')shape=shape.replaceAll('#B1EF6B',color);
 const [ox,oy]=origin[kind];
 return '<g data-glyph-source="'+(kind==='op'?'ir-op':kind==='matrix'?'data-2':kind==='add'?'system-add':'system-op')+'" data-glyph-variant="'+kind+'" transform="translate('+x+' '+y+') scale('+scale+') translate('+(-ox)+' '+(-oy)+')">'+shape+'</g>';
}
// 01.4 data roles: tensorNode / dataTiles from training-parallel-communication-v1.
// Height accommodates the atlas metadata line; tile geometry and label treatment are retained.
function tensor(x,y,w,label,summary,color,shard=null){
 const h=62.4,pad=5,gap=3,cell=11,rows=Math.max(1,Math.floor((h-pad*2+gap)/(cell+gap))),cols=Math.max(1,Math.floor((w-pad*2+gap)/(cell+gap))),gw=cols*(cell+gap)-gap,gh=rows*(cell+gap)-gap;
 let tiles='';
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)tiles+=`<rect class="data-tile" x="${x+(w-gw)/2+c*(cell+gap)}" y="${y+(h-gh)/2+r*(cell+gap)}" width="${cell}" height="${cell}" fill="${color}" opacity="0.22"/>`;
 let partitions='';
 if(shard){
  const horizontal=shard.axis==='行',shown=Math.min(shard.count,horizontal?8:16),first=Math.max(0,Math.min(shard.count-shown,shard.index-Math.floor(shown/2))),span=(horizontal?h-10:w-10)/shown;
  for(let slot=0;slot<shown;slot++){const i=first+slot;partitions+=`<rect class="weight-partition" data-partition="${i}" data-owned="${i===shard.index}" x="${x+5+(horizontal?0:slot*span)}" y="${y+5+(horizontal?slot*span:0)}" width="${horizontal?w-10:Math.max(.3,span-1)}" height="${horizontal?Math.max(.3,span-1):h-10}" fill="${i===shard.index?color:'#131313'}" opacity="${i===shard.index?.55:.8}"/>`;}
  shard={...shard,label:shard.count===1?'完整副本':`${shard.axis==='专家'?'EP':'TP'} ${shard.index} / ${shard.count} · [${shard.start}, ${shard.end})${shown<shard.count?' · 局部':''}`};
 }
 return `<g data-glyph-source="data-4" data-glyph-variant="tensor-node" ${shard?'data-sharded="true"':''}><rect class="outline data-block tensor-node" x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#131313" stroke="${color}" stroke-width="1.2"/><g pointer-events="none">${tiles}</g><g pointer-events="none">${partitions}</g><g class="data-label" style="paint-order:stroke;stroke:#131313;stroke-width:2.5px;stroke-linejoin:round" pointer-events="none"><text x="${x+w/2}" y="${y+(shard?17:25)}" text-anchor="middle" font-size="14" fill="${color}">${esc(label)}</text><text x="${x+w/2}" y="${y+(shard?35:45)}" text-anchor="middle" font-size="12" fill="#ababab">${esc(summary)}</text>${shard?`<text x="${x+w/2}" y="${y+53}" text-anchor="middle" font-size="11" fill="#ccc">${esc(shard.label)}</text>`:''}</g></g>`;
}
root.RankApprovedGlyphs={draw,tensor,sources};
})(globalThis);
