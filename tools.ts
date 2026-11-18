import { FunctionDeclaration, Type } from '@google/genai';
import mockData from './mockData.json' with { type: 'json' };

// 1. Tool Schema Declaration for Gemini
export const checkReturnEligibilityDeclaration: FunctionDeclaration = {
  name: 'checkReturnEligibility',
  description:
    'Evaluates whether an order ID is eligible for a refund based on a 30-day return window, delivery status, and final-sale rules.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      orderId: {
        type: Type.STRING,
        description: 'The numeric order identifier (e.g., "8841"). Strip any "#" prefix.',
      },
    },
    required: ['orderId'],
  },
};

export const generateReturnLabelDeclaration: FunctionDeclaration = {
  name: 'generateReturnLabel',
  description:
    'Generates a prepaid return shipping label for an order ONLY AFTER the user explicitly confirms they want to proceed with the return.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      orderId: {
        type: Type.STRING,
        description: 'The numeric order identifier to generate a return label for.',
      },
      reason: {
        type: Type.STRING,
        description: 'Short summary of why the customer is returning the item.',
      },
    },
    required: ['orderId', 'reason'],
  },
};

// 2. Deterministic Backend Execution Functions
export function checkReturnEligibility(orderId: string) {
  const cleanId = orderId.replace('#', '').trim();
  const order = mockData.orders.find((o) => o.orderId === cleanId);

  if (!order) {
    return {
      found: false,
      eligible: false,
      reason: `Order #${cleanId} was not found in our system.`,
    };
  }

  if (order.isFinalSale) {
    return {
      found: true,
      eligible: false,
      item: order.item,
      reason: 'Item was purchased as Final Sale and cannot be returned.',
    };
  }

  if (order.daysSinceDelivery > 30) {
    return {
      found: true,
      eligible: false,
      item: order.item,
      daysSinceDelivery: order.daysSinceDelivery,
      reason: `Return window expired (${order.daysSinceDelivery} days since delivery; policy is 30 days).`,
    };
  }

  return {
    found: true,
    eligible: true,
    orderId: order.orderId,
    customerName: order.customerName,
    item: order.item,
    refundAmount: order.price,
    daysSinceDelivery: order.daysSinceDelivery,
  };
}

export function generateReturnLabel(orderId: string, reason: string) {
  const eligibility = checkReturnEligibility(orderId);
  if (!eligibility.eligible) {
    return {
      success: false,
      error: eligibility.reason,
    };
  }

  // Simulated write operation
  const trackingNumber = `1Z999AA10${Math.floor(1000000 + Math.random() * 9000000)}`;
  return {
    success: true,
    orderId: eligibility.orderId,
    trackingNumber,
    carrier: 'UPS Ground',
    recordedReason: reason,
    labelUrl: `https://returns.example.com/labels/${trackingNumber}.pdf`,
  };
}