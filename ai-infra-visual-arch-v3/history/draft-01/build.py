"""Build the four-page HTML review from the supplied report-deck template.

Navigation and thumbnail runtime: Vinniechenyu/report-deck-skill.
All case imagery is copied unchanged from the user's AI_Infra checkout.
"""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parent
template = (ROOT / 'vendor/deck-template.html').read_text()

slides = '''
<section class="slide cover-slide" id="agent" data-layout="cover" data-short="Agent 协作 · Scale">
  <header class="head">
    <div><div class="brand">AI INFRA / VISUAL DESIGN <span class="chapter">01 · 开发者与 Agent</span></div>
    <h1 class="title cover-title">让开发者在 Agent 协作中，<em>保留判断</em></h1>
    <p class="subtitle cover-desc">把抽象计算转化为可选择、可核查的视觉关系，接续开发者已有的工作流程。</p></div>
    <div class="page-no">1 / 4</div>
  </header>
  <div class="slide-body">
    <div class="case-layout scale-layout">
      <div class="argument">
        <div class="case-name">SCALE<span>参数共享与输出关系</span></div>
        <h2>Agent 协助处理，<br>开发者核查关系</h2>
        <div class="design-point"><b>01 <span>关系可见</span></b><p>空间布局区分输入、参数与输出，呈现共享关系。</p></div>
        <div class="design-point"><b>02 <span>影响可查</span></b><p>选择或调整参数，关联输出显现作用范围。</p></div>
        <div class="design-point"><b>03 <span>上下文可延续</span></b><p>将选中对象、配置与来源证据带回会话。</p></div>
      </div>
      <figure class="case-media scale-media">
        <button class="media-zoom" data-full="assets/scale.png" aria-label="放大 Scale 关系视图" title="放大 Scale 关系视图"><img src="assets/scale.png" alt="Scale 原型：输入与输出按批次对应，scale 和 bias 居中，共享参数关联两个输出。"></button>
        <figcaption>视觉判断：让参数的作用范围，可以直接在画面中指认。</figcaption>
      </figure>
    </div>
    <div class="workflow"><span class="workflow-label">协作路径</span><span>向 Agent 提问</span><span class="flow-arrow" aria-hidden="true">→</span><strong>在图中选择与核查</strong><span class="flow-arrow" aria-hidden="true">→</span><span>带着证据继续调查</span></div>
  </div>
  <footer class="slide-footer"><span>AI Infra 视觉设计复盘</span><span>设计目标与原型探索 · 2026.11.02</span></footer>
</section>

<section class="slide" id="attention" data-layout="evidence-grid" data-short="视觉聚焦 · 执行泳道">
  <header class="head">
    <div><div class="brand">AI INFRA / VISUAL DESIGN <span class="chapter">02 · 注意力与比较</span></div>
    <h2 class="title">让当前问题成为焦点，<em>同时保留全局</em></h2>
    <p class="subtitle">在大量相似事件中，用视觉强度与空间对齐，建立清楚的阅读顺序。</p></div>
    <div class="page-no">2 / 4</div>
  </header>
  <div class="slide-body">
    <div class="case-layout attention-layout">
      <figure class="case-media swimlane-media">
        <button class="media-zoom" data-full="assets/swimlane.png" aria-label="放大推理执行泳道" title="放大推理执行泳道"><img src="assets/swimlane.png" alt="推理执行泳道的已有画面：Serving、Host 和 Device 共享时间轴，lane 6 的关注路径以橙红色呈现。"></button>
        <figcaption>实际画面 · 橙红色表示调查关注路径</figcaption>
      </figure>
      <div class="argument">
        <div class="case-name">INFERENCE REQUEST<span>执行泳道</span></div>
        <div class="design-point"><b>01 <span>灰阶保留整体</span></b><p>重复事件保持较低视觉强度，整体分布仍然可见。</p></div>
        <div class="design-point"><b>02 <span>强调色集中注意</span></b><p>关注路径和关联对象共同显现，减少逐行搜索。</p></div>
        <div class="design-point"><b>03 <span>对齐支持比较</span></b><p>共享时间轴与上下配对，让起点和区间差异可比较。</p></div>
        <p class="tradeoff">取舍<span>降低周边强度，保留判断所需的上下文。</span></p>
      </div>
    </div>
  </div>
  <footer class="slide-footer"><span>视觉变量 · 明暗 / 色彩 / 对齐</span><span>AI Infra · Visual Design Review</span></footer>
</section>

<section class="slide" id="layers" data-layout="evidence-grid" data-short="观察层级 · Layer Stack">
  <header class="head">
    <div><div class="brand">AI INFRA / VISUAL DESIGN <span class="chapter">03 · 整体与局部</span></div>
    <h2 class="title">进入局部时，<em>仍然知道自己在看哪里</em></h2>
    <p class="subtitle">用稳定的层序与对象身份，连接整网分布、层内结构和张量采样。</p></div>
    <div class="page-no">3 / 4</div>
  </header>
  <div class="slide-body">
    <div class="case-layout layer-layout">
      <figure class="case-media layer-media">
        <button class="media-zoom" data-full="assets/layer-stack.png" aria-label="放大 Layer Stack" title="放大 Layer Stack"><img src="assets/layer-stack.png" alt="Layer Stack 已有画面：L0 到 L48 依序排列，L18 抬起成为焦点，平面内部呈现计算结构。"></button>
        <figcaption>Layer Stack · 重复平面建立层序，当前层形成视觉焦点。</figcaption>
      </figure>
      <div class="argument layer-argument">
        <div class="case-name">LAYER STACK<span>观察尺度的组织</span></div>
        <div class="scale-step"><span class="step-index">01</span><div><h3>整网 · 看分布</h3><p>重复结构保留层序，支持跨层定位。</p></div></div>
        <div class="scale-step"><span class="step-index">02</span><div><h3>单层 · 看关系</h3><p>选中层成为焦点，正视图承载层内计算。</p></div></div>
        <div class="scale-step"><span class="step-index">03</span><div><h3>张量 · 看细节</h3><p>Query 采样检查沿用当前选层与张量模式。</p></div></div>
        <p class="tradeoff">取舍<span>总览呈现结构，精确读数进入局部。</span></p>
      </div>
    </div>
    <div class="continuity"><span>持续保留的上下文</span><strong>选中层</strong><i>·</i><strong>张量对象</strong><i>·</i><strong>训练阶段</strong></div>
  </div>
  <footer class="slide-footer"><span>视觉变量 · 层序 / 焦点 / 观察尺度</span><span>AI Infra · Visual Design Review</span></footer>
</section>

<section class="slide" id="system" data-layout="pattern-system" data-short="团队资产 · 图元与 Pattern">
  <header class="head">
    <div><div class="brand">AI INFRA / VISUAL DESIGN <span class="chapter">04 · 体系与延续</span></div>
    <h2 class="title">把设计判断，沉淀为<em>团队可延续的规则</em></h2>
    <p class="subtitle">从对象表达，到关系组合，再到可执行的方法，为新的技术问题保留设计起点。</p></div>
    <div class="page-no">4 / 4</div>
  </header>
  <div class="slide-body">
    <div class="system-layout">
      <article class="system-stage glyph-stage">
        <div class="stage-index">01 / 基础语言</div><h3>对象如何表达</h3>
        <div class="glyph-display"><img src="assets/tensor.svg" alt="直接复用正式图例库的数据角色 Tensor 图元。"></div>
        <p>记录形状、颜色与标签的语义分工，让相同对象有可辨认的表达。</p>
        <div class="stage-output">图元与变体</div>
      </article>
      <article class="system-stage pattern-stage">
        <div class="stage-index">02 / 场景组合</div><h3>关系如何组织</h3>
        <button class="pattern-preview" data-full="assets/logsumexp.png" aria-label="放大 LogSumExp 归约访存检查" title="放大 LogSumExp 归约访存检查"><img src="assets/logsumexp.png" alt="LogSumExp Pattern：逻辑输入、GM、UB 与 work 布局在同一画布中建立映射。"></button>
        <p>把对象放进实际关系，形成计算、执行、内存与层级观察的 Pattern。</p>
        <div class="stage-output">可复用的关系与交互</div>
      </article>
      <article class="system-stage method-stage">
        <div class="stage-index">03 / 执行方法</div><h3>新问题如何沿用</h3>
        <div class="method-list"><div><span>任务</span>明确要判断什么</div><div><span>对象</span>固定身份与来源</div><div><span>视图</span>选择已有表达</div><div><span>核查</span>保留证据与边界</div></div>
        <p>将适用条件、组合方式与检查点写入方法，供团队和 Agent 沿用。</p>
        <div class="stage-output">方法与 Skills</div>
      </article>
    </div>
    <div class="system-conclusion"><span>已有沉淀</span><strong>图元、Pattern 与方法资产</strong><span class="next-label">下一步</span><p>在真实开发任务中，验证复用效果与适用边界。</p></div>
  </div>
  <footer class="slide-footer"><span>从单次交付，走向持续积累</span><span>AI Infra · Visual Design Review / Draft 01</span></footer>
</section>
'''

