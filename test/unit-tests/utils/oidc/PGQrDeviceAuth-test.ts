//
// Copyright 2026 Belgian Secure Communications (BSC)
//
// SPDX-License-Identifier: AGPL-3.0-only
// Please see LICENSE files in the repository root for full details.
//

/*
Tests for src/utils/oidc/PGQrDeviceAuth.ts
*/

import { initiateQrDeviceAuth } from "../../../../src/utils/oidc/PGQrDeviceAuth";
import type { MatrixClient } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";
import * as authorize from "matrix-js-sdk/src/oidc/authorize";
import * as DeviceFlow from "../../../../src/utils/oidc/PGDeviceFlow";
import { MSC4108SignInWithQR } from "matrix-js-sdk/src/rendezvous";

// Test data constants
const TEST_DEVICE_AUTH_RESPONSE = {
    device_code: "dev_code_test",
    user_code: "user_code_test",
    verification_uri: "https://issuer.example/verify",
    verification_uri_complete: "https://issuer.example/verify?code=abc",
    interval: 7,
};

const TEST_AUTH_METADATA = {
    device_authorization_endpoint: "https://issuer.example/device_authorize",
};

const TEST_CLIENT_ID = "client_id_123";
const TEST_DEVICE_ID = "did:device:abc";
const TEST_SCOPE = "scope:did:device:abc";

const createMockMatrixClient = (): MatrixClient => {
    return {
        getAuthMetadata: jest.fn().mockResolvedValue(TEST_AUTH_METADATA),
    } as jest.MockedObject<MatrixClient>;
};

const createMockResponse = (body: object | null | string, ok = true, status = 200): Response => {
    return {
        ok,
        status,
        json: jest.fn().mockResolvedValue(body),
    } as unknown as Response;
};

