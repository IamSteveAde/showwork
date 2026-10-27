import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentCreator, verifyViewerToken } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

export async function deliveryAccess(project: { id: string; creatorId: string; deletedAt?: Date | null }) {
  if (project.deletedAt) return null;
  const creator = await getCurrentCreator();
  if (creator && (creator.id === project.creatorId || isAdminEmail(creator.email) || await db.projectCollaborator.findFirst({ where: { projectId: project.id, creatorId: creator.id } }))) {
    return { email: creator.email, name: creator.name, creator: true };
  }
  const managed = await db.managedProject.findUnique({ where: { deliveryProjectId: project.id }, select: { publishedAt: true } });
  if (managed && !managed.publishedAt) return null;
  const cookie = (await cookies()).get(`viewer_${project.id}`)?.value;
  const viewer = cookie ? verifyViewerToken(cookie, project.id) : null;
  return viewer ? { ...viewer, creator: false } : null;
}