css = '''
/* The deck's presentation theme; source screenshots and glyphs are untouched. */
:root{--background:#111111;--card:#181918;--foreground:#f1f2ee;--secondary-foreground:#b4b7af;--muted-foreground:#858981;--primary:#d9edaa;--primary-foreground:#151811;--primary-soft:#272d20;--accent:#d9edaa;--border:#32352e;--sans:"PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,sans-serif;--mono:"SFMono-Regular",Consolas,monospace;--fs-display:3.5cqw;--fs-h1:2.85cqw;--fs-h2:1.8cqw;--fs-h3:1.5cqw;--fs-body:1.27cqw;--fs-sm:1.1cqw;--fs-xs:.86cqw}
html{scroll-snap-type:y mandatory;background:#080908;scrollbar-width:none}html::-webkit-scrollbar{display:none}
body{background:#080908;color:var(--foreground);height:auto;overflow:visible}
#deck{display:flex;flex-direction:column}
.slide{--slide-w:min(100vw,177.7778vh);--slide-h:min(56.25vw,100vh);width:var(--slide-w);height:var(--slide-h);padding:calc(var(--slide-h)*.045) calc(var(--slide-w)*.044) calc(var(--slide-h)*.112);margin:calc((100vh - var(--slide-h))/2) auto;flex-shrink:0;background:#111111;isolation:isolate}
body.navigator-open .slide{--slide-w:min(calc(100vw - var(--navigator-w) - 32px),177.7778vh);--slide-h:min(calc((100vw - var(--navigator-w) - 32px)*.5625),100vh)}
.thumb-stage .slide{--slide-w:1600px!important;--slide-h:900px!important}
.cover-slide{background:#111111;color:var(--foreground)}.cover-slide::before{display:none}
.head{margin:0 0 2.7cqh;gap:1cqw}.brand{display:flex;align-items:center;font:500 var(--fs-xs)/1.4 var(--mono);letter-spacing:.1em;color:#a0a59a}
.chapter{font-family:var(--sans);margin-left:2cqw;padding-left:1.8cqw;border-left:1px solid #44483e;letter-spacing:.03em;color:#aeb3a6}
.title,.cover-title{font:600 var(--fs-h1)/1.26 var(--sans);letter-spacing:-.04em;max-width:none;margin:1.6cqh 0 0;white-space:nowrap}
.title em{font-style:normal;color:var(--primary)}
.subtitle,.cover-desc{font:400 var(--fs-body)/1.6 var(--sans);margin:1.3cqh 0 0;color:#a5aa9e;max-width:none}
.page-no{font:400 .9cqw/1.4 var(--mono);color:#919789;padding-top:.15cqh}
.slide-body{display:flex;gap:1.4cqh}.case-layout{display:grid;flex:1;min-height:0;min-width:0;gap:3cqw;align-items:stretch}
.scale-layout{grid-template-columns:22% 1fr}.attention-layout{grid-template-columns:1fr 23%;gap:3.2cqw}.layer-layout{grid-template-columns:1fr 23%;gap:2cqw}
.argument{display:flex;flex-direction:column;min-height:0;min-width:0;padding-top:1.3cqh}
.case-name{font:500 .95cqw/1.4 var(--mono);letter-spacing:.06em;color:#dfe5d6;margin-bottom:1.8cqh}
.case-name span{display:block;font:400 1.1cqw/1.5 var(--sans);letter-spacing:0;color:#929989;margin-top:.4cqh}
.argument h2{font-size:var(--fs-h2);font-weight:500;line-height:1.45;margin:0 0 2cqh;color:#e9ece4;letter-spacing:-.02em}
.design-point{margin-top:2.1cqh}.design-point b{font:500 .92cqw/1.4 var(--mono);color:#9bac87;display:flex;gap:.9cqw;align-items:baseline}
.design-point b span{font:500 var(--fs-h3)/1.3 var(--sans);color:#e9ece3}
.design-point p{margin:.8cqh 0 0;font-size:var(--fs-body);line-height:1.65;color:#a8afa0}
.case-media{min-height:0;min-width:0;margin:0;display:flex;flex-direction:column;background:#111;overflow:hidden}
.media-zoom{display:block;flex:1;min-height:0;width:100%;border:0;padding:0;margin:0;background:#111;cursor:zoom-in;overflow:hidden;text-align:initial}
.media-zoom img{width:100%;height:100%;object-fit:contain;display:block}
.scale-media img{object-position:center center}
figcaption{flex:0 0 auto;font-size:var(--fs-sm);line-height:1.4;color:#919989;padding:1cqh 0 .4cqh}
.workflow{display:flex;align-items:center;justify-content:center;gap:1.7cqw;min-height:5.6cqh;flex-shrink:0;border-top:1px solid #353a2e;font-size:var(--fs-body);color:#c3c9b9}
.workflow-label{font-size:var(--fs-sm);color:#8c9581;margin-right:.5cqw}.flow-arrow{color:#6c785c;font-size:1.45cqw}.workflow strong{font-weight:500;color:#d9edaa}
.tradeoff{margin:3.2cqh 0 0;padding-top:2.2cqh;border-top:1px solid #34382f;color:#a5b093;font-size:var(--fs-sm);line-height:1.5}.tradeoff span{display:block;margin-top:1cqh;color:#c3cbbb;font-size:var(--fs-body);line-height:1.6}
.attention-layout .case-name{margin-bottom:1.2cqh}.attention-layout .design-point{margin-top:2.5cqh}
.swimlane-media img{object-fit:contain;object-position:left center}
.layer-media img{object-fit:contain;object-position:left center}.layer-argument{padding-top:.6cqh}
.scale-step{display:flex;gap:1.1cqw;margin-top:3cqh;align-items:baseline}.step-index{font:400 .9cqw/1.5 var(--mono);color:#b3c496}.scale-step h3{font-size:var(--fs-h3);font-weight:500;line-height:1.4;margin:0;color:#e8ece1}.scale-step p{font-size:var(--fs-body);line-height:1.6;color:#a5ae9b;margin:.8cqh 0 0}
.continuity{display:flex;gap:1.5cqw;justify-content:center;align-items:center;min-height:5cqh;flex-shrink:0;border-top:1px solid #353a2e;color:#aab79a;font-size:var(--fs-body)}.continuity>span{font-size:var(--fs-sm);color:#929e82;margin-right:1cqw}.continuity strong{font-weight:400;color:#dce4d1}.continuity i{font-style:normal;color:#646f57}
.slide-footer{position:absolute;bottom:7.6cqh;left:4.4cqw;right:4.4cqw;display:flex;justify-content:space-between;gap:2cqw;color:#707a66;font:400 .78cqw/1.4 var(--sans)}
.system-layout{display:grid;grid-template-columns:.9fr 1.28fr 1fr;gap:3cqw;flex:1;min-height:0;min-width:0;padding-top:.8cqh}
.system-stage{display:flex;flex-direction:column;min-height:0;min-width:0;padding:0 2cqw 0 0;border-right:1px solid #33382d}.system-stage:last-child{border:0;padding-right:0}
.stage-index{font:400 var(--fs-sm)/1.4 var(--mono);color:#aaba95}.system-stage h3{font-weight:500;font-size:2cqw;line-height:1.4;margin:1.3cqh 0 0;letter-spacing:-.03em}
.glyph-display{flex:1;min-height:0;display:flex;align-items:center;justify-content:center}.glyph-display img{display:block;width:100%;max-height:27cqh;object-fit:contain}
.pattern-preview{display:block;min-height:0;flex:1;margin:1.6cqh 0;border:0;background:transparent;padding:0;cursor:zoom-in;overflow:hidden}.pattern-preview img{display:block;width:100%;height:100%;object-fit:contain}
.system-stage p{font-size:var(--fs-body);line-height:1.65;color:#aab29f;margin:1.7cqh 0 2cqh;min-height:7cqh}.stage-output{font-size:var(--fs-sm);line-height:1.4;color:#d6e8b9;padding-top:1.2cqh;border-top:1px solid #353c2c}
.method-list{display:flex;flex:1;min-height:0;flex-direction:column;justify-content:center;gap:2.3cqh;padding-top:1.3cqh;font-size:var(--fs-body);color:#bbc4af}.method-list div{display:flex;gap:1.3cqw;align-items:baseline}.method-list span{font-size:1.6cqw;font-weight:500;color:#eef1e8;flex-shrink:0}
.system-conclusion{border-top:1px solid #48533a;display:flex;align-items:center;gap:1cqw;margin-top:2.4cqh;padding-top:2.2cqh;flex-shrink:0;font-size:var(--fs-sm);color:#8f9e7d;line-height:1.5}.system-conclusion strong{font-size:var(--fs-body);font-weight:500;color:#dce8cc}.system-conclusion p{font-size:var(--fs-body);margin:0;color:#b2bfa2}.next-label{margin-left:auto}
/* Presentation controls stay outside the evidence area. Selected states use fill. */
.deck-view-switcher{background:#20231c;border:1px solid #424a38;box-shadow:none;bottom:10px;gap:3px;padding:4px}
.deck-view-switcher button{min-height:36px;min-width:48px;font-size:12px;color:#b7c1aa}.deck-view-switcher button:hover{background:#343e2b;color:#e7efdc}.deck-view-switcher button.active{background:#d9edaa;color:#161c10;box-shadow:none}
.deck-position{border-left-color:#48523a;color:#a9b99a}.deck-navigator,.nav-title,.deck-lighttable,.lt-head{background:#151811}.nav-item.active,.lt-item.active{background:#d9edaa;color:#151b0e;box-shadow:none;outline:none}.lt-item.active .lt-meta span{color:#3f4b30}.thumb-frame,.lt-item .thumb-frame{box-shadow:none;background:#111}.lt-grid{grid-template-columns:repeat(2,minmax(0,1fr));max-width:1160px}.nav-label,.lt-meta{font-family:var(--sans)}
:focus-visible{outline:none;background-color:#d9edaa!important;color:#161c10!important;text-decoration:underline;text-underline-offset:4px}.media-zoom:focus-visible,.pattern-preview:focus-visible{background:#293820!important}.media-zoom:focus-visible img,.pattern-preview:focus-visible img{opacity:.82}
.lightbox{padding:40px;cursor:default;background:#080b07ed}.lightbox-media{max-width:94vw;max-height:88vh;display:flex;align-items:center;justify-content:center}.lightbox img{display:block;max-width:94vw;max-height:88vh;border-radius:0}.close-lightbox{position:absolute;right:20px;top:18px;border:0;border-radius:999px;background:#d9edaa;color:#161c10;padding:10px 18px;cursor:pointer}
.edge-button{padding:0!important;min-width:38px!important;font-size:19px!important}.notes-button{position:fixed;right:18px;bottom:14px;z-index:9010;border:0;border-radius:999px;background:#242b1b;color:#cbd8ba;padding:10px 16px;font-size:12px;cursor:pointer}
.speaker-dialog{border:1px solid #424c36;background:#171c12;color:#e6eddc;width:min(820px,88vw);max-height:80vh;padding:28px 32px;border-radius:14px;font:16px/1.85 var(--sans)}.speaker-dialog::backdrop{background:#060905c9}.speaker-dialog h2{font-size:24px;line-height:1.45;margin:0 50px 18px 0}.speaker-dialog h3{font-size:15px;letter-spacing:.04em;color:#b6cd96;margin:24px 0 8px}.speaker-dialog p{margin:10px 0;color:#cbd5bf}.speaker-dialog .notes-close{position:absolute;top:20px;right:20px;border:0;background:#d9edaa;color:#11180b;padding:8px 13px;border-radius:999px;cursor:pointer}.speaker-dialog a{color:#d9edaa}.speaker-dialog ul{padding-left:20px}.speaker-dialog li{margin:5px 0}.speaker-dialog .boundary{font-size:14px;color:#a7b29a;border-top:1px solid #3f4a33;padding-top:14px}
@media(max-width:700px){.deck-view-switcher{display:flex!important;bottom:8px}.deck-view-switcher button{padding:0 7px;min-width:33px;min-height:30px;font-size:10px}.deck-position{font-size:10px;min-width:40px;padding:0 5px}.notes-button{right:8px;bottom:9px;font-size:10px;padding:9px}.slide-footer{font-size:.78cqw}.deck-navigator{width:220px!important}.lt-grid{grid-template-columns:1fr}.deck-lighttable{padding:60px 16px 70px}.chapter{letter-spacing:0}}
@media print{.deck-view-switcher,.deck-navigator,.deck-lighttable,.navigator-resizer,.notes-button,.lightbox,.speaker-dialog{display:none!important}html,body{background:#111;width:1600px;height:auto;overflow:visible}.slide{width:1600px!important;height:900px!important;break-after:page;margin:0;print-color-adjust:exact;-webkit-print-color-adjust:exact}#deck{padding:0!important}@page{size:16in 9in;margin:0}}
'''

