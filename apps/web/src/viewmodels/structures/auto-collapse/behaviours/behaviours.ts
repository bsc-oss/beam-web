/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import { CollapseOnWindowResizeBehaviour } from "./CollapseOnWindowResizeBehaviour";
import type { BaseCollapseBehaviour } from "./BaseCollapseBehaviour";
import type { CollapseHandler } from "../CollapseHandler";
import type { CallStore } from "../../../../stores/CallStore";

interface BehaviourClass {
    new (collapseHandler: CollapseHandler, callStore: CallStore): BaseCollapseBehaviour;
    shouldStartCollapsed(): boolean;
}

/**
 * The auto-collapse behaviours used by the app.
 */
// PG_CHANGED: CollapseOnCallResizeBehaviour removed — the room list should not auto-collapse when joining a call
export const Behaviours: BehaviourClass[] = [CollapseOnWindowResizeBehaviour];
