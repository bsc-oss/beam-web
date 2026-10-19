//
// Copyright 2026 Belgian Secure Communications (BSC)
//
// SPDX-License-Identifier: AGPL-3.0-only
// Please see LICENSE files in the repository root for full details.
//

import { ClientRendezvousFailureReason, MSC4108FailureReason } from "matrix-js-sdk/src/rendezvous";

export type CancelWatcherStop = () => void;

export interface CancelWatcherResult {
    stop: CancelWatcherStop;
}

/**
 * Starts polling a rendezvous URL every `intervalMs` to reflect remote cancellation/expiry on the caller.
 * On 404 → treats as user-cancelled for UX; on 5xx → unknown error.
 * Returns a `stop()` function to clear the interval.
 */
export function startRendezvousCancelWatcher(
    url: string | undefined,
    onCancel: (reason: MSC4108FailureReason | ClientRendezvousFailureReason) => void,
    intervalMs: number = 2000,
): CancelWatcherResult {
    if (!url) {
        return { stop: () => {} };
    }

    const timer = window.setInterval(async () => {
        try {
            const res = await fetch(url, { method: "GET", cache: "no-store" });
            if (res.status === 404) {
                window.clearInterval(timer);
                onCancel(MSC4108FailureReason.UserCancelled);
            } else if (res.status >= 500) {
                window.clearInterval(timer);
                onCancel(ClientRendezvousFailureReason.Unknown);
            }
        } catch {
            // transient network error: ignore; next tick may succeed
        }
    }, intervalMs);

    return { stop: () => window.clearInterval(timer) };
}
