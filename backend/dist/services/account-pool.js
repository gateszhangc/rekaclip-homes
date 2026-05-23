import { query, withClient } from '../db/index.js';
import { encryptSecret, decryptSecret } from '../utils/crypto.js';
const PG_UNDEFINED_COLUMN = '42703';
const PG_UNDEFINED_TABLE = '42P01';
const PG_CHECK_VIOLATION = '23514';
const DEPLOYMENTS_TABLE = 'easyclaw.deployments';
const hasPgCode = (error, code) => typeof error === 'object' &&
    error !== null &&
    error.code === code;
const normalizeModelKey = (value) => {
    if (!value) {
        return undefined;
    }
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : undefined;
};
const normalizeProviderKey = (value) => {
    if (!value) {
        return undefined;
    }
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : undefined;
};
const KIE_PROVIDER = 'kie';
const KIE_GPT_5_4_MODEL = 'kie-gpt/gpt-5-4';
const KIE_CLAUDE_OPUS_4_6_MODEL = 'kie-claude/claude-opus-4-6';
const KIE_GEMINI_3_1_PRO_MODEL = 'kie-gemini/gemini-3.1-pro';
const OPENROUTER_GPT_5_4_MODEL = 'openrouter/openai/gpt-5.4';
const OPENROUTER_CLAUDE_OPUS_4_6_MODEL = 'openrouter/anthropic/claude-opus-4';
const OPENROUTER_GEMINI_3_PRO_MODEL = 'openrouter/google/gemini-3.1-pro-preview';
const canonicalOpenRouterOpenAIModelMap = {
    'gpt-5-4': OPENROUTER_GPT_5_4_MODEL,
    'gpt-5.4': OPENROUTER_GPT_5_4_MODEL,
    'openai/gpt-5-4': OPENROUTER_GPT_5_4_MODEL,
    'openai/gpt-5.4': OPENROUTER_GPT_5_4_MODEL,
    'openrouter/openai/gpt-5-4': OPENROUTER_GPT_5_4_MODEL,
    'openrouter/openai/gpt-5.4': OPENROUTER_GPT_5_4_MODEL,
    'gpt-5-2': 'openrouter/openai/gpt-5.2',
    'gpt-5.2': 'openrouter/openai/gpt-5.2',
    'openai/gpt-5-2': 'openrouter/openai/gpt-5.2',
    'openai/gpt-5.2': 'openrouter/openai/gpt-5.2',
    'openrouter/openai/gpt-5-2': 'openrouter/openai/gpt-5.2',
    'openrouter/openai/gpt-5.2': 'openrouter/openai/gpt-5.2',
};
const canonicalKieModelMap = {
    'gpt-5-4': KIE_GPT_5_4_MODEL,
    'gpt-5.4': KIE_GPT_5_4_MODEL,
    'kie-gpt/gpt-5-4': KIE_GPT_5_4_MODEL,
    'kie-gpt/gpt-5.4': KIE_GPT_5_4_MODEL,
    'kie-codex/gpt-5-4': KIE_GPT_5_4_MODEL,
    'kie-codex/gpt-5.4': KIE_GPT_5_4_MODEL,
    'claude-opus-4-6': KIE_CLAUDE_OPUS_4_6_MODEL,
    'claude-opus-4.6': KIE_CLAUDE_OPUS_4_6_MODEL,
    'kie-claude/claude-opus-4-6': KIE_CLAUDE_OPUS_4_6_MODEL,
    'kie-claude/claude-opus-4.6': KIE_CLAUDE_OPUS_4_6_MODEL,
    'gemini-3-pro': KIE_GEMINI_3_1_PRO_MODEL,
    'gemini-3-pro-preview': KIE_GEMINI_3_1_PRO_MODEL,
    'gemini-3.1-pro-preview': KIE_GEMINI_3_1_PRO_MODEL,
    'kie-gemini/gemini-3.1-pro': KIE_GEMINI_3_1_PRO_MODEL,
    'kie-gemini/gemini-3-pro': KIE_GEMINI_3_1_PRO_MODEL,
    'kie-gemini/gemini-3-pro-preview': KIE_GEMINI_3_1_PRO_MODEL,
};
const canonicalOpenRouterGemini3ProModelMap = {
    'gemini-3-pro': OPENROUTER_GEMINI_3_PRO_MODEL,
    'gemini-3-pro-preview': OPENROUTER_GEMINI_3_PRO_MODEL,
    'gemini-3.1-pro-preview': OPENROUTER_GEMINI_3_PRO_MODEL,
    'google/gemini-3-pro': OPENROUTER_GEMINI_3_PRO_MODEL,
    'google/gemini-3-pro-preview': OPENROUTER_GEMINI_3_PRO_MODEL,
    'google/gemini-3.1-pro-preview': OPENROUTER_GEMINI_3_PRO_MODEL,
    'openrouter/google/gemini-3-pro': OPENROUTER_GEMINI_3_PRO_MODEL,
    'openrouter/google/gemini-3-pro-preview': OPENROUTER_GEMINI_3_PRO_MODEL,
    'openrouter/google/gemini-3.1-pro-preview': OPENROUTER_GEMINI_3_PRO_MODEL,
};
const canonicalOpenRouterClaudeOpus46ModelMap = {
    'claude-opus-4-6': OPENROUTER_CLAUDE_OPUS_4_6_MODEL,
    'claude-opus-4.6': OPENROUTER_CLAUDE_OPUS_4_6_MODEL,
    'anthropic/claude-opus-4-6': OPENROUTER_CLAUDE_OPUS_4_6_MODEL,
    'anthropic/claude-opus-4.6': OPENROUTER_CLAUDE_OPUS_4_6_MODEL,
    'openrouter/anthropic/claude-opus-4-6': OPENROUTER_CLAUDE_OPUS_4_6_MODEL,
    'openrouter/anthropic/claude-opus-4.6': OPENROUTER_CLAUDE_OPUS_4_6_MODEL,
    'openrouter/anthropic/claude-opus-4': OPENROUTER_CLAUDE_OPUS_4_6_MODEL,
};
const canonicalizeOpenRouterOpenAIModel = (model) => {
    const normalizedModel = normalizeModelKey(model);
    if (!normalizedModel) {
        return undefined;
    }
    return canonicalOpenRouterOpenAIModelMap[normalizedModel];
};
const canonicalizeKieModel = (model) => {
    const normalizedModel = normalizeModelKey(model);
    if (!normalizedModel) {
        return undefined;
    }
    return canonicalKieModelMap[normalizedModel];
};
const canonicalizeOpenRouterGemini3ProModel = (model) => {
    const normalizedModel = normalizeModelKey(model);
    if (!normalizedModel) {
        return undefined;
    }
    return canonicalOpenRouterGemini3ProModelMap[normalizedModel];
};
const canonicalizeOpenRouterClaudeOpus46Model = (model) => {
    const normalizedModel = normalizeModelKey(model);
    if (!normalizedModel) {
        return undefined;
    }
    return canonicalOpenRouterClaudeOpus46ModelMap[normalizedModel];
};
const canonicalizeOpenRouterHomepageModel = (model) => canonicalizeOpenRouterOpenAIModel(model) ||
    canonicalizeOpenRouterClaudeOpus46Model(model) ||
    canonicalizeOpenRouterGemini3ProModel(model);
