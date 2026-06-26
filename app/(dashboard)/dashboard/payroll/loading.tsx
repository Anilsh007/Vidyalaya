import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

export default function PayrollLoading() {
  return <LoadingSkeleton title="Loading payroll management" rows={8} />;
}
