"use client";
import WorkspaceTeamPanel from './WorkspaceTeamPanel';
export default function InviteCollaboratorForm({ calendarId }: { calendarId: string; advancedPermissionsAccess?: boolean }) {
  return <WorkspaceTeamPanel calendarId={calendarId} />;
}
