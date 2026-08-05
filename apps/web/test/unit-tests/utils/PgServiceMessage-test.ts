/*
Copyright 2026 Belgian Secure Communications (BSC)

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import fetchMock from "@fetch-mock/jest";

import SdkConfig from "../../../src/SdkConfig";
import {
    fetchServiceMessage,
    type IServiceMessageDisplay,
    isSameServiceMessage,
    isServiceMessagePersistentlyDismissed,
    persistServiceMessageDismissal,
} from "../../../src/utils/PgServiceMessage";

jest.mock("../../../src/languageHandler", () => ({
    getCurrentLanguage: () => "en",
}));

const ENDPOINT = "https://notice.example/current";

const PAYLOAD = {
    id: 42,
    isActive: true,
    isCritical: true,
    allowPersistentDismissalWeb: true,
    content: {
        en: { title: "Title EN", message: "Message EN" },
        fr: { title: "Titre FR", message: "Message FR" },
    },
};

const DISMISSABLE: IServiceMessageDisplay = {
    id: 1,
    title: "t",
    message: "m",
    isCritical: false,
    allowPersistentDismissalWeb: true,
};

const NON_DISMISSABLE: IServiceMessageDisplay = { ...DISMISSABLE, id: 2, allowPersistentDismissalWeb: false };

describe("PgServiceMessage", () => {
    beforeEach(() => {
        localStorage.clear();
        fetchMock.mockReset();
        SdkConfig.reset();
    });

    describe("fetchServiceMessage", () => {
        it("returns undefined when pg_notice_url is not configured", async () => {
            await expect(fetchServiceMessage()).resolves.toBeUndefined();
            expect(fetchMock.callHistory.calls()).toHaveLength(0);
        });

        it("fetches and maps a localized active message", async () => {
            SdkConfig.put({ pg_notice_url: ENDPOINT });
            fetchMock.get(ENDPOINT, PAYLOAD);

            await expect(fetchServiceMessage()).resolves.toEqual({
                id: 42,
                title: "Title EN",
                message: "Message EN",
                isCritical: true,
                allowPersistentDismissalWeb: true,
            });
        });

        it("returns undefined when the payload is not active", async () => {
            SdkConfig.put({ pg_notice_url: ENDPOINT });
            fetchMock.get(ENDPOINT, { ...PAYLOAD, isActive: false });

            await expect(fetchServiceMessage()).resolves.toBeUndefined();
        });

        it("returns undefined on a network/HTTP failure", async () => {
            SdkConfig.put({ pg_notice_url: ENDPOINT });
            fetchMock.get(ENDPOINT, 500);

            await expect(fetchServiceMessage()).resolves.toBeUndefined();
        });
    });

    describe("isSameServiceMessage", () => {
        it("treats identical content as equal and detects changes", () => {
            const a: IServiceMessageDisplay = { ...DISMISSABLE };
            const b: IServiceMessageDisplay = { ...DISMISSABLE };
            expect(isSameServiceMessage(a, b)).toBe(true);
            expect(isSameServiceMessage(a, { ...b, message: "changed" })).toBe(false);
            expect(isSameServiceMessage(undefined, undefined)).toBe(true);
            expect(isSameServiceMessage(a, undefined)).toBe(false);
        });
    });

    describe("dismissal persistence", () => {
        it("persists and detects dismissal when allowPersistentDismissalWeb is true", () => {
            expect(isServiceMessagePersistentlyDismissed(DISMISSABLE)).toBe(false);
            persistServiceMessageDismissal(DISMISSABLE);
            expect(isServiceMessagePersistentlyDismissed(DISMISSABLE)).toBe(true);
        });

        it("never persists dismissal when allowPersistentDismissalWeb is false", () => {
            persistServiceMessageDismissal(NON_DISMISSABLE);
            expect(isServiceMessagePersistentlyDismissed(NON_DISMISSABLE)).toBe(false);
            expect(localStorage.length).toBe(0);
        });
    });
});
