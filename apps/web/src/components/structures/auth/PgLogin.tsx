//
// Copyright 2026 Belgian Secure Communications (BSC)
//
// SPDX-License-Identifier: AGPL-3.0-only
// Please see LICENSE files in the repository root for full details.
//

import React, { type ReactNode } from "react";
import { logger } from "matrix-js-sdk/src/logger";
import QrCodeIcon from "@vector-im/compound-design-tokens/assets/web/icons/qr-code";

import { _t } from "../../../languageHandler";
import Login, { type ClientLoginFlow, type OAuthNativeFlow } from "../../../Login";
import { type IServiceMessageDisplay } from "../../../utils/PgServiceMessage.ts";
import { type ValidatedServerConfig } from "../../../utils/ValidatedServerConfig";
import { startOAuthLogin } from "../../../utils/oauth/authorize";
import SdkConfig from "../../../SdkConfig";
import AuthPage from "../../views/auth/AuthPage";
import AuthBody from "../../views/auth/AuthBody";
import AuthHeader from "../../views/auth/AuthHeader";
import Spinner from "../../views/elements/Spinner";
import AccessibleButton from "../../views/elements/AccessibleButton";
import LoginWithQR from "../../views/auth/LoginWithQR";
import { Mode } from "../../views/auth/LoginWithQR-types";
import PGEmailBasedHomeserverPicker from "../../views/auth/PgEmailBasedHomeserverPicker";

interface IProps {
    isSyncing?: boolean;
    serverConfig: ValidatedServerConfig;
    onServerConfigChange(config: ValidatedServerConfig): void;
    serviceMessage?: IServiceMessageDisplay;
}

interface IState {
    loginHint: string;
    showEmailHomeserverPicker: boolean;
    busy: boolean;
    errorText?: ReactNode;
    showQrLogin: boolean;
}

/*
 * A simplified component focused on OIDC auto-start functionality for the PG Authorization flow
 */
export default class PgLoginComponent extends React.PureComponent<IProps, IState> {
    private readonly isEmailLoginEnabled = SdkConfig.get().pg_enable_email_login;

    public constructor(props: IProps) {
        super(props);

        this.state = {
            loginHint: "",
            showEmailHomeserverPicker: true,
            busy: false,
            errorText: null,
            showQrLogin: false,
        };
    }

    public componentDidMount(): void {
        if (this.isEmailLoginEnabled) {
            this.initLoginLogic(this.props.serverConfig);
        }
    }

    public componentDidUpdate(prevProps: IProps): void {
        if (this.isEmailLoginEnabled) {
            if (
                prevProps.serverConfig.hsUrl !== this.props.serverConfig.hsUrl ||
                prevProps.serverConfig.isUrl !== this.props.serverConfig.isUrl ||
                // delegatedAuthentication is only set by buildValidatedConfigFromDiscovery and won't be modified
                // so shallow comparison is fine
                prevProps.serverConfig.delegatedAuthentication !== this.props.serverConfig.delegatedAuthentication
            ) {
                // Ensure that we end up actually logging in to the right place
                this.initLoginLogic(this.props.serverConfig);
            }
        }
    }

    private async initLoginLogic({ hsUrl, isUrl }: ValidatedServerConfig): Promise<void> {
        this.setState({ busy: true, errorText: null });

        if (this.state.showEmailHomeserverPicker) {
            return;
        }

        if (!hsUrl) {
            this.setState({
                errorText: _t("pg|auth|invalid_auth_state", {
                    errorCode: "04",
                }),
                busy: false,
            });
            return;
        }

        const loginLogic = new Login(hsUrl, isUrl, null, {
            delegatedAuthentication: this.props.serverConfig.delegatedAuthentication,
        });

        // Skip auto-start flows when in QR login mode
        if (this.state.showQrLogin) {
            this.setState({ busy: false });
            return;
        }

        loginLogic
            .getFlows()
            .then(
                (flows) => {
                    this.autoStartOidcIfAvailable(flows);
                },
                (err) => {
                    // Handle error
                    this.setState({
                        errorText: _t("pg|auth|invalid_auth_state", {
                            errorCode: "05",
                        }),
                    });
                },
            )
            .finally(() => {
                this.setState({ busy: false });
            });
    }

