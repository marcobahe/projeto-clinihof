import { prisma } from './db';

export async function getUserWorkspace(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { workspaceId: true },
  });

  if (user?.workspaceId) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: user.workspaceId },
    });
    if (workspace) return workspace;
  }

  const workspace = await prisma.workspace.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: 'asc' },
  });
  
  return workspace;
}

export async function getWorkspaceById(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });
  
  return workspace;
}
