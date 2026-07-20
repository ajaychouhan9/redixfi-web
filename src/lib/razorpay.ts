// Minimal typing for the Razorpay Checkout.js global — loaded via <Script src="https://checkout.razorpay.com/v1/checkout.js" />.
export interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name?: string;
  description?: string;
  prefill?: { name?: string; contact?: string; email?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export function openRazorpayCheckout(options: RazorpayOptions) {
  if (!window.Razorpay) {
    throw new Error("Razorpay checkout script hasn't loaded yet.");
  }
  new window.Razorpay(options).open();
}
