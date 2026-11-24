/* Extracted Lingqu physical Pattern renderers, unchanged. Host owns selection/data.
 * Origin: lingqu-rank-map/pattern.js; source SHA256: 4c4b91c810e254fd54742f4a57f7e170cf792f8119daac250d31eeaaf6375f78
 * buildPhysSvg / relSvg / lkDefs / cased / buildBoardSvg retained verbatim.
 */
(function(root){
function create({world,coordinate=()=>({pp:0}),coordinateLabel=()=>''}){
 var PHYS={board:8,pod:64,group:128,sp:1024};
 var physCount={sp:Math.ceil(world/1024),groups:Math.ceil(world/128),pods:Math.ceil(world/64),boards:Math.ceil(world/8)};
 var GEO={sw1:{},sw2:{},board:{}},PITCH_=9,ROWP_=9,PODW_=126;
 var PLANE_C=Array(8).fill('#6E6E6E');
 function physOf(r){return {sp:Math.floor(r/1024),group:Math.floor(r/128),pod:Math.floor(r/64),board:Math.floor(r/8),slot:r%8};}
 var coordOfRank=coordinate,coordLine=coordinateLabel;
  function buildPhysSvg() {
    var SPN = physCount.sp, cols = SPN > 2 ? 2 : SPN, rows = Math.ceil(SPN / cols);
    var PITCH = PITCH_, ROWP = ROWP_, PODW = PODW_, PODH = 84, GAPP = 6, GRPW = PODW * 2 + GAPP, GRPGAP = 18;
    var SW1H = 16, PLANEH = 34, PAD = 18, HEAD = 26, GRPCOLS = 2;
    var GRPROWS = Math.ceil((PHYS.sp / PHYS.group) / GRPCOLS);
    var SPW = PAD * 2 + GRPCOLS * GRPW + (GRPCOLS - 1) * GRPGAP;
    var GRPH = SW1H + 8 + PODH;
    var SPH = HEAD + PLANEH + 14 + GRPROWS * GRPH + (GRPROWS - 1) * 16 + PAD;
    var SPGAP = 70, M = 40;
    var W = cols * SPW + (cols - 1) * SPGAP + M * 2, H = rows * SPH + (rows - 1) * SPGAP + M * 2;
    var panels = [], links = [], nodes = [], sps = [];
    for (var s = 0; s < SPN; s++) {
      var sx = M + (s % cols) * (SPW + SPGAP), sy = M + Math.floor(s / cols) * (SPH + SPGAP);
      sps.push({ x: sx, y: sy });
      var base = s * PHYS.sp, inSp = Math.min(PHYS.sp, world - base);
      panels.push('<rect class="p-sp" data-sp="' + s + '" x="' + sx + '" y="' + sy + '" width="' + SPW + '" height="' + SPH + '"/>'
        + '<text class="p-splabel" x="' + (sx + PAD) + '" y="' + (sy + 18) + '">SP' + s + ' · ' + inSp + '</text>');
      var planeW = (SPW - PAD * 2 - 7 * 8) / 8, py = sy + HEAD, planeC = [];
      for (var pl = 0; pl < 8; pl++) {
        var px = sx + PAD + pl * (planeW + 8), sw2w = (planeW - 12) / 4;
        panels.push('<rect class="p-plane" style="--pc:' + PLANE_C[pl] + '" x="' + px + '" y="' + py + '" width="' + planeW + '" height="' + PLANEH + '"><title>平面 ' + (pl + 1) + ' · 4×SW2 · 与平面内每颗 L1 成 Clos · 平面间无互联</title></rect>'
          + '<text class="p-planelabel" x="' + (px + planeW / 2) + '" y="' + (py + 13) + '" text-anchor="middle">P' + (pl + 1) + '</text>');
        for (var q = 0; q < 4; q++) panels.push('<use class="p-sw2" href="#hw-sw" x="' + (px + 6 + q * sw2w) + '" y="' + (py + PLANEH - 14) + '" width="' + (sw2w - 3) + '" height="10"/>');
        (GEO.sw2[s] = GEO.sw2[s] || [])[pl] = [0, 1, 2, 3].map(function (q9) { return { x: px + 6 + q9 * sw2w + (sw2w - 3) / 2, y: py + PLANEH - 4 }; });
        planeC.push({ x: px + planeW / 2, y: py + PLANEH });
      }
      var groups = Math.ceil(inSp / PHYS.group);
      for (var g = 0; g < groups; g++) {
        var gx = sx + PAD + (g % GRPCOLS) * (GRPW + GRPGAP), gy = sy + HEAD + PLANEH + 14 + Math.floor(g / GRPCOLS) * (GRPH + 16);
        var gBase = base + g * PHYS.group, sw1w = (GRPW - 7 * 4) / 8;
        for (var k = 0; k < 8; k++) {
          var swx = gx + k * (sw1w + 4);
          (GEO.sw1[gBase / PHYS.group] = GEO.sw1[gBase / PHYS.group] || [])[k] = { x: swx + sw1w / 2, top: gy, bot: gy + SW1H };
          panels.push('<rect class="p-sw1" style="--pc:' + PLANE_C[k] + '" x="' + swx + '" y="' + gy + '" width="' + sw1w + '" height="' + SW1H + '"><title>L1 SW · 平面 ' + (k + 1) + ' · 下接 2 个 POD 每颗 NPU 1 口 · 上接本平面 4×SW2（4 口）</title></rect>');
          panels.push('<use class="p-swicon" href="#hw-sw" x="' + (swx + 1) + '" y="' + (gy + 1) + '" width="' + (sw1w - 2) + '" height="' + (SW1H - 2) + '"/>');
          links.push('<line class="p-l2" style="--pc:' + PLANE_C[k] + '" x1="' + planeC[k].x + '" y1="' + planeC[k].y + '" x2="' + (swx + sw1w / 2) + '" y2="' + gy + '"/>');
        }
        if (g === 0) panels.push('<text class="p-sw1label" x="' + (gx + GRPW / 2) + '" y="' + (gy + SW1H - 4) + '" text-anchor="middle">L1 ×8</text>');
        for (var pd = 0; pd < 2; pd++) {
          var pBase = gBase + pd * PHYS.pod; if (pBase >= world) break;
          var pdx = gx + pd * (PODW + GAPP), pdy = gy + SW1H + 8, podIdx = Math.floor(pBase / PHYS.pod);
          panels.push('<rect class="p-pod" data-pod="' + podIdx + '" data-sp="' + s + '" x="' + pdx + '" y="' + pdy + '" width="' + PODW + '" height="' + PODH + '">'
            + '<title>POD ' + podIdx + ' · 8 板 · 64 NPU · 16 CPU · 每板 1 DPU · 4 NIC · 点一下取景，再点某一行进那块板</title></rect>');
          // 上联：CPU 列、NPU 列、DPU 列各一条 UB 到 L1 SW；NIC 列一条 RoCE 穿过 SW1 行出去
          [pdx + 11, pdx + 58, pdx + 101].forEach(function (ux) {
            links.push('<line class="p-l1" x1="' + ux + '" y1="' + (gy + SW1H) + '" x2="' + ux + '" y2="' + pdy + '"/>');
          });
          links.push('<line class="p-roce" x1="' + (pdx + 115) + '" y1="' + (gy - 3) + '" x2="' + (pdx + 115) + '" y2="' + pdy + '"/>');
          if (g === 0 && pd === 0) panels.push('<text class="p-rocelabel" x="' + (pdx + 119) + '" y="' + (gy - 4) + '">RoCE</text>');
          panels.push('<g class="lod1 p-colhd">'
            + '<text x="' + (pdx + 10.5) + '" y="' + (pdy + 4.2) + '" text-anchor="middle">CPU</text>'
            + '<text x="' + (pdx + 58) + '" y="' + (pdy + 4.2) + '" text-anchor="middle">NPU · POD ' + podIdx + '</text>'
            + '<text x="' + (pdx + 101) + '" y="' + (pdy + 4.2) + '" text-anchor="middle">DPU</text>'
            + '<text x="' + (pdx + 115) + '" y="' + (pdy + 4.2) + '" text-anchor="middle">NIC</text></g>');
          for (var b = 0; b < 8; b++) {
            var ry = pdy + 6 + b * ROWP + ROWP / 2, bIdx = Math.floor(pBase / PHYS.board) + b;
            GEO.board[bIdx] = { pdx: pdx, pdy: pdy, ry: ry, grp: gBase / PHYS.group, sp: s };
            panels.push('<rect class="p-board" data-board="' + bIdx + '" data-pod="' + podIdx + '" x="' + (pdx + 2) + '" y="' + (ry - ROWP / 2) + '" width="' + (PODW - 4) + '" height="' + ROWP + '"><title>板 ' + bIdx + ' · 2 CPU + 8 NPU + DPU + 4 NIC</title></rect>');
            /* 设备各有各的形：只有 NPU 是实心（填充 = 显存占用率这份数据），
               其余都是空心轮廓——CPU 方框、DPU 菱形、NIC 四根端口短竖线。 */
            // 图形直接用 hpc-topology-node 的 2D 图元（hw-icons.js 里的 <symbol>）：CPU 鲲鹏、DPU、NIC 擎天
            panels.push('<use class="p-cpu" href="#hw-cpu" x="' + (pdx + 4.6) + '" y="' + (ry - 2.6) + '" width="6.2" height="5.2"/>'
              + '<use class="p-cpu" href="#hw-cpu" x="' + (pdx + 11) + '" y="' + (ry - 2.6) + '" width="6.2" height="5.2"/>'
              + '<use class="p-dpu" href="#hw-dpu" x="' + (pdx + 97.4) + '" y="' + (ry - 3) + '" width="8" height="6"/>');
            for (var ni = 0; ni < 4; ni++) panels.push('<use class="p-nic" href="#hw-nic" x="' + (pdx + 107.2 + (ni % 2) * 6.8) + '" y="' + (ry - 3.4 + Math.floor(ni / 2) * 3.4) + '" width="6.4" height="3.2"/>');
            if (b > 0) panels.push('<line class="p-bdiv lod1" x1="' + (pdx + 3) + '" y1="' + (ry - ROWP / 2) + '" x2="' + (pdx + PODW - 3) + '" y2="' + (ry - ROWP / 2) + '"/>');
            for (var n = 0; n < 8; n++) {
              var r = pBase + b * 8 + n; if (r >= world) break;
              var c = coordOfRank(r);
              nodes.push('<rect class="p-npu" data-rank="' + r + '" data-pp="' + c.pp + '" data-pod="' + podIdx + '"'
                + ' x="' + (pdx + 22 + n * PITCH + 1) + '" y="' + (ry - 3.5) + '" width="7" height="7">'
                + '<title>rank ' + r + ' · ' + coordLine(r) + ' · 超节点' + s + ' POD' + podIdx + ' 板' + b + ' 槽' + n + '</title></rect>');
              // rank 号 / 封装图标 / 占用条这三件只在放大到 6× 以上才看得见：不在这里一次建 4096×3 个，见 ensurePodDetail
            }
          }
        }
      }
    }
    // 超节点之间：L2 经 UBoE 互联。直播里只说"经 UBoE 跨超节点"，没给超节点间
    // 的具体拓扑，这里只把相邻面板连起来做示意，不假装知道是环还是全互联。
    for (var s2 = 1; s2 < SPN; s2++) {
      var A = sps[s2 - 1], B = sps[s2];
      if (Math.floor(s2 / cols) === Math.floor((s2 - 1) / cols)) {
        links.push('<line class="p-uboe" x1="' + (A.x + SPW) + '" y1="' + (A.y + HEAD + PLANEH / 2) + '" x2="' + B.x + '" y2="' + (B.y + HEAD + PLANEH / 2) + '"/>'
          + '<text class="p-uboelabel" x="' + (A.x + SPW + SPGAP / 2) + '" y="' + (A.y + HEAD + PLANEH / 2 - 6) + '" text-anchor="middle">UBoE</text>');
      } else {
        var U = sps[s2 - cols];
        links.push('<line class="p-uboe" x1="' + (U.x + SPW / 2) + '" y1="' + (U.y + SPH) + '" x2="' + (B.x + SPW / 2) + '" y2="' + B.y + '"/>'
          + '<text class="p-uboelabel" x="' + (U.x + SPW / 2 + 8) + '" y="' + (U.y + SPH + SPGAP / 2 + 3) + '">UBoE</text>');
      }
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' + lkDefs('p-')
      + '<g class="p-links">' + links.join('') + '</g><g class="p-panels">' + panels.join('') + '</g><g class="p-nodes">' + nodes.join('') + '</g></svg>';
  }

  function relSvg(b) {
    var G = GEO.board[b]; if (!G) return '';
    var L1 = GEO.sw1[G.grp] || [], P2 = GEO.sw2[G.sp] || [], out = [], x0 = G.pdx, ry = G.ry, i, k;
    var NX = function (n) { return x0 + 22 + n * PITCH_ + 4.5; }, NT = ry - 3.5, NB = ry + 4.1;   // NB：rank 号下沿（往下的线不穿字）
    var CPU = [x0 + 7.7, x0 + 14.1], DPU = x0 + 101.4, NIC = function (k9) { return { x: x0 + 107.2 + (k9 % 2) * 6.8 + 3.2, y: ry - 3.4 + Math.floor(k9 / 2) * 3.4 + 1.6 }; };
    // n：这根线属于哪颗 NPU（data-n，选中它就换激活样式）；稀疏干线加衬边（见上面「连线样式」）
    var SPARSE = { 'rel-ub': 1, 'rel-cpu': 1, 'rel-pcie': 1, 'rel-nic': 1, 'rel-roce': 1, 'rel-nsw': 1, 'rel-inf': 1, 'rel-h2d': 1 };
    function put(el, cls) { out.push(SPARSE[cls] ? cased(el) : el); }
    function na(n) { return n == null ? '' : typeof n === 'string' ? ' data-m="' + n + '"' : ' data-n="' + n + '"'; }
    function ln(cls, x1, y1, x2, y2, n) { put('<line class="' + cls + '"' + na(n) + ' x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>', cls); }
    function cv(cls, x1, y1, x2, y2, bend, n) { put('<path class="' + cls + '"' + na(n) + ' d="M' + x1 + ',' + y1 + ' V' + (Math.min(y1, y2) + bend) + ' H' + x2 + ' V' + y2 + '"/>', cls); }
    // ③ L1 → plane SW2
    L1.forEach(function (s1, k9) { (P2[k9] || []).forEach(function (s2) { ln('rel-l12', s1.x, s1.top, s2.x, s2.y); }); });
    // ② NPU → 8 L1   ④ CPU → 8 L1   ⑦ DPU → L1
    for (i = 0; i < 8; i++) L1.forEach(function (s1) { ln('rel-clos', NX(i), NT, s1.x, s1.bot, i); });
    CPU.forEach(function (cx) { L1.forEach(function (s1) { ln('rel-ub', cx, ry - 2.6, s1.x, s1.bot); }); });
    if (L1[7]) ln('rel-ub', DPU, ry - 3, L1[7].x, L1[7].bot);
    // ① fullmesh arcs (above the NPU row)
    for (i = 0; i < 8; i++) for (k = i + 1; k < 8; k++) cv('rel-mesh', NX(i), NT, NX(k), NT, -(0.6 + (k - i) * 0.55), i + ',' + k);
    // ⑤ H2D (below the row)   ⑥ CPU↔CPU   ⑦ DPU—PCIe—CPU0   ⑧ NIC ↔ NPU pair
    for (i = 0; i < 8; i++) cv('rel-h2d', CPU[i < 4 ? 0 : 1], ry + 2.6, NX(i), NB, 2.4 + (i % 4) * 0.5, i);
    ln('rel-cpu', CPU[0] + 3.1, ry, CPU[1] - 3.1, ry);
    cv('rel-pcie', DPU, ry + 3, CPU[0], ry + 2.6, 5.2);
    for (k = 0; k < 4; k++) { var nc = NIC(k); [2 * k, 2 * k + 1].forEach(function (n9) { cv('rel-nic', nc.x, nc.y + 1.6, NX(n9), NB, 3.6 + k * 0.4, n9); }); }
    // ⑩ NIC 交换（POD 形态图 SW·4N：每 CPU 1 口、每 NIC 2 口）——集群层没有这颗小交换的图元，
    //    画成 CPU1 → NIC 列的一条长弧（在 H2D 弧的更外一层）
    cv('rel-nsw', CPU[1], ry + 2.6, NIC(3).x, NIC(3).y + 1.6, 8.2);
    // ⑪ 框内 L2 交换板：本组 8 颗 L1 经交换板框内互联——在 L1 行上沿画一条横贯的汇流线
    if (L1[0] && L1[7]) ln('rel-inf', L1[0].x - 4, L1[0].top - 1.2, L1[7].x + 4, L1[7].top - 1.2);
    // ⑨ RoCE out of the frame (NICs and DPU), up past the L1 row
    for (k = 0; k < 4; k++) { var nr = NIC(k); ln('rel-roce', nr.x, nr.y - 1.6, nr.x, (L1[0] ? L1[0].top : ry) - 4); }
    ln('rel-roce', DPU, ry - 3, DPU, (L1[0] ? L1[0].top : ry) - 4);
    // the board row itself
    out.push('<rect class="rel-row" x="' + (x0 + 2) + '" y="' + (ry - ROWP_ / 2) + '" width="' + (PODW_ - 4) + '" height="' + ROWP_ + '"/>');
    return '<g class="rel lod1" pointer-events="none">' + out.join('') + '</g>';
  }

  function lkDefs(p) {
    function port(id, col, r, op) {
      return '<marker id="' + p + id + '" viewBox="-3 -3 6 6" markerWidth="6" markerHeight="6" markerUnits="strokeWidth" refX="0" refY="0">'
        + '<circle r="' + r + '" fill="' + col + '" fill-opacity="' + op + '"/></marker>';
    }
    return '<defs>' + port('lkp', '#A0A0A0', 1.3, .85) + port('lkh', '#FFFFFF', 1.2, .9) + port('lkj', '#8A8A8A', 1.15, .8) + '</defs>';
  }
  function cased(el) { return el.replace(/ class="[^"]*"/, ' class="lkc"').replace(/<title>[\s\S]*?<\/title>/, '') + el; }

  function buildBoardSvg(bIdx) {
    var W = 960, H = 550, base = bIdx * PHYS.board, pb = physOf(base);
    var NX = function (i) { return 152 + i * 100; };   // NPU/L1/L2 列中心 = 每颗器件图标的中线
    var NPUY = 196, NPUH = 58, L1Y = 310, L1H = 24, SWBY = 465, SWBH = 20, L2Y = 355, L2H = 30, CPUY = 58;   // 名字挪到图标下方后各行之间多留一截
    /* 端点只落在图元上（反馈「算中点的时候不要带上文字」「文字统一放在图标下方居中」）：
       每个器件图标居中、名字在图标正下方居中；从上面来的线接图标**顶边中点**，侧向的线接图标**左右边中点**
       （名字挪到下面之后两侧是空的），往下走的线从**名字下沿中点**出——不穿过字 */
    var AT = NPUY + 4, NB = NPUY + 57;   // NPU：图标顶边 / 名字下沿
    var bg = [], links = [], nodes = [], txt = [];
    var BOX_ICON = { 'b-cpu': 'hw-cpu', 'b-dpu': 'hw-dpu', 'b-nic': 'hw-nic', 'b-l1': 'hw-sw', 'b-nsw': 'hw-sw', 'b-swb': 'hw-sw' };
    // 图元在 48×36 viewBox 里实际画到哪（留白不算）：端点贴的是看得见的边
    var ICV = { 'hw-cpu': [0, 0, 48, 36], 'hw-nic': [0, 0, 48, 36], 'hw-dpu': [0, 0, 48, 36], 'hw-sw': [0, 0, 48, 12] };
    /* 部件：图标居中 + 名字在下。返回端口：x 图标中线，t / b 图标顶 / 底边，m 竖向中线，l / r 左右边，lb 名字下沿 */
    function box(cls, cx, y, w, h, label, title, attrs) {
      var ic = BOX_ICON[cls], vh = ic === 'hw-sw' ? 12 : 36, iw = ic === 'hw-sw' ? 52 : 48, ih = iw * vh / 48, ix = cx - iw / 2, iy = y + 4, v = ICV[ic];
      nodes.push('<g class="' + cls + '"' + (attrs || '') + '><rect x="' + (cx - 32) + '" y="' + y + '" width="64" height="' + 58 + '"/>'
        + '<use href="#' + ic + '" x="' + ix + '" y="' + iy + '" width="' + iw + '" height="' + ih + '"/>'
        + '<text x="' + (cls==='b-l1'?cx+34:cx) + '" y="' + (cls==='b-l1'?iy+ih/2+3:y+53) + '" text-anchor="' + (cls==='b-l1'?'start':'middle') + '">' + label + '</text>' + (title ? '<title>' + title + '</title>' : '') + '</g>');
      var t = iy + v[1] * ih / vh, b = iy + v[3] * ih / vh;
      return { x: cx, t: t, b: b, m: (t + b) / 2, l: ix + v[0] * iw / 48, r: ix + v[2] * iw / 48, lb: cls==='b-l1'?b:y + 58 };   // 图标与名字之间留 5 左右
    }
    // 参数面 RoCE 总线（顶）：NIC 与 DPU 都从这儿出框
    links.push(cased('<line class="b-roce b-bus" x1="60" y1="22" x2="900" y2="22"/>'));
    txt.push('<text class="b-lbl b-lbl-roce" x="904" y="25">RoCE</text>');
    // CPU 行：DPU · NIC0 · CPU0 · NIC1 · NIC2 · CPU1 · NIC3 · SW
    var DP = box('b-dpu', 72, CPUY, 64, 22, 'DPU', 'DPU · PCIe 接 CPU0 · UB 上 L1 · RoCE 出框');
    links.push(cased('<line class="b-roce" x1="' + DP.x + '" y1="22" x2="' + DP.x + '" y2="' + DP.t + '"/>'));
    var SW = box('b-nsw', 905, CPUY + 1, 48, 22, 'SW', 'NIC 交换（POD 形态：SW 挂 4×NIC，每 NIC 2 口；每颗 CPU 1 口）');
    for (var k = 0; k < 4; k++) {
      var NC = box('b-nic', (NX(2 * k) + NX(2 * k + 1)) / 2, CPUY + 1, 58, 22, 'NIC' + k, 'NIC' + k + ' · 1 口 UB 挂 NPU' + (2 * k) + '/NPU' + (2 * k + 1) + ' · RoCE 出框', ' data-nic="' + k + '"');
      links.push(cased('<line class="b-roce" x1="' + NC.x + '" y1="22" x2="' + NC.x + '" y2="' + NC.t + '"/>'));
      // RDMA 端头：NIC 顶上一个空心环（hpc-topology-node 的 RDMA 端点画法）
      nodes.push('<circle class="b-rdma" cx="' + NC.x + '" cy="' + NC.t + '" r="1.2"/>');
      // NIC 交换（POD 形态图「SW 4*N · 2口/N」）：每张 NIC 2 口汇到右侧那颗小交换的顶边中点
      links.push(cased('<path class="b-nsw-l" d="M' + NC.x + ',' + NC.t + ' V48 H' + SW.x + ' V' + SW.t + '"><title>NIC' + k + ' — NIC 交换 · 2 口</title></path>'));
      [2 * k, 2 * k + 1].forEach(function (i) {
        links.push('<line class="b-nicl" data-n="' + i + '" x1="' + NC.x + '" y1="' + NC.lb + '" x2="' + NX(i) + '" y2="' + AT + '"><title>NIC' + k + ' — NPU' + i + ' · UB 1 口</title></line>');
      });
    }
    var CP = [0, 1].map(function (c) {
      var A = box('b-cpu', (NX(4 * c + 1) + NX(4 * c + 2)) / 2, CPUY, 110, 34, 'CPU' + c, 'CPU' + c + ' · H2D 每卡 2 口 UB（x86 走 4 口 PCIe SW）· 8 口 UB 上 L1', ' data-cpu="' + c + '"');
      for (var i = 4 * c; i < 4 * c + 4; i++) links.push('<line class="b-h2d" data-n="' + i + '" x1="' + A.x + '" y1="' + A.lb + '" x2="' + NX(i) + '" y2="' + AT + '"><title>CPU' + c + ' — NPU' + i + ' · H2D · UB 2 口</title></line>');
      links.push(cased('<path class="b-nsw-l" d="M' + A.x + ',' + A.t + ' V40 H' + SW.x + ' V' + SW.t + '"><title>CPU' + c + ' — NIC 交换 · 1 口</title></path>'));
      return A;
    });
    txt.push('<text class="b-lbl" x="' + SW.x + '" y="' + (CPUY + 72) + '" text-anchor="middle">1口/C · 2口/N</text>');
    // CPU0/CPU1 top ports connect through a dedicated orthogonal lane.
    links.push(cased('<path class="b-cpul" d="M' + CP[0].x + ',' + CP[0].t + ' V12 H' + CP[1].x + ' V' + CP[1].t + '"><title>CPU0 — CPU1 互联</title></path>'));
    txt.push('<text class="b-lbl" x="' + ((CP[0].x + CP[1].x) / 2) + '" y="' + 9 + '" text-anchor="middle">CPU↔CPU</text>');   // 骑在弧顶上
    // L1 行（每平面一颗）：先定位置，左右两根 UB 干线要接它们的侧边中点
    var L1A = [];
    for (var k3 = 0; k3 < 8; k3++) L1A.push(box('b-l1', NX(k3), L1Y, 64, L1H, 'P' + (k3 + 1), 'L1 灵衢 SW · 平面 ' + (k3 + 1) + ' · 4 口 → 本平面 4×SW2', ' style="--pc:' + PLANE_C[k3] + '"'));
    // DPU —PCIe— CPU0（两头都从名字下沿出）；DPU/CPU0 —UB— L1 P1 左边中点（走左边沿）；CPU1 —UB— L1 P8 右边中点（走右边沿）
    var PCY = CPUY + 74, UBY = CPUY + 82;
    links.push(cased('<path class="b-pcie" d="M' + DP.x + ',' + DP.lb + ' V' + PCY + ' H' + CP[0].x + ' V' + CP[0].lb + '"><title>DPU — CPU0 · PCIe</title></path>'));
    txt.push('<text class="b-lbl" x="' + (DP.x + 42) + '" y="' + (PCY - 8) + '" text-anchor="middle">PCIe</text>');
    links.push(cased('<path class="b-ub" d="M' + DP.x + ',' + DP.lb + ' V' + UBY + ' H20 V' + L1A[0].m + ' H' + L1A[0].l + '"><title>DPU / CPU0 — L1 · UB</title></path>'));
    links.push(cased('<path class="b-ub b-join" d="M' + CP[0].x + ',' + CP[0].lb + ' V' + UBY + ' H20"/>'));
    links.push(cased('<path class="b-ub" d="M' + CP[1].x + ',' + CP[1].lb + ' V' + UBY + ' H940 V' + L1A[7].m + ' H' + L1A[7].r + '"><title>CPU1 — L1 · UB</title></path>'));
    txt.push('<text class="b-lbl" x="14" y="' + ((CPUY + L1Y) / 2) + '" text-anchor="middle" transform="rotate(-90 14 ' + ((CPUY + L1Y) / 2) + ')">Unified Bus → L1</text>');
    txt.push('<text class="b-lbl" x="946" y="' + ((CPUY + L1Y) / 2) + '" text-anchor="middle" transform="rotate(90 946 ' + ((CPUY + L1Y) / 2) + ')">Unified Bus → L1</text>');
    // NPU 行 + 板内 fullmesh（弧在行上方）：图标居中，rank 号放在图标下方
    for (var i = 0; i < 8; i++) {
      var r = base + i; if (r >= world) break;
      nodes.push('<g class="b-npug"><rect class="p-npu p-bnpu" data-rank="' + r + '" data-slot="' + i + '" data-pp="' + coordOfRank(r).pp + '" x="' + (NX(i) - 32) + '" y="' + NPUY + '" width="64" height="' + NPUH + '"><title>NPU' + i + ' · rank ' + r + ' · ' + coordLine(r) + '</title></rect>'
        + '<use class="b-npuicon" href="#hw-npu" x="' + (NX(i) - 24) + '" y="' + (NPUY + 4) + '" width="48" height="36"/>'
        + '<rect class="b-npustrip" x="' + (NX(i) - 14) + '" y="' + (NPUY + 34) + '" width="28" height="3"/>'
        + '<text class="b-npul" x="' + NX(i) + '" y="' + (NPUY + 53) + '" text-anchor="middle">' + r + '</text></g>');   // 只写全局 rank 号；板内槽号（npuN）只进悬停
      for (var j = i + 1; j < 8; j++) {
        var off = 8 + (j - i - 1) * 4;
        links.push('<path class="b-mesh" data-m="' + i + ',' + j + '" d="M' + NX(i) + ',' + AT + ' V' + (AT - off) + ' H' + NX(j) + ' V' + AT + '"/>');
      }
    }
    txt.push('<text class="b-lbl b-lbl-mesh" x="' + ((NX(3) + NX(4)) / 2) + '" y="' + (NPUY - 58) + '" text-anchor="middle">fullmesh 7×X4</text>');
    // 出板：每颗 NPU 8 口（名字下沿中点出），每口一颗 L1（每平面一颗，接图标顶边中点）
    for (var i2 = 0; i2 < 8; i2++) for (var k2 = 0; k2 < 8; k2++) {
      if (base + i2 >= world) break;
      links.push('<line class="b-fan" data-n="' + i2 + '" style="--pc:' + PLANE_C[k2] + '" x1="' + NX(i2) + '" y1="' + NB + '" x2="' + L1A[k2].x + '" y2="' + L1A[k2].t + '"/>');
    }
    txt.push('<text class="b-lbl" x="' + ((NX(3) + NX(4)) / 2) + '" y="' + (L1Y - 8) + '" text-anchor="middle">Clos 8×X4</text>');
    // L1 → 本平面 4×SW2（L2）
    for (k3 = 0; k3 < 8; k3++) {
      bg.push('<rect class="b-plane" style="--pc:' + PLANE_C[k3] + '" x="' + (NX(k3) - 32) + '" y="' + L2Y + '" width="64" height="' + L2H + '"><title>L2 · 平面 ' + (k3 + 1) + ' · 4×SW2 · 与本平面每颗 L1 成 Clos</title></rect>');
      for (var q = 0; q < 4; q++) {
        var qx = NX(k3) - 20.5 + q * 13;
        bg.push('<rect class="b-sw2" style="--pc:' + PLANE_C[k3] + '" x="' + (qx - 4) + '" y="' + (L2Y + L2H - 11) + '" width="10" height="6"/>');
        links.push('<line class="b-l12" style="--pc:' + PLANE_C[k3] + '" x1="' + (qx + 1) + '" y1="' + L1A[k3].lb + '" x2="' + (qx + 1) + '" y2="' + (L2Y + L2H - 11) + '"/>');
      }
      txt.push('<text class="b-lbl b-lbl-plane" x="' + NX(k3) + '" y="' + (L2Y + 12) + '" text-anchor="middle">P' + (k3 + 1) + '</text>');
      txt.push('<text class="b-lbl b-bundle-count" x="' + (NX(k3) + 33) + '" y="' + (L2Y - 13) + '">×4</text>');
      links.push(cased('<line class="b-ub b-out" x1="' + NX(k3) + '" y1="' + (L2Y + L2H) + '" x2="' + NX(k3) + '" y2="' + (L2Y + L2H + 22) + '"/>'));
    }
    /* 框内 L2「交换板」（POD 形态图：L2 层 2*SW + 2*SW，每颗 L1 出 4 口，作框内板间互联；
       同一块交换板配成 8 口时也可以出框）。本页的 1024P 组网按第一页「单层 SW 出框」画，
       交换板这一层画在 L1 与平面之间，只连 L1、两侧短线表示它通向框内其他板。 */
    [(NX(1) + NX(2)) / 2, (NX(5) + NX(6)) / 2].forEach(function (sx, si) {
      var SB = {x:sx,t:SWBY+4,b:SWBY+17,m:SWBY+10.5,l:sx-55,r:sx+55,lb:SWBY+48};
      nodes.push('<g class="b-swb"><rect x="'+(sx-64)+'" y="'+SWBY+'" width="128" height="48"/>'
       + '<use href="#hw-sw" x="'+(sx-55)+'" y="'+SB.t+'" width="52" height="13"/>'
       + '<use href="#hw-sw" x="'+(sx+3)+'" y="'+SB.t+'" width="52" height="13"/>'
       + '<text x="'+sx+'" y="'+(SWBY+37)+'" text-anchor="middle">交换板 '+(si?'B':'A')+' · 2×SW</text><title>框内 L2 交换板 · 两颗交换器件 · 框内板间互联</title></g>');
      var railY=si?346:338,outerX=si?924:80;
      for (var k4=0;k4<8;k4++) links.push('<line class="b-swbl" x1="'+L1A[k4].x+'" y1="'+L1A[k4].lb+'" x2="'+L1A[k4].x+'" y2="'+railY+'"/>');
      links.push('<path class="b-swbl" d="M'+L1A[si?0:7].x+','+railY+' H'+outerX+' V440 H'+SB.x+' V'+SB.t+'"/>');
      var peerX=si?894:12,peerPort=si?peerX:peerX+54;
      nodes.push('<g class="b-peer"><rect x="'+peerX+'" y="'+(SB.m-11)+'" width="54" height="22" rx="3"/><text x="'+(peerX+27)+'" y="'+(SB.m+3)+'" text-anchor="middle">框内其他板</text><title>交换板连接同框其他板；此处为当前板视图的去向端点</title></g>');
      links.push(cased('<line class="b-swbx" x1="' + (si ? SB.r : SB.l) + '" y1="' + SB.m + '" x2="' + peerPort + '" y2="' + SB.m + '"><title>交换板 → 框内其他板</title></line>'));
    });
    txt.push('<text class="b-lbl" x="' + ((NX(3) + NX(4)) / 2) + '" y="' + (SWBY - 12) + '" text-anchor="middle">框内板间互联</text>');
    // 底部总线不加衬边：上面落下来的 8 根短线要在它身上汇成一排汇接点，衬边会把接点切掉
    links.push('<line class="b-ub b-bus" x1="60" y1="' + (L2Y + L2H + 22) + '" x2="' + (NX(3) + 40) + '" y2="' + (L2Y + L2H + 22) + '"/>'
      + '<line class="b-uboe b-bus" x1="' + (NX(4) - 40) + '" y1="' + (L2Y + L2H + 22) + '" x2="900" y2="' + (L2Y + L2H + 22) + '"/>');
    txt.push('<text class="b-lbl b-lbl-ub" x="60" y="' + (L2Y + L2H + 36) + '">Unified Bus → POD</text>'
      + '<text class="b-lbl b-lbl-uboe" x="900" y="' + (L2Y + L2H + 36) + '" text-anchor="end">UBoE → SuperPoD</text>');
    return '<svg class="near" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' + lkDefs('b-')
      + '<g class="b-bg">' + bg.join('') + '</g><g class="b-links">' + links.join('') + '</g><g class="b-flow"></g><g class="b-nodes">' + nodes.join('') + '</g><g class="b-txt">' + txt.join('') + '</g></svg>';
  }
 return {cluster:buildPhysSvg,board:buildBoardSvg,relations:relSvg,geometry:GEO,physOf,
 podBounds(pod){var b=GEO.board[pod*8];return b?{x:b.pdx,y:b.pdy,width:126,height:84}:null;}};
}
root.LingquPhysicalPattern={create};
})(globalThis);
