//
// Copyright 2026 Belgian Secure Communications (BSC)
//
// SPDX-License-Identifier: AGPL-3.0-only
// Please see LICENSE files in the repository root for full details.
//

export interface PageLeaveGuardOptions {
    /** Return true when the page should block closing/refreshing. */
    shouldGuard: () => boolean;
    /** Called on pagehide (i.e. when navigating away or closing). Do cleanup here. */
    onPageHide?: () => void;
}

export interface PageLeaveGuardResult {
    stop: () => void;
}

/**
 * Installs native page-leave guards:
 * - beforeunload: triggers the native confirmation dialog when shouldGuard() is true
 * - pagehide: invokes onPageHide() for best-effort cleanup
 */
export function startPageLeaveGuard(options: PageLeaveGuardOptions): PageLeaveGuardResult {
    const beforeUnload = (e: BeforeUnloadEvent): void => {
        if (!options.shouldGuard()) return;
        e.preventDefault();
    };

    const pageHide = (): void => {
        if (!options.shouldGuard()) return;
        try {
            options.onPageHide?.();
        } catch {
            // no-op
        }
    };

    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("pagehide", pageHide);

    return {
        stop: () => {
            window.removeEventListener("beforeunload", beforeUnload);
            window.removeEventListener("pagehide", pageHide);
        },
    };
}