const requiresOpenRouterProviderForModel = (model) => {
    return !!canonicalizeOpenRouterOpenAIModel(model);
};
export const MODEL_PROVIDER_MISMATCH = 'MODEL_PROVIDER_MISMATCH';
export function normalizeImportedAccountProviderAndModel(input) {
    const normalizedModelKey = normalizeModelKey(input.model);
    const rawProviderInput = normalizeProviderKey(input.provider);
    const normalizedProviderInput = rawProviderInput || 'openai';
    const normalizedKieModel = canonicalizeKieModel(normalizedModelKey);
    const normalizedOpenRouterHomepageModel = canonicalizeOpenRouterHomepageModel(normalizedModelKey);
    const normalizedOpenRouterGemini3ProModel = canonicalizeOpenRouterGemini3ProModel(normalizedModelKey);
    if (rawProviderInput === KIE_PROVIDER && normalizedKieModel) {
        return {
            provider: KIE_PROVIDER,
            model: normalizedKieModel,
        };
    }
    if (rawProviderInput === KIE_PROVIDER &&
        normalizedModelKey?.includes('/') &&
        !normalizedModelKey.startsWith('kie-')) {
        throw new Error(`${MODEL_PROVIDER_MISMATCH}: model=${normalizedModelKey}, provider=${rawProviderInput}, expected=${KIE_PROVIDER}`);
    }
    if (!rawProviderInput && normalizedOpenRouterHomepageModel) {
        return {
            provider: 'openrouter',
            model: normalizedOpenRouterHomepageModel,
        };
    }
    if (normalizedModelKey?.startsWith('kie-') && rawProviderInput && rawProviderInput !== KIE_PROVIDER) {
        throw new Error(`${MODEL_PROVIDER_MISMATCH}: model=${normalizedModelKey}, provider=${rawProviderInput}, expected=${KIE_PROVIDER}`);
    }
    if (rawProviderInput === 'openrouter') {
        if (normalizedOpenRouterHomepageModel) {
            return {
                provider: 'openrouter',
                model: normalizedOpenRouterHomepageModel,
            };
        }
    }
    if (normalizedOpenRouterGemini3ProModel) {
        if (rawProviderInput && rawProviderInput !== 'openrouter') {
            throw new Error(`${MODEL_PROVIDER_MISMATCH}: model=${normalizedOpenRouterGemini3ProModel}, provider=${rawProviderInput}, expected=openrouter`);
        }
        return {
            provider: 'openrouter',
            model: normalizedOpenRouterGemini3ProModel,
        };
    }
    if (rawProviderInput === 'anthropic' &&
        (normalizedModelKey === 'claude-opus-4-6' || normalizedModelKey === 'claude-opus-4.6')) {
        return {
            provider: 'anthropic',
            model: 'anthropic/claude-opus-4-6',
        };
    }
    const normalizedOpenRouterModel = canonicalizeOpenRouterOpenAIModel(normalizedModelKey);
    const normalizedProvider = requiresOpenRouterProviderForModel(normalizedModelKey)
        ? 'openrouter'
        : normalizedProviderInput;
    const normalizedModel = normalizedOpenRouterModel ?? input.model?.trim() ?? null;
    return {
        provider: normalizedProvider,
        model: normalizedModel,
    };
}
/**
 * 获取或分配用户的绑定账号
 * 如果用户已绑定，返回绑定的账号
 * 如果用户未绑定，从账号池分配新账号
 */
