/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2024 New Vector Ltd.
Copyright 2024 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-02-06
*/

/**
 * The intention of this enum is to have a mode that scans a QR code instead of generating one.
 */
export enum Mode {
    /**
     * A QR code with be generated and shown
     */
    Reciprocate = "reciprocate",
    /**
     * A QR code will be generated and shown for a new device to login
     * (opposite of Reciprocate mode - this device is the one getting logged in)
     */
    Login = "login",
}

export enum Phase {
    Loading,
    ShowingQR,
    // The following are specific to MSC4108
    OutOfBandConfirmation,
    WaitingForDevice,
    Verifying,
    Error,
    // PG_CHANGED: New phases for Login mode,
    WaitingForScan,
    ConfirmingOnOtherDevice,
    GettingSecrets,
    Intro,
}

/**
 * Enum representing the click actions (transitions) a user can take during the login with QR flow
 */
export enum Click {
    /**
     * Cancel the flow
     */
    Cancel,
    /**
     * A specific case of cancellation when the existing device declines the login
     */
    Decline,
    /**
     * Approve the login from the existing device
     */
    Approve,
    /**
     * PG_CHANGED: Go back / cancel from the new device
     */
    Back,
    /**
     * Initialise the flow & show QR code
     */
    ShowQr,
    Retry,
}
