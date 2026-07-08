import type { Metadata } from "next";

import { SlicePlaceholder } from "@/components/layout/slice-placeholder";
import { SLICE_PLACEHOLDERS } from "@/lib/slice-placeholders";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  return <SlicePlaceholder config={SLICE_PLACEHOLDERS.search} />;
}
