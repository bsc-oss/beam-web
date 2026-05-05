/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-02-06
*/

// PG_CHANGED

import { cleanup, render, waitFor } from "jest-matrix-react";
import { act } from "react";
import { mocked, type MockedObject } from "jest-mock";
import fetchMock from "@fetch-mock/jest";
import React from "react";
import {
    ClientRendezvousFailureReason,
    MSC4108FailureReason,
    MSC4108SignInWithQR,
    RendezvousError,
    RendezvousIntent,
} from "matrix-js-sdk/src/rendezvous";
import { HTTPError, type MatrixClient } from "matrix-js-sdk/src/matrix";

import LoginWithQR, { LoginWithQRFailureReason } from "../../../../../../src/components/views/auth/LoginWithQR";
import { Click, Mode, Phase } from "../../../../../../src/components/views/auth/LoginWithQR-types";
import SdkConfig from "../../../../../../src/SdkConfig";

// Local helper types to avoid `as any`
 type FlowProps = {
     onClick: (type: Click, checkCode?: string) => Promise<void>;
     phase: Phase;
     userCode?: string;
     failureReason?: unknown;
 };
 
 type WithCheckCode = { checkCode?: string };
 
 type DeviceAuthGrant = Awaited<ReturnType<MSC4108SignInWithQR["deviceAuthorizationGrant"]>>;
 
 type ShareSecretsReturn = Awaited<ReturnType<MSC4108SignInWithQR["shareSecrets"]>>;
 type WhoamiClient = { whoami: () => Promise<{ user_id: string; device_id: string; is_guest: boolean }> };

jest.mock("matrix-js-sdk/src/rendezvous");
jest.mock("matrix-js-sdk/src/rendezvous/transports");
jest.mock("matrix-js-sdk/src/rendezvous/channels");

// PG OIDC utils and collaborators
jest.mock("../../../../../../src/utils/oidc/PGQrDeviceAuth", () => ({
    initiateQrDeviceAuth: jest.fn(),
}));

jest.mock("../../../../../../src/utils/oidc/PGPollDeviceToken", () => {
    class DeviceFlowTimeoutError extends Error { }
    class DeviceFlowAbortedError extends Error { }
    class DeviceFlowAuthorizationError extends Error {
        public errorCode?: string;
        constructor(errorCode?: string, message?: string) {
            super(message);
            this.errorCode = errorCode;
        }
    }
    return {
        pollDeviceToken: jest.fn(),
        DeviceFlowTimeoutError,
        DeviceFlowAbortedError,
        DeviceFlowAuthorizationError,
    };
});

jest.mock("../../../../../../src/utils/oidc/persistOidcSettings", () => ({
    persistOidcAuthenticatedSettings: jest.fn(),
}));

jest.mock("../../../../../../src/Lifecycle", () => ({
    setLoggedIn: jest.fn(),
    clearStorage: jest.fn(),
    loadSession: jest.fn(),
    logout: jest.fn(),
}));

jest.mock("../../../../../../src/utils/crypto/PGFinalizePostLoginCrypto", () => ({
    finalizePostLoginCrypto: jest.fn(),
}));

jest.mock("../../../../../../src/MatrixClientPeg", () => ({
    MatrixClientPeg: { safeGet: jest.fn().mockReturnValue({ setDeviceDetails: jest.fn() }) },
}));

jest.mock("../../../../../../src/dispatcher/dispatcher", () => ({
    __esModule: true,
    default: { dispatch: jest.fn() },
}));

jest.mock("../../../../../../src/utils/rendezvous/PGCancelWatcher", () => ({
    startRendezvousCancelWatcher: jest.fn().mockReturnValue({ stop: jest.fn() }),
}));

jest.mock("../../../../../../src/utils/navigation/PGPageLeaveGuard", () => ({
    startPageLeaveGuard: jest.fn().mockReturnValue({ stop: jest.fn() }),
}));

const mockedFlow = jest.fn();

jest.mock("../../../../../../src/components/views/auth/LoginWithQRFlow", () => (props: Record<string, any>) => {
    mockedFlow(props);
    return <div />;
});

function makeClient() {
    return mocked({
        getUser: jest.fn(),
        isGuest: jest.fn().mockReturnValue(false),
        isUserIgnored: jest.fn(),
        getUserId: jest.fn(),
        on: jest.fn(),
        isSynapseAdministrator: jest.fn().mockResolvedValue(false),
        isRoomEncrypted: jest.fn().mockReturnValue(false),
        mxcUrlToHttp: jest.fn().mockReturnValue("mock-mxcUrlToHttp"),
        doesServerSupportUnstableFeature: jest.fn().mockReturnValue(true),
        removeListener: jest.fn(),
        requestLoginToken: jest.fn(),
        currentState: {
            on: jest.fn(),
        },
        getClientWellKnown: jest.fn().mockReturnValue({}),
        getCrypto: jest.fn().mockReturnValue({}),
        baseUrl: "https://hs/",
        idBaseUrl: "https://id/",
    } as unknown as MatrixClient);
}

