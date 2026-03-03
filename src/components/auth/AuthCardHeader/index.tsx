import { Alert, AlertDescription } from "@/components/ui/alert";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthCardHeaderProps {
  title: string;
  description: string;
  error?: string | null;
}

export function AuthCardHeader({ title, description, error }: AuthCardHeaderProps) {
  return (
    <CardHeader>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <CardTitle className="text-xl">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
  );
}
