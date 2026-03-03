"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthCardHeader } from "@/components/auth/AuthCardHeader";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ControlledInput } from "@/components/form/ControlledInput";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: "/auth/reset-password",
    });
    if (error) {
      setError(error.message ?? "Something went wrong");
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <AuthLayout>
        <AuthCard>
          <AuthCardHeader
            title="Check your inbox"
            description="If an account exists for that email, a reset link has been sent. In development, check the server console."
          />
          <CardContent>
            <a href="/auth/sign-in" className="text-sm underline underline-offset-4">
              Back to sign in
            </a>
          </CardContent>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard>
        <AuthCardHeader
          title="Forgot password"
          description="Enter your email and we'll send you a reset link"
          error={error}
        />
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <ControlledInput
              name="email"
              label="Email"
              control={control}
              placeholder="you@example.com"
              type="email"
              error={errors.email}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <a href="/auth/sign-in" className="underline underline-offset-4">
              Back to sign in
            </a>
          </div>
        </CardContent>
      </AuthCard>
    </AuthLayout>
  );
}
