import { RouteConfig, PaymentRequirements, VerifyResponse, SettleResponse } from 'x402/types';
export { PaymentRequirements, RouteConfig } from 'x402/types';
import { X402ServerConfig } from '../types/index.mjs';
import '../x402-protocol-0Omt1wFY.mjs';
import 'zod';
import '@solana/web3.js';

declare class X402PaymentHandler {
    private facilitatorClient;
    private config;
    constructor(config: X402ServerConfig);
    /**
     * Extract payment header from request headers
     * Pass in headers object from any framework (Next.js, Express, etc.)
     */
    extractPayment(headers: Record<string, string | string[] | undefined> | Headers): string | null;
    /**
     * Create payment requirements object from x402 RouteConfig
     * @param routeConfig - x402 standard RouteConfig (price, network, config)
     * @param resource - Optional resource URL override (uses config.resource if not provided)
     */
    createPaymentRequirements(routeConfig: RouteConfig, resource?: string): Promise<PaymentRequirements>;
    /**
     * Create a 402 Payment Required response body
     * Use this with your framework's response method
     * @param requirements - Payment requirements (from createPaymentRequirements)
     */
    create402Response(requirements: PaymentRequirements): {
        status: 402;
        body: {
            x402Version: number;
            accepts: PaymentRequirements[];
            error?: string;
        };
    };
    /**
     * Verify payment with facilitator
     * @returns VerifyResponse with isValid and optional invalidReason
     */
    verifyPayment(paymentHeader: string, paymentRequirements: PaymentRequirements): Promise<VerifyResponse>;
    /**
     * Settle payment with facilitator
     * @returns SettleResponse with success status and optional errorReason
     */
    settlePayment(paymentHeader: string, paymentRequirements: PaymentRequirements): Promise<SettleResponse>;
}

/**
 * Client for communicating with x402 facilitator service
 */
declare class FacilitatorClient {
    private facilitatorUrl;
    constructor(facilitatorUrl: string);
    /**
     * Get fee payer address from facilitator's /supported endpoint
     */
    getFeePayer(network: string): Promise<string>;
    /**
     * Verify payment with facilitator
     * @returns VerifyResponse with isValid and optional invalidReason from facilitator
     */
    verifyPayment(paymentHeader: string, paymentRequirements: PaymentRequirements): Promise<VerifyResponse>;
    /**
     * Settle payment with facilitator
     * @returns SettleResponse with success status and optional errorReason from facilitator
     */
    settlePayment(paymentHeader: string, paymentRequirements: PaymentRequirements): Promise<SettleResponse>;
}

export { FacilitatorClient, X402PaymentHandler, X402ServerConfig };
