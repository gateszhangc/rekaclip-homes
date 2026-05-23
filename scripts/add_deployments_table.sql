-- 线上数据库执行：添加 deployments 表到 easyclaw schema
-- 执行方式：连接到数据库后运行此 SQL

-- 创建 deployments 表
CREATE TABLE IF NOT EXISTS easyclaw.deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id character varying NOT NULL,
  account_id uuid,
  status character varying NOT NULL DEFAULT 'provisioning'::character varying CHECK (status IN ('provisioning', 'running', 'failed')),
  telegram_token_encrypted text NOT NULL,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE easyclaw.deployments ADD COLUMN IF NOT EXISTS account_id uuid;

-- 创建索引（提高查询性能）
CREATE INDEX IF NOT EXISTS deployments_user_id_idx ON easyclaw.deployments (user_id);
CREATE INDEX IF NOT EXISTS deployments_status_idx ON easyclaw.deployments (status);
CREATE INDEX IF NOT EXISTS deployments_account_id_idx ON easyclaw.deployments (account_id);

-- 授权
GRANT ALL ON easyclaw.deployments TO postgres, anon, authenticated, service_role;

-- 设置默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA easyclaw GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
