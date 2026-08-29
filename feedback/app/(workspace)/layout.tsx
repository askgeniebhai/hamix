import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <AppTopbar />
        <main id="main-content" className="flex flex-1 flex-col p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
