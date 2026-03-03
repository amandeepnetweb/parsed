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

const schema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const name = `${values.firstName} ${values.lastName}`.trim();
    const { error } = await authClient.signUp.email({
      name,
      email: values.email,
      password: values.password,
      ...(values.phone ? { phone: values.phone } : {}),
    } as Parameters<typeof authClient.signUp.email>[0]);
    if (error) {
      setError(error.message ?? "Registration failed");
      return;
    }
    toast.success("Account created successfully");
    router.push("/dashboard");
  };

  return (
    <AuthLayout>
      <AuthCard>
        <AuthCardHeader
          title="Create an account"
          description="Fill in your details to get started"
          error={error}
        />
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <ControlledInput
                name="firstName"
                label="First name"
                control={control}
                placeholder="Ahmed"
                error={errors.firstName}
              />
              <ControlledInput
                name="lastName"
                label="Last name"
                control={control}
                placeholder="Ali"
                error={errors.lastName}
              />
            </div>
            <ControlledInput
              name="email"
              label="Email"
              control={control}
              placeholder="you@example.com"
              type="email"
              error={errors.email}
            />
            <ControlledInput
              name="phone"
              label="Phone (optional)"
              control={control}
              placeholder="+1 234 567 8900"
              type="tel"
              error={errors.phone}
            />
            <ControlledInput
              name="password"
              label="Password"
              control={control}
              placeholder="••••••••"
              type="password"
              showPasswordToggle
              description="Minimum 8 characters"
              error={errors.password}
            />
            <ControlledInput
              name="confirmPassword"
              label="Confirm password"
              control={control}
              placeholder="••••••••"
              type="password"
              showPasswordToggle
              error={errors.confirmPassword}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <AuthFooter mode="register" />
        </CardContent>
      </AuthCard>
    </AuthLayout>
  );
}
