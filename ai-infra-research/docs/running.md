# 运行与维护

## 本地预览

要求 Python 3.10+，无 pip/npm 运行依赖；Node 用于测试纯前端逻辑。

将 config/sources.example.json 复制为 .local/sources.json，填写三个来源仓库和 PTO 设计系统的本机根路径。`.local` 已被 Git 忽略，不能作为发布依赖。本次交付已配置此机器的映射。

在本仓库根目录运行：

```sh
rtk python3 scripts/build.py
rtk python3 scripts/serve.py
```

打开 http://127.0.0.1:8766/。服务只绑定 127.0.0.1，只提供首页、入选文章及其静态依赖；没有目录浏览、上传或写入 API。它不是适合公网部署的生产服务。

PTO 原有 8765 服务保持不变。其 launch-v2 → whitepaper-gallery.html 仍可打开知识库；PTO 原文保持相对链接。跨仓原文和 Markdown 阅读视图需要 8766 服务。服务未开启时页面保留摘要与搜索，明确显示来源未连接，不把无效地址作为正常按钮。

## 生成兼容入口

先修改 catalog/assets.json 或 web/ 源文件，再生成。不要直接修改生成的 index.html 或 PTO 的兼容 HTML。

```sh
rtk python3 scripts/build.py --pto-output /absolute/path/to/pto/whitepaper-gallery.html
```

该命令会覆盖指定文件。首次替换或有手工编辑时应先保存副本。本轮替换前的 gallery、launch-v2 与 CHANGELOG 已保留在本仓库 .local/backups/first-gallery-evolution/。端口不同可传 `--service-url http://127.0.0.1:新端口/`；启动服务相应传 `--port`。

## 检查

```sh
rtk python3 scripts/validate_catalog.py
rtk python3 scripts/check_sources.py
rtk node --test tests/catalog.test.cjs
rtk python3 -m unittest discover -s tests -p test_preview.py
rtk python3 scripts/smoke_http.py
```

最后一项要求预览服务已运行，检查所有白名单资源与原文入口，不使用浏览器，不请求外部 CDN。HTTP 测试需要允许绑定本地端口。

check_sources 区分原文件存在、指纹变更、静态依赖缺失与外部资源依赖；源文件缺失或漂移返回非零退出码。静态依赖缺失保留在报告中，不代表完成浏览器验证。HTML 动态生成的路径和第三方嵌入不能保证被静态分析完整发现。

## 新增或更新内容

1. 按 scope 审阅，补齐策展说明、设计用途、提纲及来源指纹。
2. 登记来源配置键和仓内相对路径；新增来源时更新示例配置及首页项目名称映射。
3. 保留唯一稳定 ID，设置相关内容，不新增同一文件的历史副本。
4. 校验、构建并重启预览服务（白名单在启动时生成）。
5. 视觉验收由用户执行。目录 reviewed 状态不能替代视觉/技术审核。

## 团队与发布边界

当前是“跨仓索引 + 本地阅读”，不是已完成远端托管。其他机器需要克隆来源仓并配置映射。正式内网部署前，应确认内容权利/敏感审查、私有访问控制、源版本固定、外部资源策略，再选择受控内容打包或内部 URL 映射。

不要把该服务改为 0.0.0.0，不要用暴露整个家目录的静态服务器解决跨仓链接。未创建远端、未推送，也未执行 Skills 封装。
