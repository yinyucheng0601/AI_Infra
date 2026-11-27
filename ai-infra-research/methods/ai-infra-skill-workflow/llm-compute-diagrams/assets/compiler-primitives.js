/* Compiler diagram primitives. Inline this asset for standalone HTML. */
const CompilerPrimitives = (() => {
const C={i:'#B1EF6B',w:'#BCA0F3',a:'#F2C45F',g:'#79D4F2',neutral:'#b6b6b6'};
const glossary={
 x:['X · 输入 / 中间值','继承：绿色正方形网格。X 随本次输入变化；编译到 Tile 后仍保留绿色。网格格数与亮度为示意，准确 shape 由文字给出。'],
 w:['W · 模型参数','继承：蓝紫色正方形网格。参数参与计算；编译改变它的访问和存储方式，不改变它作为模型参数的身份。'],
 y:['Y · 输出值','继承：输出也是计算产生的数据，因此沿用绿色。这里以 Y = XW 为教学主线，不涉及真实模型的耗时测量。'],
 aggregate:['聚合结果','继承并保留：黄色网格专用于均值、最大值、指数和等聚合结果。本篇 MatMul 主线未单独展开这类对象，不额外制造黄色节点。'],
 gradient:['梯度','继承并保留：青色网格表达求导结果。本篇讲前向编译，不将青色改作 Pass 或缓冲的颜色。'],
 instruction:['设备指令 · Kernel 内部执行','窄条表示设备指令的执行动作。本图使用搬运、计算、同步三类语义占位，不是具体 ISA 助记符，也不是实测指令序列。具体指令及顺序应由编译产物或指令 Trace 确认。OP 经过编译形成设备代码，不能与一条指令直接对应。'],
 op:['IR 操作 · OP','胶囊表示当前 IR 中的操作，例如 tensor.matmul、tile.matmul、加载或存储。OP 描述操作语义；它可以经过拆分、融合等编译变换，不能与一条设备指令或一次 Kernel 调度直接对应。'],
 add:['＋ · 逐元素相加','继承：圆形加号保留原语义。矩阵乘法使用 MatMul 胶囊；不会因为英文中出现 multiply 就改用圆形乘号。'],
 multiply:['× · 逐元素乘法 / 广播乘法','继承：圆形乘号表达逐元素或标量广播相乘。矩阵乘法使用明确命名的 MatMul 操作。本篇图例保留它，主线无需使用。'],
 tile:['Tile · 带类型与布局信息的局部数据','新增修饰：继续使用张量网格，沿用细边框底纹，叠加形状与内存空间标签。Tile 不是默认获得一块独立物理存储；存储由后续 MemRef 关系表达。'],
 loop:['循环范围 · 结构包含','新增：左侧括线与范围标签圈定重复执行的语句。×4 表示教学示例中的迭代次数，不表示四个设备，也不表示四倍性能。'],
 callable:['Callable · 可调用函数（图解统称）','本图将可调用函数统称为 Callable；对应源码中的 Function，不是新增的 IR 节点类型。范围框表示有参数、函数体与返回值的函数定义；函数体可以包含多个 OP 和循环。同一函数可以被调用多次。Kernel 是设备端执行实现的概念，不能仅凭 MatMul 名称就把一个 OP 等同于 kernel。'],
 kernel:['Kernel · 设备端执行入口','本报告以带执行目标的函数范围框表示 kernel：标题标识入口，AIC / AIV 标记设备执行目标，内部展示操作与循环。它不是物理核心，也不是一次运行实例。PyPTO 的混合 InCore 可拆成 AIC 与 AIV kernel，由 Group 组织；单个 MatMul OP 不保证对应一个 kernel。Task 表示一次 Kernel 调度。'],
 task:['Task · 一次 Kernel 调度','PyPTO 官方定义：A task is one kernel dispatch。Task 引用本次执行的 Kernel，并关联参数与依赖；同一个 Kernel 可被多次调度。运行时根据依赖调度就绪任务。此处为身份示意，卡片宽度不表示耗时；设备指令属于 Kernel 内部的执行细节。'],
 buffer:['MemRef · 内存引用','MemRef 是编译器中的内存引用，关联缓冲身份与地址；图中的存储槽是示意，并非硬件缓冲本身。逻辑 Tile 值通过明确的存储绑定关联到 MemRef；多个值可以在满足约束时共享存储。'],
 address:['地址区间','新增：带单位刻度的轴与区间块。区间包含起点、不包含终点，即 [offset, offset + size)。相同 offset 在不同 memory space 中属于不同地址域。'],
 pass:['Pass · 编译处理步骤','新增：紧凑的编号步骤标签，用在编译轴上。它可以分析或变换 IR；不作为计算操作或运行任务画进数据流。'],
 snapshot:['阶段 IR · 程序结构','用节点与有向边呈现阶段 IR 的局部数据流：X、W 被操作消费，操作产生结果。此图是结构示意，不是从文件自动解析的真实图。PyPTO IR 还包含函数、循环、条件和类型，不能把整个 IR 等同于 DAG。IR dump 是该结构的文本导出载体。'],
 opflow:['操作间数据依赖 →','灰色实线箭头表达函数体内操作之间的数据依赖；与双折角数据箭头含义一致，局部简图使用中性色减少视觉干扰。'],
 data:['数据依赖 →','浅灰白连续实线与双折角箭头，连接数据与操作的输入输出。它表明消费关系，不表示实际搬运耗时。'],
 mapping:['跨阶段 IR 对应 ⋯◇','新增：灰色点线与空心菱形终点。表达教学对应或已核对的对象映射；它不属于程序内部执行边。映射必须说明依据。'],
 call:['调用 / 引用 ⇢','新增：灰色长虚线与空心箭头。从调用点或任务指向 Callable 定义；一条边不代表一次耗时区间。'],
 dependency:['任务依赖 →','新增：实线空心箭头，直接标注“先完成”。它约束 Task 之间的顺序，和携带张量值的数据边分开。'],
 binding:['存储绑定 ─○','新增：灰色实线、空心圆终点，显式标注“存于”。它连接逻辑值与存储对象，不表示数据流动。'],
 incore:['InCore → AIC / AIV / Group','PyPTO 实现：混合 InCore 函数可以展开为 AIC、AIV 与 Group。纯 Cube 或纯 Vector 函数仅转换为对应类型。拆分取决于操作构成，不是所有 MatMul 都会一分为二。'],
 load:['Load / Store · 显式读写','PyPTO 的 Tensor→Tile 转换会按操作语义插入或改写加载与存储。图中折叠了具体搬运指令和中间内存层，不以箭头长短表示搬运成本。'],
 sequence:['编译阶段轴','从左到右表达编译先后，间隔没有耗时比例。本图省略中间 Pass；分组顺序参考当前本地 PassManager，而非将每个 run 都固定成相同序列。'],
 evidence:['真实 IR 对照','以 l3_decode_csa 的相邻阶段 IR 文件为例，核对函数体中的 tensor.matmul 到 tile.matmul。只报告 IR 文件可直接支持的变换，不推出性能改善。']
};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function t(x,y,s,cl='',anchor='start'){return `<text x="${x}" y="${y}" class="${cl}" text-anchor="${anchor}">${esc(s)}</text>`}
function hit(key,html,layer=''){return `<g class="hit" tabindex="0" role="button" aria-label="${esc(glossary[key][0])}" data-key="${key}" data-layer="${layer}">${html}</g>`}
// Tensor-node styling from the AI Infra training / inference reports.
function grid(x,y,label,key='x',type='i',detail='',tile=false,w=120,h=60){
 const color=C[type],cols=Math.floor((w-10)/14),rows=Math.floor((h-8)/14),left=x+(w-cols*14+3)/2,top=y+(h-rows*14+3)/2;
 let q=`<rect class="outline" data-node-box="grid" x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#131313" stroke="${color}" stroke-width="1.2"/>`;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)q+=`<rect data-cell="1" x="${left+c*14}" y="${top+r*14}" width="11" height="11" fill="${color}" opacity=".22"/>`;
 q+=`<g class="data-label" style="--tensor-color:${color}">`+t(x+w/2,y+h/2+(detail?-4:5),label,'grid-label','middle')+(detail?t(x+w/2,y+h/2+15,detail,'grid-detail','middle'):'')+'</g>';
 return hit(key,q,'data');
}
function op(x,y,label,key='op',w=140){return hit(key,`<rect class="op outline" x="${x}" y="${y}" width="${w}" height="48" rx="24" fill="#685CF0" stroke="#685CF0" stroke-width="1"/><circle cx="${x+25}" cy="${y+24}" r="12" fill="#211391"/><text x="${x+25}" y="${y+25}" text-anchor="middle" dominant-baseline="middle" style="font-size:15px;font-style:italic;fill:#A58BFF">ƒₓ</text>`+t(x+(w+28)/2,y+24,label,'op-label','middle'),'data')}

function arithmetic(cx,cy,key){const d=key==='add'?`M${cx-8} ${cy} H${cx+8} M${cx} ${cy-8} V${cy+8}`:`M${cx-6} ${cy-6} L${cx+6} ${cy+6} M${cx+6} ${cy-6} L${cx-6} ${cy+6}`;return hit(key,`<circle class="outline" cx="${cx}" cy="${cy}" r="24"/><path class="symbol-mark" d="${d}" stroke="#E8EDF2" stroke-width="2.4" stroke-linecap="round" fill="none"/>`).replace('class="hit"','class="hit symbol"')}
function boundary(x,y,w,h,label,key='callable'){return hit(key,`<rect class="outline" x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="none" stroke="#6b6b6b"/><path d="M${x} ${y+31} H${x+w}" stroke="#444"/>`+t(x+14,y+22,label,'small'),'program')}
function loop(x,y,w,h,label){return hit('loop',`<path class="outline" d="M${x+14} ${y} H${x} V${y+h} H${x+14}" fill="none" stroke="#8EAED0" stroke-width="1.5"/><path d="M${x+14} ${y} H${x+w} V${y+h} H${x+14}" stroke="#8EAED0" stroke-width="1.5" stroke-dasharray="4 5" fill="none"/>`+t(x+25,y+20,label,'small'),'program')}
function kernel(x,y,w,h,label,target){return hit('kernel',`<rect class="outline" x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#171422" stroke="#685CF0" stroke-width="1.5"/><path d="M${x+1} ${y+35} H${x+w-1}" stroke="#685CF0"/><rect x="${x+w-54}" y="${y+9}" width="42" height="19" rx="4" fill="#392A7C"/>`+t(x+13,y+24,label,'small')+`<text x="${x+w-33}" y="${y+23}" text-anchor="middle" style="font-size:11px;fill:#DFD7FF">${esc(target)}</text>`,'program')}

function instruction(x,y,label,w=200){return hit('instruction',`<rect class="outline" x="${x}" y="${y}" width="${w}" height="27" rx="1" fill="#211C3C" stroke="#685CF0"/><path d="M${x+7} ${y+5} V${y+22}" stroke="#685CF0"/>`+t(x+18,y+18,label,'tiny'),'program')}
function task(x,y,label,w=170){return hit('task',`<rect class="outline" x="${x}" y="${y}" width="${w}" height="65" rx="8" fill="#242424" stroke="#999"/>`+t(x+12,y+19,'TASK','tiny')+t(x+12,y+45,label,'small'),'program')}
function buffer(x,y,label,w=180){return hit('buffer',`<rect class="outline" x="${x}" y="${y}" width="${w}" height="53" fill="#242424" stroke="#999"/><path d="M${x+9} ${y+5} V${y+48} M${x+w-9} ${y+5} V${y+48}" stroke="#666"/>`+t(x+w/2,y+32,label,'small','middle'),'storage')}
function doc(x,y,label){
 const node=(nx,ny,w,text,kind='tensor')=>`<rect data-ir-kind="${kind}" x="${nx}" y="${ny}" width="${w}" height="20" rx="${kind==='op'?10:4}" fill="${kind==='op'?'#685CF0':'#242424'}" stroke="${kind==='op'?'#685CF0':'#aaa'}" stroke-width="1.1"/>`+t(nx+w/2,ny+14,text,'tiny','middle');
 return hit('snapshot',`<path class="outline" d="M${x} ${y+3} V${y+65} M${x+162} ${y+3} V${y+65}" fill="none" stroke="#aaa"/>`+t(x+81,y-10,label,'small','middle')+`<path d="M${x+47} ${y+17} H${x+66} V${y+33} H${x+80} M${x+47} ${y+49} H${x+66} V${y+33} M${x+130} ${y+33} H${x+151}" fill="none" stroke="#aaa" stroke-width="1.3"/><path d="M${x+76} ${y+30} L${x+80} ${y+33} L${x+76} ${y+36} M${x+147} ${y+30} L${x+151} ${y+33} L${x+147} ${y+36}" fill="none" stroke="#aaa"/>`+node(x+10,y+7,37,'X')+node(x+10,y+39,37,'W')+node(x+80,y+23,50,'op','op'),'program');
}
function pass(x,y,label){return hit('pass',`<rect class="outline" x="${x}" y="${y}" width="260" height="36" rx="3" fill="#252525" stroke="#656565"/>`+t(x+130,y+23,label,'small','middle'),'program')}
function route(points,kind='data',label='',pos=null){
 const styles={opflow:['#aaa','','open'],data:['#E8E8E8','','arrow'],mapping:['#aaa','3 6','diamond'],call:['#ccc','10 6','open'],dependency:['#ccc','','open'],binding:['#aaa','','circle']};const[c,d,m]=styles[kind];
 const path=points.map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join(' ');
 for(let i=1;i<points.length;i++)if(points[i][0]!==points[i-1][0]&&points[i][1]!==points[i-1][1])throw new Error('Non-orthogonal relationship');
 const a=points[0],b=points[1];const lp=pos||[(a[0]+b[0])/2+(a[0]===b[0]?24:0),(a[1]+b[1])/2-10];
 return hit(kind,`<path class="outline edge" d="${path}" fill="none" stroke="${c}" stroke-width="1.7" stroke-linejoin="round" ${d?`stroke-dasharray="${d}"`:''} marker-end="url(#${m})"/><path d="${path}" fill="none" stroke="transparent" stroke-width="12"/>`+(label?t(lp[0],lp[1],label,'edge-label','middle'):''));
}
function line(x1,y1,x2,y2,kind='data',label=''){return route(x1===x2||y1===y2?[[x1,y1],[x2,y2]]:[[x1,y1],[x1,(y1+y2)/2],[x2,(y1+y2)/2],[x2,y2]],kind,label)}
function address(x,y,w,label,used=1){return hit('address',`<path class="outline" d="M${x} ${y} H${x+w} M${x} ${y-5} V${y+7} M${x+w} ${y-5} V${y+7}" stroke="#999" fill="none"/><rect x="${x}" y="${y+15}" width="${w*used}" height="32" fill="#555" stroke="#aaa"/>`+t(x,y+100,label,'small')+t(x,y+69,'0','tiny')+t(x+w,y+69,'8192 B','tiny','end'),'storage')}
const defs=`<defs><linearGradient id="op-purple" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#4D3BC9"/><stop offset="1" stop-color="#3D2DC0"/></linearGradient><marker id="arrow" viewBox="0 0 14 14" refX="12" refY="7" markerWidth="10" markerHeight="10" orient="auto"><path d="M8 7 H12" stroke="#131313" stroke-width="2.5"/><path d="M3 2 L8 7 L3 12 M7 2 L12 7 L7 12" stroke="#E8E8E8" stroke-width="1.4" stroke-linejoin="miter" fill="none"/></marker><marker id="open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1 L9 5 L1 9" stroke="#ccc" stroke-width="1.5" fill="none"/></marker><marker id="diamond" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="9" markerHeight="9" orient="auto"><path d="M1 6 L6 1 L11 6 L6 11Z" fill="#131313" stroke="#aaa"/></marker><marker id="circle" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><circle cx="5" cy="5" r="3" fill="#131313" stroke="#aaa"/></marker></defs>`;

const css="svg text{font-family:Inter,\"PingFang SC\",system-ui,sans-serif;fill:#e8e8e8;font-size:18px}\nsvg .small{font-size:14px;fill:#ababab}\nsvg .tiny{font-size:12px;fill:#ababab}\nsvg .op-label{font-size:18px;font-weight:650;fill:#fff;dominant-baseline:middle}\nsvg .hit{cursor:pointer}\nsvg .hit .outline{transition:stroke .12s}\nsvg .hit:hover .outline,svg .hit.selected .outline,svg .hit:focus .outline{stroke:#fff;stroke-width:2.5}\nsvg .hit.selected text{fill:#fff}\nsvg .hit:focus{outline:none}\nsvg .data-label{paint-order:stroke;stroke:#131313;stroke-width:2.5px;stroke-linejoin:round}\nsvg .grid-label{font-size:14px;fill:var(--tensor-color);font-weight:400}\nsvg .grid-detail{font-size:12px;fill:var(--tensor-color);font-weight:400}\nsvg .hit.selected .data-label text{fill:var(--tensor-color)}\nsvg .edge-label{font-size:12px;fill:#ccc;paint-order:stroke;stroke:#131313;stroke-width:5px}\nsvg .soft{opacity:.24}\nsvg .hit.selected{opacity:1}\nsvg .hit[data-key=\"task\"]{--object-color:#685CF0}\nsvg .hit[data-key=\"loop\"]{--object-color:#685CF0}\nsvg .hit[data-key=\"loop\"]>path{stroke:#685CF0}\nsvg .hit[data-key=\"loop\"]>text{fill:#685CF0}\nsvg .hit[data-key=\"buffer\"],svg .hit[data-key=\"address\"]{--object-color:#C7AD88}\nsvg .hit[data-key=\"pass\"],svg .hit[data-key=\"snapshot\"]{--object-color:#aaa}\nsvg .hit[data-key=\"callable\"]>.outline,svg .hit[data-key=\"loop\"]>.outline,svg .hit[data-key=\"task\"]>.outline,svg .hit[data-key=\"buffer\"]>.outline,svg .hit[data-key=\"address\"]>.outline,svg .hit[data-key=\"pass\"]>.outline,svg .hit[data-key=\"snapshot\"]>.outline{stroke:var(--object-color);stroke-width:1.3}\nsvg .hit[data-key=\"callable\"]>text,svg .hit[data-key=\"loop\"]>text,svg .hit[data-key=\"task\"]>text,svg .hit[data-key=\"buffer\"]>text,svg .hit[data-key=\"address\"]>text,svg .hit[data-key=\"pass\"]>text,svg .hit[data-key=\"snapshot\"]>text{fill:var(--object-color)}\nsvg .hit[data-key=\"task\"]>.outline{fill:#211C3C}\nsvg .hit[data-key=\"buffer\"]>.outline{fill:#25221D}\nsvg .hit[data-key=\"pass\"]>.outline,svg .hit[data-key=\"snapshot\"]>.outline{fill:#202020}\nsvg .hit[data-key=\"callable\"]>path{stroke:#8EAED0;stroke-opacity:.3}\nsvg .hit[data-key=\"buffer\"]>path{stroke:#C7AD88;stroke-opacity:.45}\nsvg .hit[data-key=\"address\"]>rect{fill:#C7AD88;fill-opacity:.17;stroke:#C7AD88;stroke-width:1.2}\nsvg .hit:hover>.outline,svg .hit.selected>.outline,svg .hit:focus>.outline{stroke-width:2;stroke:var(--object-color,#fff)}\nsvg .symbol .outline{stroke:#B9C2CD;stroke-width:1.5;fill:#1A1E23}\nsvg .symbol.selected .outline,svg .symbol:hover .outline,svg .symbol:focus .outline{stroke:#fff;stroke-width:2}\nsvg .hit[data-key=\"kernel\"]{--object-color:#685CF0}\nsvg .hit[data-key=\"kernel\"]>text{fill:#CEC4F9}\nsvg .hit[data-key=\"op\"]{--object-color:#685CF0}\nsvg .cell-title{font-size:16px;font-weight:600;fill:#eee}";
return {css,defs,glossary,grid,op,arithmetic,boundary,loop,kernel,task,instruction,buffer,address,doc,pass,route,line};
})();