notes = [
 {'title':'让开发者在 Agent 协作中，保留判断','script':[
 '我的一个设计目标，是让可视化自然地进入开发者与 Agent 协作的工作流程。Agent 可以协助分析和生成代码，开发者仍然需要判断：它理解的计算关系是否正确，参数变化影响了哪里，下一步应该核查什么。',
 'Scale 把这些判断组织成可操作的画面。输入、参数与输出按照计算关系布置，颜色区分数据角色；开发者选择或修改参数时，可以核查关联输出，再将当前对象与来源证据带回会话。',
 '视觉设计的重点，是让抽象关系成为能够辨认、比较和指认的对象，使讨论拥有具体落点。目标是支持已有开发流程中的理解与核查环节。'],
 'sources':[
 {'label':'Scale · 原型说明与验证边界','path':'ai-infra-research/prototypes/scale-investigation-trial/README.md'},
 {'label':'Scale · 对象与交接数据契约','path':'ai-infra-research/prototypes/scale-investigation-trial/model.js'},
 {'label':'AI Infra 计算可视化 · 总 workflow','path':'ai-infra-research/methods/ai-infra-investigation/README.md'}],
 'boundary':'设计目标与原型探索。当前参考关系和数值检查基于固定来源及确定性数据，不是 NPU 设备结果。证据复制是交接能力，不表示已接入自动双向 Agent 会话。尚无真实开发任务的效率收益测量。'},
 {'title':'让当前问题成为焦点，同时保留全局','script':[
 '执行泳道里有大量相似事件。如果每条泳道、每个标签和每条连线都有相同的视觉强度，读者就需要逐项搜索。',
 '这里用灰阶保留整体分布，将强调色集中到当前调查路径。共享时间轴让起点与区间可以比较；上下配对和局部连接则帮助读者找到跨层对应。',
 '视觉取舍是让重点足够突出，同时保留判断所需的上下文。它支持提出调查方向，后续仍需回到原始事件验证。'],
 'sources':[{'label':'Inference Request · Pattern 与数据口径','path':'ai-infra-research/patterns/critical-path-swimlane/README.md'}],
 'boundary':'截图来自仓库现有封面。Device 行是 Host 记录的 runner_run 调用窗口，不是独立采集的设备执行时长。关注路径不证明唯一因果瓶颈。本页未虚构 Before/After 或用户效率指标。'},
 {'title':'进入局部时，仍然知道自己在看哪里','script':[
 'Layer Stack 同时面对整网分布、单层计算结构和具体张量三个观察尺度。它们需要各自的阅读方式，也需要保留彼此的对应。',
 '重复平面建立层序，当前层抬起成为焦点，前后层保留为参照；单层正视图承载计算关系，矩阵检查器承载采样坐标与数值。选择与张量模式成为不同视图间的共同上下文。',
 '这里的视觉取舍是：总览保留结构与分布，精确读数进入局部。不同视图承担不同任务，持续回答当前对象来自哪里。'],
 'sources':[{'label':'Layer Stack · 已有规格与视觉编码','path':'layer_stack/pangu-layer-stack-spec.md'},
 {'label':'单层正视图 · 数据绑定与模式','path':'layer_stack/layer-front-notes.md'},
 {'label':'Layer Atlas 2 · Pattern 来源','path':'layer_stack/pangu-layer-atlas-2.md'}],
 'boundary':'主图为 Layer Atlas 2 的已有截图；单层正视图和 Query 检查能力另据仓库说明。不同文件与版本的能力不表示已在同一入口完整验收。数值与传播用于原型表达，不是整网实测；图中没有展示或宣称完整连续变形。'},
 {'title':'把设计判断，沉淀为团队可延续的规则','script':[
 '作为团队中承担视觉设计的角色，我也在考虑：这些判断如何继续支持新的技术内容。',
 '目前逐步积累了三个层次。图元记录对象的视觉语义；Pattern 把对象放进具体关系和交互中；方法与 Skills 则记录适用条件、来源约束与检查方式，供团队和 Agent 沿用。',
 '这些资产已有具体应用，跨页面仍然存在需要统一和验证的地方。下一步希望通过真实开发任务，检验哪些规则可以直接复用，哪些需要保留场景差异。'],
 'sources':[{'label':'正式图例库 · 对象与视觉语言','path':'ai-infra-research/reports/llm-compute/diagram-legend-library/OBJECT-SYSTEM.md'},
 {'label':'LogSumExp · 关系映射与验证范围','path':'ai-infra-research/prototypes/logsumexp-case5/README.md'},
 {'label':'图元接入 · 方法边界','path':'ai-infra-research/methods/ai-infra-glyphs/README.md'}],
 'boundary':'Tensor SVG 从正式 inventory 的 system-value / data-1 变体原样抽取；LogSumExp 使用仓库已有截图。资产与静态验证不等于已证明团队复用收益。页面不主张所有图元与场景均为个人从零原创；个人贡献归属应结合实际协作过程确认。'}
]

