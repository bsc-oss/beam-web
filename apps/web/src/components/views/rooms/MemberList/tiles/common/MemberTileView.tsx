/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-02-06
*/

import React, { useEffect, useRef, type JSX } from "react";

import AccessibleButton from "../../../../elements/AccessibleButton";

interface Props {
    avatarJsx: JSX.Element;
    nameJsx: JSX.Element | string;
    onClick: () => void;
    onFocus: (e: React.FocusEvent) => void;
    memberIndex: number;
    memberCount: number;
    ariaLabel?: string;
    presenceJsx?: JSX.Element;
    userLabel?: React.ReactNode;
    iconJsx?: JSX.Element;
    tabIndex?: number;
    focused?: boolean;
    // PG_CHANGED
    email?: string;
}

export function MemberTileView(props: Props): JSX.Element {
    let userLabelJsx: React.ReactNode;
    if (props.userLabel) {
        userLabelJsx = <div className="mx_MemberTileView_userLabel">{props.userLabel}</div>;
    }
    const ref = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (props.focused) {
            ref.current?.focus({ preventScroll: true, focusVisible: true });
        }
    }, [props.focused]);
    return (
        // The wrapping div is required to make the magic mouse listener work, for some reason.
        <div>
            <AccessibleButton
                ref={ref}
                className="mx_MemberTileView"
                onClick={props.onClick}
                onFocus={props.onFocus}
                aria-label={props?.ariaLabel}
                tabIndex={props.tabIndex}
                role="option"
                aria-posinset={props.memberIndex + 1}
                aria-setsize={props.memberCount}
            >
                <div aria-hidden className="mx_MemberTileView_left">
                    <div className="mx_MemberTileView_avatar">
                        {props.avatarJsx} {props.presenceJsx}
                    </div>
                    {/* PG_CHANGED */}
                    <div className="mx_MemberTileView_name_wrapper">
                        <div className="mx_MemberTileView_name">{props.nameJsx}</div>
                        <div className="mx_MemberTileView_email">{props.email ?? "no email"}</div>
                    </div>
                </div>
                <div aria-hidden className="mx_MemberTileView_right">
                    {userLabelJsx}
                    {props.iconJsx}
                </div>
            </AccessibleButton>
        </div>
    );
}
