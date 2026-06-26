import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

export default function AccountsLoading() {
  return <LoadingSkeleton title="Loading accounts" rows={8} />;
}
