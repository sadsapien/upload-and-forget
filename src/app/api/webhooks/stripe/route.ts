import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const beatId = session.metadata?.beatId;
    if (beatId) {
      await prisma.sale.upsert({
        where: { stripeSessionId: session.id },
        create: {
          beatId,
          amountCents: session.amount_total ?? 0,
          currency: session.currency ?? 'cad',
          stripeSessionId: session.id,
        },
        update: {},
      });
    }
  }

  return NextResponse.json({ received: true });
}
