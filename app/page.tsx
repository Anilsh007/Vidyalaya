import { redirect } from "next/navigation";

import { getOptionalSession } from "@/lib/auth/session";
import { getDefaultDashboardRoute } from "@/lib/modules/module-access";

export default async function HomePage() {
  const session = await getOptionalSession();
  redirect(session ? getDefaultDashboardRoute(session) : "/login");
}
