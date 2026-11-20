// Expert artwork supplied by the user. Geometry retained verbatim from expert-icon.svg.
const EXPERT_ARTWORK="<rect width=\"71\" height=\"91\" rx=\"7\" fill=\"#606060\"/>\n<rect x=\"53\" width=\"8\" height=\"91\" fill=\"black\"/>";
function expertGlyph(id,x,y,width=96){const scale=width/71;return `<g data-kind="expert" transform="translate(${x-width/2} ${y}) scale(${scale})">${EXPERT_ARTWORK}<text x="35.5" y="46" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="25">E${String(id).padStart(2,'0')}</text></g>`;}
