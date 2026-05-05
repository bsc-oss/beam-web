/*
Copyright 2026 Belgian Secure Communications (BSC)

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import SdkConfig from "../SdkConfig";
import { MatrixClientPeg } from "../MatrixClientPeg";

/**
 * Check whether a Matrix user ID belongs to a configured service account.
 * The localpart is compared against the `pg_service_account_localpart` array in config.
 * Only matches accounts on the same homeserver as the current user.
 */
export function isServiceAccount(userId: string): boolean {
    const localparts = SdkConfig.get().pg_service_account_localpart;
    if (!localparts || localparts.length === 0) return false;

    // Extract localpart and server: @localpart:server
    const match = userId.match(/^@([^:]+):(.+)$/);
    if (!match) return false;

    const localpart = match[1];
    const server = match[2];

    // Only consider accounts on the same homeserver
    const myDomain = MatrixClientPeg.safeGet().getDomain();
    if (server !== myDomain) return false;

    return localparts.includes(localpart);
}
