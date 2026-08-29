import type { ReactNode } from "react";

import { listUserOrganizations, requireActiveOrganization } from "@/lib/auth/session";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { session, organization } = await requireActiveOrganization();
  const organizations = await listUserOrganizations(session.user.id);

  return (
    <div className="flex min-h-full flex-1">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <AppTopbar
          user={{ name: session.user.name, email: session.user.email }}
          organization={organization}
          organizations={organizations}
        />
        <main id="main-content" className="flex flex-1 flex-col p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
