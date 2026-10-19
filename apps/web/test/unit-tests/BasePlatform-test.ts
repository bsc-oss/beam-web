//
// Copyright 2026 Belgian Secure Communications (BSC)
//
// SPDX-License-Identifier: AGPL-3.0-only
// Please see LICENSE files in the repository root for full details.
//

import BasePlatform from "../../src/BasePlatform";
import SdkConfig from "../../src/SdkConfig";
import PgUrlHelper from "../../src/PgUrlHelper";

// PG_CHANGED: created to test the PG changes in BasePlatform.ts

// Concrete subclass so the abstract BasePlatform can be instantiated in tests.
// doesn't implement abstract
// @ts-ignore
class TestPlatform extends BasePlatform {
    public constructor() {
        super();
    }
}

describe("BasePlatform", () => {
    let platform: BasePlatform;

    const mockSdkConfig = (config: Record<string, unknown> = {}): jest.SpyInstance => {
        return jest.spyOn(SdkConfig, "get").mockReturnValue(config);
    };

    beforeEach(() => {
        jest.restoreAllMocks();
        platform = new TestPlatform();
    });

    describe("getOAuthClientMetadata", () => {
        describe("tos_uri resolution", () => {
            it("resolves tos_uri from terms_and_conditions_links via PgUrlHelper.resolveUrl", async () => {
                const resolveUrlSpy = jest
                    .spyOn(PgUrlHelper, "resolveUrl")
                    .mockReturnValue("https://beam.example/tos/en");
                mockSdkConfig({
                    brand: "Beam",
                    terms_and_conditions_links: [{ url: "https://beam.example/tos/{LANG}" }],
                });

                const metadata = await platform.getOAuthClientMetadata();

                expect(resolveUrlSpy).toHaveBeenCalledWith("https://beam.example/tos/{LANG}");
                expect(metadata.tos_uri).toBe("https://beam.example/tos/en");
            });

            it("prefers oidc_metadata.tos_uri and does not call PgUrlHelper.resolveUrl", async () => {
                const resolveUrlSpy = jest.spyOn(PgUrlHelper, "resolveUrl");
                mockSdkConfig({
                    brand: "Beam",
                    oidc_metadata: { tos_uri: "https://beam.example/explicit-tos" },
                    terms_and_conditions_links: [{ url: "https://beam.example/tos/{LANG}" }],
                });

                const metadata = await platform.getOAuthClientMetadata();

                expect(resolveUrlSpy).not.toHaveBeenCalled();
                expect(metadata.tos_uri).toBe("https://beam.example/explicit-tos");
            });

            it("leaves tos_uri undefined when neither tos_uri nor terms_and_conditions_links are configured", async () => {
                const resolveUrlSpy = jest.spyOn(PgUrlHelper, "resolveUrl");
                mockSdkConfig({ brand: "Beam" });

                const metadata = await platform.getOAuthClientMetadata();

                expect(resolveUrlSpy).not.toHaveBeenCalled();
                expect(metadata.tos_uri).toBeUndefined();
            });
        });
    });
});
