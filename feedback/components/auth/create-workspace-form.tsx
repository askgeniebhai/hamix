"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";

import { authClient } from "@/lib/auth/client";
import {
  createOrganizationSchema,
  slugify,
  type CreateOrganizationInput,
} from "@/lib/validation/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [name, setName] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: "", slug: "" },
  });

  async function onSubmit(values: CreateOrganizationInput) {
    setServerError(null);
    const { error } = await authClient.organization.create(values);
    if (error) {
      setServerError(error.message ?? "Couldn't create your workspace.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1" className="text-lg">Name your workspace</CardTitle>
        <CardDescription>
          This is where your team will collect and act on feedback.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          {serverError ? (
            <Alert variant="destructive">
              <CircleAlert className="size-4" aria-hidden="true" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Workspace name</Label>
            <Input
              id="name"
              autoComplete="organization"
              aria-invalid={!!errors.name}
              {...register("name", {
                onChange: (e) => {
                  setName(e.target.value);
                  if (!slugTouched) {
                    setValue("slug", slugify(e.target.value), {
                      shouldValidate: true,
                    });
                  }
                },
              })}
            />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">URL slug</Label>
            <Input
              id="slug"
              aria-invalid={!!errors.slug}
              {...register("slug", {
                onChange: () => setSlugTouched(true),
              })}
              placeholder={name ? slugify(name) : "acme-inc"}
            />
            {errors.slug ? (
              <p className="text-xs text-destructive">{errors.slug.message}</p>
            ) : null}
          </div>

          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? "Creating workspace…" : "Create workspace"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
