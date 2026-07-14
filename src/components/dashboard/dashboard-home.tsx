"use client";

import {
  AlertCircle,
  CheckSquare,
  FileStack,
  FileText,
  FolderPlus,
  MessageSquare,
  Scan,
  Sparkles,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { ActivityFeed } from "@/features/projects/components/activity-feed";
import { DashboardOnboardingNudge } from "@/features/projects/components/dashboard-onboarding-nudge";
import { RiskOverviewDonut } from "@/features/projects/components/risk-overview-donut";
import type { DashboardData } from "@/features/projects/lib/dashboard";
import { BrandBadge } from "@/components/brand/brand-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { easeOut, staggerContainer, fadeUp } from "@/lib/motion";

const quickActions = (recentProjectId: string | null) => [
  { label: "New Project", icon: FolderPlus, href: "/dashboard/projects?create=true" },
  {
    label: "Upload",
    icon: Upload,
    href: recentProjectId
      ? `/dashboard/projects/${recentProjectId}/data-room`
      : "/dashboard/projects?create=true",
  },
  { label: "Full Scan", icon: Scan, href: "/dashboard/intelligence" },
  { label: "New Chat", icon: MessageSquare, href: "/dashboard/chat" },
];

interface DashboardHomeProps {
  data: DashboardData;
}

export function DashboardHome({ data }: DashboardHomeProps) {
  const reduceMotion = useReducedMotion();
  const hasProjects = data.stats.projectCount > 0;

  const stats = [
    { label: "Projects", value: data.stats.projectCount, icon: FolderPlus },
    { label: "Documents processed", value: data.stats.documentsProcessed, icon: FileStack },
    {
      label: "Documents processing",
      value: data.stats.documentsProcessing,
      icon: Scan,
    },
    { label: "Open risks", value: data.stats.openRisks, icon: AlertCircle },
    { label: "Pending tasks", value: data.stats.pendingTasks, icon: CheckSquare },
  ];

  return (
    <motion.div
      className="space-y-12"
      variants={reduceMotion ? undefined : staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <DashboardOnboardingNudge onboarding={data.onboarding} />

      <motion.div
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 via-card/70 to-primary/5 p-8 md:p-10"
        variants={fadeUp}
        transition={easeOut}
      >
        <motion.div
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
          animate={reduceMotion ? undefined : { scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <div className="relative space-y-4">
          <BrandBadge variant="primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Intelligence workspace
          </BrandBadge>
          <PageHeader
            title="Dashboard"
            description="Overview of your projects, risks, and recent activity across your organization."
            className="!flex-col !items-start !gap-2"
          />
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} {...stat} delay={0.1 + i * 0.06} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <motion.div className="min-w-0" variants={fadeUp} transition={{ ...easeOut, delay: 0.15 }}>
          <RiskOverviewDonut data={data.riskOverview} />
        </motion.div>
        <motion.div className="min-w-0" variants={fadeUp} transition={{ ...easeOut, delay: 0.2 }}>
          <ActivityFeed items={data.recentActivity} />
        </motion.div>
      </div>

      <motion.div variants={fadeUp} transition={{ ...easeOut, delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Jump into common workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickActions(data.recentProjectId).map((action, i) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.label}
                    initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={{ ...easeOut, delay: 0.3 + i * 0.05 }}
                  >
                    <Button
                      variant="outline"
                      className="h-auto w-full justify-start gap-3 border-border/60 bg-card/30 px-5 py-5 text-left hover:border-primary/20 hover:bg-primary/5"
                      asChild
                    >
                      <Link href={action.href}>
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/15 bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                        </div>
                        <span className="font-medium">{action.label}</span>
                      </Link>
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={fadeUp} transition={{ ...easeOut, delay: 0.25 }}>
          <Card className="h-full border-border/60 bg-card/40">
            <CardHeader>
              <CardTitle>Recent reports</CardTitle>
              <CardDescription>Generated reports across your projects</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-secondary/50">
                    <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium">No reports yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Generate executive summaries and risk registers after running intelligence
                    agents.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/40" role="list">
                  {data.recentReports.map((report) => (
                    <li
                      key={report.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{report.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {report.projectName} · {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/projects/${report.projectId}/reports`}>
                          Open
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} transition={{ ...easeOut, delay: 0.3 }}>
          <Card className="h-full border-border/60 bg-card/40">
            <CardHeader>
              <CardTitle>Upcoming tasks</CardTitle>
              <CardDescription>Action items from your diligence workflows</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-secondary/50">
                  <CheckSquare className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium">No upcoming tasks</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Action plan tasks will appear here once you create items from findings.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {!hasProjects && (
        <motion.div variants={fadeUp} transition={{ ...easeOut, delay: 0.3 }}>
          <Card className="border-dashed border-border/60 bg-transparent shadow-none">
            <CardHeader className="items-center text-center">
              <motion.div
                className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10"
                animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <FolderPlus className="h-6 w-6 text-primary" aria-hidden="true" />
              </motion.div>
              <CardTitle>Create your first project</CardTitle>
              <CardDescription className="max-w-md">
                Set up a workspace and create a project to begin AI-powered due diligence.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-8">
              <Button size="lg" asChild>
                <Link href="/dashboard/projects">Create your first project</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
