/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-02-06
*/

// @vitest-environment happy-dom

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";
import { createTestClient, TestSDKContext } from "test-utils";

import { SDKContextClass } from "./SDKContextClass";
import { UserProfilesStore } from "../stores/UserProfilesStore";

describe("SDKContextClass", () => {
    let sdkContext: TestSDKContext;
    let client: MatrixClient;

    beforeAll(() => {
        client = createTestClient();
    });

    beforeEach(() => {
        sdkContext = new TestSDKContext();
    });

    it("instance should always return the same instance", () => {
        const globalInstance = SDKContextClass.instance;
        expect(SDKContextClass.instance).toBe(globalInstance);
    });

    it("userProfilesStore should raise an error without a client", () => {
        expect(() => sdkContext.userProfilesStore).toThrow("Unable to create UserProfilesStore without a client");
    });

    describe("when SDKContext has a client", () => {
        beforeEach(() => {
            sdkContext._client = client;
        });

        it("userProfilesStore should return a UserProfilesStore", () => {
            const store = sdkContext.userProfilesStore;
            expect(store).toBeInstanceOf(UserProfilesStore);
            // it should return the same instance
            expect(sdkContext.userProfilesStore).toBe(store);
        });

        it("onLoggedOut should clear the UserProfilesStore", () => {
            const store = sdkContext.userProfilesStore;
            sdkContext.onLoggedOut();
            sdkContext._client = client;
            expect(sdkContext.userProfilesStore).not.toBe(store);
        });

        // PG_CHANGED
        it("onLoggedOut should clear all store instances to prevent data persistence", () => {
            // Initialize multiple stores
            const userProfilesStore = sdkContext.userProfilesStore;
            const roomViewStore = sdkContext.roomViewStore;

            // Verify stores are initialized
            expect(userProfilesStore).toBeDefined();
            expect(roomViewStore).toBeDefined();

            // Call onLoggedOut
            sdkContext.onLoggedOut();

            // Re-attach a client: onLoggedOut also clears it, and userProfilesStore requires one
            sdkContext._client = client;

            // Verify all stores are recreated (not the same instance)
            // This ensures no data persists between sessions
            expect(sdkContext.userProfilesStore).not.toBe(userProfilesStore);
            expect(sdkContext.roomViewStore).not.toBe(roomViewStore);

            // Note: Some stores like widgetStore and spaceStore are global singletons
            // and maintain the same instance, but their internal state is cleared
            // via their own onNotReady/reset methods when the client logs out
        });
    });
});
