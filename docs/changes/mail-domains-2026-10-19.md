# 临时邮箱域名接入

<!-- section:change-identity -->
## 1. 变更身份

Change ID: MAIL-DOMAINS-20261019
标题：接入两个临时邮箱域名
类型：功能修改；项目：cloud-mail；请求人/决策人：用户；目标日期：2026-10-19；状态：Intake Ready
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

AC-001 → FR-001：公共DNS查到MX，路由显示启用且目标cloudmail。
AC-002 → FR-002：域名接口包含三项，生成地址可落在每项，原域名查询仍成功。
AC-003 → NFR-001：现有安全测试通过，D1查询不变并核对实际查询计划与读行。

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

待实施，FR-001/FR-002/NFR-001逐项回填。

<!-- section:verification -->
## 19. 验证证据

待验收，AC-001/AC-002/AC-003逐项回填；清理与剩余风险随执行记录。

<!-- section:release-decision -->
## 20. 发布结论

实施结论：待完成；合并与发布尚未完成；下一动作：域名路由配置与服务器验证。
