/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-02-06
*/

// PG_CHANGED: Changes to support QR code login on new devices using MSC4108 and OIDC Device Authorization

import React from "react";
import {
    ClientRendezvousFailureReason,
    MSC4108FailureReason,
    MSC4108RendezvousSession,
    MSC4108SecureChannel,
    MSC4108SignInWithQR,
    RendezvousError,
    type RendezvousFailureReason,
    RendezvousIntent,
} from "matrix-js-sdk/src/rendezvous";
import { logger } from "matrix-js-sdk/src/logger";
import { type MatrixClient } from "matrix-js-sdk/src/matrix";
import { createClient } from "matrix-js-sdk/src/matrix";
import * as Lifecycle from "../../../Lifecycle";
import { Click, Mode, Phase } from "./LoginWithQR-types";
import LoginWithQRFlow from "./LoginWithQRFlow";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import dis from "../../../dispatcher/dispatcher";
import { finalizePostLoginCrypto } from "../../../utils/crypto/PGFinalizePostLoginCrypto";
import PlatformPeg from "../../../PlatformPeg";
import SdkConfig from "../../../SdkConfig";
import {
    DeviceFlowTimeoutError,
    DeviceFlowAbortedError,
    DeviceFlowAuthorizationError,
    pollDeviceToken,
    type DeviceTokenResponse,
} from "../../../utils/oauth/PGPollDeviceToken";
import { initiateQrDeviceAuth } from "../../../utils/oauth/PGQrDeviceAuth";
import { _t } from "../../../languageHandler";
import { startRendezvousCancelWatcher, type CancelWatcherResult } from "../../../utils/rendezvous/PGCancelWatcher";
import { startPageLeaveGuard, type PageLeaveGuardResult } from "../../../utils/navigation/PGPageLeaveGuard";
import { Action } from "../../../dispatcher/actions";

interface IProps {
    client?: MatrixClient;
    mode: Mode;
    onFinished(success: boolean): void;
}

interface IState {
    phase: Phase;
    rendezvous?: MSC4108SignInWithQR;
    mediaPermissionError?: boolean;
    verificationUri?: string;
    userCode?: string;
    checkCode?: string;
    failureReason?: FailureReason;
    serverName?: string;
    rendezvousHomeserverUrl?: string; // Pre-fetched rendezvous server endpoint (homeserver rendezvous endpoint, not actual active rendezvous URL)
    activeRendezvousUrl?: string; // URL returned by POST creating the rendezvous session
    isLongLivedSession: boolean; // PG_CHANGED: Whether to stay logged in for 30 days
}

export enum LoginWithQRFailureReason {
    RateLimited = "rate_limited",
    CheckCodeMismatch = "check_code_mismatch",
}

export type FailureReason = RendezvousFailureReason | LoginWithQRFailureReason;

/**
 * A component that allows sign in and E2EE set up with a QR code.
 *
 * It implements `login.reciprocate` & `login.start` capabilities and showing QR codes.
 *
 * This uses the unstable feature of MSC4108: https://github.com/matrix-org/matrix-spec-proposals/pull/4108
 */
export default class LoginWithQR extends React.Component<IProps, IState> {
    private finished = false;
    private isEstablishingConnection = false;
    private isFetchingRendezvousHomeserverUrl = false;
    private cancelWatcher?: CancelWatcherResult;
    private pageLeaveGuard?: PageLeaveGuardResult;

    public constructor(props: IProps) {
        super(props);

        this.state = {
            // PG_CHANGED: only login with web is QR code, show the QR code view but don't start the flow yet.
            phase: Phase.Intro,
            isLongLivedSession: false, // PG_CHANGED: Default unchecked
        };
    }

    private get ourIntent(): RendezvousIntent {
        // Select intent based on requested mode
        return this.props.mode === Mode.Login
            ? RendezvousIntent.LOGIN_ON_NEW_DEVICE
            : RendezvousIntent.RECIPROCATE_LOGIN_ON_EXISTING_DEVICE;
    }

