//
// Copyright 2026 Belgian Secure Communications (BSC)
//
// SPDX-License-Identifier: AGPL-3.0-only
// Please see LICENSE files in the repository root for full details.
//

/*
Tests for src/utils/oidc/deviceFlow.ts
*/

import fetchMock from "@fetch-mock/jest";
import { logger } from "matrix-js-sdk/src/logger";
import { type ValidatedAuthMetadata } from "matrix-js-sdk/src/matrix";

import { getDeviceFlowClientId } from "../../../../src/utils/oauth/PGDeviceFlow";
import { mockPlatformPeg, unmockPlatformPeg } from "../../../test-utils/platform";
import SdkConfig from "../../../../src/SdkConfig";
import PlatformPeg from "../../../../src/PlatformPeg";
import { makeDelegatedAuthMetadata } from "../../../test-utils/auth";

// Test data constants
const TEST_ISSUER = "https://issuer.example/";
const TEST_ISSUER_WITH_SLASH = "https://issuer.example/";
const TEST_ISSUER_WITHOUT_SLASH = "https://issuer.example";
const TEST_STATIC_CLIENT_ID = "static-client-123";
const TEST_DYNAMIC_CLIENT_ID = "dynamic-client-456";
const TEST_REGISTRATION_ENDPOINT = "https://issuer.example/register";

const TEST_OIDC_CLIENT_METADATA = {
    client_name: "Test Beam Client",
    client_uri: "https://beam.example/",
    logo_uri: "https://beam.example/logo.png",
    redirect_uris: ["https://beam.example/callback"] as [string, ...string[]],
    application_type: "web" as const,
    tos_uri: "https://beam.example/tos",
    policy_uri: "https://beam.example/privacy",
};

const TEST_AUTH_META: ValidatedAuthMetadata = {
    ...makeDelegatedAuthMetadata(TEST_ISSUER),
    registration_endpoint: TEST_REGISTRATION_ENDPOINT,
};

const TEST_AUTH_META_NO_REGISTRATION = {
    ...makeDelegatedAuthMetadata(TEST_ISSUER),
    registration_endpoint: undefined,
} as unknown as ValidatedAuthMetadata;

