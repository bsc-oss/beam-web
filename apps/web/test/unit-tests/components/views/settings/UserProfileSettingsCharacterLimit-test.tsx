/*
Copyright 2026 Belgian Secure Communications (BSC)

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { render, screen } from "jest-matrix-react";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@vector-im/compound-web";
import { ToastContext, type ToastRack } from "@element-hq/web-shared-components";

import UserProfileSettings, {
    PROFILE_FIELD_MAX_LENGTH,
} from "../../../../../src/components/views/settings/UserProfileSettings";
import { PROFILE_FIELD_MAX_RAW_LENGTH } from "../../../../../src/components/views/elements/PgCharacterLimit";
import { stubClient } from "../../../../test-utils";
import { OwnProfileStore } from "../../../../../src/stores/OwnProfileStore";
import MatrixClientContext from "../../../../../src/contexts/MatrixClientContext";

jest.mock("../../../../../src/components/views/settings/AvatarSetting", () => () => <div>Mocked AvatarSetting</div>);

jest.mock("../../../../../src/dispatcher/dispatcher", () => ({
    dispatch: jest.fn(),
    register: jest.fn(),
}));

/**
 * PG_CHANGED: integration test of the soft character limit with the real `EditInPlace`
 * (the main `UserProfileSettings-test.tsx` mocks it). Verifies that the form itself refuses
 * to submit an overlong value, both via the save button and via the Enter key, and that
 * the value is never truncated.
 */
describe("UserProfileSettings character limit", () => {
    let client: MatrixClient;

    const renderProfileSettings = () =>
        render(
            <TooltipProvider>
                <MatrixClientContext.Provider value={client}>
                    <ToastContext.Provider
                        value={{ displayToast: jest.fn().mockReturnValue(jest.fn()) } as unknown as ToastRack}
                    >
                        <UserProfileSettings canSetAvatar={true} canSetDisplayName={true} />
                    </ToastContext.Provider>
                </MatrixClientContext.Provider>
            </TooltipProvider>,
        );

    beforeEach(() => {
        client = stubClient();
        jest.spyOn(OwnProfileStore.instance, "displayName", "get").mockReturnValue("Alice");
        jest.spyOn(OwnProfileStore.instance, "function", "get").mockReturnValue("Analyst");
    });

    it("blocks saving an overlong display name via the save button, then saves once shortened", async () => {
        const user = userEvent.setup();
        renderProfileSettings();

        const input = screen.getByLabelText("Display Name");
        const tooLong = "x".repeat(PROFILE_FIELD_MAX_LENGTH + 4);
        await user.clear(input);
        await user.type(input, tooLong);

        // Not hard-capped: the full value is kept so it can be edited down
        expect(input).toHaveValue(tooLong);
        expect(input).toBeInvalid();
        expect(screen.getByText("4 characters over the limit")).toBeInTheDocument();
        // The error replaces the counter
        expect(screen.queryByText(/characters$/)).not.toBeInTheDocument();

        // The save button is disabled while over the limit
        const saveButton = screen.getByRole("button", { name: "Save" });
        expect(saveButton).toHaveAttribute("aria-disabled", "true");
        await user.click(saveButton);
        expect(client.setDisplayName).not.toHaveBeenCalled();
        expect(input).toHaveValue(tooLong);

        // Remove the surplus characters and save again
        await user.type(input, "{backspace}{backspace}{backspace}{backspace}");
        expect(screen.queryByText(/over the limit/)).not.toBeInTheDocument();
        expect(
            screen.getByText(`${PROFILE_FIELD_MAX_LENGTH}/${PROFILE_FIELD_MAX_LENGTH} characters`),
        ).toBeInTheDocument();
        expect(input).toBeValid();
        expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("aria-disabled", "false");

        await user.click(screen.getByRole("button", { name: "Save" }));
        expect(client.setDisplayName).toHaveBeenCalledWith("x".repeat(PROFILE_FIELD_MAX_LENGTH));
    });

    it("counts an emoji as one character, like the backend, and saves it", async () => {
        const user = userEvent.setup();
        renderProfileSettings();

        const input = screen.getByLabelText("Display Name");
        // 49 letters + a thumbs up: 51 UTF-16 code units, but exactly 50 characters
        const nameWithEmoji = "x".repeat(PROFILE_FIELD_MAX_LENGTH - 1) + "\u{1F44D}";
        await user.clear(input);
        await user.click(input);
        await user.paste(nameWithEmoji);

        expect(input).toHaveValue(nameWithEmoji);
        expect(input).toBeValid();
        expect(screen.queryByText(/over the limit/)).not.toBeInTheDocument();
        expect(
            screen.getByText(`${PROFILE_FIELD_MAX_LENGTH}/${PROFILE_FIELD_MAX_LENGTH} characters`),
        ).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Save" }));
        expect(client.setDisplayName).toHaveBeenCalledWith(nameWithEmoji);
    });

    it("blocks saving a value over the raw UTF-16 cap even when it is a single character", async () => {
        const user = userEvent.setup();
        renderProfileSettings();

        const input = screen.getByLabelText("Display Name");
        // A letter with 256 stacked combining marks is 1 character, but 257 UTF-16 code units
        const stackedCombiningMarks = "a" + "\u0301".repeat(PROFILE_FIELD_MAX_RAW_LENGTH);
        await user.clear(input);
        await user.click(input);
        await user.paste(stackedCombiningMarks);

        expect(input).toHaveValue(stackedCombiningMarks);
        expect(input).toBeInvalid();
        expect(screen.getByText("This value is too long")).toBeInTheDocument();
        expect(screen.queryByText(/over the limit/)).not.toBeInTheDocument();

        const saveButton = screen.getByRole("button", { name: "Save" });
        expect(saveButton).toHaveAttribute("aria-disabled", "true");
        await user.click(saveButton);
        expect(client.setDisplayName).not.toHaveBeenCalled();
    });

    it("blocks saving an overlong display name via the Enter key", async () => {
        const user = userEvent.setup();
        renderProfileSettings();

        const input = screen.getByLabelText("Display Name");
        await user.clear(input);
        await user.type(input, "x".repeat(PROFILE_FIELD_MAX_LENGTH + 1));
        await user.keyboard("{Enter}");

        expect(client.setDisplayName).not.toHaveBeenCalled();
        expect(screen.getByText("1 character over the limit")).toBeInTheDocument();
    });

    it("blocks saving an overlong role and shows the counter near the limit", async () => {
        const user = userEvent.setup();
        renderProfileSettings();

        const input = screen.getByLabelText("Role");
        await user.clear(input);
        await user.type(input, "y".repeat(PROFILE_FIELD_MAX_LENGTH - 10));
        expect(
            screen.getByText(`${PROFILE_FIELD_MAX_LENGTH - 10}/${PROFILE_FIELD_MAX_LENGTH} characters`),
        ).toBeInTheDocument();
        expect(input).toBeValid();

        await user.type(input, "y".repeat(12));
        expect(input).toBeInvalid();
        expect(screen.getByText("2 characters over the limit")).toBeInTheDocument();

        const saveButton = screen.getByRole("button", { name: "Save" });
        expect(saveButton).toHaveAttribute("aria-disabled", "true");
        await user.click(saveButton);
        expect(client.setFunction).not.toHaveBeenCalled();
    });
});
