import { headers } from 'next/headers';
import Stripe from 'stripe';

import { createServerSupabaseClient } from '@/lib/supabase/server';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return new Response('Missing STRIPE_WEBHOOK_SECRET', { status: 500 });
  }

  const body = await req.text();
  const headerPayload = await headers();
  const signature = headerPayload.get('stripe-signature');

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session,
        supabase
      );
      break;

    case 'account.updated':
      await handleAccountUpdated(
        event.data.object as Stripe.Account,
        supabase
      );
      break;

    default:
      console.log(`Unhandled Stripe webhook event: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

type SupabaseClient = ReturnType<typeof createServerSupabaseClient>;

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  supabase: SupabaseClient
) {
  const metadata = session.metadata;
  if (!metadata?.payment_period_id) {
    console.warn('checkout.session.completed: missing payment_period_id in metadata', {
      sessionId: session.id,
    });
    return;
  }

  const { payment_period_id } = metadata;
  const paymentIntentId = session.payment_intent as string | null;

  // Idempotency: if a payment with this payment_intent_id already exists and is
  // completed, this event has already been processed — skip.
  if (paymentIntentId) {
    const { data: existing } = await supabase
      .from('payments')
      .select('id, status')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();

    if (existing?.status === 'completed') {
      console.log(
        `checkout.session.completed: already processed for payment_intent ${paymentIntentId}`
      );
      return;
    }
  }

  const now = new Date().toISOString();

  // Update the pending payment record for this period
  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'completed',
      stripe_payment_intent_id: paymentIntentId,
      paid_at: now,
    })
    .eq('payment_period_id', payment_period_id)
    .eq('status', 'pending');

  if (paymentError) {
    console.error('checkout.session.completed: failed to update payment record', {
      payment_period_id,
      error: paymentError,
    });
    return;
  }

  // Mark payment period as paid
  const { error: periodError } = await supabase
    .from('payment_periods')
    .update({
      status: 'paid',
      paid_at: now,
    })
    .eq('id', payment_period_id);

  if (periodError) {
    console.error('checkout.session.completed: failed to update payment_period', {
      payment_period_id,
      error: periodError,
    });
    return;
  }

  console.log(`checkout.session.completed: payment recorded for period ${payment_period_id}`);
}

async function handleAccountUpdated(account: Stripe.Account, supabase: SupabaseClient) {
  const { error } = await supabase
    .from('stripe_accounts')
    .update({
      charges_enabled: account.charges_enabled ?? false,
      payouts_enabled: account.payouts_enabled ?? false,
    })
    .eq('stripe_account_id', account.id);

  if (error) {
    console.error('account.updated: failed to update stripe_accounts', {
      stripeAccountId: account.id,
      error,
    });
    return;
  }

  console.log(
    `account.updated: synced account ${account.id} — charges=${account.charges_enabled}, payouts=${account.payouts_enabled}`
  );
}
