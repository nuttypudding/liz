import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ArenaContent } from "@/components/arena/arena-content";
import { loadCuratedSamples } from "@liz/triage";
import { loadModelCatalog } from "@/lib/models";

async function ArenaLoader() {
  const samples = loadCuratedSamples();
  const models = loadModelCatalog();
  return <ArenaContent samples={samples} models={models} />;
}

export default function ArenaPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader
            title="LLM Arena"
            description="Compare vision-capable LLMs on maintenance intake classification"
          />
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <ArenaLoader />
    </Suspense>
  );
}
