/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-02-06
*/

import React from "react";
import { Room } from "matrix-js-sdk/src/matrix";
import { fireEvent, render, screen, waitFor } from "jest-matrix-react";
import userEvent from "@testing-library/user-event";
import { LinkedTextContext } from "@element-hq/web-shared-components";

import { mkEvent, stubClient } from "../../../../test-utils";
import { MatrixClientPeg } from "../../../../../src/MatrixClientPeg";
import RoomTopic from "../../../../../src/components/views/elements/RoomTopic";
import dis from "../../../../../src/dispatcher/dispatcher";
import { Action } from "../../../../../src/dispatcher/actions";
import Modal from "../../../../../src/Modal";
// PG_CHANGED
import ConfirmLinkDialog from "../../../../../src/components/views/dialogs/PGConfirmLinkDialog";
import { permalinkPrefix } from "../../../../../src/utils/permalinks/MatrixToPermalinkConstructor";
import { type ActionPayload } from "../../../../../src/dispatcher/payloads";
import MatrixClientContext from "../../../../../src/contexts/MatrixClientContext";

jest.mock("../../../../../src/dispatcher/dispatcher");
// PG_CHANGED: mock Modal for ConfirmLinkDialog tests
jest.mock("../../../../../src/Modal", () => ({
    createDialog: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    ModalManagerEvent: { Opened: "opened" },
}));

