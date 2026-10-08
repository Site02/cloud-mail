# okkmail 部署与定制说明

基于 [maillab/cloud-mail](https://github.com/maillab/cloud-mail) 定制。上游基线 `5fe5274`。

## 跑在哪

| 地址 | 给谁 | 登录 |
|---|---|---|
| `box.okkmail.cc` | 自己：收件箱 / 地址记录 / 后台 | 要 |
| `temp.okkmail.cc` | 别人：临时邮箱 | 不要，根路径 302 到 `/find` |

一个 Worker（`cloudmail`）+ 一个 D1（`cloudmail-db`）+ 一个 KV。收信走 Cloudflare Email Routing 的
zone 级 catch-all → 这个 Worker。

**catch-all 是 zone 级的，子域没有独立 catch-all。** 所以 `temp.okkmail.cc` 只是入口别名，
不产生地址；公开页生成的地址仍然是 `xxx@okkmail.cc`。

## 部署

```bash
cd ~/Documents/cloud-mail/mail-vue \
  && pnpm --config.verifyDepsBeforeRun=false build \
  && cd ../mail-worker \
  && CLOUDFLARE_API_TOKEN=$(cat ~/.cf-okkmail-token) npx wrangler deploy --secrets-file ~/.config/cloud-mail/worker-secrets.env
```

三处都不能省：

- **Node.js** — 运行前用 `node --version` 确认当前终端版本满足 Wrangler 的要求；不要固定到某个 Homebrew 补丁版本目录。
- **`--config.verifyDepsBeforeRun=false`** — 否则 pnpm 会先做依赖检查、决定清空重建
  `node_modules`，然后因为没有 TTY 无法确认而中止
  （`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`）。
- **`CLOUDFLARE_API_TOKEN`** — 用 token 而不是 `wrangler login`。OAuth 登录是全局的，
  在别的项目登录另一个 Cloudflare 账号会把它覆盖掉，回来部署就是 `Authentication error [10000]`。
  token 存在 `~/.cf-okkmail-token`（权限 600），限定在本账号 + `okkmail.cc` 这个 zone。
- **`worker-secrets.env`** — 存放 `jwt_secret`，可选放 `init_secret`，权限 600，不能放进仓库。
  已公开过的签名密钥必须先轮换；轮换会使现有登录会话失效。

token 权限清单（模板「Edit Cloudflare Workers」+ 手动加 D1）：Workers Scripts / KV / R2 /
Pages / Observability / Containers = Edit，**D1 = Edit**，Zone `okkmail.cc` 的 Workers Routes = Edit。

## 临时邮箱查询与数据库读取量

修改邮件共用页面后，发布前应运行应用和服务器测试、生产构建，以及 `mail-vue` 的 `npm run check:mail-flows`。浏览器检查覆盖管理邮件正文、图片和实际下载、未知状态、延迟刷新、请求403恢复、临时邮箱图片补取、邮箱隔离与离线读取；检查环境需先安装浏览器运行依赖。模拟检查结果和真实生产账号结果必须分别记录。当前故障审查及未完成项见 [邮件稳定性检查](docs/ui/mail-stability-review-2026-10-08.md)。

2026-10-07，公开收件箱查询在过去一天执行约 2,767 次，累计读取约 777 万行，平均每次约 2,809 行，最终耗尽 D1 当日免费读取额度。此前的 `LIMIT 20`、最近 10 分钟筛选和本机邮件缓存只限制了显示或保存的内容，不能保证数据库少读行。索引定义写在初始化脚本中，也不代表线上已执行初始化。

以后修改邮件查询、筛选、分页、地址切换或刷新机制时，部署验收必须同时完成：

1. 核对线上数据库确有查询依赖的索引，并用查询计划确认实际使用索引；不要只检查代码中的 `CREATE INDEX`。
2. 对比部署前后该查询的平均读取行数、执行次数和当日总读取量；评估多个用户或标签页持续打开时的用量。
3. 检查隐藏标签页、请求失败、无效地址和正式邮箱的刷新行为，避免无意义的重复请求。
4. 用真实线上请求区分地址错误与服务故障；数据库额度耗尽时不得宣称已恢复，待额度重置后再验证索引、查询成本和具体邮箱结果。

## 反直觉的默认值（都踩过）

这些开关在 `setting` 表里，**不是环境变量**，改完必须刷缓存。

| 字段 | 默认 | 含义 | 该设成 |
|---|---|---|---|
| `ai_code` | 1 | 常量是 `{OPEN:0, CLOSE:1}`，**1 是关闭** | `0` — 不开的话验证码永远不提取 |
| `no_recipient` | 1 | 拒收未注册地址的信 | `0` — 公开页的随机地址靠它 |
| `register` | 0 | **开放注册** | `1` — 不关的话陌生人能拿你域名注册 |
| `notice_content` | 空 | init 有句 `UPDATE ... WHERE notice_content = ''` | 留一个空格，否则升级时免责声明会自己长回来 |

`PREFIX` 在 wrangler.toml 里，默认 `"tmp"`，不改的话地址会变成 `tmpxxx@`。本项目已设为空。

### 改了 setting 表之后必须刷缓存

大部分设置缓存在 KV，直接改数据库后须刷新缓存，而且 `query()` 没有 DB 回退——删 KV key 会让整站报
「数据库未初始化」。删除方式 `sync_delete` 的读取直接查询 D1，以免缓存传播延迟导致用户看到或执行错误的删除方式。若配置了独立的 `init_secret`，可通过受控的初始化接口刷新缓存：

```bash
curl -X POST -H "X-Init-Key: <init_secret>" "https://box.okkmail.cc/api/init"
```

初始化密钥不能与登录签名密钥共用，也不能放在 URL 中。

## 定制点（升级上游时要重新打）

### 后端 `mail-worker/src/`

| 文件 | 改动 |
|---|---|
| `../wrangler.toml` | 域名、绑定、两个 custom domain、`PREFIX=""` |
| `index.js` | `temp.*` 根路径 302 到 `/find` |
| `security/security.js` | 明确列出免登录路由 |
| `hono/webs.js` | 注册 `open-api` |
| `api/open-api.js` | **新增**。公开地址生成、列表、正文、附件、域名接口 |
| `service/open-service.js` | **新增**。按地址分页查询服务器仍保留的公开邮件；正文和附件均按地址、邮件 ID 与归属限定，正式邮箱不可公开查询 |
| `api/email-api.js` | 加 `/email/addresses` |
| `service/email-service.js` | 加 `addressList()`（地址聚合）、`claimNoOne()`（认领无归属邮件） |
| `service/account-service.js` | `add()` 末尾调 `claimNoOne`，添加邮箱时把历史信一并收编 |

### 前端 `mail-vue/src/`

| 文件 | 改动 |
|---|---|
| `views/find/` | **新增**。公开临时邮箱页，固定暗色，含正文弹窗 |
| `views/address/` | **新增**。地址记录页 |
| `request/open.js` | **新增**。公开接口 |
| `views/email/index.vue` | 收件箱顶部随机地址条（点复制才建号） |
| `components/email-scroll/index.vue` | 加 `header` slot；`grid-template-rows` 改三行 |
| `views/sys-setting/index.vue` | 删「关于」区块 + 停 GitHub 版本检查请求 |
| `layout/account/index.vue` | 添加框的随机按钮 + 添加成功自动复制 |
| `layout/aside/index.vue` | 侧边栏加「地址记录」 |
| `router/index.js` | `/find` 免登录放行；`/addresses` 路由 |
| `store/account.js`、`request/email.js`、`i18n/*.js` | 配套 |

## 设计上的两个决定

**公开页的地址不入库。** 服务端随机生成字符串，catch-all 本来就收所有地址，所以不会创建账号，
也不会堆一堆没人用的废账号。信落在「无收件人」，管理端「地址记录」里能看到。

**公开页按地址查询。** 知道地址的人可以查看服务器仍保留的邮件正文和附件。正式账号、
其加号别名以及已归属某位用户的邮件不会进入公开查询。

**收件箱顶部那个地址，点「复制」才建账号。** 只看不复制不留痕——复制这个动作本身就等于
「我要用它」。

## 已知代价

`temp.okkmail.cc` 和 `okkmail.cc` 是同一个 zone。公开站被拉进 disposable 黑名单的话，
**根域一起中招，自己的小号会跟着废**。彻底避免要另买一个域名单独跑公开站。

## 资源

- Cloudflare 账号 `A01123490047@gmail.com`，Account ID `79c3d88c58b0a43008575287de4cafb6`
- D1 `cloudmail-db`、KV、Workers AI binding 见 `mail-worker/wrangler.toml`
- 登录签名密钥和可选的初始化密钥通过 Worker Secret 配置，不保存在仓库配置中

回复或转发相关修改须覆盖引用图片、普通附件及草稿变更确认。复用图片查询发布前确认生产存在 `idx_attachments_key_type`，并核对实际查询计划与读行数。真实账号验收见 [检查记录](docs/ui/mail-authenticated-review-2026-10-08.md)。

图片验收必须同时覆盖历史邮件的外部HTTPS图片与内嵌附件图片，并分别验证个人邮箱、全部邮件和临时邮箱。以图片成功解码为准，不能只检查正文有图片标签。两个阅读入口共用正文加载规则；脚本、嵌套页面、表单及同源访问仍须隔离。
