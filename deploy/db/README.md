# Reka Clip 本地数据库导出

从本地 PostgreSQL（`DATABASE_URL`，默认 `postgresql://postgres@localhost:5432/rekaclip`）导出的快照，用于在新环境初始化或对照 schema。

## 文件说明

| 文件 | 说明 |
|------|------|
| `00_schema.sql` | 当前库中的 schema + 表结构（由 `information_schema` 生成） |
| `01_data.sql` | 全表 `INSERT` 数据（含本地测试用户、订单等） |
| `migrations_combined.sql` | `src/db/migrations/*.sql` 合并参考（Drizzle 源迁移） |
| `export_manifest.json` | 导出时间与表清单 |

**注意：** `01_data.sql` 含真实邮箱与测试订单，勿当作生产数据提交到公开仓库；生产环境应使用空库 + `npm run db:migrate` 或仅导入 schema。

## 重新导出

```bash
# 需已配置 .env.development 中的 DATABASE_URL
bash deploy/db/export.sh
```

或：

```bash
node deploy/db/export.mjs
```

## 恢复（新库）

```bash
createdb rekaclip   # 如尚未创建
export DATABASE_URL="postgresql://postgres@localhost:5432/rekaclip"

psql "$DATABASE_URL" -f deploy/db/00_schema.sql
psql "$DATABASE_URL" -f deploy/db/01_data.sql
```

仅建表、不要本地测试数据时：

```bash
psql "$DATABASE_URL" -f deploy/db/migrations_combined.sql
# 或
npm run db:migrate   # 见 deploy/DEPLOY.md 中迁移注意事项
```

## Schema 名称

应用 Drizzle schema 为 **`easyclaw`**（历史项目名），表均在 `easyclaw.*` 下；`drizzle.__drizzle_migrations` 记录已执行的迁移。
