/*
Copyright 2026 Belgian Secure Communications (BSC)

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import SdkConfig from "./SdkConfig";
import { getCurrentLanguage, getDefaultPGLanguage, getPGLanguages } from "./languageHandler";

type HelpSection =
    | "encryption"
    | "identity_reset"
    | "device_verification"
    | "settings"
    | "sharing"
    | "supported_browser";

/**
 * Returns the current user language mapped to a supported language code.
 * Falls back to English if the user's language is not supported.
 */
function getLanguageCode(): string {
    const lang = getCurrentLanguage().toLowerCase().split("-")[0].split("_")[0];
    return getPGLanguages().includes(lang) ? lang : getDefaultPGLanguage();
}

/**
 * Builds a help URL by combining the base help_url (with {LANG} placeholder),
 * the current user language, and an optional section anchor from help_sections.
 */
function buildHelpUrl(section?: HelpSection): string {
    const helpUrl = SdkConfig.get("help_url");
    const lang = getLanguageCode();
    let url = helpUrl.replace("{LANG}", lang);

    if (section) {
        const sections = SdkConfig.get("help_sections");
        const anchor = sections?.[section];
        if (anchor) {
            url += "#" + anchor;
        }
    }

    return url;
}

/**
 * Helper to build localized help URLs from config.
 *
 * Instead of storing separate full URLs for each help page in config
 * (help_encryption_url, help_encryption_device_verification_url, etc.),
 * we combine:
 *   - help_url (base URL with {LANG} placeholder)
 *   - the current user language (EN, DE, FR, NL — fallback to EN)
 *   - help_sections (anchors for each topic)
 *
 * Also supports resolving any arbitrary URL containing a {LANG} placeholder.
 */
// oxlint-disable-next-line typescript/no-extraneous-class -- PG_CHANGED: static helper class kept for readability
export default class PgUrlHelper {
    /** General help page URL (localized, no section anchor). */
    public static getHelpUrl(): string {
        return buildHelpUrl();
    }

    /** Help page for encryption. */
    public static getEncryptionUrl(): string {
        return buildHelpUrl("encryption");
    }

    /** Help page for identity reset (encryption key reset). */
    public static getIdentityResetUrl(): string {
        return buildHelpUrl("identity_reset");
    }

    /** Help page for device verification. */
    public static getDeviceVerificationUrl(): string {
        return buildHelpUrl("device_verification");
    }

    /** Help page for notification settings. */
    public static getNotificationSettingsUrl(): string {
        return buildHelpUrl("settings");
    }

    /** Help page for E2EE history sharing. */
    public static getE2eeHistorySharingUrl(): string {
        return buildHelpUrl("sharing");
    }

    /** Help page for supported browsers. */
    public static getSupportedBrowserUrl(): string {
        return buildHelpUrl("supported_browser");
    }

    /**
     * Resolves a URL containing a {LANG} placeholder with the current user language.
     * Use this for URLs outside of help_url (e.g. terms_and_conditions_links).
     */
    public static resolveUrl(url: string): string {
        return url.replace("{LANG}", getLanguageCode());
    }
}
