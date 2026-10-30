from pathlib import Path
import sys
R=Path(__file__).resolve().parent
sys.path.insert(0,str(R.parent/'_shared'))
from demo_ui import enhance
(R/'index.html').write_text(enhance((R/'page.html').read_text(),'rsfa'))
print('Built RSFA performance page')