    private async autoStartOidcIfAvailable(flows: ClientLoginFlow[]): Promise<void> {
        const flow = flows.find((flow) => flow.type === "oauthNativeFlow") as OAuthNativeFlow;

        if (!this.state.loginHint) {
            this.setState({
                errorText: _t("pg|auth|homeserver_selector|auth_email_missing"),
            });
            return;
        }

        if (!flow) {
            this.setState({
                errorText: _t("pg|auth|invalid_auth_state", {
                    errorCode: "01",
                }),
            });
            return;
        }

        if (!this.props.serverConfig.delegatedAuthentication) {
            this.setState({
                errorText: _t("pg|auth|invalid_auth_state", {
                    errorCode: "02",
                }),
            });
            return;
        }

        try {
            await startOAuthLogin(
                this.props.serverConfig.delegatedAuthentication,
                flow.clientId,
                this.props.serverConfig.hsUrl,
                this.props.serverConfig.isUrl,
                undefined,
                this.state.loginHint,
            );
        } catch (error) {
            logger.error("PG AUTH - Failed to auto-start OIDC login:", error);
            this.setState({
                errorText: _t("pg|auth|invalid_auth_state", {
                    errorCode: "03",
                }),
            });
        }
    }

    private onHomeserverSelected = async (config: ValidatedServerConfig, email: string): Promise<void> => {
        this.props.onServerConfigChange(config);
        this.setState({
            showEmailHomeserverPicker: false,
            loginHint: email,
        });
    };

    private onQrLoginFinished = (success: boolean): void => {
        if (success) {
            // The LoginWithQR component handles the actual login
            return;
        }

        // QR login was cancelled or failed, go back to homeserver picker
        this.setState({
            showQrLogin: false,
            errorText: null,
        });
    };

    public render(): React.ReactNode {
        if (this.isEmailLoginEnabled && this.state.showEmailHomeserverPicker) {
            return (
                <AuthPage serviceMessage={this.props.serviceMessage}>
                    <AuthHeader />
                    <AuthBody>
                        <PGEmailBasedHomeserverPicker onHomeserverSelected={this.onHomeserverSelected} />
                        <hr />
                        <p>{_t("pg|auth|homeserver_selector|continue_with_qr")}</p>
                        <AccessibleButton
                            kind="primary"
                            onClick={() => {
                                this.setState({ showQrLogin: true, showEmailHomeserverPicker: false });
                            }}
                            className="pg_EmailBasedHomeserverPicker_submitButton"
                        >
                            <QrCodeIcon width={25} height={25} />
                            {_t("pg|auth|homeserver_selector|continue_with_qr")}
                        </AccessibleButton>
                    </AuthBody>
                </AuthPage>
            );
        }

        if (this.state.showQrLogin) {
            return (
                <AuthPage serviceMessage={this.props.serviceMessage}>
                    <AuthHeader />
                    <AuthBody>
                        <LoginWithQR mode={Mode.Login} onFinished={this.onQrLoginFinished} />
                    </AuthBody>
                </AuthPage>
            );
        }

        if (this.isEmailLoginEnabled) {
            const loader =
                !this.state.errorText && (this.state.busy || this.props.isSyncing) ? (
                    <div className="mx_Login_loader">
                        <Spinner />
                    </div>
                ) : null;

            const errorText = this.state.errorText;

            let errorTextSection;
            if (errorText) {
                errorTextSection = (
                    <div className="pg_Login_error_wrapper">
                        <div className="mx_PgLogin_error">{errorText}</div>
                        <AccessibleButton
                            kind="primary"
                            onClick={() => window.location.reload()}
                            style={{ marginTop: "16px" }}
                        >
                            {_t("action|reload")}
                        </AccessibleButton>
                    </div>
                );
            }

            return (
                <AuthPage serviceMessage={this.props.serviceMessage}>
                    <AuthHeader />
                    <AuthBody>
                        {loader}
                        {errorTextSection}
                    </AuthBody>
                </AuthPage>
            );
        }

        // Default fallback to QR login when config is disabled
        return (
            <AuthPage serviceMessage={this.props.serviceMessage}>
                <AuthHeader />
                <AuthBody>
                    <LoginWithQR mode={Mode.Login} onFinished={this.onQrLoginFinished} />
                </AuthBody>
            </AuthPage>
        );
    }
}