html = re.sub(r'<title>.*?</title>', '<title>AI Infra · 视觉设计复盘 / Draft 01</title>', template)
html = html.replace('</title>', '</title>\n<link rel="icon" href="data:,">', 1)
html = html.replace('</style>', css + '\n</style>', 1)
html = re.sub(r'<main id="deck">.*?</main>', '<main id="deck">\n' + slides + '\n</main>', html, flags=re.S)
html = html.replace('导航器 / Navigator · ', '页面导航 · ').replace('2 页</span>', '4 页</span>')
html = html.replace('幻灯片总览 / Overview', '四页总览').replace('点击任意页面返回演示 / Click a slide to resume','点击页面返回演示')
html = html.replace('<span class="deck-position" aria-live="polite">1 / 2</span>', '<span class="deck-position" aria-live="polite">1 / 4</span>')
html = html.replace('<button type="button" data-view="slide"', '<button type="button" class="edge-button" data-prev aria-label="上一页" title="上一页（←）">‹</button>\n  <button type="button" data-view="slide"', 1)
html = html.replace('</nav>','<button type="button" class="edge-button" data-next aria-label="下一页" title="下一页（→）">›</button></nav>',1)
html = html.replace('<div class="lightbox" aria-hidden="true"><div class="lightbox-media"></div></div>',
 '<div class="lightbox" role="dialog" aria-modal="true" aria-label="图片预览" aria-hidden="true" inert><button class="close-lightbox" title="关闭图片预览（Esc）">关闭</button><div class="lightbox-media"></div></div>\n<button class="notes-button" title="查看当前页讲稿与来源（N）" aria-haspopup="dialog">讲稿 · N</button>\n<dialog class="speaker-dialog" aria-labelledby="notes-title"><button class="notes-close" title="关闭讲稿（Esc）">关闭</button><h2 id="notes-title"></h2><div class="notes-content"></div></dialog>')
