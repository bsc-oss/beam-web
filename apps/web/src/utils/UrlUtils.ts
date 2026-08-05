/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2024 New Vector Ltd.
Copyright 2019-2021 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-02-06
*/

/**
 * If a url has no path component, etc. abbreviate it to just the hostname
 *
 * @param {string} u The url to be abbreviated
 * @returns {string} The abbreviated url
 */
export function abbreviateUrl(u?: string): string {
    if (!u) return "";

    let parsedUrl: URL;
    try {
        parsedUrl = parseUrl(u);
    } catch (e) {
        console.error(e);
        // if it's something we can't parse as a url then just return it
        return u;
    }

    if (parsedUrl.pathname === "/") {
        // we ignore query / hash parts: these aren't relevant for IS server URLs
        return parsedUrl.host || "";
    }

    return u;
}

export function unabbreviateUrl(u?: string): string {
    if (!u) return "";

    let longUrl = u;
    if (!u.startsWith("https://")) longUrl = "https://" + u;
    const parsed = parseUrl(longUrl);
    if (!parsed.hostname) return u;

    return longUrl;
}

export function parseUrl(u: string): URL {
    if (!u.includes(":")) {
        u = window.location.protocol + u;
    }
    return new URL(u);
}

export const PERMITTED_URL_SCHEMES = [
    "bitcoin",
    "ftp",
    "geo",
    "http",
    "https",
    "im",
    "irc",
    "ircs",
    "magnet",
    "mailto",
    "matrix",
    "mms",
    "news",
    "nntp",
    "openpgp4fpr",
    "sip",
    "sftp",
    "sms",
    "smsto",
    "ssh",
    "tel",
    "urn",
    "webcal",
    "wtai",
    "xmpp",
];

// PG_CHANGED
/** RTL override characters that can be used to disguise URLs */
const RTL_OVERRIDE_CHARS_REGEX = /[\u202E\u202D\u202C\u200F\u200E\u2066\u2067\u2068\u2069]/;

/**
 * Determines if a link is suspicious based on:
 * 1. RTL override characters in the URL or displayed text
 * 2. Displayed text looks like a URL but has a different host than the actual URL
 */
export function isSuspiciousLink(displayedText: string, actualUrl: string): boolean {
    // Check for RTL override characters
    if (RTL_OVERRIDE_CHARS_REGEX.test(displayedText) || RTL_OVERRIDE_CHARS_REGEX.test(actualUrl)) {
        return true;
    }

    // Check if displayed text is a URL with a different host than the actual URL
    try {
        const displayedHost = new URL(displayedText.trim()).hostname.toLowerCase();
        const actualHost = new URL(actualUrl).hostname.toLowerCase();
        return displayedHost !== actualHost;
    } catch {
        return false;
    }
}
