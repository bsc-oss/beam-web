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

import React, { type ReactNode } from "react";
import { ErrorSolidIcon, InfoSolidIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import flag from "../../../../res/img/pg-flag-bg.svg";
import { type IServiceMessageDisplay } from "../../../utils/PgServiceMessage.ts";

interface IProps {
    // PG_CHANGED
    serviceMessage?: IServiceMessageDisplay;
}

export default class AuthPage extends React.PureComponent<React.PropsWithChildren<IProps>> {
    // PG_CHANGED
    private renderServiceMessage(): ReactNode {
        const { serviceMessage } = this.props;
        if (!serviceMessage) {
            return null;
        }

        return (
            <div
                className={`pg_Login_serviceMessage${serviceMessage.isCritical ? " pg_Login_serviceMessage--critical" : ""}`}
                role="alert"
                aria-live="polite"
            >
                {serviceMessage.isCritical ? (
                    <ErrorSolidIcon
                        className="pg_Login_serviceMessageIcon"
                        color="var(--pg-pglogin-service-message-icon-color)"
                        width="20px"
                        height="20px"
                    />
                ) : (
                    <InfoSolidIcon
                        className="pg_Login_serviceMessageIcon"
                        color="var(--pg-pglogin-service-message-icon-color)"
                        width="20px"
                        height="20px"
                    />
                )}
                <div className="pg_Login_serviceMessageBody">
                    <div className="pg_Login_serviceMessageTitle">{serviceMessage.title}</div>
                    <div className="pg_Login_serviceMessageText">{serviceMessage.message}</div>
                </div>
            </div>
        );
    }

    public render(): React.ReactElement {
        const pageStyle = {
            background: "var(--cpd-color-yellow-200)",
        };

        const flagStyle: React.CSSProperties = {
            position: "absolute",
            filter: "blur(40px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
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

        return (
            <div className="mx_AuthPage" style={pageStyle}>
                <div style={flagStyle}>
                    <img src={flag} alt="Belgian Flag Background" />
                </div>
                {/* PG_CHANGED */}
                <div className="mx_AuthPage_content">
                    {this.renderServiceMessage()}
                    <div className="mx_AuthPage_modal" style={modalStyle}>
                        <div className="mx_AuthPage_modalBlur" style={blurStyle} />
                        <div className="mx_AuthPage_modalContent glass" style={modalContentStyle}>
                            {this.props.children}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
