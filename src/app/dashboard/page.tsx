import { FolderPlus, MessageSquare, Scan, Upload } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const quickActions = [
  { label: "New Project", icon: FolderPlus, href: "/dashboard/projects" },
  { label: "Upload", icon: Upload, href: "/dashboard/projects" },
  { label: "Full Scan", icon: Scan, href: "/dashboard/intelligence" },
  { label: "New Chat", icon: MessageSquare, href: "/dashboard/chat" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Overview of your projects, risks, and recent activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Projects", value: "0" },
          { label: "Documents processed", value: "0" },
          { label: "Open risks", value: "0" },
          { label: "Pending tasks", value: "0" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
          <CardDescription>Common workflows to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button key={action.label} variant="outline" className="h-auto justify-start gap-3 py-4" asChild>
                  <Link href={action.href}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader className="text-center">
          <CardTitle>Create your first project</CardTitle>
          <CardDescription>
            Set up a workspace and upload your data room to begin AI-powered due diligence.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <Button asChild>
            <Link href="/dashboard/projects">Create your first project</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
