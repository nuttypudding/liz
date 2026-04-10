---
id: 203
title: Screening audit log middleware — log all screening actions
tier: Haiku
depends_on: [180]
feature: P3-002-ai-tenant-screening
---

# 203 — Screening audit log middleware — log all screening actions

## Objective
Create a middleware/utility function that logs all screening-related actions to the screening_audit_log table. Actions: view, screen, decide, export, notify, etc. Enables audit trail for compliance and debugging.

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Middleware used throughout screening API routes and operations (tasks 183–192).

## Implementation

### 1. Create audit log utility

Create `apps/web/lib/screening/audit-log.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Screening audit log action types
 */
export enum AuditAction {
  VIEW = 'view', // Landlord viewed application
  SCREEN = 'screen', // Started background check
  DECIDE = 'decide', // Made approval/denial decision
  EXPORT = 'export', // Exported application data
  NOTIFY = 'notify', // Sent notification
  WEBHOOK = 'webhook', // Received webhook event
}

/**
 * Log screening action to audit trail
 */
export async function logScreeningAction(params: {
  application_id: string;
  action: AuditAction | string;
  actor_id?: string; // User ID (null for system actions)
  details?: Record<string, any>;
}): Promise<boolean> {
  try {
    const { error } = await supabase.from('screening_audit_log').insert([
      {
        application_id: params.application_id,
        action: params.action,
        actor_id: params.actor_id || null,
        details: params.details || {},
        timestamp: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error('Audit log error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Audit log exception:', error);
    return false;
  }
}

/**
 * Get audit log for application
 */
export async function getApplicationAuditLog(applicationId: string) {
  try {
    const { data, error } = await supabase
      .from('screening_audit_log')
      .select('*')
      .eq('application_id', applicationId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Audit log retrieval error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Audit log exception:', error);
    return [];
  }
}

/**
 * Audit log helper for common actions
 */
export const AuditLogger = {
  /**
   * Log application view
   */
  logView: async (applicationId: string, actorId: string) => {
    return logScreeningAction({
      application_id: applicationId,
      action: AuditAction.VIEW,
      actor_id: actorId,
      details: { ip: '' }, // Could capture IP if needed
    });
  },

  /**
   * Log screening initiation
   */
  logScreeningStart: async (
    applicationId: string,
    actorId: string,
    provider: string,
    orderId: string
  ) => {
    return logScreeningAction({
      application_id: applicationId,
      action: AuditAction.SCREEN,
      actor_id: actorId,
      details: {
        provider,
        order_id: orderId,
      },
    });
  },

  /**
   * Log decision
   */
  logDecision: async (
    applicationId: string,
    actorId: string,
    decision: 'approve' | 'deny' | 'conditional',
    reason?: string
  ) => {
    return logScreeningAction({
      application_id: applicationId,
      action: AuditAction.DECIDE,
      actor_id: actorId,
      details: {
        decision,
        reason,
      },
    });
  },

  /**
   * Log notification sent
   */
  logNotification: async (
    applicationId: string,
    type: 'confirmation' | 'decision' | 'landlord_alert'
  ) => {
    return logScreeningAction({
      application_id: applicationId,
      action: AuditAction.NOTIFY,
      actor_id: null, // System action
      details: {
        notification_type: type,
      },
    });
  },

  /**
   * Log webhook received
   */
  logWebhook: async (
    applicationId: string,
    provider: string,
    status: string
  ) => {
    return logScreeningAction({
      application_id: applicationId,
      action: AuditAction.WEBHOOK,
      actor_id: null, // System action
      details: {
        provider,
        webhook_status: status,
      },
    });
  },
};
```

### 2. Update API routes to use audit log

Examples for tasks 183, 185, 186, etc.:

```typescript
// In task 183 (application submission):
import { AuditLogger } from '@/lib/screening/audit-log';

// After creating application
await AuditLogger.logNotification(application.id, 'confirmation');

// In task 185 (view application):
import { AuditLogger } from '@/lib/screening/audit-log';

// Log view
await AuditLogger.logView(params.id, userId);

// In task 186 (decision):
import { AuditLogger } from '@/lib/screening/audit-log';

// Log decision
await AuditLogger.logDecision(
  params.id,
  userId,
  payload.decision,
  payload.denial_reason
);
```

## Acceptance Criteria
1. [ ] AuditAction enum defined with standard actions (view, screen, decide, export, notify, webhook)
2. [ ] logScreeningAction() function logs to screening_audit_log table
3. [ ] AuditLogger helper object with convenience methods
4. [ ] logView() captures view action with user ID
5. [ ] logScreeningStart() captures screening initiation with provider and order ID
6. [ ] logDecision() captures decision and reason
7. [ ] logNotification() captures notification type
8. [ ] logWebhook() captures webhook provider and status
9. [ ] All timestamps recorded in UTC
10. [ ] Non-fatal errors logged but don't block operations
11. [ ] Audit log used in all API routes (tasks 183–192)
