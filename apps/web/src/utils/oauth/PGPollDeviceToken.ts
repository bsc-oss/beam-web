//
// Copyright 2026 Belgian Secure Communications (BSC)
//
// SPDX-License-Identifier: AGPL-3.0-only
// Please see LICENSE files in the repository root for full details.
//

import { type ValidatedAuthMetadata } from "matrix-js-sdk/src/matrix";
import { type DeviceAuthData } from "./PGQrDeviceAuth";
import { logger } from "matrix-js-sdk/src/logger";

// Constants
const DEFAULT_TIMEOUT_MS = 1 * 60 * 1000; // 1 minute
const DEFAULT_INTERVAL_SEC = 5;
const MIN_INTERVAL_SEC = 1;
const SLOW_DOWN_INCREMENT_SEC = 1;
const DEVICE_CODE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";

// Types
export interface DeviceTokenResponse {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
    expires_in?: number;
    token_type?: string;
    error?: string;
    error_description?: string;
}

export interface PollOptions {
    signal?: AbortSignal;
    timeoutMs?: number;
}

export class DeviceFlowTimeoutError extends Error {
    constructor() {
        super("Device flow timed out");
        this.name = "DeviceFlowTimeoutError";
    }
}

export class DeviceFlowAbortedError extends Error {
    constructor() {
        super("Device flow was aborted");
        this.name = "DeviceFlowAbortedError";
    }
}

export class DeviceFlowAuthorizationError extends Error {
    constructor(
        public readonly errorCode: string,
        message?: string,
    ) {
        super(message || `Device flow authorization failed: ${errorCode}`);
        this.name = "DeviceFlowAuthorizationError";
    }
}

/**
 * Poll the OIDC token endpoint for a device_code until an access_token is issued or an error occurs.
 *
 * This function implements the OAuth 2.0 Device Authorization Grant polling mechanism:
 * - Continuously polls the token endpoint at the specified interval
 * - Handles standard OAuth errors (authorization_pending, slow_down, etc.)
 * - Supports cancellation via AbortSignal
 * - Implements timeout protection
 *
 * @param authMeta - OIDC client configuration containing the token endpoint
 * @param clientId - OAuth client identifier
 * @param deviceCode - Device code from the device authorization response
 * @param baseIntervalSec - Base polling interval in seconds
 * @param opts - Additional options (timeout, abort signal)
 * @returns Promise resolving to the token response
 * @throws {DeviceFlowTimeoutError} When polling exceeds the timeout
 * @throws {DeviceFlowAbortedError} When the operation is cancelled
 * @throws {DeviceFlowAuthorizationError} When authorization fails or is denied
 */
export async function pollDeviceToken(
    authMeta: ValidatedAuthMetadata,
    deviceAuthData: DeviceAuthData,
    opts: PollOptions = {},
): Promise<DeviceTokenResponse> {
    const { usedClientId, device_code, interval } = deviceAuthData;

    validateInputs(authMeta, usedClientId, device_code);

    const pollState = {
        started: Date.now(),
        timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        intervalSec: Math.max(MIN_INTERVAL_SEC, Math.floor(interval || DEFAULT_INTERVAL_SEC)),
    };

    const tokenForm = new URLSearchParams();
    tokenForm.set("client_id", usedClientId);
    tokenForm.set("grant_type", DEVICE_CODE_GRANT_TYPE);
    tokenForm.set("device_code", device_code);

    while (true) {
        if (opts.signal?.aborted) {
            throw new DeviceFlowAbortedError();
        }
        if (Date.now() - pollState.started > pollState.timeoutMs) {
            throw new DeviceFlowTimeoutError();
        }

        const response = await makeTokenRequest(authMeta, tokenForm, opts);

        if (response.res.ok && response.json.access_token) {
            if (!response.json.refresh_token) {
                logger.warn(
                    "OIDC device flow returned no refresh_token; session will expire when access_token expires",
                );
            }

            return response.json;
        }

        await handleErrorResponse(response.json, pollState, opts);
    }
}

/**
 * Validates required inputs for the device token polling process.
 * @param authMeta - OIDC client configuration containing endpoints
 * @param clientId - OAuth client identifier
 * @param deviceCode - Device code from device authorization response
 * @throws {Error} When required parameters are missing
 */
function validateInputs(authMeta: ValidatedAuthMetadata, clientId: string, deviceCode: string): void {
    if (!authMeta.token_endpoint) {
        throw new Error("Missing token_endpoint");
    }
    if (!clientId) {
        throw new Error("Missing clientId");
    }
    if (!deviceCode) {
        throw new Error("Missing deviceCode");
    }
}

/**
 * Makes a token request to the OIDC token endpoint.
 * @param authMeta - OIDC client configuration
 * @param tokenForm - URL-encoded form data for the token request
 * @param opts - Poll options including abort signal
 * @returns Promise resolving to response and parsed JSON
 * @throws {Error} When network request fails or token endpoint is unavailable
 */
async function makeTokenRequest(
    authMeta: ValidatedAuthMetadata,
    tokenForm: URLSearchParams,
    opts: PollOptions,
): Promise<{ res: Response; json: DeviceTokenResponse }> {
    if (!authMeta.token_endpoint) {
        throw new Error("Token endpoint not available in OIDC metadata");
    }

    try {
        const response = await fetch(authMeta.token_endpoint, {
            method: "POST",
            body: tokenForm,
            signal: opts.signal,
        });

        const json: DeviceTokenResponse = await response.json();

        return { res: response, json };
    } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
            throw new DeviceFlowAbortedError();
        }
        throw new Error(
            `Token request failed: ${fetchError instanceof Error ? fetchError.message : "Unknown network error"}`,
        );
    }
}

/**
 * Handles error responses from the token endpoint according to OAuth 2.0 Device Flow spec.
 * @param json - Token response containing error information
 * @param pollState - Current polling state (interval timing)
 * @param opts - Poll options including abort signal
 * @throws {DeviceFlowAuthorizationError} For terminal errors (access_denied, expired_token)
 */
async function handleErrorResponse(
    json: DeviceTokenResponse,
    pollState: { intervalSec: number },
    opts: PollOptions,
): Promise<void> {
    switch (json.error) {
        case "authorization_pending":
            // Continue polling at current interval
            await delay(pollState.intervalSec * 1000, opts.signal);
            break;
        case "slow_down":
            // Increase polling interval as requested by server
            pollState.intervalSec += SLOW_DOWN_INCREMENT_SEC;
            await delay(pollState.intervalSec * 1000, opts.signal);
            break;
        case "access_denied":
        case "expired_token":
            // Terminal errors - stop polling
            throw new DeviceFlowAuthorizationError(json.error, json.error_description);
        default:
            // Unknown or unhandled error
            throw new DeviceFlowAuthorizationError(
                json.error || "unknown_error",
                json.error_description || "Unknown device flow error",
            );
    }
}

/**
 * Creates a delay that can be cancelled via AbortSignal.
 * @param ms - Delay duration in milliseconds
 * @param signal - Optional AbortSignal to cancel the delay
 * @returns Promise that resolves after the delay or rejects if cancelled
 * @throws {DeviceFlowAbortedError} When the delay is cancelled
 */
async function delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DeviceFlowAbortedError());
            return;
        }

        const timeout = setTimeout(resolve, ms);

        const onAbort = (): void => {
            clearTimeout(timeout);
            signal?.removeEventListener("abort", onAbort);
            reject(new DeviceFlowAbortedError());
        };

        if (signal) {
            signal.addEventListener("abort", onAbort);
        }
    });
}