describe("initiateQrDeviceAuth", () => {
    let client: MatrixClient;
    let rendezvous: {
        pgGetPublicKey: jest.MockedFunction<() => Promise<string>>;
        deviceAuthorizationGrant: jest.MockedFunction<(options?: { deviceId: string; verificationUri: string; verificationUriComplete?: string }) => Promise<void>>;
    } & MSC4108SignInWithQR;
    let abort: AbortController;
    let mockFetch: jest.MockedFunction<typeof fetch>;

    const mockFetchResponse = (body: object | null | string, ok = true, status = 200): void => {
        mockFetch.mockResolvedValue(createMockResponse(body, ok, status));
    };

    beforeEach(() => {
        jest.resetAllMocks();

        abort = new AbortController();
       rendezvous = {
            pgGetPublicKey: jest.fn().mockResolvedValue(TEST_DEVICE_ID),
            deviceAuthorizationGrant: jest.fn().mockResolvedValue(undefined),
        } as unknown as typeof rendezvous;

        client = createMockMatrixClient();

        // default mocks
        jest.spyOn(DeviceFlow, "getDeviceFlowClientId").mockResolvedValue(TEST_CLIENT_ID);
        jest.spyOn(authorize, "generateScope").mockReturnValue(TEST_SCOPE);

        // mock fetch - cleaner typed approach
        mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
        globalThis.fetch = mockFetch;
    });

    describe("Successful Authorization Flow", () => {
        it("should return device auth data and call collaborators", async () => {
            const responseBody = {
                ...TEST_DEVICE_AUTH_RESPONSE,
                device_code: "dev_code_1",
                user_code: "user_code_1",
            };

            mockFetchResponse(responseBody);

            const res = await initiateQrDeviceAuth(client, rendezvous, abort);

            expect(res.authMeta).toBeDefined();
            expect(res.deviceAuthData).toEqual({
                usedClientId: TEST_CLIENT_ID,
                device_code: "dev_code_1",
                user_code: "user_code_1",
                interval: 7,
                requestedDeviceId: TEST_DEVICE_ID,
            });

            expect(client.getAuthMetadata).toHaveBeenCalledTimes(1);
            expect(DeviceFlow.getDeviceFlowClientId).toHaveBeenCalledWith(
                expect.objectContaining({ device_authorization_endpoint: "https://issuer.example/device_authorize" }),
            );
            expect(rendezvous.pgGetPublicKey).toHaveBeenCalledTimes(1);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            const [url, options] = mockFetch.mock.calls[0];
            expect(url).toBe("https://issuer.example/device_authorize");
            expect(options?.method).toBe("POST");
            expect(options?.signal).toBe(abort.signal);

            const body = options?.body as URLSearchParams;
            const params = body instanceof URLSearchParams ? body : new URLSearchParams(body as string);
            expect(params.get("client_id")).toBe(TEST_CLIENT_ID);
            expect(params.get("scope")).toBe(TEST_SCOPE);

            expect(rendezvous.deviceAuthorizationGrant).toHaveBeenCalledWith({
                deviceId: TEST_DEVICE_ID,
                verificationUri: "https://issuer.example/verify",
                verificationUriComplete: "https://issuer.example/verify?code=abc",
            });
        });

        it("should default interval to 5 when omitted", async () => {
            mockFetchResponse({
                device_code: "dev_code_2",
                user_code: "user_code_2",
                verification_uri: "https://issuer.example/verify",
                // no interval
            });

            const res = await initiateQrDeviceAuth(client, rendezvous, abort);
            expect(res.deviceAuthData.interval).toBe(5);
        });

        it("should pass undefined for verification_uri_complete when missing", async () => {
            mockFetchResponse({
                device_code: "dev_code_3",
                user_code: "user_code_3",
                verification_uri: "https://issuer.example/verify",
                // verification_uri_complete omitted
                interval: 10,
            });

            await initiateQrDeviceAuth(client, rendezvous, abort);
            expect(rendezvous.deviceAuthorizationGrant).toHaveBeenCalledWith({
                deviceId: TEST_DEVICE_ID,
                verificationUri: "https://issuer.example/verify",
                verificationUriComplete: undefined,
            });
        });

        it("should pass AbortController signal to fetch", async () => {
            mockFetchResponse({
                device_code: "dev_code_4",
                user_code: "user_code_4",
                verification_uri: "https://issuer.example/verify",
            });

            await initiateQrDeviceAuth(client, rendezvous, abort);
            const [, options] = mockFetch.mock.calls[0];
            expect(options?.signal).toBe(abort.signal);
        });
    });

    describe("Input Validation", () => {
        it("should throw when device_authorization_endpoint is missing", async () => {
            (client.getAuthMetadata as jest.Mock).mockResolvedValue({});

            await expect(initiateQrDeviceAuth(client, rendezvous, abort)).rejects.toThrow(
                "OIDC device authorization endpoint not available",
            );
            expect(mockFetch).not.toHaveBeenCalled();
            expect(rendezvous.deviceAuthorizationGrant).not.toHaveBeenCalled();
        });
    });

    describe("HTTP Error Handling", () => {
        it("should log and throw generic error for unauthorized_client responses", async () => {
            mockFetchResponse({ error: "unauthorized_client" }, false, 401);

            await expect(initiateQrDeviceAuth(client, rendezvous, abort)).rejects.toThrow(
                "Device authorization failed",
            );
            expect(rendezvous.deviceAuthorizationGrant).not.toHaveBeenCalled();
        });

        it("should log and throw generic error for other HTTP errors", async () => {
            mockFetchResponse({ error: "invalid_scope" }, false, 400);

            await expect(initiateQrDeviceAuth(client, rendezvous, abort)).rejects.toThrow(
                "Device authorization failed",
            );
        });

        it("should log and throw generic error when HTTP error has no error field", async () => {
            mockFetchResponse({}, false, 500);

            await expect(initiateQrDeviceAuth(client, rendezvous, abort)).rejects.toThrow(
                "Device authorization failed",
            );
        });

        it("should handle different error response formats", async () => {
            mockFetchResponse({
                error: "invalid_request",
                error_description: "The request is missing a required parameter",
            }, false, 400);

            await expect(initiateQrDeviceAuth(client, rendezvous, abort)).rejects.toThrow(
                "Device authorization failed",
            );
        });
    });

    describe("Network Error Handling", () => {
        it("should log and throw generic error on network failure", async () => {
            const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => undefined);
            mockFetch.mockRejectedValue(new Error("network down"));

            await expect(initiateQrDeviceAuth(client, rendezvous, abort)).rejects.toThrow(
                "Device authorization failed",
            );
            expect(warnSpy).toHaveBeenCalled();
        });

        it("should log and throw generic error on JSON parse failure", async () => {
            const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => undefined);
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: jest.fn().mockRejectedValue(new Error("bad json")),
            } as unknown as Response);

            await expect(initiateQrDeviceAuth(client, rendezvous, abort)).rejects.toThrow(
                "Device authorization failed",
            );
            expect(warnSpy).toHaveBeenCalled();
        });

        it("should log and throw generic error when aborted during fetch", async () => {
            const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => undefined);
            mockFetch.mockImplementation(() =>
                new Promise((_, reject) => {
                    abort.abort();
                    const err = new Error("The operation was aborted") as Error & { name: string };
                    err.name = "AbortError";
                    reject(err);
                }),
            );

            await expect(initiateQrDeviceAuth(client, rendezvous, abort)).rejects.toThrow(
                "Device authorization failed",
            );
            expect(warnSpy).toHaveBeenCalled();
        });

        it("should handle timeout scenarios", async () => {
            const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => undefined);
            mockFetch.mockImplementation(() =>
                new Promise((_, reject) => {
                    setTimeout(() => {
                        const err = new Error("Request timeout") as Error & { name: string };
                        err.name = "TimeoutError";
                        reject(err);
                    }, 100);
                })
            );

            await expect(initiateQrDeviceAuth(client, rendezvous, abort)).rejects.toThrow(
                "Device authorization failed",
            );
            expect(warnSpy).toHaveBeenCalled();
        });
    });

    describe("Dependency Error Handling", () => {
        it("should handle getDeviceFlowClientId failure", async () => {
            jest.spyOn(DeviceFlow, "getDeviceFlowClientId").mockRejectedValue(new Error("Client ID error"));

            await expect(initiateQrDeviceAuth(client, rendezvous, abort)).rejects.toThrow(
                "Client ID error",
            );
        });

        it("should handle rendezvous.pgGetPublicKey failure", async () => {
            rendezvous.pgGetPublicKey.mockRejectedValue(new Error("Public key error"));

            await expect(initiateQrDeviceAuth(client, rendezvous, abort)).rejects.toThrow(
                "Public key error",
            );
        });

        it("should handle rendezvous.deviceAuthorizationGrant failure", async () => {
            const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => undefined);
            mockFetchResponse(TEST_DEVICE_AUTH_RESPONSE);
            rendezvous.deviceAuthorizationGrant.mockRejectedValue(new Error("Device authorization grant error"));

            await expect(initiateQrDeviceAuth(client, rendezvous, abort)).rejects.toThrow(
                "Device authorization failed",
            );
            expect(warnSpy).toHaveBeenCalled();
        });
    });

    describe("Edge Cases", () => {
        it("should handle missing required fields in response", async () => {
            mockFetchResponse({
                // missing device_code, user_code, verification_uri
                interval: 5,
            });

            const res = await initiateQrDeviceAuth(client, rendezvous, abort);
            // The function doesn't validate required fields, so it succeeds with undefined values
            expect(res.deviceAuthData.device_code).toBeUndefined();
            expect(res.deviceAuthData.user_code).toBeUndefined();
            expect(res.deviceAuthData.interval).toBe(5);

            // Verify that deviceAuthorizationGrant was called with undefined verificationUri
            expect(rendezvous.deviceAuthorizationGrant).toHaveBeenCalledWith({
                deviceId: TEST_DEVICE_ID,
                verificationUri: undefined, // verification_uri is undefined
                verificationUriComplete: undefined,
            });
        });

        it("should handle malformed JSON response", async () => {
            const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => undefined);
            mockFetchResponse(null);

            await expect(initiateQrDeviceAuth(client, rendezvous, abort)).rejects.toThrow(
                "Device authorization failed",
            );
            expect(warnSpy).toHaveBeenCalled();
        });

        it("should handle response that causes destructuring errors", async () => {
            mockFetchResponse("not an object");

            const res = await initiateQrDeviceAuth(client, rendezvous, abort);
            // Destructuring a string results in undefined values, not an error
            expect(res.deviceAuthData.device_code).toBeUndefined();
            expect(res.deviceAuthData.user_code).toBeUndefined();
            expect(res.deviceAuthData.interval).toBe(5); // default value
        });
    });
});
