const orders = {};

export function getOrder(sessionId) {
  if (!orders[sessionId]) {
    orders[sessionId] = {
      isNewUser: true,
      name: null,
      mobile: null,
      chatbotId: null,
      userId: null,
      providerId: null,
      step: null,
      product: null,
      productId: null,
      productName: null,
      productPrice: null,
      quantity: null,
      paymentMethod: null,
      address: null,
      orderId: null,
    };
  }
  return orders[sessionId];
}

