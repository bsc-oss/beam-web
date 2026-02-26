/*
Copyright 2026 Belgian Secure Communications (BSC)
PG_CHANGED
Copyright 2019-2024 New Vector Ltd.
Copyright 2019 The Matrix.org Foundation C.I.C.
Copyright 2015, 2016 OpenMarket Ltd

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-02-06
*/

import React from "react";

import flag from "../../../../res/img/pg-flag-bg.svg";

interface IProps {
    /**
     * Whether to add a blurred shadow around the modal.
     *
     * If the modal component provides its own shadow or blurring, this can be
     * disabled.  Defaults to `true`.
     */
    addBlur?: boolean;
}

export default class AuthPage extends React.PureComponent<React.PropsWithChildren<IProps>> {

    public render(): React.ReactElement {
        const pageStyle = {
            background: 'var(--cpd-color-yellow-200)',
        };

        const flagStyle: React.CSSProperties = {
            position: 'absolute',
            filter: "blur(40px)",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%'
        };

        const modalStyle: React.CSSProperties = {
            position: "relative",
            background: "initial",
        };

        const blurStyle: React.CSSProperties = {
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            filter: "blur(40px)",
            background: pageStyle.background,
        };

        const modalContentStyle: React.CSSProperties = {
            display: "flex",
            zIndex: 1,
            borderRadius: "inherit",
        };

        let modalBlur;
        if (this.props.addBlur !== false) {
            // Blur out the background: add a `div` which covers the content behind the modal,
            // and blurs it out.
            modalBlur = <div className="mx_AuthPage_modalBlur" style={blurStyle} />;
        }

        return (
            <div className="mx_AuthPage" style={pageStyle}>
                <div style={flagStyle}>
                    <img src={flag} alt={"Belgian Flag Background"} />
                </div>
                <div className="mx_AuthPage_modal" style={modalStyle}>
                    <div className="mx_AuthPage_modalBlur" style={blurStyle} />
                    <div className="mx_AuthPage_modalContent glass" style={modalContentStyle}>
                        {this.props.children}
                    </div>
                </div>
            </div>
        );
    }
}
