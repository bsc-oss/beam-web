/*
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { describe, it, expect } from "vitest";
import fetchMock from "@fetch-mock/vitest";

import { getAllLanguagesWithLabels } from "./utils";

describe("getAllLanguagesWithLabels", () => {
    // PG_CHANGED: the fork restricts the language list to the fixed PG languages (en/fr/nl/de),
    // regardless of what the languages.json manifest advertises.
    it("should return the fixed PG languages", async () => {
        fetchMock.modifyRoute("languages", {
            response: {
                en: "en_EN.json",
                de: "de_DE.json",
                qq: "qq.json",
            },
        });
        await expect(getAllLanguagesWithLabels()).resolves.toMatchInlineSnapshot(`
                [
                  {
                    "label": "English",
                    "labelInTargetLanguage": "English",
                    "value": "en",
                  },
                  {
                    "label": "French",
                    "labelInTargetLanguage": "français",
                    "value": "fr",
                  },
                  {
                    "label": "Dutch",
                    "labelInTargetLanguage": "Nederlands",
                    "value": "nl",
                  },
                  {
                    "label": "German",
                    "labelInTargetLanguage": "Deutsch",
                    "value": "de",
                  },
                ]
            `);
    });
});
