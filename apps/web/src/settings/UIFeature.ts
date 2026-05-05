/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2024 New Vector Ltd.
Copyright 2020 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-04-30
*/

// see settings.md for documentation on conventions
export const enum UIFeature {
    AdvancedEncryption = "UIFeature.advancedEncryption",
    URLPreviews = "UIFeature.urlPreviews",
    Widgets = "UIFeature.widgets",
    // PG_CHANGED
    Threads = "UIFeature.threads",
    // PG_CHANGED
    SlashCommands = "UIFeature.slashCommands",
    LocationSharing = "UIFeature.locationSharing",
    Voip = "UIFeature.voip",
    Feedback = "UIFeature.feedback",
    Registration = "UIFeature.registration",
    PasswordReset = "UIFeature.passwordReset",
    Deactivate = "UIFeature.deactivate",
    ShareQRCode = "UIFeature.shareQrCode",
    ShareSocial = "UIFeature.shareSocial",
    IdentityServer = "UIFeature.identityServer",
    ThirdPartyID = "UIFeature.thirdPartyId",
    AdvancedSettings = "UIFeature.advancedSettings",
    RoomHistorySettings = "UIFeature.roomHistorySettings",
    TimelineEnableRelativeDates = "UIFeature.timelineEnableRelativeDates",
    AllowCreatingPublicRooms = "UIFeature.allowCreatingPublicRooms",
    AllowCreatingPublicSpaces = "UIFeature.allowCreatingPublicSpaces",
}

export { UIComponent } from "@element-hq/element-web-module-api";
