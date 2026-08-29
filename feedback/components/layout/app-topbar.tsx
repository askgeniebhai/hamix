import type { ActiveOrganization } from "@/lib/auth/session";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import { UserMenu } from "@/components/layout/user-menu";

export function AppTopbar({
  user,
  organization,
  organizations,
}: {
  user: { name: string; email: string };
  organization: { id: string; name: string };
  organizations: ActiveOrganization[];
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
      <OrgSwitcher organization={organization} organizations={organizations} />
      <UserMenu user={user} />
    </header>
  );
}
