"""Shared decision-support cover renderer, driven by chapter JSON."""
import html,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parent
def esc(s): return html.escape(str(s),quote=True)
def render(key,d,model,label):
    master=key=='master'
    focus=d.get('focus')
    widths=[355,560,355] if focus is None else [790 if i==focus else 240 for i in range(3)]
    detail={'attention':'证据随问题深入，整体参照持续可见','layers':'表达可以变化，同一对象的对应关系持续可见','agent':'开发者的判断连同对象、条件与证据一起保留'}.get(key,'')
    shapes=[];start=45
    for i,w in enumerate(widths):
        shapes.append((start,start+w,50 if focus==i else (80 if focus is None else 165)));start+=w
    svg='<svg viewBox="35 12 1290 586" role="img" aria-label="聚焦、理解、介入：当前章节展开，其他环节保留上下文">'
    svg+='<defs><marker id="ds-arrow-'+key+'" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L8 5L1 9" fill="none" stroke="#8996a2" stroke-width="1.2"/></marker></defs>'
    for i,((a,b,top),stage) in enumerate(zip(shapes,model['principles'])):
        a+=12;b-=12
        mid=(a+b)/2;bottom=480-top
        q=(b-a)*.24
        curve=f'M{a} 230C{a+q} 230 {mid-q} {top} {mid} {top}C{mid+q} {top} {b-q} 230 {b} 230 M{a} 250C{a+q} 250 {mid-q} {bottom} {mid} {bottom}C{mid+q} {bottom} {b-q} 250 {b} 250'
        contour="".join(f'<path class="ds-contour" marker-end="url(#ds-arrow-{key})" d="{segment if j==0 else chr(77)+segment}"/>' for j,segment in enumerate(curve.split(" M")))
        muted=focus is not None and focus!=i
        svg+=f'<g class="ds-lobe{ " ds-muted" if muted else " ds-expanded"}" style="--support-accent:{stage["color"]}">{contour}<circle class="ds-port" cx="{a}" cy="230" r="3"/><circle class="ds-port" cx="{a}" cy="250" r="3"/>'
        if muted:
            svg+=f'<text class="ds-context-name" x="{mid}" y="249" text-anchor="middle">{stage["name"]}</text>'
        else:
            svg+=f'<text class="ds-question" x="{mid}" y="{top-22}" text-anchor="middle">{esc(stage["question"])}</text>'
            if focus is not None:
                svg+=f'<text class="ds-stage-caption" x="{mid}" y="119" text-anchor="middle">{stage["name"]}</text>'
                items=stage['expand'].split(' · ')
                widths=[max(70,len(t)*19+36) for t in items];cursor=mid-(sum(widths)+14*(len(items)-1))/2
                for item,w in zip(items,widths):
                    svg+=f'<foreignObject x="{cursor}" y="150" width="{w}" height="44"><div xmlns="http://www.w3.org/1999/xhtml" class="ds-content-tag">{esc(item)}</div></foreignObject>';cursor+=w+14
                svg+=f'<foreignObject x="{mid-310}" y="215" width="620" height="158"><div xmlns="http://www.w3.org/1999/xhtml" class="ds-focus-detail"><p>{esc(d.get("mechanism",d["reasoning"][2]))}</p><span>{esc(detail)}</span></div></foreignObject>'
                principle=stage['principle'];w=sum(12 if ord(c)<128 else 23 for c in principle)+44
                svg+=f'<foreignObject x="{mid-w/2}" y="382" width="{w}" height="48"><div xmlns="http://www.w3.org/1999/xhtml" class="ds-principle">{principle}</div></foreignObject>'
            else:
                svg+=f'<text class="ds-name" x="{mid}" y="265" text-anchor="middle">{stage["name"]}</text>'
                for j,item in enumerate(stage['expand'].split(' · ')):
                    w=max(76,sum(10 if ord(c)<128 else 19 for c in item)+38)
                    svg+=f'<foreignObject x="{mid-w/2}" y="{98+j*43}" width="{w}" height="36"><div xmlns="http://www.w3.org/1999/xhtml" class="ds-content-tag">{esc(item)}</div></foreignObject>'
                principle=stage['principle'];w=sum(12 if ord(c)<128 else 23 for c in principle)+44
                svg+=f'<foreignObject x="{mid-w/2}" y="288" width="{w}" height="48"><div xmlns="http://www.w3.org/1999/xhtml" class="ds-principle">{principle}</div></foreignObject>'
                svg+=f'<text class="ds-detail" x="{mid}" y="372" text-anchor="middle">{stage["converge"]}</text>'
        svg+='</g>'
    headings=['判断需要','体验断点','设计取舍','案例承接']
    reasoning=d['reasoning']
    for i,(h,t) in enumerate(zip(headings,reasoning)):
        svg+=f'<foreignObject x="{30+i*335}" y="490" width="310" height="115"><div xmlns="http://www.w3.org/1999/xhtml" class="ds-reason"><small>{h}</small><p>{esc(t)}</p></div></foreignObject>'
    svg+='</svg>'
    return f'<div class="chapter-theory theory-derivation diamond-theory decision-theory" data-cover-label="{esc(label)}" role="group" aria-label="决策支持框架" style="--diagram-accent:{d["color"]}"><div class="theory-brand">COMPUTE DEVELOPMENT VISUALIZATION<span>DECISION SUPPORT / {dict(attention="FOCUS",layers="CONTINUITY",agent="CONTROL").get(key,key.upper())}</span></div><header><small class="derive-principle">{d["level"]}</small><h2>{d["title"]}</h2><p>{esc(d["context"])}</p></header><div class="diamond-stage">{svg}</div></div>'
