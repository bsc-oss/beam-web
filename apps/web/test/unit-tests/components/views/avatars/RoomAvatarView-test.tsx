/*
 * Copyright 2026 Belgian Secure Communications (BSC)
 * Copyright 2025 New Vector Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 *
 * Modified by Belgian Secure Communications for Beam application on 2026-04-30
 */

import React from "react";
import { render, screen } from "jest-matrix-react";
import { mocked } from "jest-mock";

import { RoomAvatarView } from "../../../../../src/components/views/avatars/RoomAvatarView";
import { mkStubRoom, stubClient } from "../../../../test-utils";
import {
    AvatarBadgeDecoration,
    type RoomAvatarViewState,
    useRoomAvatarViewModel,
} from "../../../../../src/components/viewmodels/avatars/RoomAvatarViewModel";
import DMRoomMap from "../../../../../src/utils/DMRoomMap";
import { Presence } from "../../../../../src/components/views/avatars/WithPresenceIndicator";

jest.mock("../../../../../src/components/viewmodels/avatars/RoomAvatarViewModel", () => ({
    ...jest.requireActual("../../../../../src/components/viewmodels/avatars/RoomAvatarViewModel"),
    useRoomAvatarViewModel: jest.fn(),
}));

describe("<RoomAvatarView />", () => {
    const matrixClient = stubClient();
    const room = mkStubRoom("roomId", "roomName", matrixClient);

    DMRoomMap.makeShared(matrixClient);
    jest.spyOn(DMRoomMap.shared(), "getUserIdForRoomId").mockReturnValue(undefined);

    let defaultValue: RoomAvatarViewState;

    beforeEach(() => {
        defaultValue = {
            badgeDecoration: undefined,
            presence: null,
        };

        mocked(useRoomAvatarViewModel).mockReturnValue(defaultValue);
    });

    it("should not render a decoration", () => {
        mocked(useRoomAvatarViewModel).mockReturnValue({ ...defaultValue });
        const { asFragment } = render(<RoomAvatarView room={room} />);
        expect(asFragment()).toMatchSnapshot();
    });

    it("should render a low priority room decoration", () => {
        mocked(useRoomAvatarViewModel).mockReturnValue({
            ...defaultValue,
            badgeDecoration: AvatarBadgeDecoration.LowPriority,
        });
        const { asFragment } = render(<RoomAvatarView room={room} />);

        expect(screen.getByLabelText("This is a low priority group")).toBeInTheDocument();
        expect(asFragment()).toMatchSnapshot();
    });

    it("should render a video room decoration", () => {
        mocked(useRoomAvatarViewModel).mockReturnValue({
            ...defaultValue,
            badgeDecoration: AvatarBadgeDecoration.VideoRoom,
        });
        const { asFragment } = render(<RoomAvatarView room={room} />);

        expect(screen.getByLabelText("This group is a video group")).toBeInTheDocument();
        expect(asFragment()).toMatchSnapshot();
    });

    it("should render a public room decoration", () => {
        mocked(useRoomAvatarViewModel).mockReturnValue({
            ...defaultValue,
            badgeDecoration: AvatarBadgeDecoration.PublicRoom,
        });
        const { asFragment } = render(<RoomAvatarView room={room} />);

        expect(screen.getByLabelText("This group is public")).toBeInTheDocument();
        expect(asFragment()).toMatchSnapshot();
    });

    it.each([
        { presence: Presence.Online, label: "Online" },
        { presence: Presence.Offline, label: "Offline" },
        { presence: Presence.Busy, label: "Busy" },
        { presence: Presence.Away, label: "Away" },
    ])("should render the $presence presence", ({ presence, label }) => {
        mocked(useRoomAvatarViewModel).mockReturnValue({
            ...defaultValue,
            badgeDecoration: AvatarBadgeDecoration.Presence,
            presence,
        });
        const { asFragment } = render(<RoomAvatarView room={room} />);

        expect(screen.getByLabelText(label)).toBeInTheDocument();
        expect(asFragment()).toMatchSnapshot();
    });
});
