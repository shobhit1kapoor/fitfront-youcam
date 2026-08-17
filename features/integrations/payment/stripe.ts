import Stripe from "stripe";

type CreatePaymentInput = {
  cart?: any;
  amount: number;
  currency: string;
};

type PaymentOperationInput = {
  paymentId: string;
  amount?: number;
};

type PaymentWebhookInput = {
  event: any;
  headers: Record<string, string>;
};

const getStripeClient = () => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new Error("Stripe secret key not configured");
  }
  return new Stripe(stripeKey, {
    apiVersion: "2025-05-28.basil",
  });
};

export async function createPaymentFunction({ cart, amount, currency }: CreatePaymentInput) {
  const stripe = getStripeClient();

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: currency.toLowerCase(),
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}

export async function capturePaymentFunction({ paymentId, amount }: PaymentOperationInput) {
  const stripe = getStripeClient();

  const paymentIntent = await stripe.paymentIntents.capture(paymentId, {
    ...(amount ? { amount_to_capture: amount } : {}),
  });

  return {
    status: paymentIntent.status,
    amount: paymentIntent.amount_received,
    data: paymentIntent,
  };
}

export async function refundPaymentFunction({ paymentId, amount }: PaymentOperationInput) {
  const stripe = getStripeClient();

  const refund = await stripe.refunds.create({
    payment_intent: paymentId,
    ...(amount ? { amount } : {}),
  });

  return {
    status: refund.status,
    amount: refund.amount,
    data: refund,
  };
}

export async function getPaymentStatusFunction({ paymentId }: PaymentOperationInput) {
  const stripe = getStripeClient();

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);

  return {
    status: paymentIntent.status,
    amount: paymentIntent.amount,
    data: paymentIntent,
  };
}

export async function generatePaymentLinkFunction({ paymentId }: PaymentOperationInput) {
  return `https://dashboard.stripe.com/payments/${paymentId}`;
}

export async function handleWebhookFunction({ event, headers }: PaymentWebhookInput) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('Stripe webhook secret is not configured');
  }

  const stripe = getStripeClient();

  try {
    const stripeEvent = stripe.webhooks.constructEvent(
      JSON.stringify(event),
      headers['stripe-signature'],
      webhookSecret
    );

    return {
      isValid: true,
      event: stripeEvent,
      type: stripeEvent.type,
      resource: stripeEvent.data.object,
    };
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`);
  }
} 