/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-04-30
*/

import React from "react";
import { render, fireEvent, screen } from "jest-matrix-react";
import { Room, type MatrixClient, JoinRule, MatrixEvent, HistoryVisibility } from "matrix-js-sdk/src/matrix";
import { mocked, type MockedObject } from "jest-mock";
import userEvent from "@testing-library/user-event";
import { LinkedTextContext } from "@element-hq/web-shared-components";

import RoomSummaryCardView from "../../../../../src/components/views/right_panel/RoomSummaryCardView";
import MatrixClientContext from "../../../../../src/contexts/MatrixClientContext";
import { flushPromises, stubClient } from "../../../../test-utils";
import { RoomPermalinkCreator } from "../../../../../src/utils/permalinks/Permalinks";
import { _t } from "../../../../../src/languageHandler";
import {
    type RoomSummaryCardState,
    useRoomSummaryCardViewModel,
} from "../../../../../src/components/viewmodels/right_panel/RoomSummaryCardViewModel";
import DMRoomMap from "../../../../../src/utils/DMRoomMap";

// Mock the viewmodel hooks
jest.mock("../../../../../src/components/viewmodels/right_panel/RoomSummaryCardViewModel", () => ({
    useRoomSummaryCardViewModel: jest.fn(),
}));

describe("<RoomSummaryCard />", () => {
    const userId = "@alice:domain.org";

    const roomId = "!room:domain.org";
    let mockClient!: MockedObject<MatrixClient>;
    let room!: Room;

    const getComponent = (props = {}) => {
        const defaultProps = {
            room,
            onClose: jest.fn(),
            permalinkCreator: new RoomPermalinkCreator(room),
        };

        return render(<RoomSummaryCardView {...defaultProps} {...props} />, {
            wrapper: ({ children }) => (
                <MatrixClientContext.Provider value={mockClient}>
                    <LinkedTextContext.Provider value={{}}>{children}</LinkedTextContext.Provider>
                </MatrixClientContext.Provider>
            ),
        });
    };

    // Setup mock view models
    const vmDefaultValues: RoomSummaryCardState = {
        isDirectMessage: false,
        isRoomEncrypted: false,
        e2eStatus: undefined,
        isVideoRoom: false,
        roomJoinRule: JoinRule.Public,
        historyVisibility: HistoryVisibility.Shared,
        alias: "",
        isFavorite: false,
        canInviteToState: true,
        pinCount: 0,
        searchInputRef: { current: null },
        onUpdateSearchInput: jest.fn(),
        onRoomMembersClick: jest.fn(),
        onRoomThreadsClick: jest.fn(),
        onRoomFilesClick: jest.fn(),
        onRoomExtensionsClick: jest.fn(),
        onRoomPinsClick: jest.fn(),
        onRoomSettingsClick: jest.fn(),
        onLeaveRoomClick: jest.fn(),
        onShareRoomClick: jest.fn(),
        onRoomExportClick: jest.fn(),
        onRoomPollHistoryClick: jest.fn(),
        onReportRoomClick: jest.fn(),
        onFavoriteToggleClick: jest.fn(),
        onInviteToRoomClick: jest.fn(),
    };

    beforeEach(() => {
        mockClient = mocked(stubClient());
        room = new Room(roomId, mockClient, userId);
        mocked(useRoomSummaryCardViewModel).mockReturnValue(vmDefaultValues);
        DMRoomMap.makeShared(mockClient);

        mockClient.getRoom.mockReturnValue(room);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("renders the room summary", () => {
        const { container } = getComponent();
        expect(container).toMatchSnapshot();
    });

    it("renders the room topic in the summary", () => {
        room.currentState.setStateEvents([
            new MatrixEvent({
                type: "m.room.topic",
                room_id: roomId,
                sender: userId,
                content: {
                    topic: "This is the room's topic.",
                },
                state_key: "",
            }),
        ]);
        const { container } = getComponent();
        expect(container).toMatchSnapshot();
    });

    it("has button to edit topic", () => {
        room.currentState.setStateEvents([
            new MatrixEvent({
                type: "m.room.topic",
                room_id: roomId,
                sender: userId,
                content: {
                    topic: "This is the room's topic.",
                },
                state_key: "",
            }),
        ]);
        const { container, getByText } = getComponent();
        expect(getByText("Edit")).toBeInTheDocument();
        expect(container).toMatchSnapshot();
    });

    // PG_CHANGED: search field is hidden in the PG fork
    describe("search", () => {
        it("has the search field", async () => {
            const onSearchChange = jest.fn();
            const { queryByPlaceholderText } = getComponent({
                onSearchChange,
            });
            expect(queryByPlaceholderText("Search messages…")).not.toBeInTheDocument();
        });

        it("should focus the search field if focusRoomSearch=true", () => {
            const onSearchChange = jest.fn();
            const { queryByPlaceholderText } = getComponent({
                onSearchChange,
                focusRoomSearch: true,
            });
            expect(queryByPlaceholderText("Search messages…")).not.toBeInTheDocument();
        });

        it("should cancel search on escape", () => {
            const onSearchChange = jest.fn();
            const onSearchCancel = jest.fn();

            const { queryByPlaceholderText } = getComponent({
                onSearchChange,
                onSearchCancel,
                focusRoomSearch: true,
            });
            expect(queryByPlaceholderText("Search messages…")).not.toBeInTheDocument();
        });

        it("should update the search field value correctly", async () => {
            const onSearchChange = jest.fn();
            const { queryByPlaceholderText } = getComponent({
                onSearchChange,
            });

            expect(queryByPlaceholderText("Search messages…")).not.toBeInTheDocument();
        });
    });

    // PG_CHANGED: Files menu item is hidden in PG fork
    it("opens room file panel on button click", () => {
        const { queryByText } = getComponent();

        expect(queryByText("Files")).not.toBeInTheDocument();
    });

    it("opens room export dialog on button click", () => {
        const { getByText } = getComponent();

        fireEvent.click(getByText(_t("export_chat|title")));

        expect(vmDefaultValues.onRoomExportClick).toHaveBeenCalled();
    });

    // PG_CHANGED: Copy link menu item is commented out in PG fork
    it("opens share room dialog on button click", () => {
        const { queryByText } = getComponent();

        expect(queryByText(_t("action|copy_link"))).not.toBeInTheDocument();
    });

    it("opens invite dialog on button click", () => {
        const { getByText } = getComponent();

        fireEvent.click(getByText(_t("action|invite")));

        expect(vmDefaultValues.onInviteToRoomClick).toHaveBeenCalled();
    });

    it("fires favourite dispatch on button click", () => {
        const { getByText } = getComponent();

        fireEvent.click(getByText(_t("room|context_menu|favourite")));

        expect(vmDefaultValues.onFavoriteToggleClick).toHaveBeenCalled();
    });

    it("opens room settings on button click", () => {
        const { getByText } = getComponent();

        fireEvent.click(getByText(_t("common|settings")));

        expect(vmDefaultValues.onRoomSettingsClick).toHaveBeenCalled();
    });

    it("opens room member list on button click", () => {
        const { getByText } = getComponent();

        fireEvent.click(getByText("People"));

        expect(vmDefaultValues.onRoomMembersClick).toHaveBeenCalled();
    });

    it("opens room threads list on button click", () => {
        const { getByText } = getComponent();

        fireEvent.click(getByText("Subchats"));

        expect(vmDefaultValues.onRoomThreadsClick).toHaveBeenCalled();
    });

    it("opens room pinned messages on button click", () => {
        const { getByText } = getComponent();

        fireEvent.click(getByText("Pinned messages"));

        expect(vmDefaultValues.onRoomPinsClick).toHaveBeenCalled();
    });

    it("does not render irrelevant options if video room", () => {
        mocked(useRoomSummaryCardViewModel).mockReturnValue({
            ...vmDefaultValues,
            isVideoRoom: true,
        });
        const { queryByText } = getComponent();

        // options not rendered
        expect(queryByText("Files")).not.toBeInTheDocument();
        expect(queryByText("Pinned")).not.toBeInTheDocument();
        expect(queryByText("Export chat")).not.toBeInTheDocument();
    });

    describe("pinning", () => {
        it("renders pins options", () => {
            const { getByText } = getComponent();

            expect(getByText("Pinned messages")).toBeInTheDocument();
        });
    });

    describe("poll history", () => {
        it("renders poll history option", () => {
            const { getByText } = getComponent();

            expect(getByText("Polls")).toBeInTheDocument();
        });

        it("opens poll history dialog on button click", () => {
            const permalinkCreator = new RoomPermalinkCreator(room);
            const { getByText } = getComponent({ permalinkCreator });

            fireEvent.click(getByText("Polls"));

            expect(vmDefaultValues.onRoomPollHistoryClick).toHaveBeenCalled();
        });
    });

    describe("public room label", () => {
        it("does not show public room label for a DM", async () => {
            mocked(useRoomSummaryCardViewModel).mockReturnValue({
                ...vmDefaultValues,
                isDirectMessage: true,
            });

            getComponent();

            await flushPromises();

            expect(screen.queryByText("Public room")).not.toBeInTheDocument();
        });

        it("does not show public room label for non public room", async () => {
            mocked(useRoomSummaryCardViewModel).mockReturnValue({
                ...vmDefaultValues,
                isDirectMessage: false,
                roomJoinRule: JoinRule.Invite,
            });
            getComponent();

            await flushPromises();

            expect(screen.queryByText("Public room")).not.toBeInTheDocument();
        });

        it("shows a public room label for a public room", async () => {
            getComponent();

            await flushPromises();

            expect(screen.queryByText("Public group")).toBeInTheDocument();
        });
    });
});
