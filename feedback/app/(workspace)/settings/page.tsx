import type { Metadata } from "next";

import { requireActiveOrganization } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { session, organization } = await requireActiveOrganization();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Basic account and workspace information.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your account details.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="text-foreground">{session.user.name}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-foreground">{session.user.email}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace</CardTitle>
          <CardDescription>
            The workspace you&apos;re currently signed into.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="text-foreground">{organization.name}</dd>
            <dt className="text-muted-foreground">URL slug</dt>
            <dd className="text-foreground">{organization.slug}</dd>
            <dt className="text-muted-foreground">Your role</dt>
            <dd className="text-foreground capitalize">{organization.role}</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