export async function getOrAssignAccount(userId, tier = 'starter', requiredProvider) {
    const normalizedTier = tier === 'pro' ? 'pro' : 'starter';
    const normalizedRequiredProvider = requiredProvider?.trim().toLowerCase() || undefined;
    const existingParams = [userId, normalizedTier];
    const existingProviderCondition = normalizedRequiredProvider
        ? ` AND COALESCE(NULLIF(lower(provider), ''), '') = $${existingParams.push(normalizedRequiredProvider)}`
        : '';
    // 1. 检查用户是否已有绑定账号
    const existingResult = await query(`SELECT id, account_id, api_key_encrypted, provider, model, thing_level,
            COALESCE(NULLIF(lower(tier), ''), 'starter') as tier
     FROM account_pool 
     WHERE bound_user_id = $1
       AND is_active = true
       AND COALESCE(NULLIF(lower(tier), ''), 'starter') = $2
       ${existingProviderCondition}`, existingParams);
    if (existingResult.rows.length > 0) {
        const row = existingResult.rows[0];
        return {
            id: row.id,
            accountId: row.account_id,
            apiKey: decryptSecret(row.api_key_encrypted),
            provider: row.provider,
            model: row.model,
            thingLevel: row.thing_level,
            tier: row.tier,
        };
    }
    const assignParams = [userId, normalizedTier];
    const assignProviderCondition = normalizedRequiredProvider
        ? ` AND COALESCE(NULLIF(lower(provider), ''), '') = $${assignParams.push(normalizedRequiredProvider)}`
        : '';
    // 2. 从未绑定的账号池中分配一个（FOR UPDATE 防止并发竞争）
    const assignResult = await query(`UPDATE account_pool
     SET is_bound = true, 
         bound_user_id = $1, 
         bound_at = now(),
         updated_at = now()
     WHERE id = (
       SELECT id FROM account_pool 
       WHERE is_bound = false 
       AND is_active = true 
       AND COALESCE(NULLIF(lower(tier), ''), 'starter') = $2
       ${assignProviderCondition}
       ORDER BY created_at asc 
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id, account_id, api_key_encrypted, provider, model, thing_level,
               COALESCE(NULLIF(lower(tier), ''), 'starter') as tier`, assignParams);
    if (assignResult.rows.length === 0) {
        if (normalizedRequiredProvider) {
            throw new Error(`NO_AVAILABLE_ACCOUNT_FOR_PROVIDER: tier=${normalizedTier}, provider=${normalizedRequiredProvider}`);
        }
        throw new Error(normalizedTier === 'pro'
            ? 'NO_AVAILABLE_PRO_ACCOUNT'
            : 'NO_AVAILABLE_STARTER_ACCOUNT');
    }
    const assigned = assignResult.rows[0];
    return {
        id: assigned.id,
        accountId: assigned.account_id,
        apiKey: decryptSecret(assigned.api_key_encrypted),
        provider: assigned.provider,
        model: assigned.model,
        thingLevel: assigned.thing_level,
        tier: assigned.tier,
    };
}
/**
 * 每次都从空闲账号池分配新账号，不复用用户历史绑定账号
 */
