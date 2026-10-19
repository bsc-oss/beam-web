/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2024 New Vector Ltd.
Copyright 2021 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-02-06
*/

// Dev note: this customisation point is heavily inspired by UIFeature flags, though
// with an intention of being used for more complex switching on whether or not a feature
// should be shown.

// Populate this class with the details of your customisations when copying it.

import { type ComponentVisibilityCustomisations as IComponentVisibilityCustomisations } from "@element-hq/element-web-module-api";

import { UIComponent } from "../settings/UIFeature";

// A real customisation module will define and export one or more of the
// customisation points that make up the interface above.
export const ComponentVisibilityCustomisations: IComponentVisibilityCustomisations = {
    shouldShowComponent(component: UIComponent): boolean {
        // PG_CHANGED: Disable ExploreRooms
        if (component === UIComponent.ExploreRooms) {
            return false;
        }
        // PG_CHANGED: Disable CreateSpaces
        if (component === UIComponent.CreateSpaces) {
            return false;
        }
        return true;
    },
};
