/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-04-30
*/

import { getByLabelText, render, type RenderResult } from "jest-matrix-react";
import userEvent from "@testing-library/user-event";
import React, { type ComponentProps } from "react";

import { EventTileThreadToolbar } from "../../../../../../src/components/views/rooms/EventTile/EventTileThreadToolbar";

describe("EventTileThreadToolbar", () => {
    const viewInRoom = jest.fn();
    const copyLink = jest.fn();

    function renderComponent(props: Partial<ComponentProps<typeof EventTileThreadToolbar>> = {}): RenderResult {
        return render(<EventTileThreadToolbar viewInRoom={viewInRoom} copyLinkToThread={copyLink} {...props} />);
    }

    afterEach(() => {
        jest.resetAllMocks();
    });

    it("renders", () => {
        const { asFragment } = renderComponent();
        expect(asFragment()).toMatchSnapshot();
    });

    it("calls the right callbacks", async () => {
        const { container } = renderComponent();

        const copyBtn = getByLabelText(container, "Copy link to subchat");
        const viewInRoomBtn = getByLabelText(container, "View in group");

        await userEvent.click(copyBtn);
        expect(copyLink).toHaveBeenCalledTimes(1);

        await userEvent.click(viewInRoomBtn);
        expect(viewInRoom).toHaveBeenCalledTimes(1);
    });
});
