/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-02-06
*/

import { create } from "storybook/theming";

export default create({
    base: "light",

    // Colors
    textColor: "#1b1d22",
    colorSecondary: "#111111",

    // UI
    appBg: "#ffffff",
    appContentBg: "#ffffff",

    // Toolbar
    barBg: "#ffffff",

    // PG_CHANGED: Rebranded to Beam
    brandTitle: "Beam",
    brandUrl: "https://web.beam.belgium.be",
    // brandImage removed for Beam branding
    brandTarget: "_self",
});
