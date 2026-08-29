"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";

import { authClient } from "@/lib/auth/client";
import { signUpSchema, type SignUpInput } from "@/lib/validation/auth";
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

export function SignUpForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  async function onSubmit(values: SignUpInput) {
    setServerError(null);
    const { error } = await authClient.signUp.email(values);
    if (error) {
      setServerError(error.message ?? "Couldn't create your account.");
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1" className="text-lg">Create your account</CardTitle>
        <CardDescription>Start capturing customer feedback.</CardDescription>
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
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              autoComplete="name"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </CardContent>
      <div className="border-t border-border px-4 py-3 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </div>
    </Card>
  );
}