def render_handoff(d,label):
    nodes=[(70,300,'AGENT','自动调查','测试 · 收集证据','提出候选解释'),(520,870,'HUMAN × AGENT','决策检查点','当前结论 · 支持证据','关键差异 · 未验证部分'),(1090,1300,'AGENT','根据反馈继续','验证假设 · 更新证据','保留可追溯结果')]
    svg='<svg viewBox="0 0 1360 610" role="img" aria-label="收敛任务和证据，Skill 约束资产选择与组装，Agent 生成并核查表达">'
    svg+='<defs><marker id="handoff-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L8 5L1 9" fill="none" stroke="#8996a2"/></marker></defs>'
    for a,b,top,bottom in [(70,490,100,390),(900,1300,100,390)]:
        mid=(a+b)/2;q=(b-a)*.24
        for y,peak in [(235,top),(255,bottom)]:
            path=f'M{a} {y}C{a+q} {y} {mid-q} {peak} {mid} {peak}C{mid+q} {peak} {b-q} {y} {b} {y}'
            svg+=f'<path class="ds-contour" marker-end="url(#handoff-arrow)" d="{path}"/><circle class="handoff-port" cx="{a}" cy="{y}" r="3"/>'
    for x,role,title,line1,line2 in [(280,'HUMAN × AGENT','收敛任务与证据','明确问题 · 对象与条件','确定需要表达的关系'),(1100,'AGENT','组合已有设计资产','图元 · Pattern · 页面框架','生成并核查表达')]:
        svg+=f'<text class="handoff-role" x="{x}" y="166" text-anchor="middle">{role}</text><text class="handoff-title" x="{x}" y="220" text-anchor="middle">{title}</text><text class="handoff-detail" x="{x}" y="288" text-anchor="middle">{line1}</text><text class="handoff-detail" x="{x}" y="325" text-anchor="middle">{line2}</text>'
    svg+='<foreignObject x="510" y="90" width="370" height="326"><div xmlns="http://www.w3.org/1999/xhtml" class="handoff-check"><small>SKILL / 工作规则</small><h3>复用设计判断</h3><p>选择已有资产 · 约束组装<br/>核查语义、绑定与来源</p><div><span>任务与证据</span><span>对象语义</span><span>关系联动</span><span>交付核查</span></div></div></foreignObject>'
    for i,(title,text) in enumerate([('图元','固定对象角色、变体与视觉语义'),('Pattern + 框架','固定关系联动与页面空间职责'),('Skill','串联问题、证据、资产选择、组装与核查')]):
        svg+=f'<foreignObject x="{40+i*445}" y="465" width="410" height="130"><div xmlns="http://www.w3.org/1999/xhtml" class="ds-reason"><small>{title}</small><p>{text}</p></div></foreignObject>'
    svg+='</svg>'
    return f'<div class="chapter-theory theory-derivation diamond-theory decision-theory" data-cover-label="{esc(label)}" role="group" aria-label="设计资产与 Skill 输出约束" style="--diagram-accent:#d9f550"><div class="theory-brand">COMPUTE DEVELOPMENT VISUALIZATION<span>HUMAN × AGENT / SYSTEM</span></div><header><small class="derive-principle">{esc(d["level"])}</small><h2>{esc(d["title"])}</h2><p>{esc(d["context"])}</p></header><div class="diamond-stage">{svg}</div></div>'

def apply(slides):
    data=json.loads((ROOT/'chapter-derivation-diagrams.json').read_text());model=data['model']
    master={'title':'从判断困难，到决策支持','context':'把可观测性设计成计算开发者的决策支持 · 本项目的设计主张','level':'总框架 · 三个设计原则','color':'#c19cf0','focus':None,'reasoning':['开发者需要判断什么？','注意力、理解或行动在哪里受阻？','由判断困难选择表达与交互','案例机制 → 页面组织 → 复用规则']}
    for key,d in data['chapters'].items():
        section='language' if key=='master' else key
        pattern=r'(<section[^>]*id="'+section+r'"[^>]*>)(<div class="chapter-theory.*?<div class="diamond-stage">.*?</svg></div>(?:<footer>.*?</footer>)?</div>)'
        m=re.search(pattern,slides,re.S)
        if not m: raise ValueError('Missing theory cover '+section)
        label=re.search(r'data-cover-label="([^"]*)"',m.group(2)).group(1)
        if key=='master':label='01  总框架 · 聚焦—理解—介入'
        slides=re.sub(pattern,lambda m:m.group(1)+(render_handoff(d,label) if key=='system' else render(key,d,model,label)),slides,count=1,flags=re.S)
    return slides
if __name__=='__main__':
    path=ROOT/'launch-slides.html';path.write_text(apply(path.read_text()))
