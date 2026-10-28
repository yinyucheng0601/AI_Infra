/* Pure conditional source model. No DOM, no device execution. See ANALYSIS.md. */
(function(root) {
  'use strict';
  const commit = '04c0c97dc5623053fefc585786697a8c19b9504a';
  const shape = [7,27,53,39], strides = [55809,2067,39,1], total = 390663;
  const params = {dtype:'float32',shape,strides,axes:[0,1],outputShape:[53,39],testOutputShape:[2067],tileLen:1,tileNum:2067,shapeLen:4,dimLen:2,hostStrides:[55809,2067],tilingKey:2,blockDim:1,outerTileLen:8,outerTileNum:4,outerTailTileLen:7,innerTileLen:16,innerTileNum:1,innerTailTileLen:11,tileElemBase:7};
  const assumption = '条件：有效轴按 dim=[3,2]、tileDim=[1,0] 分类；dim 尾部未初始化，实际 API/硬件访问尚未验证。';
  function integer(v,max,name) { if (!Number.isInteger(v)||v<0||v>=max) throw new RangeError(name); }
  function offset(a,b,c,d) { return ((a*27+b)*53+c)*39+d; }
  function decode(n) { if(n<0||n>=total) return null; return [Math.floor(n/55809),Math.floor(n/2067)%27,Math.floor(n/39)%53,n%39]; }
  function members(c,d) {
    integer(c,53,'c');integer(d,39,'d');
    return Array.from({length:189},(_,q)=>{const a=Math.floor(q/27),b=q%27; return {a,b,c,d,offset:offset(a,b,c,d),bytes:offset(a,b,c,d)*4,inner:b<16?0:1};});
  }
  function group(c,outer,inner) {
    integer(c,53,'c');integer(outer,5,'outer');integer(inner,2,'inner');
    const b0=inner?16:0,L=inner?11:16,d0=outer*8,validLanes=outer===4?7:8;
    const src=[[d0,d0+7,0,1,39],[c,c,0,1,53],[b0,b0+L-1,0,1,27],[0,6,0,1,7]];
    const dst=[[0,7,0,1,8],[0,0,0,1,1],[0,L-1,0,1,L],[0,6,0,1,7]];
    const slots=[];
    for(let a=0;a<7;a++)for(let b=b0;b<b0+L;b++)for(let lane=0;lane<8;lane++) {
      const n=offset(a,b,c,d0+lane),q=a*L+b-b0;
      slots.push({a,b,c,d:d0+lane,lane,offset:n,bytes:n*4,local:q*8+lane,localBytes:(q*8+lane)*4,work:q,consumed:lane<validLanes,legalCoordinate:d0+lane<39,inAllocation:n<total,alias:decode(n)});
    }
    return {id:`c${c}/d${d0}/b${b0}`,c,outer,inner,b0,L,d0,validLanes,src,dst,slots,computeLen:7*L,repeat:Math.ceil(7*L/8),requested:7*L*8,writtenBytes:7*L*32,yOffset:c*39+d0};
  }
  function element(c,d,a,b) {
    integer(a,7,'a');integer(b,27,'b');integer(c,53,'c');integer(d,39,'d');
    const b0=b<16?0:16,L=b<16?16:11,d0=Math.floor(d/8)*8,lane=d%8,q=a*L+b-b0,n=offset(a,b,c,d);
    return {a,b,c,d,lane,offset:n,bytes:n*4,local:q*8+lane,localBytes:(q*8+lane)*4,work:q,consumed:true,legalCoordinate:true,inAllocation:true,group:`c${c}/d${d0}/b${b0}`,b0,L,computeLen:7*L,repeat:Math.ceil(7*L/8),mask:'0x'+((0x01010101*Math.pow(2,d%8))>>>0).toString(16).padStart(8,'0')};
  }
  const evidence = {
    element:{title:'元素与地址',refs:[['generator',12,15],['kernel',942,977],['kernel',1014,1029]],formula:'offset = ((a*27+b)*53+c)*39+d; byte = offset*4',known:'数学归约集合、行主序地址和分块内目的槽可计算。',unknown:'源值未加载；DataCopy 的实际执行需要匹配版本环境确认。'},
    group:{title:'搬运分组',refs:[['kernel',752,770],['kernel',812,855],['kernel',867,870],['kernel',1014,1029]],formula:'GM[a,b,c,d0+lane] → UB[(a*L+b-b0)*8+lane]',known:'每个分组请求 8 列；b 分为 16 和 11，a 全覆盖。',unknown:'末组 d=39 超出轴范围，不能将请求等同于已完成的硬件访问。'},
    gather:{title:'GatherMask 整理',refs:[['kernel',893,918],['kernel',1054,1057]],formula:'UB[q*8+lane] → work[q]; repeat = ceil(7*L/8)',known:'pattern 每 8 槽选一个 lane；Exp/ReduceSum 只使用前 112 或 77 项。',unknown:'尾分块会筛出 80 槽，最后 3 槽不进入归约；其本次未写入值未知。'},
    sum:{title:'两段归约',refs:[['kernel',817,832],['kernel',912,918]],formula:'sum[lane*8] += Σq exp(work[q]); 112 + 77 = 189',known:'两段各贡献一次，源代码没有调用 ComputeMax。',unknown:'未验证设备数值精度、指令展开和运行耗时。'},
    output:{title:'输出写回',refs:[['kernel',924,939],['test',25,38],['host',111,116]],formula:'y[c*39+d] = ln(sum[lane*8])',known:'请求写回完整组 32 B，末组 28 B，覆盖 2067 个输出位置。',unknown:'测试描述 [2067]、数学 [53,39]、Host InferShape 复制输入，实际调用路径待确认。'},
    tail:{title:'尾列额外请求',refs:[['kernel',836,853],['kernel',1022,1029]],formula:'UpdateOuter(8) 请求 d=32..39；ComputeSum(...,7) 只消费 d=32..38',known:'每个 (a,b,c) 多出一个请求槽；不属于当前输出的归约集合。',unknown:'不合法 SliceInfo 的 API 接受方式和实际访问未验证，不能宣称发现运行时 bug。'},
    host:{title:'Host 与模型前提',refs:[['host',29,53],['host',77,103],['kernel',783,794],['kernel',1078,1082]],formula:'tileNum=390663/7/27=2067; TilingKey=2',known:'当前入口调用 735 行起的 KernelLogSumExp2；strides 没有传入此 Init。',unknown:'dimOffset 达到 2 后仍读未初始化 dim[2]。页面采用预期轴分类，保留此不确定性。'}
  };
  function outputStatus(c,d) { integer(c,53,'c'); integer(d,39,'d'); return {c,d,investigate:d>=32,reason:d>=32?'尾组额外请求 d=39；未参与归约，设备行为待确认':null}; }
  function describe(s) {
    const g=group(s.c,Math.floor(s.d/8),s.b<16?0:1), e=element(s.c,s.d,s.a,s.b), ev=evidence[s.kind]||evidence.element;
    const selectedRequest=s.kind==='tail'?{a:s.a,b:s.b,c:s.c,d:39,offset:offset(s.a,s.b,s.c,39),bytes:offset(s.a,s.b,s.c,39)*4,local:e.work*8+7,consumed:false,legalCoordinate:false,alias:decode(offset(s.a,s.b,s.c,39))}:null;
    return {case:'LogSumExpCase5',commit,output:{c:s.c,d:s.d,index:s.c*39+s.d},selection:{kind:s.kind,a:s.a,b:s.b,element:e,selectedRequest,group:{id:g.id,b0:g.b0,L:g.L,d0:g.d0,validLanes:g.validLanes,computeLen:g.computeLen,repeat:g.repeat,requested:g.requested,srcSlice:g.src,dstSlice:g.dst}},params,formula:ev.formula,known:ev.known,unconfirmed:[ev.unknown,assumption],sources:ev.refs.map(([file,start,end])=>({file,start,end})),question:s.question||''};
  }
  function context(s,sources) {
    const obj=describe(s);
    obj.sources=obj.sources.map(ref=>({...ref,path:sources[ref.file].path,url:sources[ref.file].url+`#L${ref.start}-L${ref.end}`}));
    return JSON.stringify(obj,null,2);
  }
  function investigation(s,sources) {
    const obj=describe(s),e=obj.selection.element,g=obj.selection.group,r=obj.selection.selectedRequest;
    const selected=r||e;
    return [
      '# LogSumExp · 源码调查',
      `case       = ${obj.case}`,
      `commit     = ${commit}`,
      `output     = y[${s.c}, ${s.d}]  # index ${obj.output.index}`,
      `object     = ${s.kind}`,
      `input      = x[${selected.a}, ${selected.b}, ${selected.c}, ${selected.d}]`,
      `GM.element = ${selected.offset}`,
      `GM.byte    = ${selected.bytes}`,
      `UB.element = ${selected.local}`,
      `work.index = ${r?'not consumed':e.work}`,
      '',
      '# 当前配置与搬运分组',
      `dtype      = float32  # 4 bytes`,
      `shape      = [7, 27, 53, 39]`,
      `axes       = [0, 1]`,
      `strides    = [55809, 2067, 39, 1]`,
      `tiling     = key 2, blockDim 1, tileNum 2067, tileLen 1`,
      `group      = ${g.id}`,
      `b.range    = [${g.b0}, ${g.b0+g.L})`,
      `d.request  = [${g.d0}, ${g.d0+8})`,
      `d.consume  = [${g.d0}, ${g.d0+g.validLanes})`,
      `computeLen = ${g.computeLen}, repeats = ${g.repeat}`,
      `srcSlice   = ${JSON.stringify(g.srcSlice)}`,
      `dstSlice   = ${JSON.stringify(g.dstSlice)}`,
      '',
      '# 对应表达式',
      obj.formula,
      '',
      '# 固定版本源码',
      ...obj.sources.flatMap(ref=>[`${sources[ref.file].path}:${ref.start}-${ref.end}`,`${sources[ref.file].url}#L${ref.start}-L${ref.end}`]),
      '',
      '# 已知',obj.known,
      '# 待确认',...obj.unconfirmed,
      '',
      '# 请继续调查的问题',
      obj.question||'（尚未填写）'
    ].join('\n');
  }
  function comparison(c){return [0,4].map(outer=>{const g=group(c,outer,0);return {label:outer===4?'尾组':'完整组',tail:outer===4,d:g.d0,requestColumns:g.src[0][1]-g.src[0][0]+1,computeColumns:g.validLanes,writeBytes:g.validLanes*4};});}
  const api={comparison,commit,shape,strides,total,params,assumption,offset,decode,members,group,element,evidence,outputStatus,describe,context,investigation};
  if(typeof module!=='undefined')module.exports=api;
  root.LogSumModel=api;
})(globalThis);
