"""Build the launch-style HTML presentation; Draft 01 stays in history/."""
from pathlib import Path
import json
import re

ROOT=Path(__file__).resolve().parent
base=(ROOT/'history/draft-01/index.html').read_text()
template=(ROOT/'vendor/deck-template.html').read_text()
nav_css=template[template.index('/* ===== 三视图导航'):template.index('/* ===== 放大预览')]
styles=nav_css+'\n'+(ROOT/'launch.css').read_text()
html=re.sub(r'<style>.*?</style>',lambda _: '<style>\n'+styles+'\n</style>',base,count=1,flags=re.S)
slides=(ROOT/'launch-slides.html').read_text()
planes=[]
for i in range(49):
    face=(ROOT/f'assets/layer-faces/layer-{i}.svg').read_text() if i==18 else f'<img src="assets/layer-faces/layer-{i}.svg" alt="" loading="eager">'
    planes.append(f'<div class="layer-plane {"selected-plane" if i==18 else ""}" style="--i:{i};z-index:{i}"><span class="layer-number">L{i}</span>{face}</div>')
slides=slides.replace('<div class="layer-stack" id="layer-stack"></div>','<div class="layer-stack" id="layer-stack">'+''.join(planes)+'</div>')
html=re.sub(r'<main id="deck">.*?</main>',lambda _: '<main id="deck">\n'+slides+'\n</main>',html,flags=re.S)
notes=json.loads((ROOT/'speaker-notes.json').read_text())
html=re.sub(r'<script id="speaker-data" type="application/json">.*?</script>',lambda _:'<script id="speaker-data" type="application/json">'+json.dumps(notes,ensure_ascii=False).replace('</','<\\/')+'</script>',html,flags=re.S)
html=html.replace('Draft 01</title>','Launch Draft 03</title>')
html=html.replace('<span class="deck-position"','<button type="button" data-play title="暂停分步演示（P）" aria-label="暂停分步演示">暂停</button><span class="deck-position"',1)
html=html.replace('上一页（←）','上一页（PageUp）').replace('下一页（→）','下一页（PageDown）')
html=html.replace('<div class="lightbox"','<div class="launch-hint">空格 / → 推进　R 重播　P 暂停　N 讲稿</div><div class="scene-progress" aria-hidden="true"><i></i></div>\n<div class="lightbox"',1)
# Adapt the supplied navigation runtime to a stationary presentation stage.
html=html.replace("clone.querySelectorAll('[id]').forEach", "clone.querySelectorAll('canvas').forEach(function(c,i){var source=slide.querySelectorAll('canvas')[i];if(source)c.getContext('2d').drawImage(source,0,0);});\n    clone.querySelectorAll('[id]').forEach")
html=html.replace('window.deckCurrent=current;', '''window.deckCurrent=current;
    slides.forEach(function(s,i){s.dataset.active=String(i===current);s.inert=i!==current;s.setAttribute('aria-hidden',String(i!==current));});''')
html=html.replace("function setView(view,moveFocus){", "function setView(view,moveFocus){\n    document.dispatchEvent(new CustomEvent('deck:view',{detail:{view:view}}));")
observer=r'  var observer=new IntersectionObserver.*?slides\.forEach\(function\(s\)\{observer\.observe\(s\);\}\);'
html,n=re.subn(observer,'',html,count=1,flags=re.S)
if n!=1: raise RuntimeError('Template observer adapter no longer matches')
forward="else if(['ArrowDown','ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();goTo(current+1);}"
back="else if(['ArrowUp','ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();goTo(current-1);}"
assert forward in html and back in html
html=html.replace(forward,"else if(['ArrowDown','ArrowRight',' '].includes(e.key)){e.preventDefault();if(window.DeckMotion)window.DeckMotion.advance();else goTo(current+1);}\n    else if(e.key==='PageDown'){e.preventDefault();goTo(current+1);}")
html=html.replace(back,"else if(['ArrowUp','ArrowLeft'].includes(e.key)){e.preventDefault();if(window.DeckMotion)window.DeckMotion.back();else goTo(current-1);}\n    else if(e.key==='PageUp'){e.preventDefault();goTo(current-1);}")
html=html.replace("window.addEventListener('resize',sizeThumbs);", "window.DeckNav={goTo:goTo,setView:setView};\n  window.addEventListener('resize',sizeThumbs);")
data={'d23':json.loads((ROOT/'assets/swimlane-d23.json').read_text()),'sample':json.loads((ROOT/'assets/layer18-sample.json').read_text())}
deps='<script id="launch-data" type="application/json">'+json.dumps(data,ensure_ascii=False).replace('</','<\\/')+'</script>\n<script src="assets/scale-model.js"></script>\n<script src="assets/visual-system.js"></script>\n<script src="launch.js"></script>'
html=html.replace('</body>',deps+'\n</body>')
(ROOT/'index.html').write_text(html)
print('Built Launch Draft 03: 4 scenes, 6 builds per scene, source-derived animated data.')
