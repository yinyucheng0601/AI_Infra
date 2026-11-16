#!/usr/bin/env python3
"""Launch the portable Slidev project; keep this terminal open while presenting."""
from pathlib import Path
import shutil, subprocess, socket, time, webbrowser, sys
ROOT = Path(__file__).resolve().parent
PROJECT = ROOT / "presentation"

def main():
    npm = shutil.which("npm")
    if not npm:
        print("请先安装 Node.js 22 LTS（包含 npm）：https://nodejs.org/ ，然后重新双击启动。")
        return 1
    if not (PROJECT / "node_modules/.bin/slidev").exists():
        print("首次启动正在安装依赖，需要联网，请稍候…", flush=True)
        subprocess.run([npm, "ci"], cwd=PROJECT, check=True)
    subprocess.run([sys.executable, "prepare.py"], cwd=PROJECT, check=True)
    port = 8854
    while port < 8954:
        with socket.socket() as sock:
            try:
                sock.bind(("127.0.0.1", port))
                break
            except OSError:
                port += 1
    else:
        raise RuntimeError("没有可用的本地预览端口")
    url = f"http://localhost:{port}/1"
    print(f"PPT 预览：{url}\n关闭此终端或按 Ctrl+C 停止预览。", flush=True)
    process = subprocess.Popen([npm, "run", "dev", "--", "--port", str(port)], cwd=PROJECT)
    try:
        for _ in range(180):
            if process.poll() is not None:
                return process.returncode
            try:
                with socket.create_connection(("127.0.0.1", port), timeout=.5):
                    webbrowser.open(url)
                    break
            except OSError:
                time.sleep(.5)
        return process.wait()
    except KeyboardInterrupt:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print(f"启动失败：{exc}")
        sys.exit(1)
