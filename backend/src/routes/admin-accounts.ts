import { Router } from 'express';
import { z } from 'zod';
import * as accountPool from '../services/account-pool.js';

const router = Router();
const providerSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.toLowerCase() : value),
  z.enum(['openai', 'openrouter', 'anthropic', 'google', 'kie'])
);
const tierSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.toLowerCase() : value),
  z.enum(['starter', 'pro'])
);

// Import schema validation
const importSchema = z.object({
  accountId: z.string().min(1),
  email: z.string().email().optional(),
  apiKey: z.string().min(1),
  provider: providerSchema.default('openai'),
  model: z.string().optional(),
  thingLevel: z.string().optional(),
  tier: tierSchema.default('starter'),
});

/**
 * 导入账号 (API Key 模式)
 * POST /api/admin/accounts/import
 */
router.post('/import', async (req, res) => {
  try {
    const parsed = importSchema.parse(req.body);

    // 导入账号
    const result = await accountPool.importAccount({
      accountId: parsed.accountId,
      email: parsed.email,
      apiKey: parsed.apiKey,
      provider: parsed.provider.toLowerCase(),
      model: parsed.model,
      thingLevel: parsed.thingLevel,
      tier: parsed.tier,
    });

    console.log(`[Admin] 账号导入成功: ${result.accountId}`);

    res.json({
      success: true,
      accountId: result.accountId,
      message: '账号导入成功'
    });

  } catch (error: any) {
    if (error.message === 'ACCOUNT_ALREADY_EXISTS') {
      return res.status(409).json({ error: '该账号已存在' });
    }
    if (typeof error?.message === 'string' && error.message.includes('MODEL_PROVIDER_MISMATCH')) {
      return res.status(400).json({
        error: '模型与 provider 不匹配，请检查 provider 和 model 是否对应',
      });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: '参数验证失败', 
        details: error.errors 
      });
    }
    console.error('导入账号失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * 批量导入账号
 * POST /api/admin/accounts/import-batch
 */
router.post('/import-batch', async (req, res) => {
  try {
    const { accounts } = req.body;

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({ error: '请提供账号列表' });
    }

    const results = {
      success: [] as string[],
      failed: [] as { index: number; error: string }[],
    };

    for (let i = 0; i < accounts.length; i++) {
      try {
        const parsed = importSchema.parse(accounts[i]);
        const result = await accountPool.importAccount({
          accountId: parsed.accountId,
          email: parsed.email,
          apiKey: parsed.apiKey,
          provider: parsed.provider.toLowerCase(),
          model: parsed.model,
          thingLevel: parsed.thingLevel,
          tier: parsed.tier,
        });
        results.success.push(result.accountId);
      } catch (error: any) {
        if (error.message === 'ACCOUNT_ALREADY_EXISTS') {
          results.failed.push({ index: i, error: '账号已存在' });
        } else if (
          typeof error?.message === 'string' &&
          error.message.includes('MODEL_PROVIDER_MISMATCH')
        ) {
          results.failed.push({
            index: i,
            error: '模型与 provider 不匹配，请检查 provider 和 model 是否对应',
          });
        } else if (error instanceof z.ZodError) {
          results.failed.push({ 
            index: i, 
            error: `参数验证失败: ${error.errors.map(e => e.message).join(', ')}` 
          });
        } else {
          results.failed.push({ index: i, error: error.message || '导入失败' });
        }
      }
    }

    console.log(`[Admin] 批量导入完成: ${results.success.length} 成功, ${results.failed.length} 失败`);

    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('批量导入账号失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * 获取账号列表
 * GET /api/admin/accounts
 */
router.get('/', async (req, res) => {
  try {
    const tierRaw =
      typeof req.query.tier === 'string' ? req.query.tier.toLowerCase() : undefined;
    let tier: accountPool.AccountTier | undefined;
    if (tierRaw && tierRaw !== 'all') {
      const parsedTier = tierSchema.safeParse(tierRaw);
      if (!parsedTier.success) {
        return res.status(400).json({ error: 'tier 参数必须是 starter 或 pro' });
      }
      tier = parsedTier.data;
    }

    const accounts = await accountPool.listAccounts(tier);
    const stats = await accountPool.getAccountStats();
    const toInt = (value: unknown) => {
      const n = Number.parseInt(String(value ?? '0'), 10);
      return Number.isNaN(n) ? 0 : n;
    };

    res.json({
      accounts,
      stats: {
        total: toInt(stats.total),
        bound: toInt(stats.bound),
        available: toInt(stats.available),
        inactive: toInt(stats.inactive),
        starter: {
          total: toInt(stats.starter_total),
          bound: toInt(stats.starter_bound),
          available: toInt(stats.starter_available),
        },
        pro: {
          total: toInt(stats.pro_total),
          bound: toInt(stats.pro_bound),
          available: toInt(stats.pro_available),
        },
      }
    });

  } catch (error) {
    console.error('获取账号列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * 获取账号库存巡检数据（tier/provider/is_bound/is_active）
 * GET /api/admin/accounts/inventory
 */
router.get('/inventory', async (_req, res) => {
  try {
    const inventory = await accountPool.getAccountInventory();
    res.json({ inventory });
  } catch (error) {
    console.error('获取账号库存失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * 删除账号
 * DELETE /api/admin/accounts/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    // 如果 force=true，先强制解绑再删除
    if (force === 'true') {
      try {
        await accountPool.unbindAccount(id, { stopDeployment: true, reason: 'Force delete test account' });
      } catch (unbindError: any) {
        // 忽略未绑定或不存在错误
        if (unbindError.message !== 'ACCOUNT_NOT_BOUND' && unbindError.message !== 'ACCOUNT_NOT_FOUND') {
          console.warn(`[Admin] Force unbind warning for ${id}:`, unbindError.message);
        }
      }
    }

    await accountPool.deleteAccount(id, force === 'true');

    res.json({ success: true });

  } catch (error: any) {
    if (error.message === 'ACCOUNT_NOT_FOUND') {
      return res.status(404).json({ error: '账号不存在' });
    }
    if (error.message === 'ACCOUNT_BOUND_CANNOT_DELETE') {
      return res.status(400).json({ error: '该账号已被用户绑定，无法删除' });
    }
    console.error('删除账号失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

/**
 * 解绑账号
 * POST /api/admin/accounts/:id/unbind
 */
router.post('/:id/unbind', async (req, res) => {
  try {
    const { id } = req.params;
    const { stopDeployment = true, reason } = req.body;

    const result = await accountPool.unbindAccount(id, { 
      stopDeployment, 
      reason 
    });

    console.log(`[Admin] 账号解绑成功: ${result.accountId}, 停止部署: ${result.stoppedDeployments}`);

    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    if (error.message === 'ACCOUNT_NOT_FOUND') {
      return res.status(404).json({ error: '账号不存在' });
    }
    if (error.message === 'ACCOUNT_NOT_BOUND') {
      return res.status(400).json({ error: '该账号未绑定用户，无需解绑' });
    }
    console.error('解绑账号失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router;
