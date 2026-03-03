import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/common";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex items-center justify-center p-6 md:p-10 lg:px-16 xl:px-24">
        <div className="w-full max-w-md lg:max-w-lg">{children}</div>
      </div>
      <div className="relative hidden lg:flex flex-col items-center justify-center bg-muted p-12 gap-6">
        <div className="text-center">
          <p className="text-4xl font-bold tracking-tight">تعلم القرآن الكريم</p>
          <p className="mt-2 text-muted-foreground text-lg">Learn the Holy Quran</p>
        </div>
        <p className="text-muted-foreground text-center max-w-sm text-sm">
          Master Quran recitation with interactive lessons, personalized progress tracking,
          and bilingual support.
        </p>
        <div className="absolute bottom-4 end-4">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
