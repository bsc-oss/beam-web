/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2024 New Vector Ltd.
Copyright 2024 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-04-30
*/

import React, { type ChangeEvent, type ReactNode } from "react";
import { act, render, screen } from "jest-matrix-react";
import { type MatrixClient, type UploadResponse } from "matrix-js-sdk/src/matrix";
import { mocked } from "jest-mock";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@vector-im/compound-web";
import { ToastContext, type ToastRack } from "@element-hq/web-shared-components";

import UserProfileSettings from "../../../../../src/components/views/settings/UserProfileSettings";
import { mkStubRoom, stubClient } from "../../../../test-utils";
import { OwnProfileStore } from "../../../../../src/stores/OwnProfileStore";
import MatrixClientContext from "../../../../../src/contexts/MatrixClientContext";
import Modal from "../../../../../src/Modal";

interface MockedAvatarSettingProps {
    removeAvatar: () => void;
    onChange: (file: File) => void;
}

let removeAvatarFn: () => void;
let changeAvatarFn: (file: File) => void;

jest.mock(
    "../../../../../src/components/views/settings/AvatarSetting",
    () =>
        (({ removeAvatar, onChange }) => {
            removeAvatarFn = removeAvatar;
            changeAvatarFn = onChange;
            return <div>Mocked AvatarSetting</div>;
        }) as React.FC<MockedAvatarSettingProps>,
);

jest.mock("../../../../../src/dispatcher/dispatcher", () => ({
    dispatch: jest.fn(),
    register: jest.fn(),
}));

let editInPlaceOnChange: (e: ChangeEvent<HTMLInputElement>) => void;
let editInPlaceOnSave: () => Promise<void>;
let editInPlaceOnCancel: () => void;
// PG_CHANGED: callbacks of the second (role/function) EditInPlace
let functionEditInPlaceOnChange: (e: ChangeEvent<HTMLInputElement>) => void;
let functionEditInPlaceOnSave: () => Promise<void>;

interface MockedEditInPlaceProps {
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onSave: () => Promise<void>;
    onCancel: () => void;
    value: string;
    className?: string;
    serverInvalid?: boolean;
    saveDisabled?: boolean;
    children?: ReactNode;
}

jest.mock("@vector-im/compound-web", () => {
    const compound = jest.requireActual("@vector-im/compound-web");
    return {
        __esModule: true,
        ...compound,
        EditInPlace: (({ onChange, onSave, onCancel, value, className, serverInvalid, saveDisabled, children }) => {
            // PG_CHANGED: capture the callbacks of each EditInPlace separately: the fork added a second one for
            // the function/role field, which would otherwise overwrite the display name callbacks.
            if (className?.includes("displayName")) {
                editInPlaceOnChange = onChange;
                editInPlaceOnSave = onSave;
                editInPlaceOnCancel = onCancel;
            } else if (className?.includes("function")) {
                functionEditInPlaceOnChange = onChange;
                functionEditInPlaceOnSave = onSave;
            }
            // PG_CHANGED: render the children (validation messages) inside a Radix form so that
            // compound's ErrorMessage/HelpMessage can be rendered.
            return (
                <compound.Form.Root>
                    <compound.Form.Field name="input" serverInvalid={serverInvalid}>
                        <div data-testid={className} data-invalid={serverInvalid} data-save-disabled={saveDisabled}>
                            Mocked EditInPlace: {value}
                        </div>
                        {children}
                    </compound.Form.Field>
                </compound.Form.Root>
            );
        }) as React.FC<MockedEditInPlaceProps>,
    };
});

const renderProfileSettings = (toastRack: Partial<ToastRack>, client: MatrixClient) => {
    return render(
        <TooltipProvider>
            <MatrixClientContext.Provider value={client}>
                <ToastContext.Provider value={toastRack as ToastRack}>
                    <UserProfileSettings canSetAvatar={true} canSetDisplayName={true} />
                </ToastContext.Provider>
            </MatrixClientContext.Provider>
        </TooltipProvider>,
    );
};

