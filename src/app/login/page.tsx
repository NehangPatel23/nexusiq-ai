import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-h2">Sign in</CardTitle>
          <CardDescription>
            Authentication will be implemented in slice 01-auth.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button disabled>Sign in (coming soon)</Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/register" className="text-primary hover:underline">
              Create an account
            </Link>
            {" · "}
            <Link href="/" className="hover:underline">
              Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
