# CSA Pass Field：自动构建收录

唯一源码为 `PyPTO3-main/Design/csa-pass-field`。本目录只维护生成的 `index.html` 和 `artifact-manifest.json`，请勿直接编辑 HTML。

两个 checkout 默认并列放置；自定义位置用构建环境变量 `CSA_SOURCE_ROOT` 指向源码目录。构建过程需要来源仓库中的 CSA 运行数据和 architecture 投影文件，以及已安装的 npm 依赖。源码缺失或构建失败时明确报错，不沿用旧页面冒充最新版本。

在 AI_Infra 根目录运行：

```sh
rtk proxy python3 ai-infra-research/scripts/build.py
```

该命令检测源码和原始输入指纹，变化时先运行来源项目的 `npm run build`，收录独立 HTML 和来源清单，再生成知识库入口。源码没有变化时复用经哈希校验的产物。网页不依赖本机路径，沿用原有线上 URL。

catalog 的 `sources[0]` 保留可打开的生成产物地址；`buildSource` 登记唯一源码目录与内容指纹，避免把来源工作区路径当作线上链接。

本机 Git 钩子通过以下命令启用（每个新 checkout 执行一次；安装前确认没有其他 hooksPath）：

```sh
rtk git config --local core.hooksPath .githooks
```

- 提交前自动构建并暂存上述生成 HTML、清单、catalog 和三个目录入口。共享目录文件有未暂存修改时先停止，避免把用户未选择的修改带入提交。
- push 前对每个待推送提交校验源码指纹和已提交 HTML 的哈希；源码更新但产物未提交时拒绝推送，并提示重新构建、提交。只构建工作区不会改变待推送的旧提交。
- 不自动创建提交或推送。配置生效后，日常流程仍是在 GitHub Desktop 或命令行审阅并提交，再 push。
- 这套流程在本机读取来源工作区，允许尚未提交的源码参与构建；manifest 使用内容指纹，不将来源仓库 HEAD 冒充源码版本。远端 CI 不能读取本机未提交文件，因此本次不宣称已接入跨仓库云端构建。

检查工作区：`rtk proxy python3 ai-infra-research/scripts/collect_csa.py --check`。
检查已提交版本：`rtk proxy python3 ai-infra-research/scripts/collect_csa.py --check --revision HEAD`。

内容成熟度和浏览器验收见来源项目的 `docs/m1-execution-evidence.md`；自动收录成功不代表完整视觉验收通过。
