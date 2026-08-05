/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-02-06
*/

import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import { SdkContextClass } from "../../../src/contexts/SDKContext";
import { OidcClientStore } from "../../../src/stores/oidc/OidcClientStore";
import { UserProfilesStore } from "../../../src/stores/UserProfilesStore";
import { createTestClient } from "../../test-utils";

describe("SdkContextClass", () => {
    let sdkContext = SdkContextClass.instance;
    let client: MatrixClient;

    beforeAll(() => {
        client = createTestClient();
    });

    beforeEach(() => {
        sdkContext = new SdkContextClass();
    });

    it("instance should always return the same instance", () => {
        const globalInstance = SdkContextClass.instance;
        expect(SdkContextClass.instance).toBe(globalInstance);
    });

    it("userProfilesStore should raise an error without a client", () => {
        expect(() => sdkContext.userProfilesStore).toThrow("Unable to create UserProfilesStore without a client");
    });

    it("oidcClientStore should raise an error without a client", () => {
        expect(() => sdkContext.oidcClientStore).toThrow("Unable to create OidcClientStore without a client");
    });

    describe("when SDKContext has a client", () => {
        beforeEach(() => {
            sdkContext.client = client;
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
            expect(sdkContext.userProfilesStore).not.toBe(store);
        });

        // PG_CHANGED
        it("onLoggedOut should clear all store instances to prevent data persistence", () => {
            // Initialize multiple stores
            const userProfilesStore = sdkContext.userProfilesStore;
            const oidcClientStore = sdkContext.oidcClientStore;
            const roomViewStore = sdkContext.roomViewStore;

            // Verify stores are initialized
            expect(userProfilesStore).toBeDefined();
            expect(oidcClientStore).toBeDefined();
            expect(roomViewStore).toBeDefined();

            // Call onLoggedOut
            sdkContext.onLoggedOut();

            // Verify all stores are recreated (not the same instance)
            // This ensures no data persists between sessions
            expect(sdkContext.userProfilesStore).not.toBe(userProfilesStore);
            expect(sdkContext.oidcClientStore).not.toBe(oidcClientStore);
            expect(sdkContext.roomViewStore).not.toBe(roomViewStore);

            // Note: Some stores like widgetStore and spaceStore are global singletons
            // and maintain the same instance, but their internal state is cleared
            // via their own onNotReady/reset methods when the client logs out
        });

        it("oidcClientstore should return a OidcClientStore", () => {
            const store = sdkContext.oidcClientStore;
            expect(store).toBeInstanceOf(OidcClientStore);
            // it should return the same instance
            expect(sdkContext.oidcClientStore).toBe(store);
        });
    });
});
