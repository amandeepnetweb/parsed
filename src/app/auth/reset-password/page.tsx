"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthCardHeader } from "@/components/auth/AuthCardHeader";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ControlledInput } from "@/components/form/ControlledInput";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

const schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  if (!token) {
    return (
      <AuthLayout>
        <AuthCard>
          <AuthCardHeader
            title="Invalid link"
            description="This password reset link is invalid or has expired."
          />
          <CardContent>
            <a href="/auth/forgot-password" className="text-sm underline underline-offset-4">
              Request a new reset link
            </a>
          </CardContent>
        </AuthCard>
      </AuthLayout>
    );
  }

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const { error } = await authClient.resetPassword({
      newPassword: values.newPassword,
      token,
    });
    if (error) {
      setError(error.message ?? "Failed to reset password");
      return;
    }
    toast.success("Password reset successfully");
    router.push("/auth/sign-in");
  };

  return (
    <AuthLayout>
      <AuthCard>
        <AuthCardHeader
          title="Reset your password"
          description="Enter your new password below"
          error={error}
        />
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <ControlledInput
              name="newPassword"
              label="New password"
              control={control}
              placeholder="••••••••"
              type="password"
              showPasswordToggle
              description="Minimum 8 characters"
              error={errors.newPassword}
            />
            <ControlledInput
              name="confirmPassword"
              label="Confirm new password"
              control={control}
              placeholder="••••••••"
              type="password"
              showPasswordToggle
              error={errors.confirmPassword}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Resetting…" : "Reset password"}
            </Button>
          </form>
        </CardContent>
      </AuthCard>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
