//
// Copyright 2026 Belgian Secure Communications (BSC)
//
// SPDX-License-Identifier: AGPL-3.0-only
// Please see LICENSE files in the repository root for full details.
//

/*
    Helper utilities for QR-code login OIDC Device Authorization (MSC4108).
    Extracted from LoginWithQR to keep UI component lean.
*/

import { logger } from "matrix-js-sdk/src/logger";
import { generateScope } from "matrix-js-sdk/src/oidc/authorize";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";
import { type OidcClientConfig } from "matrix-js-sdk/src/matrix";
import { MSC4108SignInWithQR } from "matrix-js-sdk/src/rendezvous";

import { getDeviceFlowClientId } from "./PGDeviceFlow";

const DEFAULT_POLLING_INTERVAL_S = 5;

interface DeviceAuthorizationResponse {
    device_code: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete?: string;
    expires_in?: number;
    interval?: number;
    error?: string;
    error_description?: string;
}

export interface DeviceAuthData {
    usedClientId: string;
    device_code: string;
    user_code: string;
    interval: number;
    requestedDeviceId: string;
}

// PG_CHANGED: session duration scopes
const LONG_LIVED_SESSION_SCOPE = "urn:pg:session:long-lived";
const SHORT_LIVED_SESSION_SCOPE = "urn:pg:session:short-lived";

/**
 * PG_CHANGED: Check if the homeserver supports PG session duration scopes.
 * Both scopes must be present in scopes_supported for the feature to be enabled.
 */
export function supportsSessionDurationScopes(authMeta: OidcClientConfig): boolean {
    const scopesSupported = authMeta.scopes_supported;
    if (!scopesSupported || !Array.isArray(scopesSupported)) {
        return false;
    }
    return scopesSupported.includes(LONG_LIVED_SESSION_SCOPE) && 
           scopesSupported.includes(SHORT_LIVED_SESSION_SCOPE);
}

export async function initiateQrDeviceAuth(
    client: MatrixClient,
    rendezvous: MSC4108SignInWithQR,
    abort: AbortController,
    // PG_CHANGED
    isLongLivedSession: boolean = true,
): Promise<{ authMeta: OidcClientConfig; deviceAuthData: DeviceAuthData }> {
    const authMeta: OidcClientConfig = await client.getAuthMetadata();
    if (!authMeta.device_authorization_endpoint) {
        throw new Error("OIDC device authorization endpoint not available");
    }

    const usedClientId: string = await getDeviceFlowClientId(authMeta);
    const requestedDeviceId = await rendezvous.pgGetPublicKey();

    const formData = new URLSearchParams();
    formData.set("client_id", usedClientId);
    // PG_CHANGED: Only add session scope if homeserver supports it
    // Otherwise the user will get an error
    let scope = generateScope(requestedDeviceId);
    if (supportsSessionDurationScopes(authMeta)) {
        const sessionScope = isLongLivedSession ? LONG_LIVED_SESSION_SCOPE : SHORT_LIVED_SESSION_SCOPE;
        scope = `${scope} ${sessionScope}`;
    }
    formData.set("scope", scope);

    try {
        const deviceRes = await fetch(authMeta.device_authorization_endpoint, {
            method: "POST",
            body: formData,
            signal: abort.signal,
        });
        const deviceJson: DeviceAuthorizationResponse = await deviceRes.json();

        if (!deviceRes.ok) {
            const msg = deviceJson?.error === "unauthorized_client"
                ? "Client not authorized for device flow (device_code)"
                : `${deviceRes.status}${deviceJson?.error ? ": " + deviceJson.error : ""}`;
            throw new Error(`Device authorization failed: ${msg}`);
        }

        const {
            device_code,
            verification_uri,
            verification_uri_complete,
            user_code,
            interval = DEFAULT_POLLING_INTERVAL_S,
        } = deviceJson;

        await rendezvous.deviceAuthorizationGrant({
            deviceId: requestedDeviceId,
            verificationUri: verification_uri,
            verificationUriComplete: verification_uri_complete,
        });

        return {
            authMeta,
            deviceAuthData: { usedClientId, device_code, user_code, interval, requestedDeviceId },
        };
    } catch (error) {
        logger.warn("Failed to initiate device authorization", error);
        throw new Error("Device authorization failed");
    }
}