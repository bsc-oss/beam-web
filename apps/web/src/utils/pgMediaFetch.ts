/*
Copyright 2026 Belgian Secure Communications (BSC)

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// Utility for fetching media with authentication, bypassing the service worker.
// This replicates the URL rewrite and auth header logic from the service worker
// so that explicit fetch() calls work even when the service worker is broken.

import { MatrixClientPeg } from "../MatrixClientPeg";

/**
 * Rewrites a media URL from the unauthenticated `/_matrix/media/v3/` endpoint
 * to the authenticated `/_matrix/client/v1/media/` endpoint.
 */
export function rewriteMediaUrl(url: string): string {
    return url.replace(/\/media\/v3\/(.*)\//, "/client/v1/media/$1/");
}

/**
 * Fetches a media URL with authentication, rewriting the URL to use
 * the authenticated media endpoint (`/_matrix/client/v1/media/`).
 *
 * This is the application-level equivalent of the service worker's
 * URL rewrite + auth header injection, ensuring media requests work
 * even when the service worker is unavailable.
 */
export async function fetchMediaAuthenticated(url: string): Promise<Response> {
    const rewrittenUrl = rewriteMediaUrl(url);
    const accessToken = MatrixClientPeg.get()?.getAccessToken();

    const headers: Record<string, string> = {};

    if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
    }

    return fetch(rewrittenUrl, {
        headers,
    });
}