    public componentDidMount(): void {
        // PG_CHANGED
        // this.updateMode();
        const isLogin = this.ourIntent === RendezvousIntent.LOGIN_ON_NEW_DEVICE;
        if (isLogin) {
            this.fetchRendezvousUrl();
        }
    }

    public componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IState>): void {
        if (prevProps.mode !== this.props.mode) {
            this.updateMode();
        }

        if (prevState.phase !== this.state.phase) {
            if (this.isLivePhase(this.state.phase)) {
                this.startPageLeaveGuard();
            } else {
                this.stopPageLeaveGuard();
            }

            // Auto-manage cancel watcher: active only during OutOfBandConfirmation for LOGIN_ON_NEW_DEVICE
            if (
                this.state.phase === Phase.OutOfBandConfirmation &&
                this.ourIntent === RendezvousIntent.LOGIN_ON_NEW_DEVICE
            ) {
                this.startCancelWatcher();
            } else {
                this.stopCancelWatcher();
            }
        }

        if (!prevState.rendezvousHomeserverUrl && !!this.state.rendezvousHomeserverUrl) {
            if (sessionStorage.getItem("qr_auto_enable")) {
                sessionStorage.removeItem("qr_auto_enable");
                this.updateMode();
            }
        }
    }

    private async updateMode(): Promise<void> {
        this.setState({ phase: Phase.Loading });
        // Reset the establishing flag so a new connection can be started
        this.isEstablishingConnection = false;

        if (this.state.rendezvous) {
            const rendezvous = this.state.rendezvous;
            // Detach listeners and cancel the existing rendezvous to stop polling on the server
            rendezvous.onFailure = undefined;
            this.setState({ rendezvous: undefined });

            try {
                await rendezvous.cancel(MSC4108FailureReason.UserCancelled);
            } catch (e) {
                logger.warn("Failed to cancel existing rendezvous", e);
            }
        }

        await this.generateAndShowCode();
    }

    public componentWillUnmount(): void {
        this.stopCancelWatcher();
        this.stopPageLeaveGuard();

        if (this.state.rendezvous && !this.finished) {
            // eslint-disable-next-line react/no-direct-mutation-state
            this.state.rendezvous.onFailure = undefined;
            // calling cancel will call close() as well to clean up the resources
            this.state.rendezvous
                .cancel(MSC4108FailureReason.UserCancelled)
                .catch((e) => logger.warn("Failed to cancel rendezvous during unmount", e));
        }
    }

    private onFinished(success: boolean): void {
        this.finished = true;
        this.props.onFinished(success);
    }

    // Phases which is considered "live" and should trigger page leave guard.
    private isLivePhase(phase: Phase): boolean {
        return (
            phase === Phase.OutOfBandConfirmation ||
            phase === Phase.WaitingForDevice ||
            phase === Phase.Verifying ||
            phase === Phase.ConfirmingOnOtherDevice ||
            phase === Phase.GettingSecrets
        );
    }

    private startPageLeaveGuard(): void {
        if (this.pageLeaveGuard) return;
        this.pageLeaveGuard = startPageLeaveGuard({
            shouldGuard: () => this.isLivePhase(this.state.phase),
            onPageHide: () => {
                try {
                    this.state.rendezvous?.cancel(MSC4108FailureReason.UserCancelled);
                } catch {}

                // Incase user leaves the page after login but before secrets are shared.
                Lifecycle.logout();

                /*
                   Even though rendezvous.cancel should normally also delete the rendezvous session it does not work consistently
                   when leaving the page. 
                */
                const url = this.state.activeRendezvousUrl;
                if (url) {
                    fetch(url, { method: "DELETE", keepalive: true }).catch(() => {});
                }
            },
        });
    }

    private stopPageLeaveGuard(): void {
        this.pageLeaveGuard?.stop();
        this.pageLeaveGuard = undefined;
    }

    private generateAndShowCode = async (): Promise<void> => {
        if (this.isEstablishingConnection) return;
        this.isEstablishingConnection = true;

        try {
            const rendezvous = await this.establishRendezvousConnection();
            if (!rendezvous) return; // Error already handled

            await this.negotiateAndSetupFlow(rendezvous);
        } finally {
            this.isEstablishingConnection = false;
        }
    };

    private fetchRendezvousUrl = async (): Promise<void> => {
        if (this.isFetchingRendezvousHomeserverUrl || this.state.rendezvousHomeserverUrl) {
            return;
        }

        this.isFetchingRendezvousHomeserverUrl = true;
        this.setState({ phase: Phase.Loading });

        try {
            const apiUrl = SdkConfig.get().pg_service_url;
            if (!apiUrl) {
                throw new Error("PG service URL not configured");
            }

            const response = await fetch(`${apiUrl}/homeserver/rendezvous-url`, {
                method: "GET",
            });

            if (!response.ok) {
                throw new Error(_t("pg|auth|qr_code_login|error_rendezvous"));
            }
            const data = await response.json();

            this.setState({
                rendezvousHomeserverUrl: data.url,
                phase: Phase.Intro,
            });
        } catch (error) {
            logger.error("Error prefetching rendezvous URL:", error);
            this.setState({
                phase: Phase.Error,
                failureReason: ClientRendezvousFailureReason.Unknown,
            });
        } finally {
            this.isFetchingRendezvousHomeserverUrl = false;
        }
    };

    private async establishRendezvousConnection(): Promise<MSC4108SignInWithQR | undefined> {
        const isReciprocate = this.ourIntent === RendezvousIntent.RECIPROCATE_LOGIN_ON_EXISTING_DEVICE;

        try {
            const transport = new MSC4108RendezvousSession({
                onFailure: this.onFailure,
                ...(isReciprocate
                    ? { client: this.props.client }
                    : { fallbackRzServer: this.state.rendezvousHomeserverUrl }),
            });
            await transport.send("");
            const channel = new MSC4108SecureChannel(transport, undefined, this.onFailure);
            const rendezvous = new MSC4108SignInWithQR(
                channel,
                false,
                isReciprocate ? this.props.client : undefined,
                this.onFailure,
            );

            await rendezvous.generateCode();

            this.setState({
                phase: Phase.ShowingQR,
                rendezvous,
                failureReason: undefined,
                activeRendezvousUrl: transport.url,
            });

            return rendezvous;
        } catch (e) {
            logger.error("Error whilst generating QR code", e);
            this.setState({
                phase: Phase.Error,
                failureReason: ClientRendezvousFailureReason.HomeserverLacksSupport,
            });
            this.isEstablishingConnection = false;
            return undefined;
        }
    }

    // Incase other device cancels the flow during out-of-band confirmation (=when the new device does not poll the rendezvous endpoint)
    private startCancelWatcher(): void {
        this.stopCancelWatcher();
        const url = this.state.activeRendezvousUrl;
        if (!url) return;

        this.cancelWatcher = startRendezvousCancelWatcher(url, (reason) => {
            this.onFailure(reason);
        });
    }

    private stopCancelWatcher(): void {
        this.cancelWatcher?.stop();
        this.cancelWatcher = undefined;
    }

    private async negotiateAndSetupFlow(rendezvous: MSC4108SignInWithQR): Promise<void> {
        try {
            const { serverName } = await rendezvous.negotiateProtocols();

            const isReciprocate = this.ourIntent === RendezvousIntent.RECIPROCATE_LOGIN_ON_EXISTING_DEVICE;

            // MSC4108-Flow 04: NewScanned (this device is already signed-in, other is new)
            if (isReciprocate) {
                const { verificationUri } = await rendezvous.deviceAuthorizationGrant();
                this.setState({
                    phase: Phase.OutOfBandConfirmation,
                    verificationUri,
                });
                return;
            }

            // MSC4108-Flow 03: ExistingScanned (this device is new)
            // Keep showing the QR while we wait for the other device to scan and connect
            // Prompt for the 2-digit check code shown on the existing device to verify the secure channel
            this.setState({ phase: Phase.OutOfBandConfirmation, serverName });
        } catch (e: RendezvousError | unknown) {
            logger.error("Error whilst negotiating protocols", e);
            await rendezvous?.cancel(e instanceof RendezvousError ? e.code : ClientRendezvousFailureReason.Unknown);
        }
    }

    private approveLogin = async (checkCode: string | undefined): Promise<void> => {
        const rendezvous = this.state.rendezvous;
        if (!(rendezvous instanceof MSC4108SignInWithQR)) {
            this.setState({ phase: Phase.Error, failureReason: ClientRendezvousFailureReason.Unknown });
            throw new Error("Rendezvous not found");
        }

        if (rendezvous?.checkCode !== checkCode) {
            this.setState({ failureReason: LoginWithQRFailureReason.CheckCodeMismatch });
            return;
        }

        const abort = new AbortController();

        try {
            // Reciprocal mode
            if (this.ourIntent == RendezvousIntent.RECIPROCATE_LOGIN_ON_EXISTING_DEVICE) {
                await this.handleReciprocateLogin(rendezvous);
                return;
            }

            // Login mode
            await this.handleNewDeviceLogin(rendezvous, abort);
        } catch (e) {
            logger.error("Error whilst approving sign in", e);

            let failureReason: FailureReason;
            if (e instanceof RendezvousError) {
                failureReason = e.code;
            } else if (e instanceof DeviceFlowTimeoutError) {
                failureReason = ClientRendezvousFailureReason.Expired;
            } else if (e instanceof DeviceFlowAbortedError) {
                failureReason = MSC4108FailureReason.UserCancelled;
            } else if (e instanceof DeviceFlowAuthorizationError) {
                failureReason = ClientRendezvousFailureReason.Unknown;
            } else {
                failureReason = ClientRendezvousFailureReason.Unknown;
            }

            this.setState({
                phase: Phase.Error,
                failureReason,
            });
        } finally {
            // Ensure background work stops if component unmounts or mode changes
            abort.abort();
            // Best-effort close rendezvous on errors
            rendezvous.close();
        }
    };

    private async handleReciprocateLogin(rendezvous: MSC4108SignInWithQR): Promise<void> {
        this.setState({ phase: Phase.Loading });

        if (this.state.verificationUri) {
            window.open(this.state.verificationUri, "_blank");
        }

        this.setState({ phase: Phase.WaitingForDevice });

        await rendezvous.shareSecrets();
        await rendezvous.close();

        this.onFinished(true);
    }

    private async handleNewDeviceLogin(rendezvous: MSC4108SignInWithQR, abort: AbortController): Promise<void> {
        this.setState({ phase: Phase.ConfirmingOnOtherDevice });
        const tempClient = createClient({ baseUrl: this.state.serverName! });

        // 1) Get device authorization and setup OIDC flow
        const { authMeta, deviceAuthData } = await initiateQrDeviceAuth(
            tempClient,
            rendezvous,
            abort,
            this.state.isLongLivedSession,
        );

        // 2) Show user code and poll for token
        this.setState({ phase: Phase.WaitingForDevice, userCode: deviceAuthData.user_code });
        const tokenJson = await pollDeviceToken(authMeta, deviceAuthData, {
            signal: abort.signal,
        });

        tempClient.setAccessToken(tokenJson.access_token!);

        // 3) Create Matrix session and finalize login
        await this.finalizeLogin(tempClient, rendezvous, tokenJson, deviceAuthData.usedClientId);
    }

    private async finalizeLogin(
        client: MatrixClient,
        rendezvous: MSC4108SignInWithQR,
        tokenJson: DeviceTokenResponse,
        clientId: string,
    ): Promise<void> {
        try {
            // PG_CHANGED: Persist the credentials *and* the OAuth client id, then start the session from storage.
            // `Lifecycle.setLoggedIn` must not be used for OAuth sessions: it wipes storage before creating the
            // client, so the client id would not be readable yet and the client would be built without a token
            // refresher (the session would then be signed out as soon as the access token expires).
            const { deviceId: returnedDeviceId } = await Lifecycle.configureFromCompletedOAuthLogin({
                accessToken: tokenJson.access_token!,
                refreshToken: tokenJson.refresh_token,
                homeserverUrl: client.baseUrl,
                identityServerUrl: client.idBaseUrl,
                clientId,
            });

            await Lifecycle.restoreSessionFromStorage({ ignoreGuest: true });

            // PG_CHANGED: Set the device display name after QR login
            const matrixClient = MatrixClientPeg.safeGet();
            const deviceDisplayName =
                SdkConfig.get("default_device_display_name") ?? PlatformPeg.get()?.getDefaultDeviceDisplayName();
            if (deviceDisplayName && returnedDeviceId) {
                try {
                    await matrixClient.setDeviceDetails(returnedDeviceId, { display_name: deviceDisplayName });
                } catch (e) {
                    logger.warn("Failed to set device display name after QR login", e);
                }
            }

            this.setState({ phase: Phase.GettingSecrets });

            // Receive secrets
            const { secrets } = await rendezvous.shareSecrets();

            await rendezvous.close();

            // Mark that we're importing secrets from QR login to avoid secret storage dialog later
            sessionStorage.setItem("pg_qr_login_secrets_imported", "true");

            await finalizePostLoginCrypto(MatrixClientPeg.safeGet(), secrets);

            dis.dispatch({ action: Action.ViewHomePage });

            this.onFinished(true);
        } catch (error) {
            logger.error(`Error finalizeLogin:`, error);
            Lifecycle.logout();

            this.setState({
                phase: Phase.Error,
                failureReason: ClientRendezvousFailureReason.Unknown,
            });
        }
    }

    private onFailure = (reason: RendezvousFailureReason): void => {
        if (this.state.phase === Phase.Error) return; // Already in failed state
        logger.info(`Rendezvous failed: ${reason}`);
        this.setState({ phase: Phase.Error, failureReason: reason });
    };

    public reset(): void {
        // PG_CHANGED: reload so lock on indexDB is released
        sessionStorage.setItem("qr_auto_enable", "true");
        window.location.reload();
    }

    // PG_CHANGED
    private onLongLivedSessionChange = (checked: boolean): void => {
        this.setState({ isLongLivedSession: checked });
    };

    private onClick = async (type: Click, checkCode?: string): Promise<void> => {
        const rendezvous = this.state.rendezvous;

        try {
            switch (type) {
                case Click.Cancel:
                    await rendezvous?.cancel(MSC4108FailureReason.UserCancelled);
                    this.onFinished(false);
                    break;
                case Click.Approve:
                    await this.approveLogin(checkCode);
                    break;
                case Click.Decline:
                    await rendezvous?.declineLoginOnExistingDevice();
                    this.onFinished(false);
                    break;
                case Click.Back:
                    await rendezvous?.cancel(MSC4108FailureReason.UserCancelled);
                    this.onFinished(false);
                    break;
                case Click.ShowQr:
                    await this.updateMode();
                    break;
                case Click.Retry:
                    this.reset();
                    await this.updateMode();
                    break;
            }
        } catch (e) {
            logger.error(`Error handling click action ${type}:`, e);
            this.setState({
                phase: Phase.Error,
                failureReason: e instanceof RendezvousError ? e.code : ClientRendezvousFailureReason.Unknown,
            });
        }
    };

    public render(): React.ReactNode {
        return (
            <LoginWithQRFlow
                onClick={this.onClick}
                phase={this.state.phase}
                code={this.state.phase === Phase.ShowingQR ? this.state.rendezvous?.code : undefined}
                failureReason={this.state.failureReason}
                userCode={this.state.userCode}
                checkCode={this.state.checkCode}
                rendezvousIntent={this.ourIntent}
                // PG_CHANGED
                longLivedSession={this.state.isLongLivedSession}
                onLongLivedSessionChange={this.onLongLivedSessionChange}
            />
        );
    }
}
