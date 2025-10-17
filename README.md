# AI Travel Planner

AI Travel Planner 是一个纯前端的旅行智能助手，通过豆包大模型、Supabase、Web Speech API 与高德地图 API 为用户提供 AI 行程规划、预算管理、地图可视化与语音输入体验。应用启动后会直接依赖 Supabase 云表存储行程与预算数据，不再落盘到浏览器 LocalStorage。

## 功能一览
- **智能行程生成**：填写或语音输入旅程需求，调用豆包 API 生成结构化行程，并可在行程详情页手动微调。
- **费用预算管理**：按行程记录支出，自动汇总各行程预算，可导出 PDF / JSON。
- **账号与数据同步**：通过 Supabase 进行注册登录，并将行程与预算全部写入云端表格。
- **地图导航与详情页**：在行程详情页查看每日安排与高德地图标注（支持经纬度）。
- **语音辅助**：借助 Web Speech API 识别中文语音输入，自动填充需求字段。

## 快速开始
1. **环境要求**：Node.js 18+ 与 npm。
2. **依赖安装**：
   ```bash
   npm install
   ```
3. **启动开发模式**：
   ```bash
   npm run dev
   ```
4. **构建生产版本**：
   ```bash
   npm run build
   ```

> 本仓库未包含 `.env`，所有密钥需要在应用运行后从“设置”页面手动输入，信息只会保存在浏览器 LocalStorage。行程与预算内容则完全存放在 Supabase 云端表中。

## 必填密钥与外部服务
| 服务 | 用途 | 填写位置 |
| --- | --- | --- |
| 豆包 API Key | 生成 AI 行程 | 设置 → 豆包 API Key |
| Supabase Project URL / API Key | 登录、云端同步 | 设置 → Supabase 配置 |
| 高德地图 Web JS API Key | 载入地图与工具栏 | 设置 → 高德地图 API Key |

### Supabase 最低表结构示例（需启用行级策略）
```sql
create table plans (
  id text primary key,
  user_id uuid not null references auth.users(id),
  data jsonb not null,
  inserted_at timestamp default now()
);

create table budgets (
  id text primary key,
  user_id uuid not null references auth.users(id),
  plan_id text not null references plans(id) on delete cascade,
  data jsonb not null,
  inserted_at timestamp default now()
);

alter table plans enable row level security;
alter table budgets enable row level security;

create policy "Plans: user owns row"
  on plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Budgets: user owns row"
  on budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```
- 请在 Supabase Authentication 中开启 Email 登录。
- 前端会使用 `plans.data` 与 `budgets.data` 字段存储完整 JSON，所有 CRUD 操作都作用于上述表。

## 使用说明
1. **设置密钥**：首次进入请在“设置”面板输入豆包 / Supabase / 高德地图 Key。
2. **注册或登录**：在“登录 / 注册”页完成账号管理后，行程与预算才会加载与写入 Supabase。
3. **创建行程**：
   - 手动填写表单或点击“语音填写需求”并按照“目的地 | 天数 | 预算 | 偏好 | 同行人”格式描述。
   - 提交后等待 AI 生成行程，页面会提示生成状态，并提供“查看行程详情”按钮。
4. **查看与编辑详情**：跳转到“行程列表/行程详情”查看每日安排、地图与导出按钮。
5. **预算记录**：进入“预算管理”页面，为不同行程添加支出，支持删除与自动汇总。
6. **地图查看**：为行程项目填写“经度,纬度”形式的 `location` 字段（例如 `116.3974,39.9093`）即可在地图中呈现。

## 导出与备份
- 在“行程详情”页面顶部，可导出当前行程的 PDF 或 JSON。
- JSON 包含行程与对应预算，可用于离线备份或复原 Supabase 数据。

## 语音输入提示
- 浏览器需支持 Web Speech API（Chrome 桌面版推荐）。
- 语音结果会尝试解析 `目的地 | 天数 | 预算 | 偏好 | 同行人 | 出发/结束日期` 结构，剩余信息会写入备注字段。
- 如识别不准，可在表单中手动修正。

## 开发提示
- 所有密钥都保存在浏览器 LocalStorage，不会上传到服务器。
- 行程与预算依赖 Supabase 表，无 Supabase 登录时将无法创建或查看数据。
- 运行 `npm run lint` 可以按需执行 ESLint 检查。
