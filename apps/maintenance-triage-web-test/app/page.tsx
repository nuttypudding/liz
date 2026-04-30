import { TriageForm } from "./triage-form";
import { loadSamples } from "@/lib/samples";

export default async function Page() {
  const samples = await loadSamples();
  return <TriageForm samples={samples} />;
}
