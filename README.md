<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a6a5c38e-5ae2-4724-8d86-eb536c69952d

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## 成绩录入与同步优化

- 支持 50、100、120、150 分制。原始分数和满分保持不变；均分、优秀率、排名和图表按百分制计算。进退步只比较同类别、同级别/公校年级的考试，单位为百分点。
- 草稿按班级和考试类别保存在当前浏览器。切换班级、页面和刷新名单后会恢复输入；成功保存的行会清空，保存期间新输入的内容会保留。
- 批量分数仅补空白项，保存前统一验证范围。未设置的公校年级必须主动选择。同一学生同一考试再次保存时，选择更新原成绩或作为补考新增。
- “仅存本地”的成绩不会参与自动同步；明确点击工具栏的云端上传后才会发布。JSON 备份仍会包含这些成绩。

### 云端升级与兼容

上线后请所有老师刷新或重新打开网页，避免继续使用旧客户端。现有基础 Gist JSON 无需手动转换。新版把每次变更保存到独立的 `.changes.*.json` 文件，读取时合并基础文件与变更文件；不再通过覆盖同一个文件实现协同。完整读取失败时停止上传，成绩仍保留在本地供重试。

累积至少 50 个变更文件后，下次写入会生成独立检查点，并在同一次请求中删除**本次已完整读取**的旧变更文件。其他老师在读取之后新增的文件不会删除。检查点保留软删除标记和字典时间戳，多个并发检查点也可以合并。普通数据同步采用最新记录时间戳；同一条成绩同时修改时仍按时间戳择一，不会把两次修改生成两条考试记录。

不要仅下载基础 JSON 作为最新备份；应在应用的数据管理页导出完整 JSON。原始基础文件继续保留，新版写入的成绩通过变更文件/检查点读取。旧客户端无法读取这些新文件。

验证命令：`npm run test`、`npm run lint`、`npm run build`。回归测试使用模拟 Gist，不会读写真实云端数据。
