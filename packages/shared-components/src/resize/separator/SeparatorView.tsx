/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React from "react";
import { Separator } from "react-resizable-panels";
import ChevronRightIcon from "@vector-im/compound-design-tokens/assets/web/icons/chevron-right";
import classNames from "classnames";
import { Tooltip } from "@vector-im/compound-web";

import { type ViewModel, useViewModel } from "../../core/viewmodel";
import styles from "./SeparatorView.module.css";
import { type ResizerViewSnapshot } from "..";
import { useI18n } from "../../core/i18n/i18nContext";

export interface SeparatorViewActions {
    /**
     * onPointerUp handler for separator.
     */
    onPointerUp: () => void;

    /**
     * onPointerMove handler for separator. Takes the event so that how far the pointer has travelled
     * since it went down can be measured.
     */
    onPointerMove: (event: React.PointerEvent) => void;

    /**
     * onPointerDown handler for separator. Takes the event so that where the pointer went down can be
     * measured from.
     */
    onPointerDown: (event: React.PointerEvent) => void;

    /**
     * onDoubleClick handler for the separator.
     */
    onDoubleClick: () => void;
}

interface Props {
    vm: ViewModel<ResizerViewSnapshot, SeparatorViewActions>;
    className?: string;
}

/**
 * Custom separator for collapsible left-panel based on {@link Separator}.
 */
export function SeparatorView({ vm, className }: Props): React.ReactNode {
    const { translate: _t } = useI18n();
    const { isCollapsed } = useViewModel(vm);

    /**
     * There are two types of separator:
     * - bar: This shows a thick bar separator with an expand icon in the middle; shown when the panel is collapsed.
     * - border: This is just a thin separator; shown when the panel is expanded.
     */
    const type = isCollapsed ? "bar" : "border";

    /**
     * PG_CHANGED: While collapsed, the only action the separator offers is clicking to expand, so it presents
     * itself as a button with a chevron rather than as a drag handle.
     */
    const barContent = (
        <Tooltip description={_t("left_panel|separator_label")} placement="right">
            <ChevronRightIcon width="16px" height="16px" />
        </Tooltip>
    );

    /**
     * This border is:
     * - a 1px border that separates the left panel and main content.
     * - a 2px border when the panel is expanded and the user is interacting with the separator.
     */
    const border = (
        <div className={styles.activeSeparatorContainer}>
            <div className={styles.activeSeparator} />
        </div>
    );

    return (
        <Separator
            className={classNames(styles.separator, className)}
            onPointerUp={vm.onPointerUp}
            onPointerMove={vm.onPointerMove}
            onPointerDown={vm.onPointerDown}
            aria-label={_t("left_panel|separator_label")}
            data-separator-type={type}
            onDoubleClick={vm.onDoubleClick}
            disableDoubleClick
        >
            {type === "bar" ? barContent : border}
        </Separator>
    );
}