describe("<RoomTopic/>", () => {
    const originalHref = window.location.href;
    // PG_CHANGED: add spy for window.open to verify external link opening
    let windowOpenSpy: jest.SpyInstance;

    beforeEach(() => {
        // PG_CHANGED: setup window.open spy and Modal mock for ConfirmLinkDialog
        windowOpenSpy = jest.spyOn(window, "open").mockImplementation(() => null);
        (Modal.createDialog as jest.Mock).mockReturnValue({
            finished: Promise.resolve([false]),
        });
        jest.clearAllMocks();
    });

    afterEach(() => {
        window.location.href = originalHref;
        // PG_CHANGED: restore window.open spy
        windowOpenSpy.mockRestore();
    });

    /**
     * Create a room with the given topic
     * @param topic
     */
    function createRoom(topic: string) {
        stubClient();
        const room = new Room("!pMBteVpcoJRdCJxDmn:matrix.org", MatrixClientPeg.safeGet(), "@alice:example.org");
        const topicEvent = mkEvent({
            type: "m.room.topic",
            room: "!pMBteVpcoJRdCJxDmn:matrix.org",
            user: "@alice:example.org",
            content: { topic },
            ts: 123,
            event: true,
        });
        room.addLiveEvents([topicEvent], { addToState: true });

        return room;
    }

    /**
     * Create a room and render it
     * @param topic
     */
    const renderRoom = (topic: string) => {
        const room = createRoom(topic);
        render(<RoomTopic room={room} />, {
            wrapper: ({ children }) => <LinkedTextContext.Provider value={{}}>{children}</LinkedTextContext.Provider>,
        });
    };

    /**
     * Create a room and click on the given text
     * @param topic
     * @param clickText
     */
    function runClickTest(topic: string, clickText: string) {
        renderRoom(topic);
        fireEvent.click(screen.getByText(clickText));
    }

    it("should capture permalink clicks", () => {
        // PG_CHANGED: use permalinkPrefix instead of hardcoded "matrix.to" URL
        const permalink = `${permalinkPrefix}!pMBteVpcoJRdCJxDmn:matrix.org/$K4Kg0fL-GKpW1EQ6lS36bP4eUXadWJFkdK_FH73Df8A?via=matrix.org`;
        const expectedHref =
            "http://localhost/#/room/!pMBteVpcoJRdCJxDmn:matrix.org/$K4Kg0fL-GKpW1EQ6lS36bP4eUXadWJFkdK_FH73Df8A?via=matrix.org";
        runClickTest(`... ${permalink} ...`, permalink);
        expect(window.location.href).toEqual(expectedHref);
        expect(dis.fire).toHaveBeenCalledTimes(0);
    });

    // PG_CHANGED: add tests for ConfirmLinkDialog on external links
    it("should show confirm dialog for external links", async () => {
        const link = "https://matrix.org";
        (Modal.createDialog as jest.Mock).mockReturnValue({
            finished: Promise.resolve([false]),
        });

        renderRoom(`... ${link} ...`);
        fireEvent.click(screen.getByRole("link", { name: link }));

        expect(Modal.createDialog).toHaveBeenCalledWith(ConfirmLinkDialog, {
            url: expect.stringContaining("matrix.org"),
            displayedText: link,
            isSuspicious: false,
        });
        expect(window.location.href).toEqual(originalHref);
        expect(dis.fire).toHaveBeenCalledTimes(0);
    });

    // PG_CHANGED: test that external link opens when user confirms
    it("should open external link when user confirms the dialog", async () => {
        const link = "https://matrix.org";
        (Modal.createDialog as jest.Mock).mockReturnValue({
            finished: Promise.resolve([true]),
        });

        renderRoom(`... ${link} ...`);
        fireEvent.click(screen.getByRole("link", { name: link }));

        await waitFor(() => {
            expect(windowOpenSpy).toHaveBeenCalledWith(
                expect.stringContaining("matrix.org"),
                "_blank",
                "noopener,noreferrer",
            );
        });
    });

    // PG_CHANGED: test that external link does not open when user cancels
    it("should not open external link when user cancels the dialog", async () => {
        const link = "https://matrix.org";
        (Modal.createDialog as jest.Mock).mockReturnValue({
            finished: Promise.resolve([false]),
        });

        renderRoom(`... ${link} ...`);
        fireEvent.click(screen.getByRole("link", { name: link }));

        await waitFor(() => {
            expect(Modal.createDialog).toHaveBeenCalled();
        });
        expect(windowOpenSpy).not.toHaveBeenCalled();
    });

    it("should open topic dialog when not clicking a link", () => {
        const topic = "foobar";
        const expectedHref = originalHref;
        runClickTest(topic, topic);
        expect(window.location.href).toEqual(expectedHref);
        expect(dis.fire).toHaveBeenCalledWith(Action.ShowRoomTopic);
    });

    describe("the edit topic button in the topic dialog", () => {
        /**
         * Render the topic, open the topic dialog and render its contents, so the
         * "Edit topic" button can be clicked.
         * @param isSpaceRoom whether the room should report itself as a space
         */
        function renderTopicDialog(isSpaceRoom: boolean) {
            const room = createRoom("a topic");
            jest.spyOn(room, "isSpaceRoom").mockReturnValue(isSpaceRoom);
            jest.spyOn(room.currentState, "maySendStateEvent").mockReturnValue(true);

            const createDialog = jest
                .spyOn(Modal, "createDialog")
                .mockReturnValue({ close: jest.fn() } as unknown as ReturnType<typeof Modal.createDialog>);

            render(<RoomTopic room={room} />, {
                wrapper: ({ children }) => (
                    <MatrixClientContext.Provider value={MatrixClientPeg.safeGet()}>
                        <LinkedTextContext.Provider value={{}}>{children}</LinkedTextContext.Provider>
                    </MatrixClientContext.Provider>
                ),
            });

            // The dispatcher is mocked for this suite, so drive the registered handler directly
            // instead of firing Action.ShowRoomTopic through it.
            const handler = jest.mocked(dis.register).mock.calls.at(-1)![0] as (payload: ActionPayload) => void;
            handler({ action: Action.ShowRoomTopic });

            const { description } = createDialog.mock.calls.at(-1)![1] as { description: React.ReactNode };
            render(
                <LinkedTextContext.Provider value={{}}>
                    <>{description}</>
                </LinkedTextContext.Provider>,
            );

            return room;
        }

        it("opens space settings for a space", () => {
            const room = renderTopicDialog(true);

            fireEvent.click(screen.getByRole("button", { name: "Edit topic" }));

            expect(dis.dispatch).toHaveBeenCalledWith({ action: Action.OpenSpaceSettings, space: room });
            expect(dis.dispatch).not.toHaveBeenCalledWith({ action: "open_room_settings" });
        });

        it("opens room settings for a room", () => {
            renderTopicDialog(false);

            fireEvent.click(screen.getByRole("button", { name: "Edit topic" }));

            expect(dis.dispatch).toHaveBeenCalledWith({ action: "open_room_settings" });
        });
    });

    it("should open the tooltip when hovering a text", async () => {
        const topic = "room topic";
        renderRoom(topic);
        await userEvent.hover(screen.getByText(topic));
        await waitFor(() => expect(screen.getByRole("tooltip", { name: "Click to read topic" })).toBeInTheDocument());
    });

    it("should not open the tooltip when hovering a link", async () => {
        const topic = "https://matrix.org";
        renderRoom(topic);
        await userEvent.hover(screen.getByRole("link", { name: topic }));
        await waitFor(() => expect(screen.queryByRole("tooltip", { name: "Click to read topic" })).toBeNull());
    });
});
