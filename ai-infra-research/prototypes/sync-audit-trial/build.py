from pathlib import Path
R=Path(__file__).resolve().parent
(R/'index.html').write_text('''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=../compute-investigation-trial/unpack.html?sync=1"><title>Unpack · 同步核查</title></head><body><a href="../compute-investigation-trial/unpack.html?sync=1">打开 Unpack 同步核查</a></body></html>''')
print('Built compatibility entry to integrated Unpack tool')
