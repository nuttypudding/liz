import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { TestLabContent } from "@/components/test-lab/test-lab-content";
import { loadCuratedSamples } from "@liz/triage";

async function TestLabLoader() {
  const samples = loadCuratedSamples();
  return <TestLabContent samples={samples} />;
}

export default function TestLabPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader
            title="Test Lab"
            description="AI Maintenance Triage"
          />
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <TestLabLoader />
    </Suspense>
  );
}
