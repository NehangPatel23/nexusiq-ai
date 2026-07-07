"use client";

import {
  AlertCircle,
  CheckSquare,
  FileStack,
  FolderPlus,
  MessageSquare,
  Scan,
  Sparkles,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { BrandBadge } from "@/components/brand/brand-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { easeOut, staggerContainer, fadeUp } from "@/lib/motion";

const quickActions = [
  { label: "New Project", icon: FolderPlus, href: "/dashboard/projects" },
  { label: "Upload", icon: Upload, href: "/dashboard/projects" },
  { label: "Full Scan", icon: Scan, href: "/dashboard/intelligence" },
  { label: "New Chat", icon: MessageSquare, href: "/dashboard/chat" },
];

const stats = [
  { label: "Projects", value: 0, icon: FolderPlus },
  { label: "Documents processed", value: 0, icon: FileStack },
  { label: "Open risks", value: 0, icon: AlertCircle },
  { label: "Pending tasks", value: 0, icon: CheckSquare },
];

export function DashboardHome() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="space-y-12"
      variants={reduceMotion ? undefined : staggerContainer}
      initial="hidden"
      animate="visible"
    >
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} {...stat} delay={0.1 + i * 0.06} />
        ))}
      </div>

      <motion.div variants={fadeUp} transition={{ ...easeOut, delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Jump into common workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((action, i) => {
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
              Set up a workspace and upload your data room to begin AI-powered due diligence.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button size="lg" asChild>
              <Link href="/dashboard/projects">Create your first project</Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