export async function assignFreshAccount(userId, tier = 'starter', requiredProvider) {
    const normalizedTier = tier === 'pro' ? 'pro' : 'starter';
    const normalizedRequiredProvider = requiredProvider?.trim().toLowerCase() || undefined;
    const assignParams = [userId, normalizedTier];
    const assignProviderCondition = normalizedRequiredProvider
        ? ` AND COALESCE(NULLIF(lower(provider), ''), '') = $${assignParams.push(normalizedRequiredProvider)}`
        : '';
    const assignResult = await query(`UPDATE account_pool
     SET is_bound = true,
         bound_user_id = $1,
         bound_at = now(),
         updated_at = now()
     WHERE id = (
       SELECT id FROM account_pool
       WHERE is_bound = false
       AND is_active = true
       AND COALESCE(NULLIF(lower(tier), ''), 'starter') = $2
       ${assignProviderCondition}
       ORDER BY created_at asc
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id, account_id, api_key_encrypted, provider, model, thing_level,
               COALESCE(NULLIF(lower(tier), ''), 'starter') as tier`, assignParams);
    if (assignResult.rows.length === 0) {
        if (normalizedRequiredProvider) {
            throw new Error(`NO_AVAILABLE_ACCOUNT_FOR_PROVIDER: tier=${normalizedTier}, provider=${normalizedRequiredProvider}`);
        }
        throw new Error(normalizedTier === 'pro'
            ? 'NO_AVAILABLE_PRO_ACCOUNT'
            : 'NO_AVAILABLE_STARTER_ACCOUNT');
    }
    const assigned = assignResult.rows[0];
    return {
        id: assigned.id,
        accountId: assigned.account_id,
        apiKey: decryptSecret(assigned.api_key_encrypted),
        provider: assigned.provider,
        model: assigned.model,
        thingLevel: assigned.thing_level,
        tier: assigned.tier,
    };
}
/**
 * 更新账号最后使用时间
 */
export async function updateAccountUsage(accountId) {
    await query(`UPDATE account_pool SET last_used_at = now(), updated_at = now() WHERE id = $1`, [accountId]);
}
/**
 * 解绑账号
 */
