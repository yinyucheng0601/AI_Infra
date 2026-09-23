# 设计方法与 Skills

方法先说明问题、输入、步骤、输出和质量标准。第三阶段再从实际验证过的方法中选择需要封装的 Skills，避免将所有本机 Skills 批量纳入。

## Spatial Systems UI：单一源目录

`design-spatial-systems-ui/` 是该 Skill 唯一维护目录。修改指令、参考文档、设计变量或元数据时，直接修改这个目录，不维护另一份安装副本，也不直接修改 ZIP。

- 本机入口：用户级 `~/.agents/skills/design-spatial-systems-ui` 软链接到此目录；源文件修改后，本机读取同一份内容。
- 页面入口：`catalog/assets.json` 的 `content` 指向该目录的 `SKILL.md`，详情与缩略图沿用原条目。
- 下载包：构建脚本按目录中的完整内容生成 `design-spatial-systems-ui.zip`，ZIP 只是分发快照，不是维护源。

换机器或移动仓库后，重新建立本机软链接；已有同名安装时先比较、备份，不强制覆盖。不要把本机绝对路径写进正式页面。

更新页面与 ZIP（从仓库根目录执行）：

```sh
rtk python3 ai-infra-research/scripts/build.py
rtk python3 ai-infra-research/scripts/validate_catalog.py
```

构建后刷新本地页面；线上页面需要另行提交、push 并等待部署。其他人已经下载并解压的 ZIP 不会自动更新。本机新安装的 Skill 下一轮可用；若未显示，重启 Codex。

软链接发现机制参见 [OpenAI 官方 Skills 文档](https://learn.chatgpt.com/docs/build-skills)。