describe("deviceFlow", () => {
    let mockPlatform: ReturnType<typeof mockPlatformPeg>;

    const mockSdkConfig = (config: Record<string, unknown> = {}): jest.SpyInstance => {
        return jest.spyOn(SdkConfig, "get").mockReturnValue(config);
    };

    beforeEach(() => {
        jest.resetAllMocks();
        fetchMock.mockClear();

        mockPlatform = mockPlatformPeg({
            getOAuthClientMetadata: jest.fn().mockResolvedValue(TEST_OIDC_CLIENT_METADATA),
        });

        // Mock logger
        jest.spyOn(logger, "debug").mockImplementation(() => {});
        jest.spyOn(logger, "info").mockImplementation(() => {});
    });

    afterEach(() => {
        unmockPlatformPeg();
        jest.restoreAllMocks();
    });

    describe("getDeviceFlowClientId", () => {
        describe("Static Client Resolution", () => {
            it("should return static client ID when configured for issuer with trailing slash", async () => {
                const staticClients = {
                    [TEST_ISSUER_WITH_SLASH]: { client_id: TEST_STATIC_CLIENT_ID },
                };
                mockSdkConfig({ oidc_static_clients: staticClients });

                const result = await getDeviceFlowClientId(TEST_AUTH_META);

                expect(result).toBe(TEST_STATIC_CLIENT_ID);
                expect(logger.debug).toHaveBeenCalledWith(
                    `Using static clientId for device flow: ${TEST_STATIC_CLIENT_ID}`,
                );
                expect(fetchMock).not.toHaveFetched();
                expect(mockPlatform.getOAuthClientMetadata).not.toHaveBeenCalled();
            });

            it("should return static client ID when configured for issuer without trailing slash", async () => {
                const authMeta = { ...TEST_AUTH_META, issuer: TEST_ISSUER_WITHOUT_SLASH };
                const staticClients = {
                    [TEST_ISSUER_WITH_SLASH]: { client_id: TEST_STATIC_CLIENT_ID },
                };
                mockSdkConfig({ oidc_static_clients: staticClients });

                const result = await getDeviceFlowClientId(authMeta);

                expect(result).toBe(TEST_STATIC_CLIENT_ID);
                expect(logger.debug).toHaveBeenCalledWith(
                    `Using static clientId for device flow: ${TEST_STATIC_CLIENT_ID}`,
                );
            });

            it("should proceed to dynamic registration when no static clients configured", async () => {
                mockSdkConfig({});
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    status: 200,
                    body: JSON.stringify({ client_id: TEST_DYNAMIC_CLIENT_ID }),
                });

                const result = await getDeviceFlowClientId(TEST_AUTH_META);

                expect(result).toBe(TEST_DYNAMIC_CLIENT_ID);
                expect(fetchMock).toHaveFetched();
            });

            it("should proceed to dynamic registration when static clients exist but not for this issuer", async () => {
                const staticClients = {
                    "https://other-issuer.example/": { client_id: "other-client" },
                };
                mockSdkConfig({ oidc_static_clients: staticClients });
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    status: 200,
                    body: JSON.stringify({ client_id: TEST_DYNAMIC_CLIENT_ID }),
                });

                const result = await getDeviceFlowClientId(TEST_AUTH_META);

                expect(result).toBe(TEST_DYNAMIC_CLIENT_ID);
                expect(fetchMock).toHaveFetched();
            });

            it("should handle undefined oidc_static_clients config", async () => {
                mockSdkConfig({ oidc_static_clients: undefined });
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    status: 200,
                    body: JSON.stringify({ client_id: TEST_DYNAMIC_CLIENT_ID }),
                });

                const result = await getDeviceFlowClientId(TEST_AUTH_META);

                expect(result).toBe(TEST_DYNAMIC_CLIENT_ID);
                expect(fetchMock).toHaveFetched();
            });
        });

        describe("Dynamic Registration Prerequisites", () => {
            it("should throw when registration_endpoint is missing", async () => {
                mockSdkConfig({});

                await expect(getDeviceFlowClientId(TEST_AUTH_META_NO_REGISTRATION)).rejects.toThrow(
                    "No registration_endpoint in OIDC metadata; cannot register device-code client",
                );

                expect(fetchMock).not.toHaveFetched();
                expect(mockPlatform.getOAuthClientMetadata).not.toHaveBeenCalled();
            });

            it("should throw when PlatformPeg is not available", async () => {
                mockSdkConfig({});
                jest.spyOn(PlatformPeg, "get").mockReturnValue(null);

                await expect(getDeviceFlowClientId(TEST_AUTH_META)).rejects.toThrow(
                    "Platform not available for OIDC client metadata",
                );

                expect(fetchMock).not.toHaveFetched();
            });

            it("should throw when platform.getOAuthClientMetadata fails", async () => {
                mockSdkConfig({});
                mockPlatform.getOAuthClientMetadata.mockRejectedValue(new Error("Platform metadata error"));

                await expect(getDeviceFlowClientId(TEST_AUTH_META)).rejects.toThrow("Platform metadata error");

                expect(fetchMock).not.toHaveFetched();
            });
        });

        describe("Successful Dynamic Registration", () => {
            beforeEach(() => {
                mockSdkConfig({});
            });

            it("should successfully register new client with all metadata", async () => {
                const registrationResponse = { client_id: TEST_DYNAMIC_CLIENT_ID };
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    status: 200,
                    body: JSON.stringify(registrationResponse),
                });

                const result = await getDeviceFlowClientId(TEST_AUTH_META);

                expect(result).toBe(TEST_DYNAMIC_CLIENT_ID);
                expect(mockPlatform.getOAuthClientMetadata).toHaveBeenCalledTimes(1);

                expect(fetchMock).toHaveFetched(TEST_REGISTRATION_ENDPOINT, {
                    method: "post",
                    headers: { "Content-Type": "application/json" },
                });

                const requestBody = JSON.parse(fetchMock.callHistory.calls()[0].options.body as string);
                expect(requestBody).toEqual({
                    client_name: TEST_OIDC_CLIENT_METADATA.client_name,
                    client_uri: TEST_OIDC_CLIENT_METADATA.client_uri,
                    logo_uri: TEST_OIDC_CLIENT_METADATA.logo_uri,
                    redirect_uris: TEST_OIDC_CLIENT_METADATA.redirect_uris,
                    response_types: ["code"],
                    grant_types: [
                        "authorization_code",
                        "refresh_token",
                        "urn:ietf:params:oauth:grant-type:device_code",
                    ],
                    token_endpoint_auth_method: "none",
                    application_type: "web",
                    tos_uri: TEST_OIDC_CLIENT_METADATA.tos_uri,
                    policy_uri: TEST_OIDC_CLIENT_METADATA.policy_uri,
                });

                expect(logger.info).toHaveBeenCalledWith("Registered device-flow client", TEST_DYNAMIC_CLIENT_ID);
            });

            it("should handle registration response with additional fields", async () => {
                const registrationResponse = {
                    client_id: TEST_DYNAMIC_CLIENT_ID,
                    client_secret: "secret-123",
                    client_id_issued_at: 1640995200,
                };
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    status: 200,
                    body: JSON.stringify(registrationResponse),
                });

                const result = await getDeviceFlowClientId(TEST_AUTH_META);

                expect(result).toBe(TEST_DYNAMIC_CLIENT_ID);
            });

            it("should handle minimal client metadata", async () => {
                const minimalMetadata = {
                    client_name: "Minimal Client",
                    client_uri: "https://minimal.example/",
                    redirect_uris: ["https://minimal.example/callback"] as [string, ...string[]],
                    application_type: "web" as const,
                    tos_uri: undefined,
                    policy_uri: undefined,
                };
                mockPlatform.getOAuthClientMetadata.mockResolvedValue(minimalMetadata);
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    status: 200,
                    body: JSON.stringify({ client_id: TEST_DYNAMIC_CLIENT_ID }),
                });

                const result = await getDeviceFlowClientId(TEST_AUTH_META);

                expect(result).toBe(TEST_DYNAMIC_CLIENT_ID);

                const requestBody = JSON.parse(fetchMock.callHistory.calls()[0].options.body as string);
                expect(requestBody.client_name).toBe("Minimal Client");
                expect(requestBody.redirect_uris).toEqual(["https://minimal.example/callback"]);
                expect(requestBody.client_uri).toBe("https://minimal.example/");
                expect(requestBody.logo_uri).toBeUndefined();
            });
        });

        describe("Dynamic Registration Error Handling", () => {
            beforeEach(() => {
                mockSdkConfig({});
            });

            it("should throw on HTTP error responses", async () => {
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    status: 400,
                    statusText: "Bad Request",
                });

                await expect(getDeviceFlowClientId(TEST_AUTH_META)).rejects.toThrow(
                    "Client registration (device flow) failed:",
                );
            });

            it("should handle registration error responses with error field", async () => {
                const errorResponse = {
                    error: "invalid_client_metadata",
                    error_description: "The client metadata is invalid",
                };
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    status: 200,
                    body: JSON.stringify(errorResponse),
                });

                await expect(getDeviceFlowClientId(TEST_AUTH_META)).rejects.toThrow(
                    "Client registration failed: invalid_client_metadata: The client metadata is invalid",
                );
            });

            it("should handle registration error responses without error_description", async () => {
                const errorResponse = { error: "unauthorized_client" };
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    status: 200,
                    body: JSON.stringify(errorResponse),
                });

                await expect(getDeviceFlowClientId(TEST_AUTH_META)).rejects.toThrow(
                    "Client registration failed: unauthorized_client",
                );
            });

            it("should handle missing client_id in successful response", async () => {
                const invalidResponse = { not_client_id: "wrong-field" };
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    status: 200,
                    body: JSON.stringify(invalidResponse),
                });

                await expect(getDeviceFlowClientId(TEST_AUTH_META)).rejects.toThrow(
                    "Invalid registration response: missing or invalid client_id",
                );
            });

            it("should handle invalid client_id type in response", async () => {
                const invalidResponse = { client_id: 123 };
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    status: 200,
                    body: JSON.stringify(invalidResponse),
                });

                await expect(getDeviceFlowClientId(TEST_AUTH_META)).rejects.toThrow(
                    "Invalid registration response: missing or invalid client_id",
                );
            });

            it("should handle empty client_id in response", async () => {
                const invalidResponse = { client_id: "" };
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    status: 200,
                    body: JSON.stringify(invalidResponse),
                });

                await expect(getDeviceFlowClientId(TEST_AUTH_META)).rejects.toThrow(
                    "Invalid registration response: missing or invalid client_id",
                );
            });
        });

        describe("Network Error Handling", () => {
            beforeEach(() => {
                mockSdkConfig({});
            });

            it("should handle network failure during fetch", async () => {
                const networkError = new Error("Network unavailable");
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    throws: networkError,
                });

                await expect(getDeviceFlowClientId(TEST_AUTH_META)).rejects.toThrow(
                    "Client registration (device flow) failed: Network unavailable",
                );
            });

            it("should handle JSON parsing errors", async () => {
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    status: 200,
                    body: "invalid json{",
                });

                await expect(getDeviceFlowClientId(TEST_AUTH_META)).rejects.toThrow(
                    "Client registration (device flow) failed:",
                );
            });

            it("should handle timeout errors", async () => {
                const timeoutError = new Error("Request timeout");
                timeoutError.name = "TimeoutError";
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    throws: timeoutError,
                });

                await expect(getDeviceFlowClientId(TEST_AUTH_META)).rejects.toThrow(
                    "Client registration (device flow) failed: Request timeout",
                );
            });

            it("should handle abort errors", async () => {
                const abortError = new Error("The operation was aborted");
                abortError.name = "AbortError";
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    throws: abortError,
                });

                await expect(getDeviceFlowClientId(TEST_AUTH_META)).rejects.toThrow(
                    "Client registration (device flow) failed: The operation was aborted",
                );
            });
        });

        describe("Edge Cases", () => {
            it("should handle null oidc_static_clients config", async () => {
                mockSdkConfig({ oidc_static_clients: null });
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    status: 200,
                    body: JSON.stringify({ client_id: TEST_DYNAMIC_CLIENT_ID }),
                });

                const result = await getDeviceFlowClientId(TEST_AUTH_META);

                expect(result).toBe(TEST_DYNAMIC_CLIENT_ID);
            });

            it("should handle empty oidc_static_clients config", async () => {
                mockSdkConfig({ oidc_static_clients: {} });
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    status: 200,
                    body: JSON.stringify({ client_id: TEST_DYNAMIC_CLIENT_ID }),
                });

                const result = await getDeviceFlowClientId(TEST_AUTH_META);

                expect(result).toBe(TEST_DYNAMIC_CLIENT_ID);
            });

            it("should handle malformed static client config", async () => {
                const malformedConfig = {
                    [TEST_ISSUER]: { not_client_id: "wrong-field" },
                };
                mockSdkConfig({ oidc_static_clients: malformedConfig });
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    status: 200,
                    body: JSON.stringify({ client_id: TEST_DYNAMIC_CLIENT_ID }),
                });

                const result = await getDeviceFlowClientId(TEST_AUTH_META);

                expect(result).toBe(TEST_DYNAMIC_CLIENT_ID);
                expect(fetchMock).toHaveFetched();
            });

            it("should handle empty string client_id in static config", async () => {
                const staticClients = {
                    [TEST_ISSUER]: { client_id: "" },
                };
                mockSdkConfig({ oidc_static_clients: staticClients });
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    status: 200,
                    body: JSON.stringify({ client_id: TEST_DYNAMIC_CLIENT_ID }),
                });

                // Empty string is falsy, so should proceed to dynamic registration
                const result = await getDeviceFlowClientId(TEST_AUTH_META);

                expect(result).toBe(TEST_DYNAMIC_CLIENT_ID);
                expect(fetchMock).toHaveFetched();
            });

            it("should handle issuer URL normalization edge cases", async () => {
                const edgeCaseAuthMeta = {
                    ...TEST_AUTH_META,
                    issuer: "https://issuer.example///",
                };
                const staticClients = {
                    "https://issuer.example///": { client_id: TEST_STATIC_CLIENT_ID },
                };
                mockSdkConfig({ oidc_static_clients: staticClients });

                const result = await getDeviceFlowClientId(edgeCaseAuthMeta);

                expect(result).toBe(TEST_STATIC_CLIENT_ID);
            });

            it("should handle very long client metadata values", async () => {
                const longMetadata = {
                    ...TEST_OIDC_CLIENT_METADATA,
                    client_name: "A".repeat(1000),
                    client_uri: "https://very-long-domain-name-that-exceeds-normal-limits.example/" + "a".repeat(500),
                };
                mockSdkConfig({});
                mockPlatform.getOAuthClientMetadata.mockResolvedValue(longMetadata);
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    status: 200,
                    body: JSON.stringify({ client_id: TEST_DYNAMIC_CLIENT_ID }),
                });

                const result = await getDeviceFlowClientId(TEST_AUTH_META);

                expect(result).toBe(TEST_DYNAMIC_CLIENT_ID);

                const requestBody = JSON.parse(fetchMock.callHistory.calls()[0].options.body as string);
                expect(requestBody.client_name).toBe(longMetadata.client_name);
                expect(requestBody.client_uri).toBe(longMetadata.client_uri);
            });
        });

        describe("Multiple Registration Attempts", () => {
            beforeEach(() => {
                mockSdkConfig({});
            });

            it("should handle concurrent registration requests", async () => {
                fetchMock.post(TEST_REGISTRATION_ENDPOINT, {
                    status: 200,
                    body: JSON.stringify({ client_id: TEST_DYNAMIC_CLIENT_ID }),
                });

                const promises = [
                    getDeviceFlowClientId(TEST_AUTH_META),
                    getDeviceFlowClientId(TEST_AUTH_META),
                    getDeviceFlowClientId(TEST_AUTH_META),
                ];

                const results = await Promise.all(promises);

                results.forEach((result) => {
                    expect(result).toBe(TEST_DYNAMIC_CLIENT_ID);
                });

                // Should make three separate registration requests
                expect(fetchMock).toHaveFetchedTimes(3);
            });
        });
    });
});
