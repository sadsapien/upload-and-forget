import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function createCheckoutForBeat(beat: {
  id: string;
  title: string;
  priceCents: number;
  slug: string;
}) {
  const product = await stripe.products.create({
    name: beat.title,
    metadata: { beatId: beat.id },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: beat.priceCents,
    currency: 'cad',
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: `${process.env.APP_URL}/beat/${beat.slug}?purchased=true`,
    cancel_url: `${process.env.APP_URL}/beat/${beat.slug}`,
    metadata: { beatId: beat.id },
  });

  return {
    productId: product.id,
    priceId: price.id,
    checkoutUrl: session.url!,
  };
}
