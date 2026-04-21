"use client";

import { Suspense, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ComponentsList } from "@/components/test-lab/components-list";
import { RunsList } from "@/components/test-lab/runs-list";
import { ManualTestForm } from "@/components/test-lab/manual-test-form";
import { TEST_LAB_COMPONENTS } from "@/lib/test-lab/registry";

function TestLabContent() {
  const [runsKey, setRunsKey] = useState(0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Lab"
        description="Isolated component testing and validation"
      />

      <Tabs defaultValue="components">
        <TabsList>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="runs">Test Runs</TabsTrigger>
          <TabsTrigger value="manual">Manual Test</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="mt-4">
          <ComponentsList
            components={TEST_LAB_COMPONENTS}
            onRunComplete={() => setRunsKey((k) => k + 1)}
          />
        </TabsContent>

        <TabsContent value="runs" className="mt-4" key={runsKey}>
          <RunsList />
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <ManualTestForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function TestLabPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader title="Test Lab" description="Isolated component testing" />
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <TestLabContent />
    </Suspense>
  );
}
