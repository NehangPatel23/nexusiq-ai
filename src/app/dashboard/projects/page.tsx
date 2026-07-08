import type { Metadata } from "next";

import { SlicePlaceholder } from "@/components/layout/slice-placeholder";
import { SLICE_PLACEHOLDERS } from "@/lib/slice-placeholders";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return <SlicePlaceholder config={SLICE_PLACEHOLDERS.projects} />;
}
