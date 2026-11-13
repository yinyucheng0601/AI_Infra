from pathlib import Path
import json
root=Path(__file__).resolve().parent
public=root/'public'
public.mkdir(exist_ok=True)
(public/'scenes').mkdir(exist_ok=True)
for source in (root/'scenes').glob('*.html'):
 (public/'scenes'/source.name).write_text(source.read_text())
assets=public/'assets'
if not assets.exists(): assets.symlink_to('../../assets',target_is_directory=True)
print('Prepared independent Slidev sources')
