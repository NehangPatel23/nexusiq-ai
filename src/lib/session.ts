import { cache } from "react";

import { auth } from "@/lib/auth";

/** Deduplicated session read within a single RSC request. */
export const getSession = cache(auth);
