import { deployments } from "@/db/schema";
import { db } from "@/db";
import { desc, eq, and } from "drizzle-orm";
import { assertDbWriteAllowed } from "@/lib/db-write-freeze";

export enum DeploymentStatus {
  Provisioning = "provisioning",
  Running = "running",
  Failed = "failed",
}

export async function insertDeployment(
  data: typeof deployments.$inferInsert
): Promise<typeof deployments.$inferSelect | undefined> {
  assertDbWriteAllowed("deployments.insert");
  const [deployment] = await db().insert(deployments).values(data).returning();
  return deployment;
}

export async function findDeploymentById(
  id: string
): Promise<typeof deployments.$inferSelect | undefined> {
  const [deployment] = await db()
    .select()
    .from(deployments)
    .where(eq(deployments.id, id))
    .limit(1);
  return deployment;
}

export async function getDeploymentsByUserId(
  user_id: string,
  page: number = 1,
  limit: number = 50
): Promise<(typeof deployments.$inferSelect)[] | undefined> {
  const offset = (page - 1) * limit;
  const data = await db()
    .select()
    .from(deployments)
    .where(eq(deployments.user_id, user_id))
    .orderBy(desc(deployments.created_at))
    .limit(limit)
    .offset(offset);
  return data;
}

export async function getUserActiveDeployment(
  user_id: string
): Promise<typeof deployments.$inferSelect | undefined> {
  const [deployment] = await db()
    .select()
    .from(deployments)
    .where(
      and(
        eq(deployments.user_id, user_id),
        eq(deployments.status, DeploymentStatus.Running)
      )
    )
    .orderBy(desc(deployments.created_at))
    .limit(1);
  return deployment;
}

export async function updateDeploymentStatus(
  id: string,
  status: DeploymentStatus,
  error_message?: string
): Promise<typeof deployments.$inferSelect | undefined> {
  assertDbWriteAllowed("deployments.updateStatus");
  const updateData: Partial<typeof deployments.$inferInsert> = {
    status,
    updated_at: new Date(),
  };
  if (error_message !== undefined) {
    updateData.error_message = error_message;
  }
  const [deployment] = await db()
    .update(deployments)
    .set(updateData)
    .where(eq(deployments.id, id))
    .returning();
  return deployment;
}

export async function getDeploymentsTotal(): Promise<number> {
  const total = await db().$count(deployments);
  return total;
}

export async function getDeploymentsByStatus(
  status: DeploymentStatus,
  page: number = 1,
  limit: number = 50
): Promise<(typeof deployments.$inferSelect)[] | undefined> {
  const offset = (page - 1) * limit;
  const data = await db()
    .select()
    .from(deployments)
    .where(eq(deployments.status, status))
    .orderBy(desc(deployments.created_at))
    .limit(limit)
    .offset(offset);
  return data;
}
