/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2024 New Vector Ltd.
Copyright 2019-2022 The Matrix.org Foundation C.I.C.
Copyright 2016 OpenMarket Ltd

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-02-06
*/

import { type ResolveDefaults, type WebConfigJson } from "shared-types";

import { type ValidatedServerConfig } from "./utils/ValidatedServerConfig";
import { type DEFAULTS } from "./SdkConfig.ts";

/**
 * Bug reports are enabled but must only be locally
 * downloadable.
 */
export const BugReportEndpointURLLocal = "local";

export interface ConfigOptions extends WebConfigJson {
    /**
     * This is not a real config field, we're just abusing the config structure to pass around a validated server config
     */
    validated_server_config?: ValidatedServerConfig;

    // PG_CHANGED: fork-specific configuration options
    pg_enable_presence?: boolean; // if false, presence is disabled globally (default: true)
    website_url?: string;
    help_sections?: {
        encryption: string;
        identity_reset: string;
        device_verification: string;
        settings: string;
        sharing: string;
        supported_browser: string;
    };
    // Blocked file types for uploads
    blocked_file_extensions?: string[]; // e.g. [".exe", ".bat", ".sh"]
    blocked_file_mime_types?: string[]; // e.g. ["application/x-msdownload"]
    pg_service_url?: string; // Pro Grade Global Service
    pg_notice_url?: string; // Service message endpoint
    pg_enable_email_login?: boolean; // Enable email-based login flow
    pg_service_account_localpart?: string[];
    // Deployment environment, used to brand the PWA icons and app name. Defaults to production.
    pg_environment?: "DEV" | "TST" | "ACC" | "PROD";
    mobile_builds?: WebConfigJson["mobile_builds"] & {
        apple_app_id?: string | null; // app id for meta tag
    };
    // PG_CHANGED end
}

/**
 * Type representing the effective config.json structure after DEFAULTS has been merged in
 */
export type IConfigOptions = ResolveDefaults<ConfigOptions, typeof DEFAULTS>;
