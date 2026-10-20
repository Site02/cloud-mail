# 临时邮箱域名接入

<!-- section:change-identity -->
## 1. 变更身份

Change ID: MAIL-DOMAINS-20261019
标题：接入两个临时邮箱域名
类型：功能修改；项目：cloud-mail；请求人/决策人：用户；目标日期：2026-10-19；状态：Closed（配置与地址生成验收完成；外部SMTP未测）
[REQUESTER] 来源：本次对话及域名截图，qtmail.click 与 qtgmail.click。

<!-- section:executive-summary -->
## 2. 摘要

[REQUESTER] 将新购域名加入现有临时邮箱。
[CODE] 当前仅配置okkmail.cc，生成器只选数组第一项。
[DECISION] 延用现有服务、免费DNS、公开地址访问与手动清理规则；生成器随机选可用域名。

<!-- section:current-state -->
## 3. 当前状态

[RUNTIME] 两域名最初为Dynadot Parking；已在同一云端账户建立DNS区域并保存分配的名称服务器。
[CODE] mail-worker/wrangler.toml与inbox-access-service.js为配置和生成入口。

<!-- section:target-outcome -->
## 4. 目标行为

[DECISION] 两域名收信路由到现有cloudmail，公开接口接受三个域名，换新地址能生成新域名。

<!-- section:scope -->
## 5. 范围

[DECISION] In scope：DNS、收信路由、域名配置、随机生成、验收与部署。
Out of scope：发信供应商扩容、独立网站、新账号和历史数据清理。

<!-- section:users-permissions -->
## 6. 角色权限

[CODE] 管理账户维护域名；公开访客仍按地址读取临时邮箱，正式邮箱归属检查保留。

<!-- section:user-flows -->
## 7. 用户流程

[CODE] 临时邮箱入口换一个→服务器生成地址→收信或查询。未就绪域名不发布；已有离线副本与错误重试行为保留。

<!-- section:requirements -->
## 8. 需求

FR-001：两个域名具备有效MX与全部地址转入cloudmail的路由。
FR-002：公开域名列表包括三个域名，随机生成覆盖新增域名。
NFR-001：保留地址权限、历史副本及现有D1查询成本。

<!-- section:acceptance -->
## 9. 验收标准

AC-001 → FR-001：Given 已激活域名，When 查询公共DNS并查看路由，Then 查到MX且全收启用、目标cloudmail。
AC-002 → FR-002：Given 已发布配置，When 请求域名列表、生成并查询地址，Then 包含三项、生成覆盖每项且原域名查询仍成功。
AC-003 → NFR-001：Given 保留现有权限，When 运行安全测试和生产查询，Then 测试通过、查询计划使用索引且读行成本不变。

<!-- section:technical-impact -->
## 10. 技术影响

[CODE] 修改wrangler域名数组与服务器生成器，不修改数据库结构/API响应字段/前端字节。
[DECISION] 使用原Worker、D1与KV，无新秘密或付费计划；新收信量计入原额度。

<!-- section:nonfunctional -->
## 11. 安全隐私与质量

[DECISION] 不改变正式邮箱阻断、附件权限、历史缓存、语言或主题。DNS新域名均仅用于当前收信服务。

<!-- section:observability -->
## 12. 可观测性

[DECISION] 核对域名激活、MX、catch-all目标、Worker部署版本、公开接口及D1成本。不能以路由配置替代实际收信证明。

<!-- section:test-plan -->
## 13. 测试计划

[DECISION] Windows工作端运行服务器测试；浏览器查看现有临时邮箱入口。真实SMTP收信未获得本轮发信授权，标为未检查。
N/A — 无UI/主题布局变化，无需新增视觉设计。

<!-- section:rollout -->
## 14. 发布回滚

[DECISION] DNS激活→MX与catch-all→测试→服务器部署并保留既有前端资源→公开接口复查。若新域名失败，从域名数组移除并恢复上版；不清除已收到的邮件。

<!-- section:risks-dependencies -->
## 15. 依赖风险

[RUNTIME] 依赖注册局传播、云端激活、邮件服务权限及Windows队列。保留未通过状态，未就绪不作为可用地址生成。

<!-- section:open-decisions -->
## 16. 决策与假设

[REQUESTER] 已授权将两个新域名接入临时邮箱。
[ASSUMPTION] 延用现有随机生成交互，随机选域名；负责人：本轮实施，验证方式：确定性测试及生产抽样。无阻塞的未决产品问题。

