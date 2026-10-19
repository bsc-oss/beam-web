/*
 * Copyright 2024 New Vector Ltd.
 * Copyright 2024 The Matrix.org Foundation C.I.C.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { render, screen } from "jest-matrix-react";
import React, { type ComponentProps } from "react";
import userEvent from "@testing-library/user-event";
import { type Room, type RoomMember } from "matrix-js-sdk/src/matrix";

import { PowerLevelSelector } from "../../../../../src/components/views/settings/PowerLevelSelector";
import { stubClient } from "../../../../test-utils";
import MatrixClientContext from "../../../../../src/contexts/MatrixClientContext";

describe("PowerLevelSelector", () => {
    const matrixClient = stubClient();

    const currentUser = matrixClient.getUserId()!;
    const userLevels = {
        [currentUser]: 100,
        "@alice:server.org": 50,
        "@bob:server.org": 0,
    };

    // PG_CHANGED: the room is used to resolve the users' emails
    const mkRoom = (emails: Record<string, string> = {}, otherRoomEmails: Record<string, string> = {}): Room =>
        ({
            getMember: jest.fn((userId: string) =>
                emails[userId] ? ({ userId, email: emails[userId] } as unknown as RoomMember) : null,
            ),
            resolveRoomMemberFromOtherRooms: jest.fn((userId: string) =>
                otherRoomEmails[userId]
                    ? ({ userId, email: otherRoomEmails[userId] } as unknown as RoomMember)
                    : undefined,
            ),
        }) as unknown as Room;

    const renderPLS = (props: Partial<ComponentProps<typeof PowerLevelSelector>>) =>
        render(
            <MatrixClientContext.Provider value={matrixClient}>
                <PowerLevelSelector
                    room={mkRoom()}
                    userLevels={userLevels}
                    canChangeLevels={true}
                    currentUserLevel={userLevels[currentUser]}
                    title="title"
                    // filter nothing by default
                    filter={() => true}
                    onClick={jest.fn()}
                    {...props}
                >
                    empty label
                </PowerLevelSelector>
            </MatrixClientContext.Provider>,
        );

    it("should render", () => {
        renderPLS({});
        expect(screen.getByRole("group")).toMatchSnapshot();
    });

    it("should display only the current user", async () => {
        // Display only the current user
        renderPLS({ filter: (user) => user === currentUser });

        // Only alice should be displayed
        const userSelects = screen.getAllByRole("combobox");
        expect(userSelects).toHaveLength(1);
        expect(userSelects[0]).toHaveAccessibleName(currentUser);

        expect(screen.getByRole("group")).toMatchSnapshot();
    });

    it("should be able to change the power level of the current user", async () => {
        const onClick = jest.fn();
        const userLevels = {
            [currentUser]: 100,
            "@alice:server.org": 100,
            "@bob:server.org": 0,
        };
        renderPLS({ userLevels, onClick });

        // Until the power level is changed, the apply button should be disabled
        // compound button is using aria-disabled instead of the disabled attribute, we can't toBeDisabled on it
        expect(screen.getByRole("button", { name: "Apply" })).toHaveAttribute("aria-disabled", "true");

        const select = screen.getByRole("combobox", { name: currentUser });
        // Sanity check
        expect(select).toHaveValue("100");

        // Change current user power level to 50
        await userEvent.selectOptions(select, "50");
        expect(select).toHaveValue("50");
        // After the user level changes, the apply button should be enabled
        expect(screen.getByRole("button", { name: "Apply" })).toHaveAttribute("aria-disabled", "false");

        // Click on Apply should call onClick with the new power level
        await userEvent.click(screen.getByRole("button", { name: "Apply" }));
        expect(onClick).toHaveBeenCalledWith(50, currentUser);
    });

    it("should not be able to change the power level if `canChangeLevels` is false", async () => {
        renderPLS({ canChangeLevels: false });

        // The selects should be disabled
        const userSelects = screen.getAllByRole("combobox");
        userSelects.forEach((select) => expect(select).toBeDisabled());
    });

    it("should be able to change only the level of someone with a lower level", async () => {
        const userLevels = {
            [currentUser]: 50,
            "@alice:server.org": 100,
        };
        renderPLS({ userLevels });

        expect(screen.getByRole("combobox", { name: currentUser })).toBeEnabled();
        expect(screen.getByRole("combobox", { name: "@alice:server.org" })).toBeDisabled();
    });

    // PG_CHANGED: show the email of the users, with the mxId as fallback
    it("should display the email of the users with the user id as fallback", async () => {
        const room = mkRoom({ "@alice:server.org": "alice@server.org" }, { "@bob:server.org": "bob@server.org" });
        renderPLS({ room });

        // alice has an email in this room
        expect(screen.getByRole("combobox", { name: "alice@server.org" })).toBeInTheDocument();
        // bob is hidden in this room, his email is resolved from another room
        expect(screen.getByRole("combobox", { name: "bob@server.org" })).toBeInTheDocument();
        // the current user has no email anywhere, the user id is displayed
        expect(screen.getByRole("combobox", { name: currentUser })).toBeInTheDocument();
        expect(screen.queryByRole("combobox", { name: "@alice:server.org" })).not.toBeInTheDocument();
        expect(screen.queryByRole("combobox", { name: "@bob:server.org" })).not.toBeInTheDocument();
    });

    it("should display the children if there is no user to display", async () => {
        // No user to display
        renderPLS({ filter: () => false });

        expect(screen.getByText("empty label")).toBeInTheDocument();
    });

    it("should display modal warning if user is last admin", async () => {
        const onClick = jest.fn();

        renderPLS({ onClick });

        // Until the power level is changed, the apply button should be disabled
        // compound button is using aria-disabled instead of the disabled attribute, we can't toBeDisabled on it
        expect(screen.getByRole("button", { name: "Apply" })).toHaveAttribute("aria-disabled", "true");

        const select = screen.getByRole("combobox", { name: currentUser });
        // Sanity check
        expect(select).toHaveValue("100");

        // Change current user power level to 50
        await userEvent.selectOptions(select, "50");

        // modal should appear because only admin in the room
        expect(screen.findByText("WARNING")).toBeTruthy();

        await userEvent.click(screen.getByRole("button", { name: "Continue" }));

        expect(select).toHaveValue("50");
        // After the user level changes, the apply button should be enabled
        expect(screen.getByRole("button", { name: "Apply" })).toHaveAttribute("aria-disabled", "false");

        // Click on Apply should call onClick with the new power level
        await userEvent.click(screen.getByRole("button", { name: "Apply" }));
        expect(onClick).toHaveBeenCalledWith(50, currentUser);
    });

    it("should display modal warning if user is last admin and return to initial value if user cancel", async () => {
        const onClick = jest.fn();

        renderPLS({ onClick });

        // Until the power level is changed, the apply button should be disabled
        // compound button is using aria-disabled instead of the disabled attribute, we can't toBeDisabled on it
        expect(screen.getByRole("button", { name: "Apply" })).toHaveAttribute("aria-disabled", "true");

        const select = screen.getByRole("combobox", { name: currentUser });
        // Sanity check
        expect(select).toHaveValue("100");

        // Change current user power level to 50
        await userEvent.selectOptions(select, "50");

        // modal should appear because only admin in the room
        expect(screen.findByText("WARNING")).toBeTruthy();

        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
        // the power level should be back to initial value
        expect(select).toHaveValue("100");
    });
});
