/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-02-06
*/

import { abbreviateUrl, isSuspiciousLink, parseUrl, unabbreviateUrl } from "../../../src/utils/UrlUtils";

// PG_CHANGED: Updated to beam.belgium.be
describe("abbreviateUrl", () => {
    it("should return empty string if passed falsey", () => {
        expect(abbreviateUrl(undefined)).toEqual("");
    });

    it("should abbreviate to host if empty pathname", () => {
        expect(abbreviateUrl("https://foo/")).toEqual("foo");
    });

    it("should not abbreviate if has path parts", () => {
        expect(abbreviateUrl("https://foo/path/parts")).toEqual("https://foo/path/parts");
    });
});

describe("unabbreviateUrl", () => {
    it("should return empty string if passed falsey", () => {
        expect(unabbreviateUrl(undefined)).toEqual("");
    });

    it("should prepend https to input if it lacks it", () => {
        expect(unabbreviateUrl("beam.belgium.be")).toEqual("https://beam.belgium.be");
    });

    it("should not prepend https to input if it has it", () => {
        expect(unabbreviateUrl("https://beam.belgium.be")).toEqual("https://beam.belgium.be");
    });
});

describe("parseUrl", () => {
    it("should not throw on no proto", () => {
        expect(() => parseUrl("test")).not.toThrow();
    });
});

// PG_CHANGED
describe("isSuspiciousLink", () => {
    describe("RTL override characters", () => {
        it("should detect RTL override in displayed text", () => {
            expect(isSuspiciousLink("example\u202E.com", "https://example.com")).toBe(true);
        });

        it("should detect RTL override in actual URL", () => {
            expect(isSuspiciousLink("example.com", "https://example\u202E.com")).toBe(true);
        });

        it("should detect various RTL characters", () => {
            const rtlChars = ["\u202E", "\u202D", "\u202C", "\u200F", "\u200E", "\u2066", "\u2067", "\u2068", "\u2069"];
            for (const char of rtlChars) {
                expect(isSuspiciousLink(`test${char}`, "https://example.com")).toBe(true);
            }
        });
    });

    describe("host mismatch", () => {
        it("should detect when displayed URL has different host than actual URL", () => {
            expect(isSuspiciousLink("https://trusted.com", "https://malicious.com")).toBe(true);
        });

        it("should detect subdomain differences", () => {
            expect(isSuspiciousLink("https://bank.com", "https://fake.bank.com")).toBe(true);
        });

        it("should be case insensitive for hosts", () => {
            expect(isSuspiciousLink("https://EXAMPLE.COM", "https://example.com")).toBe(false);
        });

        it("should allow same host with different paths", () => {
            expect(isSuspiciousLink("https://example.com/login", "https://example.com/phishing")).toBe(false);
        });

        it("should allow same host with different protocols", () => {
            expect(isSuspiciousLink("http://example.com", "https://example.com")).toBe(false);
        });
    });

    describe("non-suspicious links", () => {
        it("should return false for plain text that is not a URL", () => {
            expect(isSuspiciousLink("Click here", "https://example.com")).toBe(false);
        });

        it("should return false for matching hosts", () => {
            expect(isSuspiciousLink("https://example.com", "https://example.com")).toBe(false);
        });

        it("should return false for partial text", () => {
            expect(isSuspiciousLink("example", "https://example.com")).toBe(false);
        });
    });
});
