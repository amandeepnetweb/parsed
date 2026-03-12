"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthCardHeader } from "@/components/auth/AuthCardHeader";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ControlledInput } from "@/components/form/ControlledInput";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });
    if (error) {
      setError(error.message ?? "Invalid email or password");
      return;
    }
    toast.success("Signed in successfully");
    router.push("/dashboard");
  };

  return (
    <AuthLayout>
      <AuthCard>
        <AuthCardHeader
          title="Sign in"
          description="Enter your email and password to access your account"
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
            <ControlledInput
              name="password"
              label="Password"
              control={control}
              placeholder="••••••••"
              type="password"
              showPasswordToggle
              error={errors.password}
            />
            <div className="text-end text-sm">
              <a href="/auth/forgot-password" className="underline underline-offset-4">
                Forgot password?
              </a>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" })}
          >
            <svg className="mr-2 size-4" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          <AuthFooter mode="login" />
        </CardContent>
      </AuthCard>
    </AuthLayout>
  );
}
