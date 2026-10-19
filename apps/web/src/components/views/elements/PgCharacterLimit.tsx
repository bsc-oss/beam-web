/*
Copyright 2026 Belgian Secure Communications (BSC)

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useCallback } from "react";
import { ErrorMessage, HelpMessage } from "@vector-im/compound-web";

import { _t } from "../../../languageHandler";
import { graphemeSegmenter } from "../../../utils/strings";

/**
 * Fraction of the limit at which the character counter becomes visible,
 * so the user sees the constraint before bumping into it.
 */
const COUNTER_VISIBLE_FROM = 0.8;

/**
 * Hard cap on the raw UTF-16 length of a profile field, independent of how many characters it renders as.
 * A single grapheme cluster can be arbitrarily long (e.g. stacked combining marks), so the character limit
 * alone does not bound the payload size. Must match the backend's raw length cap.
 */
export const PROFILE_FIELD_MAX_RAW_LENGTH = 256;

/**
 * Number of user-perceived characters (extended grapheme clusters) in `value`, so that an emoji, including
 * skin-tone modifiers, flags and ZWJ sequences, counts as 1 instead of 2-11 UTF-16 code units.
 * This is how the backend counts, so the client must count the same way.
 */
export function countCharacters(value: string): number {
    let count = 0;
    const segments = graphemeSegmenter.segment(value)[Symbol.iterator]();
    while (!segments.next().done) count++;
    return count;
}

/**
 * Number of characters by which `value` exceeds `max`, or 0 when within the limit.
 */
export function charactersOverLimit(value: string, max: number): number {
    return Math.max(0, countCharacters(value) - max);
}

/**
 * Whether the raw UTF-16 length of `value` exceeds the backend's hard cap, regardless of how many
 * characters it renders as.
 */
export function exceedsRawLengthLimit(value: string): boolean {
    return value.length > PROFILE_FIELD_MAX_RAW_LENGTH;
}

/**
 * Whether the backend would reject `value` for being too long, either by character count or by raw length.
 */
export function isOverLengthLimit(value: string, max: number): boolean {
    return charactersOverLimit(value, max) > 0 || exceedsRawLengthLimit(value);
}

interface Props {
    /** The current value of the text control. */
    value: string;
    /** The maximum number of characters allowed. */
    max: number;
}

/**
 * Soft character-limit feedback for a compound form field (e.g. `EditInPlace`).
 *
 * Shows a counter once the value is within the last 20% of the limit. Once the value
 * is over the limit, the counter is replaced (in the same place) by an error message.
 * The user is never prevented from typing past the limit, so an overlong value can be
 * edited down instead of retyped. Characters are counted the way the backend counts them
 * (grapheme clusters), not as UTF-16 code units.
 *
 * When over the limit, the error message registers a Radix Form custom matcher so
 * that the form's native constraint validation blocks submission as well.
 */
const PgCharacterLimit: React.FC<Props> = ({ value, max }) => {
    const length = countCharacters(value);
    const over = charactersOverLimit(value, max);
    const showCounter = length >= Math.ceil(max * COUNTER_VISIBLE_FROM);

    const matchTooLong = useCallback((controlValue: string) => isOverLengthLimit(controlValue, max), [max]);

    if (over > 0) {
        return (
            <ErrorMessage className="mx_PgCharacterLimit_error" match={matchTooLong} forceMatch>
                {_t("pg|forms|characters_over_limit", { count: over })}
            </ErrorMessage>
        );
    }

    if (exceedsRawLengthLimit(value)) {
        return (
            <ErrorMessage className="mx_PgCharacterLimit_error" match={matchTooLong} forceMatch>
                {_t("pg|forms|value_too_long")}
            </ErrorMessage>
        );
    }

    if (showCounter) {
        return <HelpMessage>{_t("pg|forms|character_count", { current: length, max })}</HelpMessage>;
    }

    return null;
};

export default PgCharacterLimit;
