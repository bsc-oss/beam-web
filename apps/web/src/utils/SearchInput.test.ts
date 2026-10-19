/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2024 New Vector Ltd.
Copyright 2023 Boluwatife Omosowon <boluomosowon@gmail.com>

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-04-30
*/

import { vi, describe, it, expect } from "vitest";

// PG_CHANGED
import { permalinkPrefix } from "./permalinks/MatrixToPermalinkConstructor";

import { parsePermalink } from "./permalinks/Permalinks";
import { transformSearchTerm } from "./SearchInput";

vi.mock("./permalinks/Permalinks");
vi.mock("../stores/WidgetStore");
vi.mock("../stores/widgets/WidgetLayoutStore");

describe("transforming search term", () => {
    it("should return the primaryEntityId if the search term was a permalink", () => {
        // PG_CHANGED: use permalinkPrefix instead of hardcoded "matrix.to" URL
        const roomLink = `${permalinkPrefix}#element-dev:matrix.org`;
        const parsedPermalink = "#element-dev:matrix.org";

        vi.mocked(parsePermalink).mockReturnValue({
            primaryEntityId: parsedPermalink,
            roomIdOrAlias: parsedPermalink,
            eventId: "",
            userId: "",
            viaServers: [],
        });

        expect(transformSearchTerm(roomLink)).toBe(parsedPermalink);
    });

    it("should return the original search term if the search term is a permalink and the primaryEntityId is null", () => {
        const searchTerm = `${permalinkPrefix}#random-link:matrix.org`; // PG_CHANGED

        vi.mocked(parsePermalink).mockReturnValue({
            primaryEntityId: null,
            roomIdOrAlias: null,
            eventId: null,
            userId: null,
            viaServers: null,
        });

        expect(transformSearchTerm(searchTerm)).toBe(searchTerm);
    });

    it("should return the original search term if the search term was not a permalink", () => {
        const searchTerm = "search term";
        vi.mocked(parsePermalink).mockReturnValue(null);
        expect(transformSearchTerm(searchTerm)).toBe(searchTerm);
    });
});
