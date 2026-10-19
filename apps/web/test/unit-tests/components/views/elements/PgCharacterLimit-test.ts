/*
Copyright 2026 Belgian Secure Communications (BSC)

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import {
    charactersOverLimit,
    countCharacters,
    exceedsRawLengthLimit,
    isOverLengthLimit,
    PROFILE_FIELD_MAX_RAW_LENGTH,
} from "../../../../../src/components/views/elements/PgCharacterLimit";

const THUMBS_UP = "\u{1F44D}";
const THUMBS_UP_MEDIUM_SKIN_TONE = "\u{1F44D}\u{1F3FD}";
const FAMILY = "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}";
const FLAG_BE = "\u{1F1E7}\u{1F1EA}";
const COMBINING_ACUTE_ACCENT = "\u0301";

/**
 * The backend counts grapheme clusters, so the client must count the same way rather than UTF-16 code units.
 */
describe("PgCharacterLimit counting", () => {
    it.each([
        ["", 0, 0],
        ["abc", 3, 3],
        [THUMBS_UP, 2, 1],
        [THUMBS_UP_MEDIUM_SKIN_TONE, 4, 1],
        [FAMILY, 11, 1],
        [FLAG_BE, 4, 1],
        ["e" + COMBINING_ACUTE_ACCENT, 2, 1],
    ])("counts %p as %i UTF-16 units but %i characters", (value, utf16Length, characters) => {
        expect(value.length).toBe(utf16Length);
        expect(countCharacters(value)).toBe(characters);
    });

    it("counts 49 letters plus an emoji as exactly 50 characters", () => {
        const value = "a".repeat(49) + THUMBS_UP;
        expect(value.length).toBe(51);
        expect(charactersOverLimit(value, 50)).toBe(0);
        expect(isOverLengthLimit(value, 50)).toBe(false);
    });

    it("reports how many characters, not code units, are over the limit", () => {
        expect(charactersOverLimit(FAMILY.repeat(3), 2)).toBe(1);
    });

    it("rejects a value over the raw UTF-16 cap even when it is a single character", () => {
        const stackedCombiningMarks = "a" + COMBINING_ACUTE_ACCENT.repeat(PROFILE_FIELD_MAX_RAW_LENGTH);
        expect(countCharacters(stackedCombiningMarks)).toBe(1);
        expect(charactersOverLimit(stackedCombiningMarks, 50)).toBe(0);
        expect(exceedsRawLengthLimit(stackedCombiningMarks)).toBe(true);
        expect(isOverLengthLimit(stackedCombiningMarks, 50)).toBe(true);
    });

    it("allows a value exactly at the raw UTF-16 cap", () => {
        const value = "a" + COMBINING_ACUTE_ACCENT.repeat(PROFILE_FIELD_MAX_RAW_LENGTH - 1);
        expect(value.length).toBe(PROFILE_FIELD_MAX_RAW_LENGTH);
        expect(isOverLengthLimit(value, 50)).toBe(false);
    });
});
