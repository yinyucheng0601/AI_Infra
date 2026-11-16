#!/bin/bash
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v python3 >/dev/null; then
  echo "请先安装 Python 3，再双击此文件。"
  read -r -p "按回车关闭…"
  exit 1
fi
python3 launch-preview.py
read -r -p "按回车关闭…"
