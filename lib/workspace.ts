import { prisma } from './db';

export async function getUserWorkspace(userId: string) {
  const workspace = await prisma.workspace.findFirst({
    where: { ownerId: userId },
  });
  
  return workspace;
}

export async function getWorkspaceById(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });
  
  return workspace;
}