<!-- section:implementation-plan -->
## 17. 实施计划

[DECISION] 在原开放PR588完成：DNS与路由配置；新增多域名测试；最小修改生成器与配置；Windows测试；保留当前生产前端资产部署；记录接口/DNS/成本证据。

<!-- section:implementation-summary -->
## 18. 实施结果

[RUNTIME] 请求日期2026-10-19，接续与发布完成于2026-10-20；代码e6e7fb2，生产版本4556c8c4-7f91-49bb-b196-4f35eb695728。

| 需求 | 修改 | 结果 |
| --- | --- | --- |
| FR-001 | 同账户两个DNS区域、注册商名称服务器、MX/SPF/DKIM、全收规则 | 两域名active，邮件路由均已启用，全收均指向cloudmail |
| FR-002 | mail-worker/wrangler.toml、src/service/inbox-access-service.js | 三域名可查询；随机选择域名，UUID地址本地部分仍保留 |
| NFR-001 | 原SQL、权限判断和缓存代码未修改；DEPLOY.md补充接入步骤 | 原绑定与网页字节保留，新增边界回归测试 |

<!-- section:verification -->
## 19. 验证证据

| AC | 结果 | 证据与边界 |
| --- | --- | --- |
| AC-001 | PASS | 公共解析器1.1.1.1查到两域名的三条Cloudflare MX；云端表格均显示已启用，分别检查全收目标cloudmail且开关on |
| AC-002 | PASS | 生产公开域名列表三项；6次生成样本：qtmail.click 4次、qtgmail.click 1次、okkmail.cc 1次；三域名查询code200；浏览器手动查询两个新域名，点击换一个实际生成qtmail.click地址 |
| AC-003 | PASS（限定范围） | Windows MSI/WSL Node24服务器53项、语言8项通过；原版生成器定向反例失败。用户授权Mac接续后，本机同样61项通过并完成打包；未重新构建前端，生产上传显示0个静态资源更新 |

[RUNTIME] Windows源码包SHA256 a7a03901d3bceee09895ec47544f7529f9117e3d75ac094a3630e8a098007769；首次job-09a1e10f09f246c7b3fad53e498e9d23测试已通过，后续打包因测试副本没有dist而失败。保留该失败，不把首次任务称作打包通过。其余两任务未开始并已精确撤回，未停止其他项目。Mac使用共用light锁，测试和打包正常结束。

[RUNTIME] Mac服务源码SHA256 894bda751b70143862d92f72ef93c9f9da72740a6c1157b9eb25573e0cfcefa8，上传的预打包文件SHA256 af5f9f05a808c5de4ccb0e1418970052e5f195f057710265246c13b6feac1a62。既有前端入口始终为index-CDlMKZT7.js，发布前后8个绑定名称/类型一致，秘密未读取或写入文档。

[RUNTIME] D1：生成地址归属检查使用idx_account_email_nocase，不存在地址读取0行；公开列表使用源码中的INDEXED BY idx_email_to_email_nocase，计划按地址与rowid搜索，同一空地址发布前后均读取1行。日统计按UTC：2026-10-19为28008行/13179查询；2026-10-20部分日发布前11054行/6263查询，发布后11397行/6447查询。统计可能延迟，不代表完整日负载验收；此次未修改查询与轮询。

[RUNTIME] 私有原始日志：/tmp/mail-domains-mac-tests.log、/tmp/mail-domains-mac-bundle.log、/tmp/mail-domains-worker-first.tar.gz；域名状态截图/tmp/mail-domains-enabled.png，网页截图/tmp/mail-new-domains-ready.png。

清理结果：Mac共享名额已释放，Windows未开始的本任务已撤回，未清理用户邮件或历史缓存；浏览器仅新增本轮空邮箱查询记录。剩余风险：真实外部SMTP投递未执行；未复跑未修改前端的全尺寸浏览器自动化和管理员历史邮件专项。

<!-- section:release-decision -->
## 20. 发布结论

- 实施结论：CLOSED — 配置、地址生成和查询范围。
- 合并准备度：NOT CLAIMED，变更归集原PR588，未合并。
- 发布准备度：PASS，已部署版本4556c8c4-7f91-49bb-b196-4f35eb695728。
- 未执行项：真实外部SMTP投递、新域名发信配置；不将收信路由配置称作端到端实际投递验收。
- 下一责任人/动作：用户可在原临时邮箱页面使用三个域名，发信供应商若需扩展另行处理。
