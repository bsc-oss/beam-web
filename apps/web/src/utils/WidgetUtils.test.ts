/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2024 New Vector Ltd.
Copyright 2022 Oliver Sand
Copyright 2022 Nordeck IT + Consulting GmbH.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-02-06
*/

import { describe, it, expect, beforeEach } from "vitest";
import { mockPlatformPeg } from "test-utils/platform";

import WidgetUtils from "./WidgetUtils";

describe("getLocalJitsiWrapperUrl", () => {
    beforeEach(() => {
        Object.defineProperty(window, "location", {
            value: {
                // PG_CHANGED: Rebranded to Beam
                origin: "https://web.beam.belgium.be",
                pathname: "",
            },
        });
    });

    it("should generate jitsi URL (for defaults)", () => {
        mockPlatformPeg();

        expect(WidgetUtils.getLocalJitsiWrapperUrl()).toEqual(
            // PG_CHANGED: Rebranded to Beam
            "https://web.beam.belgium.be/jitsi.html" +
                "#conferenceDomain=$domain" +
                "&conferenceId=$conferenceId" +
                "&isAudioOnly=$isAudioOnly" +
                "&startWithAudioMuted=$startWithAudioMuted" +
                "&startWithVideoMuted=$startWithVideoMuted" +
                "&isVideoChannel=$isVideoChannel" +
                "&displayName=$matrix_display_name" +
                "&avatarUrl=$matrix_avatar_url" +
                "&userId=$matrix_user_id" +
                "&roomId=$matrix_room_id" +
                "&theme=$theme" +
                "&roomName=$roomName" +
                "&supportsScreensharing=true" +
                "&language=$org.matrix.msc2873.client_language",
        );
    });
});
