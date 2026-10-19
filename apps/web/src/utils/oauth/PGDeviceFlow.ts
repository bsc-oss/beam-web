//
// Copyright 2026 Belgian Secure Communications (BSC)
//
// SPDX-License-Identifier: AGPL-3.0-only
// Please see LICENSE files in the repository root for full details.
//

import { logger } from "matrix-js-sdk/src/logger";
import { type ValidatedAuthMetadata } from "matrix-js-sdk/src/matrix";
import PlatformPeg from "../../PlatformPeg";
import SdkConfig from "../../SdkConfig";

/**
 * OIDC client registration response
 */
interface OidcRegistrationResponse {
    client_id: string;
    error?: string;
    error_description?: string;
}

/**
 * Ensure issuer URL has trailing slash for consistent static client lookup
 */
const withTrailingSlash = (url: string): string => (url.endsWith("/") ? url : url + "/");

/**
 * Get a client_id that is authorized for the OIDC Device Authorization Grant.
 *
 * This function implements a two-step strategy to obtain a client ID:
 *
 * 1) **Static Configuration (Preferred)**: Check if a pre-registered client ID exists
 *    in the app configuration for this OIDC issuer. These clients are registered
 *    ahead of time and configured to support the device code grant type.
 *
 * 2) **Dynamic Registration (Fallback)**: If no static client exists and the OIDC
 *    provider supports dynamic registration, create a new public client on-the-fly
 *    that includes the device_code grant type for QR code login flows.
 */
export const getDeviceFlowClientId = async (authMeta: ValidatedAuthMetadata): Promise<string> => {
    const issuer = withTrailingSlash(authMeta.issuer);
    const staticClients = SdkConfig.get().oidc_static_clients;
    const staticId = staticClients?.[issuer]?.client_id;

    if (staticId) {
        logger.debug(`Using static clientId for device flow: ${staticId}`);
        return staticId;
    }

    if (!authMeta.registration_endpoint) {
        throw new Error("No registration_endpoint in OIDC metadata; cannot register device-code client");
    }

    const platform = PlatformPeg.get();
    if (!platform) {
        throw new Error("Platform not available for OIDC client metadata");
    }

    const baseMeta = await platform.getOAuthClientMetadata();

    const clientMetadata = {
        client_name: baseMeta.client_name,
        client_uri: baseMeta.client_uri,
        logo_uri: baseMeta.logo_uri,
        redirect_uris: baseMeta.redirect_uris,
        response_types: ["code"] as const,
        grant_types: ["authorization_code", "refresh_token", "urn:ietf:params:oauth:grant-type:device_code"] as const,
        token_endpoint_auth_method: "none" as const,
        application_type: "web" as const,
        tos_uri: baseMeta.tos_uri,
        policy_uri: baseMeta.policy_uri,
    };

    try {
        const response = await fetch(authMeta.registration_endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(clientMetadata),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const json: OidcRegistrationResponse = await response.json();

        if (json.error) {
            const errorMsg = json.error_description ? `${json.error}: ${json.error_description}` : json.error;
            throw new Error(`Client registration failed: ${errorMsg}`);
        }

        if (!json.client_id || typeof json.client_id !== "string") {
            throw new Error("Invalid registration response: missing or invalid client_id");
        }

        logger.info("Registered device-flow client", json.client_id);
        return json.client_id;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Client registration (device flow) failed: ${error.message}`);
        }
        throw new Error("Client registration (device flow) failed: Unknown error");
    }
};
