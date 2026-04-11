"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PiggyBank,
  Scale,
  Zap,
  ShieldCheck,
  Sparkles,
  Bot,
  Save,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { OptionCard } from "@/components/onboarding/option-card";
import { RulesManager } from "@/components/settings/RulesManager";
import { AutopilotSettings } from "@/components/settings/autopilot-settings";
import type { LandlordProfile } from "@/lib/types";

type RiskAppetite = "cost_first" | "balanced" | "speed_first";
type DelegationMode = "manual" | "assist" | "auto";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "preferences";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [riskAppetite, setRiskAppetite] = useState<RiskAppetite>("balanced");
  const [delegationMode, setDelegationMode] = useState<DelegationMode>("assist");
  const [maxAutoApprove, setMaxAutoApprove] = useState(150);
  const [notifyEmergencies, setNotifyEmergencies] = useState(true);
  const [notifyAllRequests, setNotifyAllRequests] = useState(false);
  const [notifyRentReminders, setNotifyRentReminders] = useState(true);
  const [notifyRentOverdueSummary, setNotifyRentOverdueSummary] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/profile");
      if (res.ok) {
        const { profile } = (await res.json()) as { profile: LandlordProfile };
        setRiskAppetite(profile.risk_appetite);
        setDelegationMode(profile.delegation_mode);
        setMaxAutoApprove(profile.max_auto_approve);
        setNotifyEmergencies(profile.notify_emergencies);
        setNotifyAllRequests(profile.notify_all_requests);
        setNotifyRentReminders(profile.notify_rent_reminders);
        setNotifyRentOverdueSummary(profile.notify_rent_overdue_summary);
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          risk_appetite: riskAppetite,
          delegation_mode: delegationMode,
          max_auto_approve:
            delegationMode === "manual" ? 0 : maxAutoApprove,
          notify_emergencies: notifyEmergencies,
          notify_all_requests: notifyAllRequests,
          notify_rent_reminders: notifyRentReminders,
          notify_rent_overdue_summary: notifyRentOverdueSummary,
          onboarding_completed: true,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      toast.success("Settings saved");
      setDirty(false);
    } catch {
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function markDirty() {
    setDirty(true);
  }

  async function handleRerunOnboarding() {
    setResetting(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          risk_appetite: riskAppetite,
          delegation_mode: delegationMode,
          max_auto_approve: delegationMode === "manual" ? 0 : maxAutoApprove,
          notify_emergencies: notifyEmergencies,
          notify_all_requests: notifyAllRequests,
          notify_rent_reminders: notifyRentReminders,
          notify_rent_overdue_summary: notifyRentOverdueSummary,
          onboarding_completed: false,
        }),
      });
      if (!res.ok) throw new Error("Failed to reset");
      router.push("/onboarding");
    } catch {
      toast.error("Failed to reset onboarding. Please try again.");
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="preferences">AI Preferences</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="autopilot">Autopilot</TabsTrigger>
        </TabsList>

        {/* AI Preferences Tab */}
        <TabsContent value="preferences">
          <div className="space-y-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Risk Appetite</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <OptionCard
                  icon={PiggyBank}
                  title="Save Money"
                  description="Minimize repair costs. Your agent suggests the most affordable options."
                  selected={riskAppetite === "cost_first"}
                  onSelect={() => {
                    setRiskAppetite("cost_first");
                    markDirty();
                  }}
                />
                <OptionCard
                  icon={Scale}
                  title="Balanced"
                  description="Your agent weighs both cost and speed equally."
                  selected={riskAppetite === "balanced"}
                  onSelect={() => {
                    setRiskAppetite("balanced");
                    markDirty();
                  }}
                  badge="Recommended"
                  badgeVariant="secondary"
                />
                <OptionCard
                  icon={Zap}
                  title="Move Fast"
                  description="Minimize resolution time. Your agent prioritizes fast vendor response."
                  selected={riskAppetite === "speed_first"}
                  onSelect={() => {
                    setRiskAppetite("speed_first");
                    markDirty();
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delegation Mode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <OptionCard
                  icon={ShieldCheck}
                  title="I approve everything"
                  description="Your agent classifies and suggests — you make every call."
                  selected={delegationMode === "manual"}
                  onSelect={() => {
                    setDelegationMode("manual");
                    markDirty();
                  }}
                />
                <OptionCard
                  icon={Sparkles}
                  title="Auto-approve small jobs"
                  description="Your agent handles jobs under your threshold. You approve the rest."
                  selected={delegationMode === "assist"}
                  onSelect={() => {
                    setDelegationMode("assist");
                    markDirty();
                  }}
                  badge="Recommended"
                  badgeVariant="secondary"
                />

                {delegationMode === "assist" && (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Auto-approve up to:
                      </span>
                      <span className="font-semibold">${maxAutoApprove}</span>
                    </div>
                    <Slider
                      value={[maxAutoApprove]}
                      onValueChange={(value) => {
                        const newVal = typeof value === "number" ? value : value[0];
                        setMaxAutoApprove(newVal);
                        markDirty();
                      }}
                      min={50}
                      max={500}
                      step={25}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>$50</span>
                      <span>$500</span>
                    </div>
                  </div>
                )}

                <OptionCard
                  icon={Bot}
                  title="Full autopilot"
                  description="AI makes routine decisions autonomously. Review decisions and set confidence thresholds in Autopilot settings."
                  selected={delegationMode === "auto"}
                  onSelect={() => {
                    setDelegationMode("auto");
                    markDirty();
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <div className="space-y-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Emergency alerts</div>
                    <div className="text-xs text-muted-foreground">
                      Get notified immediately for urgent issues
                    </div>
                  </div>
                  <Switch
                    checked={notifyEmergencies}
                    onCheckedChange={(checked) => {
                      setNotifyEmergencies(checked as boolean);
                      markDirty();
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">
                      All request alerts
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Get notified for every new maintenance request
                    </div>
                  </div>
                  <Switch
                    checked={notifyAllRequests}
                    onCheckedChange={(checked) => {
                      setNotifyAllRequests(checked as boolean);
                      markDirty();
                    }}
                  />
                </div>

                <Separator />

                <div className="space-y-0.5">
                  <div className="text-sm font-semibold">Rent</div>
                  <div className="text-xs text-muted-foreground">
                    Notifications about rent due dates and overdue payments
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Rent reminders</div>
                    <div className="text-xs text-muted-foreground">
                      Get notified about upcoming and overdue rent
                    </div>
                  </div>
                  <Switch
                    checked={notifyRentReminders}
                    onCheckedChange={(checked) => {
                      setNotifyRentReminders(checked as boolean);
                      markDirty();
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Daily overdue summary</div>
                    <div className="text-xs text-muted-foreground">
                      Receive a daily summary of overdue tenants
                    </div>
                  </div>
                  <Switch
                    checked={notifyRentOverdueSummary}
                    onCheckedChange={(checked) => {
                      setNotifyRentOverdueSummary(checked as boolean);
                      markDirty();
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Automation Rules Tab */}
        <TabsContent value="rules">
          <div className="space-y-6 pt-4">
            <RulesManager />
          </div>
        </TabsContent>

        {/* Autopilot Tab */}
        <TabsContent value="autopilot">
          <AutopilotSettings />
        </TabsContent>
      </Tabs>

      {/* Re-run onboarding */}
      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Re-run onboarding</div>
            <div className="text-xs text-muted-foreground">
              Go through the setup wizard again to update your portfolio
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRerunOnboarding}
            disabled={resetting}
          >
            <RotateCcw className="size-4 mr-1" />
            {resetting ? "Resetting..." : "Re-run"}
          </Button>
        </CardContent>
      </Card>

      {/* Plan & Billing */}
      <Card>
        <CardHeader>
          <CardTitle>Plan & Billing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Current plan: Free (Beta)</p>
          <Link href="/billing" className="text-sm text-primary hover:underline">
            Manage billing →
          </Link>
        </CardContent>
      </Card>

      {/* Save button — sticky at bottom */}
      <div className="sticky bottom-20 lg:bottom-4 z-10">
        <Button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="w-full min-h-11"
        >
          <Save data-icon="inline-start" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader title="Settings" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
