import Link from "next/link";

interface AuthFooterProps {
  mode: "login" | "register";
}

export function AuthFooter({ mode }: AuthFooterProps) {
  if (mode === "login") {
    return (
      <div className="mt-4 text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/auth/sign-up" className="underline underline-offset-4">
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 text-center text-sm">
      Already have an account?{" "}
      <Link href="/auth/sign-in" className="underline underline-offset-4">
        Sign in
      </Link>
    </div>
  );
}
