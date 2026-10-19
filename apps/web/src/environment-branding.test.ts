/*
Copyright 2026 Belgian Secure Communications (BSC)

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { describe, it, expect, beforeEach } from "vitest";

import { applyEnvironmentBranding, withEnvironmentSuffix } from "./environment-branding";

/** The relevant part of index.html, with the content hashed icon names the build produces. */
const PRODUCTION_HEAD = `
    <title>Beam</title>
    <link rel="apple-touch-icon" sizes="120x120" href="vector-icons/120.a2f9942.png">
    <link rel="apple-touch-icon" sizes="180x180" href="vector-icons/180.e5d2cd4.png">
    <link rel="manifest" href="manifest.json">
    <link rel="icon" type="image/png" sizes="24x24" href="vector-icons/24.df17aae.png">
    <link rel="icon" type="image/png" sizes="512x512" href="vector-icons/512.900bf4a.png">
    <meta name="apple-mobile-web-app-title" content="Beam">
    <meta name="application-name" content="Beam">
`;

function appIconPaths(): string[] {
    return [...document.querySelectorAll<HTMLLinkElement>('link[rel~="apple-touch-icon"]')].map(
        (link) => new URL(link.href, document.baseURI).pathname,
    );
}

function faviconPaths(): string[] {
    return [...document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')].map(
        (link) => new URL(link.href, document.baseURI).pathname,
    );
}

function manifestPath(): string {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!;
    return new URL(link.href, document.baseURI).pathname;
}

function metaContent(name: string): string {
    return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)!.content;
}

describe("withEnvironmentSuffix", () => {
    it.each([
        ["DEV", "Beam Gov - DEV"],
        ["TST", "Beam Gov - TST"],
        ["ACC", "Beam Gov - BETA"],
        ["acc", "Beam Gov - BETA"],
    ])("suffixes the name for %s", (environment, expected) => {
        expect(withEnvironmentSuffix("Beam Gov", environment)).toBe(expected);
    });

    it.each([undefined, "", "PROD", "prod", " ", "nonsense", "constructor"])(
        "leaves the name alone for %s",
        (environment) => {
            expect(withEnvironmentSuffix("Beam Gov", environment)).toBe("Beam Gov");
        },
    );
});

describe("applyEnvironmentBranding", () => {
    beforeEach(() => {
        document.head.innerHTML = PRODUCTION_HEAD;
        document.title = "Beam";
    });

    it("points the document at the app icons, manifest and name of the environment", () => {
        applyEnvironmentBranding("ACC");

        expect(manifestPath()).toBe("/manifest-acc.json");
        expect(appIconPaths()).toEqual(["/vector-icons-acc/120.png", "/vector-icons-acc/180.png"]);
        expect(metaContent("apple-mobile-web-app-title")).toBe("Beam - BETA");
        expect(metaContent("application-name")).toBe("Beam - BETA");
        expect(document.title).toBe("Beam - BETA");
    });

    it("leaves the favicons alone, they are too small to carry the label", () => {
        applyEnvironmentBranding("ACC");

        expect(faviconPaths()).toEqual(["/vector-icons/24.df17aae.png", "/vector-icons/512.900bf4a.png"]);
    });

    it("uses the environment's own label rather than its name", () => {
        applyEnvironmentBranding("DEV");

        expect(manifestPath()).toBe("/manifest-dev.json");
        expect(appIconPaths()[0]).toBe("/vector-icons-dev/120.png");
        expect(document.title).toBe("Beam - DEV");
    });

    it.each([undefined, "", "PROD", "prod", "nonsense", "constructor"])(
        "leaves production branding in place for %s",
        (environment) => {
            applyEnvironmentBranding(environment);

            expect(manifestPath()).toBe("/manifest.json");
            expect(appIconPaths()[0]).toBe("/vector-icons/120.a2f9942.png");
            expect(faviconPaths()[0]).toBe("/vector-icons/24.df17aae.png");
            expect(metaContent("application-name")).toBe("Beam");
            expect(document.title).toBe("Beam");
        },
    );

    it("is idempotent, so a second config load does not stack suffixes", () => {
        applyEnvironmentBranding("TST");
        applyEnvironmentBranding("TST");

        expect(appIconPaths()[0]).toBe("/vector-icons-tst/120.png");
        expect(metaContent("application-name")).toBe("Beam - TST");
        expect(document.title).toBe("Beam - TST");
    });
});