export async function unbindAccount(accountPoolId, options = {}) {
    const { stopDeployment = true, reason } = options;
    return await withClient(async (client) => {
        // 1. 查询账号信息
        const accountResult = await client.query(`SELECT id, account_id, is_bound, bound_user_id 
       FROM account_pool WHERE id = $1`, [accountPoolId]);
        if (accountResult.rows.length === 0) {
            throw new Error('ACCOUNT_NOT_FOUND');
        }
        const account = accountResult.rows[0];
        if (!account.is_bound) {
            throw new Error('ACCOUNT_NOT_BOUND');
        }
        const previousUserId = account.bound_user_id;
        let stoppedCount = 0;
        const fetchDeploymentsByAccountId = async () => {
            try {
                const result = await client.query(`SELECT id
           FROM ${DEPLOYMENTS_TABLE}
           WHERE account_id = $1 AND status IN ('provisioning', 'running')`, [accountPoolId]);
                return result.rows;
            }
            catch (error) {
                if (hasPgCode(error, PG_UNDEFINED_COLUMN) || hasPgCode(error, PG_UNDEFINED_TABLE)) {
                    console.warn('[AccountPool] deployments.account_id unavailable, fallback to user_id lookup', error);
                    return [];
                }
                throw error;
            }
        };
        const fetchDeploymentsByUserId = async () => {
            if (!previousUserId) {
                return [];
            }
            try {
                const result = await client.query(`SELECT id
           FROM ${DEPLOYMENTS_TABLE}
           WHERE user_id = $1 AND status IN ('provisioning', 'running')`, [previousUserId]);
                return result.rows;
            }
            catch (error) {
                if (hasPgCode(error, PG_UNDEFINED_COLUMN) || hasPgCode(error, PG_UNDEFINED_TABLE)) {
                    console.warn('[AccountPool] deployments.user_id unavailable while unbinding', error);
                    return [];
                }
                throw error;
            }
        };
        const stopDeploymentRecord = async (deploymentId) => {
            const fallbackToFailed = async () => {
                await client.query(`UPDATE ${DEPLOYMENTS_TABLE}
           SET status = 'failed'
           WHERE id = $1`, [deploymentId]);
            };
            try {
                await client.query(`UPDATE ${DEPLOYMENTS_TABLE}
           SET status = 'stopped', stopped_at = now(), stop_reason = 'account_unbound'
           WHERE id = $1`, [deploymentId]);
                return;
            }
            catch (error) {
                if (hasPgCode(error, PG_CHECK_VIOLATION)) {
                    // Legacy status constraints may not include "stopped".
                    await fallbackToFailed();
                    return;
                }
                if (hasPgCode(error, PG_UNDEFINED_COLUMN)) {
                    // Older schemas might not have stopped_at / stop_reason.
                    try {
                        await client.query(`UPDATE ${DEPLOYMENTS_TABLE}
               SET status = 'stopped'
               WHERE id = $1`, [deploymentId]);
                        return;
                    }
                    catch (fallbackError) {
                        if (hasPgCode(fallbackError, PG_CHECK_VIOLATION)) {
                            await fallbackToFailed();
                            return;
                        }
                        throw fallbackError;
                    }
                }
                throw error;
            }
        };
        // 2. 停止相关部署
        if (stopDeployment) {
            const byAccountId = await fetchDeploymentsByAccountId();
            const byUserId = await fetchDeploymentsByUserId();
            const deployments = new Map();
            for (const deployment of byAccountId) {
                deployments.set(deployment.id, deployment);
            }
            for (const deployment of byUserId) {
                deployments.set(deployment.id, deployment);
            }
            const deploymentList = Array.from(deployments.values());
            for (let index = 0; index < deploymentList.length; index++) {
                const deployment = deploymentList[index];
                const savepointName = `stop_deployment_${index}`;
                await client.query(`SAVEPOINT ${savepointName}`);
                try {
                    await stopDeploymentRecord(deployment.id);
                    await client.query(`RELEASE SAVEPOINT ${savepointName}`);
                    stoppedCount++;
                }
                catch (error) {
                    await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
                    await client.query(`RELEASE SAVEPOINT ${savepointName}`);
                    console.error(`[AccountPool] 停止部署 ${deployment.id} 失败:`, error);
                }
            }
        }
        // 3. 解绑账号
        await client.query(`UPDATE account_pool 
       SET is_bound = false,
           bound_user_id = null,
           bound_at = null,
           updated_at = now()
       WHERE id = $1`, [accountPoolId]);
        // 4. 记录解绑日志
        try {
            await client.query(`INSERT INTO account_unbind_logs (account_id, previous_user_id, reason, stopped_deployments)
         VALUES ($1, $2, $3, $4)`, [accountPoolId, previousUserId, reason || null, stoppedCount]);
        }
        catch (error) {
            if (hasPgCode(error, PG_UNDEFINED_TABLE) || hasPgCode(error, PG_UNDEFINED_COLUMN)) {
                console.warn('[AccountPool] account_unbind_logs unavailable, skip audit log', error);
            }
            else {
                throw error;
            }
        }
        return {
            accountId: accountPoolId,
            previousUserId,
            stoppedDeployments: stoppedCount,
            accountStatus: 'available'
        };
    });
}
/**
 * 获取账号列表
 */
