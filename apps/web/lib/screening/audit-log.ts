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
