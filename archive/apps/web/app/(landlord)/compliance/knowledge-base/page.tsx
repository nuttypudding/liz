"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DisclaimerBanner } from "@/components/compliance/DisclaimerBanner";
import { COMPLIANCE_DISCLAIMERS } from "@/lib/compliance/disclaimers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- Types ---

interface JurisdictionRule {
  id: string;
  topic: string;
  rule_text: string;
  statute_citation: string;
  details: Record<string, unknown> | null;
  last_verified_at: string;
}

interface JurisdictionGroup {
  state_code: string;
  city: string | null;
  rules: JurisdictionRule[];
}

interface KnowledgeResponse {
  jurisdictions: JurisdictionGroup[];
  total_count: number;
  limit: number;
  offset: number;
}

// --- Topic category mapping ---

const CATEGORIES = [
  {
    key: "notice_requirements",
    label: "Notice Requirements",
    keywords: ["notice", "entry_notice", "eviction_notice", "rent_increase_notice", "lease_termination"],
    color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    cardBorder: "border-l-blue-500",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  {
    key: "security_deposits",
    label: "Security Deposits & Move-Out",
    keywords: ["security_deposit", "deposit", "move_out", "deduct", "return_deadline"],
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    cardBorder: "border-l-emerald-500",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  {
    key: "habitability",
    label: "Habitability & Maintenance",
    keywords: ["habitability", "maintain", "repair", "landlord_duty", "housing_standard"],
    color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    cardBorder: "border-l-amber-500",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  {
    key: "fair_housing",
    label: "Fair Housing & Discrimination",
    keywords: ["fair_housing", "discrimination", "accommodation", "service_animal", "emotional_support"],
    color: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
    cardBorder: "border-l-purple-500",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  },
  {
    key: "rent_control",
    label: "Rent Control & Increases",
    keywords: ["rent_control", "rent_increase", "just_cause", "rent_cap", "rent_stabilization"],
    color: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    cardBorder: "border-l-rose-500",
    badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  },
  {
    key: "other",
    label: "Other Local Rules",
    keywords: [],
    color: "bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-300",
    cardBorder: "border-l-slate-500",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-950 dark:text-slate-300",
  },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

interface CategorizedRule {
  rule: JurisdictionRule;
  stateCode: string;
  city: string | null;
  categoryKey: CategoryKey;
}

function classifyTopic(topic: string): CategoryKey {
  const lower = topic.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.key === "other") continue;
    if (cat.keywords.some((kw) => lower.includes(kw))) return cat.key;
  }
  return "other";
}

function getCategoryMeta(key: CategoryKey) {
  return CATEGORIES.find((c) => c.key === key)!;
}

function formatTopicLabel(topic: string): string {
  return topic
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${label} copied`),
    () => toast.error("Failed to copy")
  );
}

// --- Page ---

export default function KnowledgeBasePage() {
  // Filter state
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Data state
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [citiesByState, setCitiesByState] = useState<Record<string, string[]>>({});
  const [jurisdictions, setJurisdictions] = useState<JurisdictionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail modal state
  const [selectedRule, setSelectedRule] = useState<CategorizedRule | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const availableCities = selectedState ? (citiesByState[selectedState] ?? []) : [];

  // --- Fetch jurisdictions (states/cities) ---

  const fetchJurisdictions = useCallback(async () => {
    try {
      const res = await fetch("/api/compliance/jurisdictions");
      if (!res.ok) return;
      const data = (await res.json()) as { states: string[]; cities: Record<string, string[]> };
      setAvailableStates(data.states);
      setCitiesByState(data.cities);
    } catch {
      // Non-critical
    }
  }, []);

  // --- Fetch rules ---

  const fetchRules = useCallback(async (state: string, city: string, search: string) => {
    setRulesLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (state) params.set("state_code", state);
      if (city) params.set("city", city);
      if (search) params.set("search", search);
      params.set("limit", "100");

      const res = await fetch(`/api/compliance/knowledge?${params}`);
      if (!res.ok) {
        setError("Could not load rules. Try again.");
        setJurisdictions([]);
        return;
      }
      const data = (await res.json()) as KnowledgeResponse;
      setJurisdictions(data.jurisdictions);
    } catch {
      setError("Could not load rules. Try again.");
      setJurisdictions([]);
    } finally {
      setRulesLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    Promise.all([fetchJurisdictions(), fetchRules("", "", "")]).finally(() =>
      setLoading(false)
    );
  }, [fetchJurisdictions, fetchRules]);

  // Re-fetch when filters change
  useEffect(() => {
    if (loading) return;
    fetchRules(selectedState, selectedCity, searchQuery);
  }, [selectedState, selectedCity, searchQuery, fetchRules, loading]);

  // --- Categorize rules ---

  const categorizedRules = useMemo(() => {
    const byCategory = new Map<CategoryKey, CategorizedRule[]>();
    for (const cat of CATEGORIES) {
      byCategory.set(cat.key, []);
    }

    for (const group of jurisdictions) {
      for (const rule of group.rules) {
        const categoryKey = classifyTopic(rule.topic);
        byCategory.get(categoryKey)!.push({
          rule,
          stateCode: group.state_code,
          city: group.city,
          categoryKey,
        });
      }
    }

    // Remove empty categories
    const result: { category: (typeof CATEGORIES)[number]; rules: CategorizedRule[] }[] = [];
    for (const cat of CATEGORIES) {
      const rules = byCategory.get(cat.key)!;
      if (rules.length > 0) {
        result.push({ category: cat, rules });
      }
    }
    return result;
  }, [jurisdictions]);

  // Flat list for prev/next navigation
  const allRulesFlat = useMemo(
    () => categorizedRules.flatMap((c) => c.rules),
    [categorizedRules]
  );

  const totalRuleCount = allRulesFlat.length;

  // --- Detail modal navigation ---

  function openRuleDetail(categorizedRule: CategorizedRule) {
    setSelectedRule(categorizedRule);
    setModalOpen(true);
  }

  function navigateRule(direction: "prev" | "next") {
    if (!selectedRule) return;
    const idx = allRulesFlat.findIndex((r) => r.rule.id === selectedRule.rule.id);
    if (idx === -1) return;
    const newIdx = direction === "prev" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= allRulesFlat.length) return;
    setSelectedRule(allRulesFlat[newIdx]);
  }

  const currentRuleIndex = selectedRule
    ? allRulesFlat.findIndex((r) => r.rule.id === selectedRule.rule.id)
    : -1;

  // Related rules: same category, excluding current
  const relatedRules = useMemo(() => {
    if (!selectedRule) return [];
    return allRulesFlat
      .filter(
        (r) =>
          r.categoryKey === selectedRule.categoryKey &&
          r.rule.id !== selectedRule.rule.id
      )
      .slice(0, 3);
  }, [selectedRule, allRulesFlat]);

  // --- Search handler ---

  function handleSearch() {
    setSearchQuery(searchInput.trim());
  }

  function handleClearSearch() {
    setSearchInput("");
    setSearchQuery("");
  }

  // --- Render ---

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Legal Knowledge Base"
          description="Understand the rules for your jurisdiction"
        />
        <Skeleton className="h-12 w-full" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 flex-1" />
        </div>
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Legal Knowledge Base"
        description="Understand the rules for your jurisdiction"
      />

      <DisclaimerBanner
        type="warning"
        text="This information is educational. Consult a licensed attorney for legal advice."
        dismissable
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {/* State filter */}
            <div className="space-y-1.5 sm:w-44">
              <label className="text-xs font-medium text-muted-foreground">State</label>
              <Select
                value={selectedState}
                onValueChange={(v) => {
                  setSelectedState(v === "__all__" ? "" : (v ?? ""));
                  setSelectedCity("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All states" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All states</SelectItem>
                  {availableStates.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City filter */}
            <div className="space-y-1.5 sm:w-44">
              <label className="text-xs font-medium text-muted-foreground">City</label>
              <Select
                value={selectedCity}
                onValueChange={(v) => setSelectedCity(v === "__all__" ? "" : (v ?? ""))}
                disabled={availableCities.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      availableCities.length === 0 ? "No city rules" : "All cities"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All cities</SelectItem>
                  {availableCities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search rules, statutes, keywords..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={handleSearch} aria-label="Search">
                <Search className="size-4" />
              </Button>
              {searchQuery && (
                <Button variant="ghost" size="icon" onClick={handleClearSearch} aria-label="Clear search">
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Active filters summary */}
          {(selectedState || searchQuery) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Showing:</span>
              {selectedState && (
                <Badge variant="secondary">{selectedState}{selectedCity ? ` / ${selectedCity}` : ""}</Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary">&quot;{searchQuery}&quot;</Badge>
              )}
              <span>{totalRuleCount} rule{totalRuleCount !== 1 ? "s" : ""} found</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/30 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Loading overlay for filter changes */}
      {rulesLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty states */}
      {!rulesLoading && !error && totalRuleCount === 0 && (
        <>
          {!selectedState && !searchQuery ? (
            <EmptyState
              icon={BookOpen}
              title="Select a jurisdiction to view rules"
              description="Choose a state above to browse jurisdiction-specific legal rules."
            />
          ) : searchQuery ? (
            <EmptyState
              icon={Search}
              title={`No rules found matching "${searchQuery}"`}
              description="Try different keywords or broaden your filters."
            />
          ) : (
            <EmptyState
              icon={BookOpen}
              title="No rules found"
              description="No jurisdiction rules are available for the selected filters."
            />
          )}
        </>
      )}

      {/* Topic grid by category */}
      {!rulesLoading && !error && categorizedRules.length > 0 && (
        <Accordion
          multiple
          defaultValue={categorizedRules.map((c) => c.category.key)}
        >
          {categorizedRules.map(({ category, rules }) => (
            <AccordionItem key={category.key} value={category.key}>
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block size-2.5 rounded-full ${category.cardBorder.replace(
                      "border-l-",
                      "bg-"
                    )}`}
                  />
                  <span className="font-semibold">{category.label}</span>
                  <Badge variant="secondary" className="ml-1">
                    {rules.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {rules.map((cr) => (
                    <button
                      key={cr.rule.id}
                      onClick={() => openRuleDetail(cr)}
                      className={`group cursor-pointer rounded-lg border border-l-4 ${category.cardBorder} bg-card p-4 text-left transition-colors hover:bg-muted/50`}
                    >
                      <div className="mb-2 font-medium text-sm">
                        {formatTopicLabel(cr.rule.topic)}
                      </div>
                      <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                        {cr.rule.rule_text}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {cr.stateCode}
                          {cr.city ? ` / ${cr.city}` : " (statewide)"}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Rule detail modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedRule && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={getCategoryMeta(selectedRule.categoryKey).badgeClass}>
                    {getCategoryMeta(selectedRule.categoryKey).label}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedRule.stateCode}
                    {selectedRule.city ? ` / ${selectedRule.city}` : ""}
                  </Badge>
                </div>
                <DialogTitle>
                  {formatTopicLabel(selectedRule.rule.topic)}
                </DialogTitle>
                <DialogDescription>
                  Jurisdiction rule details
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Rule text */}
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Rule Text
                  </h4>
                  <div className="rounded-md border bg-muted/30 p-3 text-sm leading-relaxed">
                    {selectedRule.rule.rule_text}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1"
                    onClick={() => copyToClipboard(selectedRule.rule.rule_text, "Rule text")}
                  >
                    <ClipboardCopy className="mr-1.5 size-3" />
                    Copy rule text
                  </Button>
                </div>

                {/* Statute citation */}
                {selectedRule.rule.statute_citation && (
                  <div>
                    <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Statute Citation
                    </h4>
                    <p className="text-sm font-mono">
                      {selectedRule.rule.statute_citation}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1"
                      onClick={() =>
                        copyToClipboard(selectedRule.rule.statute_citation, "Citation")
                      }
                    >
                      <ClipboardCopy className="mr-1.5 size-3" />
                      Copy citation
                    </Button>
                  </div>
                )}

                {/* JSONB details */}
                {selectedRule.rule.details &&
                  Object.keys(selectedRule.rule.details).length > 0 && (
                    <div>
                      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Details
                      </h4>
                      <div className="space-y-1.5">
                        {Object.entries(selectedRule.rule.details).map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
                            >
                              <span className="font-medium capitalize text-muted-foreground min-w-[100px]">
                                {key.replace(/_/g, " ")}
                              </span>
                              <span>{String(value)}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Last verified */}
                {selectedRule.rule.last_verified_at && (
                  <div className="text-xs text-muted-foreground">
                    Last verified on{" "}
                    {new Date(selectedRule.rule.last_verified_at).toLocaleDateString()}
                    <br />
                    <span className="italic">
                      {COMPLIANCE_DISCLAIMERS.VERIFY_STATUTE}
                    </span>
                  </div>
                )}

                {/* Related rules */}
                {relatedRules.length > 0 && (
                  <div>
                    <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Related Rules
                    </h4>
                    <div className="space-y-1.5">
                      {relatedRules.map((rr) => (
                        <button
                          key={rr.rule.id}
                          onClick={() => setSelectedRule(rr)}
                          className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                        >
                          <span className="font-medium">
                            {formatTopicLabel(rr.rule.topic)}
                          </span>
                          <Badge variant="outline" className="ml-auto text-[10px]">
                            {rr.stateCode}
                            {rr.city ? ` / ${rr.city}` : ""}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <div className="flex w-full items-center justify-between">
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentRuleIndex <= 0}
                      onClick={() => navigateRule("prev")}
                    >
                      <ChevronLeft className="mr-1 size-3.5" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentRuleIndex >= allRulesFlat.length - 1}
                      onClick={() => navigateRule("next")}
                    >
                      Next
                      <ChevronRight className="ml-1 size-3.5" />
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {currentRuleIndex + 1} of {allRulesFlat.length}
                  </span>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
