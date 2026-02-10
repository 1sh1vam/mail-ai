import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/services/authService";
import { Mail } from "lucide-react";

export function LoginPage() {
  const handleLogin = () => {
    window.location.href = authService.getLoginUrl();
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">AI Mail</CardTitle>
          <CardDescription>
            An AI-powered email client that understands your commands
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleLogin} className="w-full" size="lg">
            Sign in with Google
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-4">
            By signing in, you allow AI Mail to read and send emails on your behalf.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
