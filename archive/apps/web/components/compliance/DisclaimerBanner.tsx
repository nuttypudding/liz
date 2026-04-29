"use client"

import { AlertCircle, AlertTriangle, Info, X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DisclaimerSeverity } from "@/lib/compliance/disclaimers"
import { useState } from "react"

const disclaimerVariants = cva(
  "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-all",
  {
    variants: {
      type: {
        warning:
          "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/40 dark:text-amber-200",
        error:
          "border-red-200 bg-red-50 text-red-900 dark:border-red-900/30 dark:bg-red-950/40 dark:text-red-200",
        info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/30 dark:bg-blue-950/40 dark:text-blue-200",
      },
    },
    defaultVariants: {
      type: "info",
    },
  }
)

interface DisclaimerBannerProps extends VariantProps<typeof disclaimerVariants> {
  text: string
  dismissable?: boolean
  icon?: boolean
  className?: string
}

export function DisclaimerBanner({
  text,
  type = "info",
  dismissable = false,
  icon = true,
  className,
}: DisclaimerBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  const iconColor = {
    warning: "text-amber-600 dark:text-amber-400",
    error: "text-red-600 dark:text-red-400",
    info: "text-blue-600 dark:text-blue-400",
  }[type || "info"]

  const IconComponent = {
    warning: AlertTriangle,
    error: AlertCircle,
    info: Info,
  }[type || "info"]

  return (
    <div className={cn(disclaimerVariants({ type }), className)}>
      {icon && <IconComponent className={cn("mt-0.5 size-5 shrink-0 flex-none", iconColor)} />}
      <div className="flex-1">
        <p className="leading-relaxed">{text}</p>
      </div>
      {dismissable && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsDismissed(true)}
          className="ml-auto mt-0.5"
          aria-label="Dismiss disclaimer"
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  )
}