function unresolvedPromise<T>(): Promise<T> {
    return new Promise(() => { });
}

// Helper function to setup OIDC mocks with consistent patterns
function setupOidcMocks() {
    const { initiateQrDeviceAuth } = require("../../../../../../src/utils/oidc/PGQrDeviceAuth");
    const { pollDeviceToken } = require("../../../../../../src/utils/oidc/PGPollDeviceToken");
    const { persistOidcAuthenticatedSettings } = require("../../../../../../src/utils/oidc/persistOidcSettings");
    const Lifecycle = require("../../../../../../src/Lifecycle");
    const { finalizePostLoginCrypto } = require("../../../../../../src/utils/crypto/PGFinalizePostLoginCrypto");

    return {
        initiateQrDeviceAuth,
        pollDeviceToken,
        persistOidcAuthenticatedSettings,
        Lifecycle,
        finalizePostLoginCrypto,
    };
}

// Helper function to setup common device auth data
function createDeviceAuthData(userCode: string = TEST_USER_CODE) {
    return {
        authMeta: { issuer: MOCK_ISSUER },
        deviceAuthData: {
            usedClientId: "cid",
            device_code: "dcode",
            user_code: userCode,
            interval: 5,
            requestedDeviceId: "did:device:abc",
        },
    };
}

// Access matrix module for spying createClient
const matrixModule: any = jest.requireActual("matrix-js-sdk/src/matrix");

// Test constants to avoid magic values and improve maintainability
const TEST_CHECK_CODES = {
    VALID: "12",    // Represents a matching check code
    INVALID: "34",  // Represents a mismatched check code
    ALTERNATE: "00", // Used for error scenario tests
    OTHER: "77",    // Used for edge case tests
} as const;

const TEST_USER_CODE = "UC-123";
const MOCK_VERIFICATION_URI = "mock-verification-uri";
const MOCK_ISSUER = "https://issuer.example/";