# Keep template navigation, adding direct page controls, hash state and keyboard guards.
html = html.replace("var chapter=slide.querySelector('.brand'),title=slide.querySelector('.title,.cover-title');", "if(slide.dataset.short)return slide.dataset.short;\n    var chapter=slide.querySelector('.brand'),title=slide.querySelector('.title,.cover-title');")
html = html.replace("scrollIntoView({behavior:'smooth',block:'center'})", "scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'center'})")
html = html.replace("position.textContent=(current+1)+' / '+slides.length;", "position.textContent=(current+1)+' / '+slides.length;\n    document.querySelector('[data-prev]').disabled=current===0;document.querySelector('[data-next]').disabled=current===slides.length-1;\n    window.deckCurrent=current;\n    history.replaceState(null,'','#'+slides[current].id);\n    document.dispatchEvent(new CustomEvent('deck:change',{detail:{index:current}}));")
html = html.replace("switcher.addEventListener('click',function(e){var b=e.target.closest('button[data-view]');if(b)setView(b.dataset.view,true);});", "switcher.addEventListener('click',function(e){var b=e.target.closest('button[data-view]');if(b)setView(b.dataset.view,true);if(e.target.closest('[data-prev]'))goTo(current-1);if(e.target.closest('[data-next]'))goTo(current+1);});")
html = html.replace("switcher.querySelectorAll('button').forEach", "switcher.querySelectorAll('button[data-view]').forEach")
html = html.replace("document.body.classList.toggle('navigator-open',view==='navigator');", "deck.inert=view==='overview';\n    document.body.classList.toggle('navigator-open',view==='navigator');")
html = html.replace("if(document.querySelector('.lightbox.open'))return;", "if(document.querySelector('.lightbox.open')||document.querySelector('.speaker-dialog[open]')||e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,textarea,select,[contenteditable=\"true\"]'))return;")
html = html.replace("if(e.key==='1')setView('slide',true);", "if(e.key==='n'||e.key==='N'){document.querySelector('.notes-button').click();return;}\n    if(e.key==='1')setView('slide',true);")
html = html.replace("window.addEventListener('resize',sizeThumbs);", "window.addEventListener('resize',sizeThumbs);\n  var initial=slides.findIndex(function(s){return '#'+s.id===location.hash;});\n  current=initial>=0?initial:0;slides[current].scrollIntoView({behavior:'instant',block:'center'});updateActive();\n  window.addEventListener('hashchange',function(){var i=slides.findIndex(function(s){return '#'+s.id===location.hash;});if(i>=0)goTo(i);});")
# Replace the template lightbox with focus-safe mouse and keyboard behavior.
start = html.index('/* ==== 放大预览 / Media lightbox ==== */')
end = html.index('</script>', start)
lightbox = '''/* Media preview and presenter notes. */
(function(){
 const lb=document.querySelector('.lightbox'),media=lb.querySelector('.lightbox-media');let prior=null;
 function close(){lb.classList.remove('open');lb.setAttribute('aria-hidden','true');lb.inert=true;media.replaceChildren();if(prior)prior.focus({preventScroll:true});}
 document.addEventListener('click',function(e){const host=e.target.closest('[data-full]');if(host){prior=host;const img=document.createElement('img');img.src=host.dataset.full;img.alt=host.querySelector('img')?.alt||'原图';media.replaceChildren(img);lb.inert=false;lb.classList.add('open');lb.setAttribute('aria-hidden','false');lb.querySelector('button').focus();return;}if(e.target===lb||e.target.closest('.close-lightbox'))close();});
 document.addEventListener('keydown',function(e){if(!lb.classList.contains('open'))return;if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){e.preventDefault();lb.querySelector('button').focus();}});
 const notes=JSON.parse(document.querySelector('#speaker-data').textContent),dialog=document.querySelector('.speaker-dialog'),trigger=document.querySelector('.notes-button');
 function openNotes(){const n=notes[window.deckCurrent||0];dialog.querySelector('h2').textContent=n.title;const body=dialog.querySelector('.notes-content');body.replaceChildren();const heading=document.createElement('h3');heading.textContent='口述稿';body.append(heading);n.script.forEach(t=>{const p=document.createElement('p');p.textContent=t;body.append(p);});const sh=document.createElement('h3');sh.textContent='来源';body.append(sh);const ul=document.createElement('ul');n.sources.forEach(s=>{const li=document.createElement('li'),a=document.createElement('a');a.href='https://github.com/yinyucheng0601/AI_Infra/blob/main/'+s.path;a.target='_blank';a.rel='noopener';a.textContent=s.label;li.append(a);ul.append(li);});body.append(ul);const b=document.createElement('p');b.className='boundary';b.textContent=n.boundary;body.append(b);dialog.showModal();}
 trigger.addEventListener('click',openNotes);dialog.querySelector('.notes-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>trigger.focus({preventScroll:true}));dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
})();
'''
html = html[:start] + lightbox + html[end:]
html = html.replace('<script>','<script id="speaker-data" type="application/json">'+json.dumps(notes,ensure_ascii=False).replace('</','<\\/')+'</script>\n<script>',1)
html = html.replace('<!-- 默认封面：保留结构，替换内容与品牌 token / Default cover: keep the composition, replace content and brand tokens. -->','')
(ROOT/'index.html').write_text(html)
(ROOT/'speaker-notes.json').write_text(json.dumps(notes,ensure_ascii=False,indent=2))
print('Built index.html: 4 slides, local assets, presenter notes, template three-view navigation.')
