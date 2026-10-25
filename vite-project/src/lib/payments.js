async function postRequest(path, body) {
  const response = await fetch(
    `/api${path}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(body),
    }
  );

  const result = await response
    .json()
    .catch(() => {
      throw new Error(
        "The backend is unavailable. Make sure npm run server is running."
      );
    });

  if (!response.ok) {
    throw new Error(
      result.error ||
        "The request could not be completed."
    );
  }

  return result;
}

export async function startCheckout(input) {
  const result = await postRequest(
    "/checkout",
    input
  );

  try {
    localStorage.setItem(
      `eventpass-order-${result.reference}`,
      result.accessToken
    );
  } catch {
    throw new Error(
      "This browser could not save your booking access. Enable site storage before trying again."
    );
  }

  window.location.assign(result.url);
}

export function getStoredOrderAccess(reference) {
  try {
    return localStorage.getItem(
      `eventpass-order-${reference}`
    );
  } catch {
    return null;
  }
}

export function verifyOrder(
  reference,
  accessToken
) {
  return postRequest(
    "/orders/verify",
    {
      reference,
      accessToken,
    }
  );
}

export function fetchOrderTickets(accessToken) {
  return postRequest(
    "/orders/tickets",
    {
      accessToken,
    }
  );
}

export function requestConfirmationEmail(accessToken) {
  return postRequest(
    "/orders/confirmation-email",
    { accessToken }
  );
}