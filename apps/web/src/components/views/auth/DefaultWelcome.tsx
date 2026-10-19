/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { Button, Heading, Text } from "@vector-im/compound-web";

import { _t } from "../../../languageHandler";
import SdkConfig from "../../../SdkConfig.ts";
import { MatrixClientPeg } from "../../../MatrixClientPeg.ts";
import { isElementBranded } from "../../../branding.ts";
import { type ValidatedServerConfig } from "../../../utils/ValidatedServerConfig.ts";

interface Props {
    /**
     * The server config to use for QR code login
     */
    serverConfig: ValidatedServerConfig;
}

/**
 * Default welcome (/#/welcome) screen to render if not overridden by config.json
 * Links out to Login, Registration, QR Login & Directory (if guest access is supported)
 */
const DefaultWelcome: React.FC<Props> = () => {
    const brand = SdkConfig.get("brand");
    const branding = SdkConfig.getObject("branding");
    const logoUrl = branding?.get("auth_header_logo_url"); // PG_CHANGED: branding can be undefined

    const showGuestFunctions = !!MatrixClientPeg.get();
    const isElement = isElementBranded();

    // PG_CHANGED: upstream's welcome-screen QR login is not supported; the fork's QR login lives in PGLogin
    const body = (
        <div className="mx_DefaultWelcome_buttons">
            <Button as="a" href="#/login" kind="primary" size="md">
                {_t("action|sign_in")}
            </Button>
            <Button as="a" href="#/register" kind="secondary" size="md">
                {_t("action|create_account")}
            </Button>
            {showGuestFunctions && (
                <Button as="a" href="#/directory" kind="tertiary" size="md">
                    {_t("action|explore_rooms")}
                </Button>
            )}
        </div>
    );

    return (
        <div className="mx_DefaultWelcome">
            {/* PG_CHANGED: branding can be undefined */}
            <a href={branding?.get("logo_link_url")} target="_blank" rel="noopener" className="mx_DefaultWelcome_logo">
                <img src={logoUrl} alt={brand} />
            </a>
            <Heading as="h1" weight="semibold">
                {isElement ? _t("welcome|title_element") : _t("welcome|title_generic", { brand })}
            </Heading>
            {isElement && <Text size="md">{_t("welcome|tagline_element")}</Text>}

            {body}
        </div>
    );
};

export default DefaultWelcome;