describe("ProfileSettings", () => {
    let client: MatrixClient;
    let toastRack: Partial<ToastRack>;

    beforeEach(() => {
        client = stubClient();
        toastRack = {
            displayToast: jest.fn().mockReturnValue(jest.fn()),
        };
    });

    it("removes avatar", async () => {
        jest.spyOn(OwnProfileStore.instance, "avatarMxc", "get").mockReturnValue("mxc://example.org/my-avatar");
        renderProfileSettings(toastRack, client);

        expect(await screen.findByText("Mocked AvatarSetting")).toBeInTheDocument();
        expect(removeAvatarFn).toBeDefined();

        act(() => {
            removeAvatarFn();
        });

        expect(client.setAvatarUrl).toHaveBeenCalledWith("");
    });

    it("changes avatar", async () => {
        renderProfileSettings(toastRack, client);

        expect(await screen.findByText("Mocked AvatarSetting")).toBeInTheDocument();
        expect(changeAvatarFn).toBeDefined();

        const returnedMxcUri = "mxc://example.org/my-avatar";
        mocked(client).uploadContent.mockResolvedValue({ content_uri: returnedMxcUri });

        const fileSentinel = {};
        await act(async () => {
            await changeAvatarFn(fileSentinel as File);
        });

        expect(client.uploadContent).toHaveBeenCalledWith(fileSentinel);
        expect(client.setAvatarUrl).toHaveBeenCalledWith(returnedMxcUri);
    });

    it("displays toast while uploading avatar", async () => {
        renderProfileSettings(toastRack, client);

        const clearToastFn = jest.fn();
        mocked(toastRack.displayToast!).mockReturnValue(clearToastFn);

        expect(await screen.findByText("Mocked AvatarSetting")).toBeInTheDocument();
        expect(changeAvatarFn).toBeDefined();

        let resolveUploadPromise = (r: UploadResponse) => {};
        const uploadPromise = new Promise<UploadResponse>((r) => {
            resolveUploadPromise = r;
        });
        mocked(client).uploadContent.mockReturnValue(uploadPromise);

        const fileSentinel = {};
        const changeAvatarActPromise = act(async () => {
            await changeAvatarFn(fileSentinel as File);
        });

        expect(toastRack.displayToast).toHaveBeenCalled();

        act(() => {
            resolveUploadPromise({ content_uri: "bloop" });
        });
        await changeAvatarActPromise;

        expect(clearToastFn).toHaveBeenCalled();
    });

    it("changes display name", async () => {
        jest.spyOn(OwnProfileStore.instance, "displayName", "get").mockReturnValue("Alice");

        renderProfileSettings(toastRack, client);

        expect(await screen.findByText("Mocked EditInPlace: Alice")).toBeInTheDocument();
        expect(editInPlaceOnSave).toBeDefined();

        act(() => {
            editInPlaceOnChange({
                target: { value: "The Value" } as HTMLInputElement,
            } as ChangeEvent<HTMLInputElement>);
        });

        await act(async () => {
            await editInPlaceOnSave();
        });

        expect(client.setDisplayName).toHaveBeenCalledWith("The Value");
    });

    it("displays error if changing display name fails", async () => {
        jest.spyOn(OwnProfileStore.instance, "displayName", "get").mockReturnValue("Alice");
        mocked(client).setDisplayName.mockRejectedValue(new Error("Failed to set display name"));

        renderProfileSettings(toastRack, client);

        expect(editInPlaceOnSave).toBeDefined();

        act(() => {
            editInPlaceOnChange({
                target: { value: "Not Alice any more" } as HTMLInputElement,
            } as ChangeEvent<HTMLInputElement>);
        });

        await act(async () => {
            await expect(editInPlaceOnSave()).rejects.toEqual(expect.any(Error));
        });
    });

    // PG_CHANGED: soft character limit on display name and role
    describe("character limit", () => {
        const setDisplayNameValue = (value: string) =>
            act(() => {
                editInPlaceOnChange({ target: { value } as HTMLInputElement } as ChangeEvent<HTMLInputElement>);
            });
        const setFunctionValue = (value: string) =>
            act(() => {
                functionEditInPlaceOnChange({
                    target: { value } as HTMLInputElement,
                } as ChangeEvent<HTMLInputElement>);
            });

        beforeEach(() => {
            jest.spyOn(OwnProfileStore.instance, "displayName", "get").mockReturnValue("Alice");
            jest.spyOn(OwnProfileStore.instance, "function", "get").mockReturnValue("Analyst");
        });

        it("does not show a counter while well within the limit", async () => {
            renderProfileSettings(toastRack, client);
            expect(await screen.findByText("Mocked EditInPlace: Alice")).toBeInTheDocument();

            setDisplayNameValue("a".repeat(39));

            expect(screen.queryByText(/\/50 characters/)).not.toBeInTheDocument();
        });

        it("shows a counter when nearing the display name limit", async () => {
            renderProfileSettings(toastRack, client);
            expect(await screen.findByText("Mocked EditInPlace: Alice")).toBeInTheDocument();

            setDisplayNameValue("a".repeat(40));

            expect(screen.getByText("40/50 characters")).toBeInTheDocument();
            expect(screen.queryByText(/over the limit/)).not.toBeInTheDocument();
            const field = screen.getByTestId("mx_UserProfileSettings_profile_displayName");
            expect(field).toHaveAttribute("data-invalid", "false");
            expect(field).toHaveAttribute("data-save-disabled", "false");
        });

        it("lets the display name exceed the limit, marks it invalid and blocks saving", async () => {
            renderProfileSettings(toastRack, client);
            expect(await screen.findByText("Mocked EditInPlace: Alice")).toBeInTheDocument();

            const tooLong = "a".repeat(62);
            setDisplayNameValue(tooLong);

            // The value is kept in full so the user can edit it down
            expect(screen.getByText(`Mocked EditInPlace: ${tooLong}`)).toBeInTheDocument();
            // The error replaces the counter
            expect(screen.queryByText(/\/50 characters/)).not.toBeInTheDocument();
            expect(screen.getByText("12 characters over the limit")).toBeInTheDocument();
            const field = screen.getByTestId("mx_UserProfileSettings_profile_displayName");
            expect(field).toHaveAttribute("data-invalid", "true");
            expect(field).toHaveAttribute("data-save-disabled", "true");

            await act(async () => {
                await expect(editInPlaceOnSave()).rejects.toEqual(expect.any(Error));
            });
            expect(client.setDisplayName).not.toHaveBeenCalled();
        });

        it("uses the singular form for a single character over the limit", async () => {
            renderProfileSettings(toastRack, client);
            expect(await screen.findByText("Mocked EditInPlace: Alice")).toBeInTheDocument();

            setDisplayNameValue("a".repeat(51));

            expect(screen.getByText("1 character over the limit")).toBeInTheDocument();
        });

        it("saves again once the display name is edited back under the limit", async () => {
            renderProfileSettings(toastRack, client);
            expect(await screen.findByText("Mocked EditInPlace: Alice")).toBeInTheDocument();

            setDisplayNameValue("a".repeat(55));
            expect(screen.getByText("5 characters over the limit")).toBeInTheDocument();

            setDisplayNameValue("a".repeat(50));
            expect(screen.queryByText(/over the limit/)).not.toBeInTheDocument();
            expect(screen.getByText("50/50 characters")).toBeInTheDocument();

            await act(async () => {
                await editInPlaceOnSave();
            });
            expect(client.setDisplayName).toHaveBeenCalledWith("a".repeat(50));
        });

        it("lets the role exceed the limit, marks it invalid and blocks saving", async () => {
            renderProfileSettings(toastRack, client);
            expect(await screen.findByText("Mocked EditInPlace: Analyst")).toBeInTheDocument();

            setFunctionValue("b".repeat(53));

            expect(screen.queryByText(/\/50 characters/)).not.toBeInTheDocument();
            expect(screen.getByText("3 characters over the limit")).toBeInTheDocument();
            const field = screen.getByTestId("mx_UserProfileSettings_profile_function");
            expect(field).toHaveAttribute("data-invalid", "true");
            expect(field).toHaveAttribute("data-save-disabled", "true");

            await act(async () => {
                await expect(functionEditInPlaceOnSave()).rejects.toEqual(expect.any(Error));
            });
            expect(client.setFunction).not.toHaveBeenCalled();
        });

        it("saves the role when within the limit", async () => {
            renderProfileSettings(toastRack, client);
            expect(await screen.findByText("Mocked EditInPlace: Analyst")).toBeInTheDocument();

            setFunctionValue("Senior Analyst");

            await act(async () => {
                await functionEditInPlaceOnSave();
            });
            expect(client.setFunction).toHaveBeenCalledWith("Senior Analyst");
        });
    });

    it("resets on cancel", async () => {
        jest.spyOn(OwnProfileStore.instance, "displayName", "get").mockReturnValue("Alice");

        renderProfileSettings(toastRack, client);

        expect(await screen.findByText("Mocked EditInPlace: Alice")).toBeInTheDocument();
        expect(editInPlaceOnChange).toBeDefined();
        expect(editInPlaceOnCancel).toBeDefined();

        act(() => {
            editInPlaceOnChange({
                target: { value: "Alicia Zattic" } as HTMLInputElement,
            } as ChangeEvent<HTMLInputElement>);
        });

        expect(await screen.findByText("Mocked EditInPlace: Alicia Zattic")).toBeInTheDocument();

        act(() => {
            editInPlaceOnCancel();
        });

        expect(await screen.findByText("Mocked EditInPlace: Alice")).toBeInTheDocument();
    });

    it("displays confirmation dialog if no rooms are encrypted", async () => {
        jest.spyOn(Modal, "createDialog");

        renderProfileSettings(toastRack, client);

        // PG_CHANGED: label changed from "Remove this device" to "Sign out"
        const signOutButton = await screen.findByText("Sign out");
        await userEvent.click(signOutButton);

        expect(Modal.createDialog).toHaveBeenCalled();
    });

    it("displays confirmation dialog if rooms are encrypted", async () => {
        jest.spyOn(Modal, "createDialog");

        const mockRoom = mkStubRoom("!test:room", "Test Room", client);
        client.getRooms = jest.fn().mockReturnValue([mockRoom]);
        client.getCrypto = jest.fn().mockReturnValue({
            isEncryptionEnabledInRoom: jest.fn().mockReturnValue(true),
            getUserDeviceInfo: jest.fn().mockResolvedValue(new Map()),
        });

        renderProfileSettings(toastRack, client);

        // PG_CHANGED: label changed from "Remove this device" to "Sign out"
        const signOutButton = await screen.findByText("Sign out");
        await userEvent.click(signOutButton);

        expect(Modal.createDialog).toHaveBeenCalled();
    });
});