export async function listAccounts(tier) {
    const conditions = [];
    const values = [];
    if (tier) {
        values.push(tier);
        conditions.push(`COALESCE(NULLIF(lower(tier), ''), 'starter') = $${values.length}`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(`SELECT
      id, 
      account_id, 
      email,
      provider,
      model,
      thing_level,
      COALESCE(NULLIF(lower(tier), ''), 'starter') as tier,
      is_bound, 
      bound_user_id,
      is_active,
      last_used_at,
      created_at
     FROM account_pool
     ${whereClause}
     ORDER BY created_at DESC`, values);
    return result.rows.map(row => ({
        id: row.id,
        accountId: row.account_id,
        email: row.email,
        provider: row.provider,
        model: row.model,
        thingLevel: row.thing_level,
        tier: row.tier,
        isBound: row.is_bound,
        boundUserId: row.bound_user_id,
        isActive: row.is_active,
        lastUsedAt: row.last_used_at,
        createdAt: row.created_at
    }));
}
/**
 * 删除账号
 */
export async function deleteAccount(accountId, force) {
    const check = await query('SELECT is_bound FROM account_pool WHERE id = $1', [accountId]);
    if (check.rows.length === 0) {
        throw new Error('ACCOUNT_NOT_FOUND');
    }
    if (check.rows[0].is_bound && !force) {
        throw new Error('ACCOUNT_BOUND_CANNOT_DELETE');
    }
    await query('DELETE FROM account_pool WHERE id = $1', [accountId]);
}
/**
 * 导入账号 (API Key 模式)
 */
export async function importAccount(input) {
    const { provider: normalizedProvider, model: normalizedModel } = normalizeImportedAccountProviderAndModel({
        provider: input.provider,
        model: input.model,
    });
    const normalizedTier = input.tier === 'pro' ? 'pro' : 'starter';
    // 检查是否已存在
    const existing = await query('SELECT id FROM account_pool WHERE account_id = $1', [input.accountId]);
    if (existing.rows.length > 0) {
        throw new Error('ACCOUNT_ALREADY_EXISTS');
    }
    await query(`INSERT INTO account_pool 
     (account_id, email, api_key_encrypted, provider, model, thing_level, tier, is_bound, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, false, true)`, [
        input.accountId,
        input.email || null,
        encryptSecret(input.apiKey),
        normalizedProvider,
        normalizedModel,
        input.thingLevel || null,
        normalizedTier
    ]);
    return { accountId: input.accountId };
}
export async function getAccountInventory() {
    const result = await query(`SELECT
      COALESCE(NULLIF(lower(tier), ''), 'starter') as tier,
      COALESCE(NULLIF(lower(provider), ''), 'unknown') as provider,
      is_bound,
      is_active,
      COUNT(*)::int as count
     FROM account_pool
     GROUP BY 1, 2, 3, 4
     ORDER BY 1, 2, 3, 4`);
    return result.rows.map((row) => ({
        tier: row.tier,
        provider: row.provider,
        isBound: row.is_bound,
        isActive: row.is_active,
        count: Number.parseInt(String(row.count ?? '0'), 10) || 0,
    }));
}
/**
 * 获取账号统计
 */
export async function getAccountStats() {
    const result = await query(`SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_bound = true) as bound,
      COUNT(*) FILTER (WHERE is_bound = false AND is_active = true) as available,
      COUNT(*) FILTER (WHERE is_active = false) as inactive,
      COUNT(*) FILTER (WHERE COALESCE(NULLIF(lower(tier), ''), 'starter') = 'starter') as starter_total,
      COUNT(*) FILTER (WHERE COALESCE(NULLIF(lower(tier), ''), 'starter') = 'starter' AND is_bound = true) as starter_bound,
      COUNT(*) FILTER (WHERE COALESCE(NULLIF(lower(tier), ''), 'starter') = 'starter' AND is_bound = false AND is_active = true) as starter_available,
      COUNT(*) FILTER (WHERE COALESCE(NULLIF(lower(tier), ''), 'starter') = 'pro') as pro_total,
      COUNT(*) FILTER (WHERE COALESCE(NULLIF(lower(tier), ''), 'starter') = 'pro' AND is_bound = true) as pro_bound,
      COUNT(*) FILTER (WHERE COALESCE(NULLIF(lower(tier), ''), 'starter') = 'pro' AND is_bound = false AND is_active = true) as pro_available
     FROM account_pool`);
    return result.rows[0];
}
