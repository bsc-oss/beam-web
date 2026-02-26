/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2019-2024 New Vector Ltd.
Copyright 2015, 2016 OpenMarket Ltd

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-02-06
*/

import React from "react";

export default class AuthHeaderLogo extends React.PureComponent {
    public render(): React.ReactElement {
        // PG_CHANGED
        const lightLogoUrl = "themes/beam/img/logos/beam-logo-light.svg";
        const darkLogoUrl = "themes/beam/img/logos/beam-logo.svg";

        return (
            <aside className="mx_AuthHeaderLogo">
                {/* PG_CHANGED */}
                <img src={lightLogoUrl} alt="Beam" className="mx_AuthHeaderLogo_light" />
                <img src={darkLogoUrl} alt="Beam" className="mx_AuthHeaderLogo_dark" />
            </aside>
        );
    }
}
