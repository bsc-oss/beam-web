//
// Copyright 2026 Belgian Secure Communications (BSC)
//
// SPDX-License-Identifier: AGPL-3.0-only
// Please see LICENSE files in the repository root for full details.
//

/*
Finalize E2EE state after login by importing secrets (if any), bootstrapping cross-signing without creating new keys,
optionally self-signing the current device, and clearing verification prompts when ready.
*/
import { MatrixClient } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";
import type { CryptoApi } from "matrix-js-sdk/src/crypto-api";

type SecretsBundle = Awaited<ReturnType<NonNullable<CryptoApi["exportSecretsBundle"]>>>;

export async function finalizePostLoginCrypto(client: MatrixClient, secrets?: SecretsBundle): Promise<void> {
    try {
        const crypto = client.getCrypto?.();

        // Import secrets bundle if provided
        if (secrets) {
            try {
                await crypto?.importSecretsBundle?.(secrets);
                logger.info("Imported secrets bundle");
            } catch (e) {
                logger.error("Failed to import secrets bundle", e);
            }
        }

        try {
            await crypto?.bootstrapCrossSigning?.({ setupNewCrossSigning: false });
        } catch (e) {
            logger.warn("bootstrapCrossSigning failed", e);
        }

        // Cross-sign our own device to mark as verified if possible
        const myDeviceId = client.getDeviceId?.();
        if (myDeviceId) {
            try {
                await crypto?.crossSignDevice?.(myDeviceId);
                logger.info("Cross-signed this device");
            } catch (e) {
                logger.warn("Failed to cross-sign device", e);
            }
        }

        const ready = await crypto?.isCrossSigningReady?.();
        if (ready) {
            try {
                localStorage.removeItem("must_verify_device");
            } catch (e) {
                // ignore storage issues
            }
        }
    } catch (e) {
        logger.warn("finalizePostLoginCrypto encountered an error", e);
    }
}
