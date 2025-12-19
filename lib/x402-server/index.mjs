// src/utils/helpers.ts
function getDefaultRpcUrl(network) {
  if (network === "solana") {
    return "https://api.mainnet-beta.solana.com";
  } else if (network === "solana-devnet") {
    return "https://api.devnet.solana.com";
  }
  throw new Error(`Unexpected network: ${network}`);
}
function getDefaultTokenAsset(network) {
  if (network === "solana") {
    return {
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      decimals: 6
    };
  } else if (network === "solana-devnet") {
    return {
      address: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      decimals: 6
    };
  }
  throw new Error(`Unexpected network: ${network}`);
}

// src/server/facilitator-client.ts
var FacilitatorClient = class {
  constructor(facilitatorUrl) {
    this.facilitatorUrl = facilitatorUrl;
  }
  /**
   * Get fee payer address from facilitator's /supported endpoint
   */
  async getFeePayer(network) {
    const response = await fetch(`${this.facilitatorUrl}/supported`);
    if (!response.ok) {
      throw new Error(`Facilitator /supported returned ${response.status}`);
    }
    const supportedData = await response.json();
    const networkSupport = supportedData.kinds?.find(
      (kind) => kind.network === network && kind.scheme === "exact"
    );
    if (!networkSupport?.extra?.feePayer) {
      throw new Error(
        `Facilitator does not support network "${network}" with scheme "exact" or feePayer not provided`
      );
    }
    return networkSupport.extra.feePayer;
  }
  /**
   * Verify payment with facilitator
   * @returns VerifyResponse with isValid and optional invalidReason from facilitator
   */
  async verifyPayment(paymentHeader, paymentRequirements) {
    try {
      const paymentPayload = JSON.parse(
        Buffer.from(paymentHeader, "base64").toString("utf8")
      );
      const verifyPayload = {
        paymentPayload,
        paymentRequirements
      };
      const response = await fetch(`${this.facilitatorUrl}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(verifyPayload)
      });
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Facilitator /verify returned ${response.status}:`, errorBody);
        return {
          isValid: false,
          invalidReason: "unexpected_verify_error"
        };
      }
      const facilitatorResponse = await response.json();
      return facilitatorResponse;
    } catch (error) {
      console.error("Payment verification failed:", error);
      return {
        isValid: false,
        invalidReason: "unexpected_verify_error"
      };
    }
  }
  /**
   * Settle payment with facilitator
   * @returns SettleResponse with success status and optional errorReason from facilitator
   */
  async settlePayment(paymentHeader, paymentRequirements) {
    try {
      const paymentPayload = JSON.parse(
        Buffer.from(paymentHeader, "base64").toString("utf8")
      );
      const settlePayload = {
        paymentPayload,
        paymentRequirements
      };
      const response = await fetch(`${this.facilitatorUrl}/settle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(settlePayload)
      });
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Facilitator /settle returned ${response.status}:`, errorBody);
        return {
          success: false,
          errorReason: "unexpected_settle_error",
          transaction: "",
          network: paymentRequirements.network
        };
      }
      const facilitatorResponse = await response.json();
      return facilitatorResponse;
    } catch (error) {
      console.error("Payment settlement failed:", error);
      return {
        success: false,
        errorReason: "unexpected_settle_error",
        transaction: "",
        network: paymentRequirements.network
      };
    }
  }
};

// src/server/payment-handler.ts
var X402PaymentHandler = class {
  facilitatorClient;
  config;
  constructor(config) {
    const defaultToken = getDefaultTokenAsset(config.network);
    this.config = {
      network: config.network,
      treasuryAddress: config.treasuryAddress,
      facilitatorUrl: config.facilitatorUrl,
      rpcUrl: config.rpcUrl || getDefaultRpcUrl(config.network),
      defaultToken: config.defaultToken || defaultToken,
      middlewareConfig: config.middlewareConfig
    };
    this.facilitatorClient = new FacilitatorClient(config.facilitatorUrl);
  }
  /**
   * Extract payment header from request headers
   * Pass in headers object from any framework (Next.js, Express, etc.)
   */
  extractPayment(headers) {
    if (headers instanceof Headers) {
      return headers.get("X-PAYMENT") || headers.get("x-payment");
    }
    const xPayment = headers["X-PAYMENT"] || headers["x-payment"];
    return Array.isArray(xPayment) ? xPayment[0] || null : xPayment || null;
  }
  /**
   * Create payment requirements object from x402 RouteConfig
   * @param routeConfig - x402 standard RouteConfig (price, network, config)
   * @param resource - Optional resource URL override (uses config.resource if not provided)
   */
  async createPaymentRequirements(routeConfig, resource) {
    const feePayer = await this.facilitatorClient.getFeePayer(this.config.network);
    const price = routeConfig.price;
    const config = { ...this.config.middlewareConfig, ...routeConfig.config };
    const finalResource = resource || config.resource;
    if (!finalResource) {
      throw new Error("resource is required: provide either as parameter or in RouteConfig.config.resource");
    }
    const paymentRequirements = {
      scheme: "exact",
      network: routeConfig.network,
      maxAmountRequired: price.amount,
      resource: finalResource,
      description: config.description || "Payment required",
      mimeType: config.mimeType || "application/json",
      payTo: this.config.treasuryAddress,
      maxTimeoutSeconds: config.maxTimeoutSeconds || 300,
      asset: price.asset.address,
      outputSchema: config.outputSchema || {},
      extra: {
        feePayer
      }
    };
    return paymentRequirements;
  }
  /**
   * Create a 402 Payment Required response body
   * Use this with your framework's response method
   * @param requirements - Payment requirements (from createPaymentRequirements)
   */
  create402Response(requirements) {
    return {
      status: 402,
      body: {
        x402Version: 1,
        accepts: [requirements],
        error: "Payment required"
      }
    };
  }
  /**
   * Verify payment with facilitator
   * @returns VerifyResponse with isValid and optional invalidReason
   */
  async verifyPayment(paymentHeader, paymentRequirements) {
    return this.facilitatorClient.verifyPayment(paymentHeader, paymentRequirements);
  }
  /**
   * Settle payment with facilitator
   * @returns SettleResponse with success status and optional errorReason
   */
  async settlePayment(paymentHeader, paymentRequirements) {
    return this.facilitatorClient.settlePayment(paymentHeader, paymentRequirements);
  }
};

export { FacilitatorClient, X402PaymentHandler };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map