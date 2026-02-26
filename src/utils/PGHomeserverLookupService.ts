/*
Copyright 2025 Belgian Secure Communications

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { logger } from "matrix-js-sdk/src/logger";
import { AutoDiscovery } from "matrix-js-sdk/src/matrix";

import SdkConfig from "../SdkConfig";
import AutoDiscoveryUtils from "./AutoDiscoveryUtils";
import { type ValidatedServerConfig } from "./ValidatedServerConfig";
import { _t } from "../languageHandler";

export interface HomeserverLookupResult {
    config: ValidatedServerConfig;
    email: string;
}

export interface HomeserverApiResponse {
    baseDomain: string;
}

export class PGHomeserverLookupService {
    private static readonly UNKNOWN_EMAIL_DOMAIN_ERROR = "Err:Homeserver:UnknownEmailDomain";

    /**
     * Looks up a homeserver configuration based on an email address
     * @param email The email address to lookup
     * @returns Promise resolving to homeserver config and email
     * @throws Error with localized message if lookup fails
     */
    public static async lookupByEmail(email: string): Promise<HomeserverLookupResult> {
        try {
            const baseDomain = await this.fetchHomeserverDomain(email);
            const config = await this.validateHomeserver(baseDomain);
            
            return {
                config,
                email,
            };
        } catch (error) {
            logger.error("Error looking up homeserver from email:", error);
            throw error;
        }
    }

    /**
     * Fetches the homeserver domain from the API based on email
     * @param email The email address to lookup
     * @returns Promise resolving to the base domain
     * @throws Error with localized message if API call fails
     */
    private static async fetchHomeserverDomain(email: string): Promise<string> {
        const apiUrl = SdkConfig.get().pg_service_url;
        if (!apiUrl) {
            throw new Error("PG service URL not configured");
        }

        const response = await fetch(`${apiUrl}/homeserver/find-by-email?email=${encodeURIComponent(email)}`, {
            method: "GET",
            headers: {
                "Accept": "application/json",
            },
        });

        if (!response.ok) {
            if (response.status === 403) {
                const data = await response.json();
                if (data.title === this.UNKNOWN_EMAIL_DOMAIN_ERROR) {
                    throw new Error(_t("pg|auth|homeserver_selector|not_allowed"));
                }
            }
            throw new Error(_t("pg|auth|homeserver_selector|validation_failed"));
        }

        const data: HomeserverApiResponse = await response.json();
        if (!data.baseDomain) {
            throw new Error(_t("pg|auth|homeserver_selector|not_found"));
        }

        return data.baseDomain;
    }

    /**
     * Validates a homeserver URL using AutoDiscovery
     * @param hsUrl The homeserver URL to validate
     * @returns Promise resolving to validated server config
     * @throws Error with localized message if validation fails
     */
    private static async validateHomeserver(hsUrl: string): Promise<ValidatedServerConfig> {
        try {
            const discoveryResult = await AutoDiscovery.findClientConfig(hsUrl);
            const validatedConfig = await AutoDiscoveryUtils.buildValidatedConfigFromDiscovery(
                hsUrl,
                discoveryResult,
            );
            return validatedConfig;
        } catch (error) {
            logger.error("Error validating discovered homeserver:", error);
            throw new Error(_t("pg|auth|homeserver_selector|validation_failed"));
        }
    }
}