describe("<LoginWithQR />", () => {
    let client!: MockedObject<MatrixClient>;
    const defaultProps = {
        legacy: true,
        mode: Mode.Reciprocate,
        onFinished: jest.fn(),
    };

    beforeEach(() => {
        mockedFlow.mockReset();
        jest.resetAllMocks();

        // Provide pg_service_url so fetchRendezvousUrl succeeds in Login mode
        SdkConfig.put({ pg_service_url: "https://mock-pg-service" } as any);
        fetchMock.get("https://mock-pg-service/homeserver/rendezvous-url", {
            url: "https://mock-rendezvous-server",
        });
        
        // Setup default mocks to prevent errors during component lifecycle
        jest.spyOn(MSC4108SignInWithQR.prototype, "cancel").mockResolvedValue(undefined);
        
        // Mock internal rendezvous session to avoid hitting implementation details
        const { MSC4108RendezvousSession } = require("matrix-js-sdk/src/rendezvous");
        jest.spyOn(MSC4108RendezvousSession.prototype, "send").mockResolvedValue(undefined as any);
        
        // Provide default successful responses for common methods
        jest
            .spyOn(MSC4108SignInWithQR.prototype, "deviceAuthorizationGrant")
            .mockResolvedValue({ verificationUri: MOCK_VERIFICATION_URI } as unknown as DeviceAuthGrant);
        jest
            .spyOn(MSC4108SignInWithQR.prototype, "shareSecrets")
            .mockResolvedValue({ secrets: {} } as unknown as ShareSecretsReturn);
        jest.spyOn(MSC4108SignInWithQR.prototype, "close").mockResolvedValue(undefined);
        
        // Mock browser APIs to avoid JSDOM limitations
        jest.spyOn(window, "open").mockImplementation(() => null);
        
        client = makeClient();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
        SdkConfig.reset();
        cleanup();
    });

    describe("MSC4108", () => {
        const getComponent = (props: { client: MatrixClient; onFinished?: (s: boolean) => void; mode?: Mode }) => (
            <LoginWithQR {...defaultProps} {...props} mode={props.mode ?? defaultProps.mode} />
        );

        /** Wait for the Intro phase, then click ShowQr to start the rendezvous flow (fire-and-forget). */
        async function triggerShowQr(): Promise<void> {
            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({ phase: Phase.Intro }),
                ),
            );
            const introCall = mockedFlow.mock.calls.find(
                (c: any[]) => (c[0] as FlowProps).phase === Phase.Intro,
            );
            const onClick = (introCall![0] as FlowProps).onClick;
            // Fire without awaiting - the async flow may have unresolved promises
            act(() => {
                void onClick(Click.ShowQr);
            });
        }

        test("render QR then back", async () => {
            const onFinished = jest.fn();
            jest.spyOn(MSC4108SignInWithQR.prototype, "negotiateProtocols").mockReturnValue(unresolvedPromise());
            render(getComponent({ client, onFinished }));
            await triggerShowQr();

            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({
                        phase: Phase.ShowingQR,
                        onClick: expect.any(Function),
                    }),
                ),
            );

            const rendezvous = mocked(MSC4108SignInWithQR).mock.instances[0];
            expect(rendezvous.generateCode).toHaveBeenCalled();
            expect(rendezvous.negotiateProtocols).toHaveBeenCalled();

            // back
            const onClick = (mockedFlow.mock.calls[0][0] as FlowProps).onClick;
            await act(async () => {
                await onClick(Click.Back);
            });
            expect(onFinished).toHaveBeenCalledWith(false);
            expect(rendezvous.cancel).toHaveBeenCalledWith(MSC4108FailureReason.UserCancelled);
        });

        test("failed to connect", async () => {
            render(getComponent({ client }));
            jest.spyOn(MSC4108SignInWithQR.prototype, "negotiateProtocols").mockResolvedValue({});
            jest.spyOn(MSC4108SignInWithQR.prototype, "deviceAuthorizationGrant").mockRejectedValue(
                new HTTPError("Internal Server Error", 500),
            );
            const fn = jest.spyOn(MSC4108SignInWithQR.prototype, "cancel");
            await triggerShowQr();
            await waitFor(() => expect(fn).toHaveBeenLastCalledWith(ClientRendezvousFailureReason.Unknown));
        });

        test("reciprocates login", async () => {
            jest.spyOn(global.window, "open");

            render(getComponent({ client }));
            jest.spyOn(MSC4108SignInWithQR.prototype, "negotiateProtocols").mockResolvedValue({});
            jest.spyOn(MSC4108SignInWithQR.prototype, "deviceAuthorizationGrant").mockResolvedValue({
                verificationUri: MOCK_VERIFICATION_URI,
            });
            jest
                .spyOn(MSC4108SignInWithQR.prototype, "shareSecrets")
                .mockResolvedValue({ secrets: {} } as unknown as ShareSecretsReturn);
            jest.spyOn(MSC4108SignInWithQR.prototype, "close").mockResolvedValue(undefined);
            await triggerShowQr();

            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({
                        phase: Phase.OutOfBandConfirmation,
                        onClick: expect.any(Function),
                    }),
                ),
            );

            const onClick = (mockedFlow.mock.calls[0][0] as FlowProps).onClick;
            await act(async () => {
                await onClick(Click.Approve);
            });

            await waitFor(() => expect(global.window.open).toHaveBeenCalledWith(MOCK_VERIFICATION_URI, "_blank"));
            await waitFor(() => expect(defaultProps.onFinished).toHaveBeenCalledWith(true));
        });

        test("handles errors during protocol negotiation", async () => {
            render(getComponent({ client }));
            jest.spyOn(MSC4108SignInWithQR.prototype, "cancel").mockResolvedValue();
            const err = new RendezvousError("Unknown Failure", MSC4108FailureReason.UnsupportedProtocol);
            // @ts-ignore work-around for lazy mocks
            err.code = MSC4108FailureReason.UnsupportedProtocol;
            jest.spyOn(MSC4108SignInWithQR.prototype, "negotiateProtocols").mockRejectedValue(err);
            await triggerShowQr();
            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({
                        phase: Phase.ShowingQR,
                    }),
                ),
            );

            await waitFor(() => {
                const rendezvous = mocked(MSC4108SignInWithQR).mock.instances[0];
                expect(rendezvous.cancel).toHaveBeenCalledWith(MSC4108FailureReason.UnsupportedProtocol);
            });
        });

        test("handles errors during reciprocation", async () => {
            render(getComponent({ client }));
            jest.spyOn(MSC4108SignInWithQR.prototype, "negotiateProtocols").mockResolvedValue({});
            jest.spyOn(MSC4108SignInWithQR.prototype, "deviceAuthorizationGrant").mockResolvedValue({});
            await triggerShowQr();
            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({
                        phase: Phase.OutOfBandConfirmation,
                        onClick: expect.any(Function),
                    }),
                ),
            );

            jest.spyOn(MSC4108SignInWithQR.prototype, "shareSecrets").mockRejectedValue(
                new HTTPError("Internal Server Error", 500),
            );
            const onClick = (mockedFlow.mock.calls[0][0] as FlowProps).onClick;
            await act(async () => {
                await onClick(Click.Approve);
            });

            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({
                        phase: Phase.Error,
                        failureReason: ClientRendezvousFailureReason.Unknown,
                    }),
                ),
            );
        });

        test("handles user cancelling during reciprocation", async () => {
            render(getComponent({ client }));
            jest.spyOn(MSC4108SignInWithQR.prototype, "negotiateProtocols").mockResolvedValue({});
            jest.spyOn(MSC4108SignInWithQR.prototype, "deviceAuthorizationGrant").mockResolvedValue({});
            await triggerShowQr();
            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({ phase: Phase.OutOfBandConfirmation, onClick: expect.any(Function) }),
                ),
            );

            jest.spyOn(MSC4108SignInWithQR.prototype, "cancel").mockResolvedValue();
            const flowProps = mockedFlow.mock.calls.find(
                (c) => (c[0] as FlowProps).phase === Phase.OutOfBandConfirmation,
            )?.[0] as FlowProps;
            const onClick = flowProps.onClick;
            await act(async () => {
                await onClick(Click.Cancel);
            });

            const rendezvous = mocked(MSC4108SignInWithQR).mock.instances[0];
            expect(rendezvous.cancel).toHaveBeenCalledWith(MSC4108FailureReason.UserCancelled);
        });

        // PG_CHANGED: new tests
        test("should decline login on existing device and finish false", async () => {
            render(getComponent({ client }));
            jest.spyOn(MSC4108SignInWithQR.prototype, "negotiateProtocols").mockResolvedValue({});
            await triggerShowQr();
            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({ phase: Phase.OutOfBandConfirmation, onClick: expect.any(Function) }),
                ),
            );

            const declineSpy = jest
                .spyOn(MSC4108SignInWithQR.prototype, "declineLoginOnExistingDevice")
                .mockResolvedValue(undefined);

            const onClick = (
                mockedFlow.mock.calls.find((c) => (c[0] as FlowProps).phase === Phase.OutOfBandConfirmation)![0] as FlowProps
            ).onClick;

            await act(async () => {
                await onClick(Click.Decline);
            });

            expect(declineSpy).toHaveBeenCalled();
            expect(defaultProps.onFinished).toHaveBeenCalledWith(false);
        });

        test("should show error when QR generation fails", async () => {
            jest.spyOn(MSC4108SignInWithQR.prototype, "generateCode").mockRejectedValue(new Error("no cam"));
            render(getComponent({ client }));
            await triggerShowQr();

            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({
                        phase: Phase.Error,
                        failureReason: ClientRendezvousFailureReason.HomeserverLacksSupport,
                    }),
                ),
            );
        });

        test("should complete login on a new device via OIDC", async () => {
            // Arrange initial QR + handshake
            jest.spyOn(MSC4108SignInWithQR.prototype, "negotiateProtocols").mockResolvedValue({});
            // shareSecrets & close are already mocked in beforeEach

            // Arrange OIDC helpers
            const { initiateQrDeviceAuth, pollDeviceToken, persistOidcAuthenticatedSettings, Lifecycle, finalizePostLoginCrypto } = setupOidcMocks();

            initiateQrDeviceAuth.mockResolvedValue(createDeviceAuthData());
            pollDeviceToken.mockResolvedValue({
                access_token: "AT",
                refresh_token: "RT",
                id_token: "IDT",
            });

            const whoami = jest.fn().mockResolvedValue({ user_id: "@u:hs", device_id: "DID", is_guest: false });
            jest.spyOn(matrixModule, "createClient").mockReturnValue({ whoami, setAccessToken: jest.fn(), baseUrl: "https://hs/", idBaseUrl: "https://id/" } as any);

            render(getComponent({ client, mode: Mode.Login }));
            await triggerShowQr();

            // Wait until OutOfBandConfirmation (check code prompt)
            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({ phase: Phase.OutOfBandConfirmation, onClick: expect.any(Function) }),
                ),
            );

            // Provide matching check code
            const rendezvous = mocked(MSC4108SignInWithQR).mock.instances[0] as unknown as MSC4108SignInWithQR & WithCheckCode;
            rendezvous.checkCode = TEST_CHECK_CODES.VALID;
            const onClick = (
                mockedFlow.mock.calls.find((c) => (c[0] as FlowProps).phase === Phase.OutOfBandConfirmation)![0] as FlowProps
            ).onClick;
            await act(async () => {
                await onClick(Click.Approve, TEST_CHECK_CODES.VALID);
            });

            // Ensure OIDC auth has started
            await waitFor(() => expect(initiateQrDeviceAuth).toHaveBeenCalled());

            // Should show user code at some point (phase may quickly advance)
            await waitFor(() => {
                const sawUserCode = mockedFlow.mock.calls.some((c) => c[0]?.userCode === TEST_USER_CODE);
                expect(sawUserCode).toBe(true);
            });

            // Expectations on collaborators
            expect(pollDeviceToken).toHaveBeenCalled();
            expect(matrixModule.createClient).toHaveBeenCalled();
            await waitFor(() => expect(Lifecycle.setLoggedIn).toHaveBeenCalled());
            await waitFor(() => expect(finalizePostLoginCrypto).toHaveBeenCalled());
            expect(persistOidcAuthenticatedSettings).toHaveBeenCalledWith("cid", MOCK_ISSUER, "IDT");
            expect(sessionStorage.getItem("pg_qr_login_secrets_imported")).toBe("true");
            await waitFor(() => expect(defaultProps.onFinished).toHaveBeenCalledWith(true));
        });

        test("should show check code mismatch when approval code is incorrect", async () => {
            jest.spyOn(MSC4108SignInWithQR.prototype, "negotiateProtocols").mockResolvedValue({});
            render(getComponent({ client, mode: Mode.Login }));
            await triggerShowQr();

            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({ phase: Phase.OutOfBandConfirmation, onClick: expect.any(Function) }),
                ),
            );

            const rendezvous = mocked(MSC4108SignInWithQR).mock.instances[0] as unknown as MSC4108SignInWithQR & WithCheckCode;
            rendezvous.checkCode = TEST_CHECK_CODES.INVALID;
            const onClick = (
                mockedFlow.mock.calls.find((c) => (c[0] as FlowProps).phase === Phase.OutOfBandConfirmation)![0] as FlowProps
            ).onClick;
            await act(async () => {
                await onClick(Click.Approve, TEST_CHECK_CODES.VALID);
            });

            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({ failureReason: LoginWithQRFailureReason.CheckCodeMismatch }),
                ),
            );
        });

        test("should map device flow timeout to Expired failure", async () => {
            jest.spyOn(MSC4108SignInWithQR.prototype, "negotiateProtocols").mockResolvedValue({});
            const { initiateQrDeviceAuth } = require("../../../../../../src/utils/oidc/PGQrDeviceAuth");
            const { pollDeviceToken, DeviceFlowTimeoutError } = require(
                "../../../../../../src/utils/oidc/PGPollDeviceToken",
            );
            initiateQrDeviceAuth.mockResolvedValue({
                authMeta: { issuer: "iss" },
                deviceAuthData: { usedClientId: "cid", device_code: "d", user_code: "u", interval: 1 },
            });
            pollDeviceToken.mockRejectedValue(new DeviceFlowTimeoutError());

            render(getComponent({ client, mode: Mode.Login }));
            await triggerShowQr();
            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({ phase: Phase.OutOfBandConfirmation, onClick: expect.any(Function) }),
                ),
            );

            const rendezvous = mocked(MSC4108SignInWithQR).mock.instances[0] as unknown as MSC4108SignInWithQR & WithCheckCode;
            rendezvous.checkCode = TEST_CHECK_CODES.ALTERNATE;
            await act(async () => {
                await (mockedFlow.mock.calls[0][0] as FlowProps).onClick(Click.Approve, TEST_CHECK_CODES.ALTERNATE);
            });

            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({ phase: Phase.Error, failureReason: ClientRendezvousFailureReason.Expired }),
                ),
            );
        });

        test("should map device flow aborted to UserCancelled failure", async () => {
            jest.spyOn(MSC4108SignInWithQR.prototype, "negotiateProtocols").mockResolvedValue({});
            const { initiateQrDeviceAuth } = require("../../../../../../src/utils/oidc/PGQrDeviceAuth");
            const { pollDeviceToken, DeviceFlowAbortedError } = require(
                "../../../../../../src/utils/oidc/PGPollDeviceToken",
            );
            initiateQrDeviceAuth.mockResolvedValue({
                authMeta: { issuer: "iss" },
                deviceAuthData: { usedClientId: "cid", device_code: "d", user_code: "u", interval: 1 },
            });
            pollDeviceToken.mockRejectedValue(new DeviceFlowAbortedError());

            render(getComponent({ client, mode: Mode.Login }));
            await triggerShowQr();
            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({ phase: Phase.OutOfBandConfirmation, onClick: expect.any(Function) }),
                ),
            );

            const rendezvous = mocked(MSC4108SignInWithQR).mock.instances[0] as unknown as MSC4108SignInWithQR & WithCheckCode;
            rendezvous.checkCode = TEST_CHECK_CODES.ALTERNATE;
            await act(async () => {
                await (mockedFlow.mock.calls[0][0] as FlowProps).onClick(Click.Approve, TEST_CHECK_CODES.ALTERNATE);
            });

            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({
                        phase: Phase.Error,
                        failureReason: MSC4108FailureReason.UserCancelled,
                    }),
                ),
            );
        });

        test("should map device flow authorization error to Unknown failure", async () => {
            jest.spyOn(MSC4108SignInWithQR.prototype, "negotiateProtocols").mockResolvedValue({});
            const { initiateQrDeviceAuth } = require("../../../../../../src/utils/oidc/PGQrDeviceAuth");
            const { pollDeviceToken, DeviceFlowAuthorizationError } = require(
                "../../../../../../src/utils/oidc/PGPollDeviceToken",
            );
            initiateQrDeviceAuth.mockResolvedValue({
                authMeta: { issuer: "iss" },
                deviceAuthData: { usedClientId: "cid", device_code: "d", user_code: "u", interval: 1 },
            });
            pollDeviceToken.mockRejectedValue(new DeviceFlowAuthorizationError("access_denied"));

            render(getComponent({ client, mode: Mode.Login }));
            await triggerShowQr();
            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({ phase: Phase.OutOfBandConfirmation, onClick: expect.any(Function) }),
                ),
            );

            const rendezvous = mocked(MSC4108SignInWithQR).mock.instances[0] as unknown as MSC4108SignInWithQR & WithCheckCode;
            rendezvous.checkCode = TEST_CHECK_CODES.ALTERNATE;
            await act(async () => {
                await (mockedFlow.mock.calls[0][0] as FlowProps).onClick(Click.Approve, TEST_CHECK_CODES.ALTERNATE);
            });

            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({
                        phase: Phase.Error,
                        failureReason: ClientRendezvousFailureReason.Unknown,
                    }),
                ),
            );
        });

        test("should not persist OIDC settings when id_token is missing", async () => {
            jest.spyOn(MSC4108SignInWithQR.prototype, "negotiateProtocols").mockResolvedValue({});
            const { initiateQrDeviceAuth, pollDeviceToken, persistOidcAuthenticatedSettings } = setupOidcMocks();

            initiateQrDeviceAuth.mockResolvedValue(createDeviceAuthData());
            pollDeviceToken.mockResolvedValue({ access_token: "AT", refresh_token: "RT" });

            const whoami = jest.fn().mockResolvedValue({ user_id: "@u:hs", device_id: "DID", is_guest: false });
            jest.spyOn(matrixModule, "createClient").mockReturnValue({ whoami, setAccessToken: jest.fn(), baseUrl: "https://hs/", idBaseUrl: "https://id/" } as any);

            render(getComponent({ client, mode: Mode.Login }));
            await triggerShowQr();
            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({ phase: Phase.OutOfBandConfirmation, onClick: expect.any(Function) }),
                ),
            );

            const rendezvous = mocked(MSC4108SignInWithQR).mock.instances[0] as unknown as MSC4108SignInWithQR & WithCheckCode;
            rendezvous.checkCode = TEST_CHECK_CODES.OTHER;
            await act(async () => {
                 await (mockedFlow.mock.calls[0][0] as FlowProps).onClick(Click.Approve, TEST_CHECK_CODES.OTHER);
            });

            await waitFor(() => expect(persistOidcAuthenticatedSettings).not.toHaveBeenCalled());
        });

        test("should not complete login when key exchange fails", async () => {
            jest.spyOn(MSC4108SignInWithQR.prototype, "negotiateProtocols").mockResolvedValue({});
            const { initiateQrDeviceAuth, pollDeviceToken, Lifecycle } = setupOidcMocks();

            initiateQrDeviceAuth.mockResolvedValue(createDeviceAuthData());
            pollDeviceToken.mockResolvedValue({
                access_token: "AT",
                refresh_token: "RT",
                id_token: "IDT",
            });

            const whoami = jest.fn().mockResolvedValue({ user_id: "@u:hs", device_id: "DID", is_guest: false });
            jest.spyOn(matrixModule, "createClient").mockReturnValue({ whoami, setAccessToken: jest.fn(), baseUrl: "https://hs/", idBaseUrl: "https://id/" } as any);

            // Mock shareSecrets to reject and simulate key exchange failure
            jest.spyOn(MSC4108SignInWithQR.prototype, "shareSecrets").mockRejectedValue(new Error("Key exchange failed"));

            render(getComponent({ client, mode: Mode.Login }));
            await triggerShowQr();

            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({ phase: Phase.OutOfBandConfirmation, onClick: expect.any(Function) }),
                ),
            );

            const rendezvous = mocked(MSC4108SignInWithQR).mock.instances[0] as unknown as MSC4108SignInWithQR & WithCheckCode;
            rendezvous.checkCode = TEST_CHECK_CODES.VALID;
            const onClick = (
                mockedFlow.mock.calls.find((c) => (c[0] as FlowProps).phase === Phase.OutOfBandConfirmation)![0] as FlowProps
            ).onClick;

            await act(async () => {
                await onClick(Click.Approve, TEST_CHECK_CODES.VALID);
            });

            // Wait for the flow to handle the error
            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({
                        phase: Phase.Error,
                        failureReason: ClientRendezvousFailureReason.Unknown,
                    }),
                ),
            );

            // User should not be logged in successfully
            expect(defaultProps.onFinished).not.toHaveBeenCalledWith(true);
            
            // Logout should be called on error
            await waitFor(() => expect(Lifecycle.logout).toHaveBeenCalled());
        });

        test("should return correct RendezvousIntent for Mode.Login", () => {
            const { container } = render(getComponent({ client, mode: Mode.Login }));
            const component = container.querySelector('div'); // LoginWithQRFlow renders a div
            expect(component).toBeInTheDocument();
            
            // Access component through LoginWithQRFlow mock calls to verify intent
            const flowProps = mockedFlow.mock.calls[0]?.[0];
            expect(flowProps?.rendezvousIntent).toBe(RendezvousIntent.LOGIN_ON_NEW_DEVICE);
        });

        test("should return correct RendezvousIntent for Mode.Reciprocate", () => {
            const { container } = render(getComponent({ client, mode: Mode.Reciprocate }));
            const component = container.querySelector('div'); // LoginWithQRFlow renders a div
            expect(component).toBeInTheDocument();
            
            // Access component through LoginWithQRFlow mock calls to verify intent
            const flowProps = mockedFlow.mock.calls[0]?.[0];
            expect(flowProps?.rendezvousIntent).toBe(RendezvousIntent.RECIPROCATE_LOGIN_ON_EXISTING_DEVICE);
        });

        test("should handle deviceAuthorizationGrant failure in Reciprocate mode", async () => {
            // Set up the mocks before rendering
            jest.spyOn(MSC4108SignInWithQR.prototype, "negotiateProtocols").mockResolvedValue({});
            const err = new RendezvousError("Device auth failed", MSC4108FailureReason.UnsupportedProtocol);
            // @ts-ignore work-around for lazy mocks
            err.code = MSC4108FailureReason.UnsupportedProtocol;
            jest.spyOn(MSC4108SignInWithQR.prototype, "deviceAuthorizationGrant").mockRejectedValue(err);
            const cancelSpy = jest.spyOn(MSC4108SignInWithQR.prototype, "cancel");

            render(getComponent({ client, mode: Mode.Reciprocate }));
            await triggerShowQr();

            // Wait for the error to be handled and cancel to be called
            await waitFor(() => expect(cancelSpy).toHaveBeenCalled());
            
            // Check that it was called with the expected failure reason
            expect(cancelSpy).toHaveBeenCalledWith(MSC4108FailureReason.UnsupportedProtocol);
        });

        test("should set verificationUri state in Reciprocate mode", async () => {
            const testVerificationUri = "https://auth.example.com/verify";
            render(getComponent({ client, mode: Mode.Reciprocate }));
            jest.spyOn(MSC4108SignInWithQR.prototype, "negotiateProtocols").mockResolvedValue({});
            jest.spyOn(MSC4108SignInWithQR.prototype, "deviceAuthorizationGrant").mockResolvedValue({
                verificationUri: testVerificationUri,
            });
            await triggerShowQr();

            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({
                        phase: Phase.OutOfBandConfirmation,
                    }),
                ),
            );

            // The component should pass the verification URI to the flow
            // In a real test, we'd verify this through component state, but since we're using mocks,
            // we verify that window.open would be called with the correct URI during approval
            const onClick = (mockedFlow.mock.calls[0][0] as FlowProps).onClick;
            jest.spyOn(global.window, "open");
            
            await act(async () => {
                await onClick(Click.Approve);
            });

            await waitFor(() => expect(global.window.open).toHaveBeenCalledWith(testVerificationUri, "_blank"));
        });

        test("should handle mode changes from Reciprocate to Login", async () => {
            const { rerender } = render(getComponent({ client, mode: Mode.Reciprocate }));

            // Start the flow to create the initial rendezvous
            await triggerShowQr();

            // Wait for initial rendezvous to be created
            await waitFor(() => expect(mocked(MSC4108SignInWithQR).mock.instances.length).toBe(1));

            const initialRendezvous = mocked(MSC4108SignInWithQR).mock.instances[0];
            const cancelSpy = jest.spyOn(initialRendezvous, "cancel");

            // Change mode to Login
            rerender(getComponent({ client, mode: Mode.Login }));

            // Should cancel the previous rendezvous and start a new one
            await waitFor(() => expect(cancelSpy).toHaveBeenCalledWith(MSC4108FailureReason.UserCancelled));
            
            // Should create a new rendezvous instance for the new mode
            await waitFor(() => expect(mocked(MSC4108SignInWithQR).mock.instances.length).toBeGreaterThan(1));
            
            // Should show the correct intent for the new mode
            const flowProps = mockedFlow.mock.calls[mockedFlow.mock.calls.length - 1]?.[0];
            expect(flowProps?.rendezvousIntent).toBe(RendezvousIntent.LOGIN_ON_NEW_DEVICE);
        });

        test("should handle mode changes from Login to Reciprocate", async () => {
            const { rerender } = render(getComponent({ client, mode: Mode.Login }));
            
            // Start the flow to create the initial rendezvous
            await triggerShowQr();

            // Wait for initial rendezvous to be created
            await waitFor(() => expect(mocked(MSC4108SignInWithQR).mock.instances.length).toBe(1));

            const initialRendezvous = mocked(MSC4108SignInWithQR).mock.instances[0];
            const cancelSpy = jest.spyOn(initialRendezvous, "cancel");

            // Change mode to Reciprocate
            rerender(getComponent({ client, mode: Mode.Reciprocate }));

            // Should cancel the previous rendezvous and start a new one
            await waitFor(() => expect(cancelSpy).toHaveBeenCalledWith(MSC4108FailureReason.UserCancelled));
            
            // Should create a new rendezvous instance for the new mode
            await waitFor(() => expect(mocked(MSC4108SignInWithQR).mock.instances.length).toBeGreaterThan(1));
            
            // Should show the correct intent for the new mode
            const flowProps = mockedFlow.mock.calls[mockedFlow.mock.calls.length - 1]?.[0];
            expect(flowProps?.rendezvousIntent).toBe(RendezvousIntent.RECIPROCATE_LOGIN_ON_EXISTING_DEVICE);
        });

        // NEW: Error handling during mode switching
        test("should handle errors during mode switching", async () => {
            const { rerender } = render(getComponent({ client, mode: Mode.Reciprocate }));

            // Start the flow to create the initial rendezvous
            await triggerShowQr();

            // Wait for initial setup
            await waitFor(() => expect(mocked(MSC4108SignInWithQR).mock.instances.length).toBe(1));

            const initialRendezvous = mocked(MSC4108SignInWithQR).mock.instances[0];
            // Make cancel throw an error to test error handling
            jest.spyOn(initialRendezvous, "cancel").mockRejectedValue(new Error("Cancel failed"));

            // Change mode - this should handle the cancel error gracefully
            rerender(getComponent({ client, mode: Mode.Login }));

            // Should still proceed to create new mode despite cancel error
            await waitFor(() => expect(mocked(MSC4108SignInWithQR).mock.instances.length).toBeGreaterThan(1));
        });

        test("should cleanup rendezvous on unmount", async () => {
            // Keep flow hanging at negotiateProtocols so cancel is only called on unmount
            jest.spyOn(MSC4108SignInWithQR.prototype, "negotiateProtocols").mockReturnValue(unresolvedPromise());
            const { unmount } = render(getComponent({ client }));
            await triggerShowQr();
            
            // Wait for ShowingQR to ensure state with rendezvous has been flushed
            await waitFor(() =>
                expect(mockedFlow).toHaveBeenCalledWith(
                    expect.objectContaining({ phase: Phase.ShowingQR }),
                ),
            );
            
            const rendezvous = mocked(MSC4108SignInWithQR).mock.instances[0];
            const cancelSpy = jest.spyOn(rendezvous, "cancel").mockResolvedValue(undefined);

            unmount();

            expect(cancelSpy).toHaveBeenCalledWith(MSC4108FailureReason.UserCancelled);
        });

        test("should not cleanup rendezvous on unmount if already finished", async () => {
            const onFinished = jest.fn();
            const { unmount } = render(getComponent({ client, onFinished }));
            await triggerShowQr();
            
            await waitFor(() => expect(mocked(MSC4108SignInWithQR).mock.instances.length).toBe(1));
            
            const rendezvous = mocked(MSC4108SignInWithQR).mock.instances[0];
            const cancelSpy = jest.spyOn(rendezvous, "cancel").mockResolvedValue(undefined);

            // Simulate finishing the flow
            const onClick = (mockedFlow.mock.calls[0][0] as FlowProps).onClick;
            await act(async () => {
                await onClick(Click.Back);
            });

            expect(onFinished).toHaveBeenCalledWith(false);
            cancelSpy.mockClear();

            unmount();

            // Should not call cancel again since flow is finished
            expect(cancelSpy).not.toHaveBeenCalled();
        });
    });
});
