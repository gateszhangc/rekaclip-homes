// 测试 Deployment 完整流程的 API
import { NextRequest } from "next/server";
import { respData, respErr } from "@/lib/resp";
import {
  insertDeployment,
  findDeploymentById,
  getDeploymentsByUserId,
  updateDeploymentStatus,
  DeploymentStatus,
} from "@/models/deployment";

// GET: 查询测试
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const deploymentId = searchParams.get("deploymentId");

    // 如果提供了 deploymentId，查询单个部署
    if (deploymentId) {
      const deployment = await findDeploymentById(deploymentId);
      if (!deployment) {
        return respErr("Deployment not found");
      }
      return respData({ deployment });
    }

    // 如果提供了 userId，查询用户的所有部署
    if (userId) {
      const deployments = await getDeploymentsByUserId(userId);
      return respData({ 
        userId, 
        count: deployments?.length || 0,
        deployments 
      });
    }

    return respErr("Missing userId or deploymentId parameter");
  } catch (e) {
    console.error("test-deployment GET error:", e);
    return respErr("internal error");
  }
}

// POST: 创建测试部署
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, telegramToken } = body;

    if (!userId || !telegramToken) {
      return respErr("Missing userId or telegramToken");
    }

    // 创建部署记录
    const deployment = await insertDeployment({
      user_id: userId,
      status: DeploymentStatus.Provisioning,
      channel_type: "telegram",
      channel_token_encrypted: `encrypted:${telegramToken}`,
      telegram_token_encrypted: `encrypted:${telegramToken}`,
    });

    if (!deployment) {
      return respErr("Failed to create deployment");
    }

    // 模拟部署过程
    setTimeout(async () => {
      try {
        // 80% 概率成功，20% 概率失败（用于测试）
        const isSuccess = Math.random() > 0.2;
        
        if (isSuccess) {
          await updateDeploymentStatus(deployment.id, DeploymentStatus.Running);
          console.log(`Deployment ${deployment.id} is now running`);
        } else {
          await updateDeploymentStatus(
            deployment.id, 
            DeploymentStatus.Failed,
            "Simulated deployment failure"
          );
          console.log(`Deployment ${deployment.id} failed`);
        }
      } catch (err) {
        console.error("Background update error:", err);
      }
    }, 3000); // 3秒后更新状态

    return respData({
      message: "Deployment created",
      deployment: {
        id: deployment.id,
        status: deployment.status,
        createdAt: deployment.created_at,
      },
      note: "Status will be updated in 3 seconds (simulated)",
    });
  } catch (e) {
    console.error("test-deployment POST error:", e);
    return respErr("internal error");
  }
}

// PATCH: 更新部署状态
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { deploymentId, status, errorMessage } = body;

    if (!deploymentId || !status) {
      return respErr("Missing deploymentId or status");
    }

    const updated = await updateDeploymentStatus(
      deploymentId,
      status as DeploymentStatus,
      errorMessage
    );

    if (!updated) {
      return respErr("Deployment not found");
    }

    return respData({
      message: "Deployment updated",
      deployment: updated,
    });
  } catch (e) {
    console.error("test-deployment PATCH error:", e);
    return respErr("internal error");
  }
}
