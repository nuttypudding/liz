import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getScreeningProvider } from '@/lib/screening/providers/factory';
import { createScreeningReport } from '@/lib/screening/screening-service';
import { AuditLogger } from '@/lib/screening/audit-log';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/webhooks/screening
 * Handle background check completion webhooks from the screening provider.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const signature = req.headers.get('x-smartmove-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const providerName = (payload.provider as string) || 'smartmove';
    const provider = getScreeningProvider(providerName);

    const isValid = await provider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('Invalid webhook signature from provider');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const order_id = payload.order_id as string | undefined;
    const reference_id = payload.reference_id as string | undefined;
    const status = payload.status as string | undefined;

    if (!order_id || !reference_id) {
      return NextResponse.json(
        { error: 'Missing order_id or reference_id' },
        { status: 400 }
      );
    }

    // Verify application exists
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, landlord_id')
      .eq('id', reference_id)
      .single();

    if (appError || !application) {
      console.error('Application not found:', reference_id);
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Update status to 'screening'
    await supabase
      .from('applications')
      .update({ status: 'screening', updated_at: new Date().toISOString() })
      .eq('id', reference_id);

    // If completed, retrieve results and run AI analysis
    if (status === 'completed') {
      try {
        const results = await provider.getResults(order_id);

        if (results.success) {
          const reportResult = await createScreeningReport(
            reference_id,
            results.background_check as Record<string, unknown> | undefined,
            results.credit_score_range
          );

          if (!reportResult.success) {
            console.error('Failed to create screening report:', reportResult.error);
          }
        } else {
          console.error('Failed to get results from provider:', results.error);
        }
      } catch (error) {
        console.error('Error processing completed webhook:', error);
        // Non-fatal — webhook must still return 200
      }
    }

    // Audit log (non-fatal)
    await AuditLogger.logWebhook(reference_id, providerName, status);

    return NextResponse.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
