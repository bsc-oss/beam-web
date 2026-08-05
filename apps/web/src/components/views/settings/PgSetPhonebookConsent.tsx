/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2025 Belgian Secure Communications
Copyright 2024 New Vector Ltd.
Copyright 2019 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-02-06
*/

import React, { useCallback, useState } from "react";
import { logger } from "matrix-js-sdk/src/logger";
import { Root, Field, RadioControl, InlineSpinner } from "@vector-im/compound-web";
import WarningIcon from "@vector-im/compound-design-tokens/assets/web/icons/warning";
import { ChevronDownIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t, type TranslationKey } from "../../../languageHandler";
import Heading from "../typography/Heading";
import { SettingsSubsectionText } from "./shared/SettingsSubsection";
import { useMatrixClientContext } from "../../../contexts/MatrixClientContext";
import { OwnProfileStore } from "../../../stores/OwnProfileStore";
import { PGPhoneBookConsentType } from "matrix-js-sdk";

interface ConsentOption {
    value: PGPhoneBookConsentType;
    titleKey: TranslationKey;
    subtitleKey: TranslationKey;
    bullets: TranslationKey[];
    warningKey?: TranslationKey;
}

const consentOptions: ConsentOption[] = [
    {
        value: "Full",
        titleKey: "pg|settings|general|consent_full_title",
        subtitleKey: "pg|settings|general|consent_full_subtitle",
        bullets: [
            "pg|settings|general|consent_full_bullet1",
            "pg|settings|general|consent_full_bullet2",
        ],
    },
    {
        value: "Limited",
        titleKey: "pg|settings|general|consent_limited_title",
        subtitleKey: "pg|settings|general|consent_limited_subtitle",
        bullets: [
            "pg|settings|general|consent_limited_bullet1",
            "pg|settings|general|consent_limited_bullet2",
        ],
        warningKey: "pg|settings|general|consent_limited_warning",
    },
    {
        value: "None",
        titleKey: "pg|settings|general|consent_none_title",
        subtitleKey: "pg|settings|general|consent_none_subtitle",
        bullets: [
            "pg|settings|general|consent_none_bullet1",
            "pg|settings|general|consent_none_bullet2",
        ],
        warningKey: "pg|settings|general|consent_none_warning",
    },
];

const PGSetPhonebookConsent: React.FC = () => {
    const client = useMatrixClientContext();
    const [consentType, setConsentType] = useState<PGPhoneBookConsentType | null>(
        OwnProfileStore.instance.phoneBookConsentType,
    );
    const [consentError, setConsentError] = useState<boolean>(false);
    const [isUpdating, setIsUpdating] = useState<boolean>(false);

    const onConsentChanged = useCallback(
        async (newConsentType: PGPhoneBookConsentType) => {
            setConsentError(false);
            setIsUpdating(true);
            const previousConsentType = consentType;
            setConsentType(newConsentType);

            try {
                const startTime = Date.now();
                await client.setPhonebookConsent(newConsentType);
                const elapsed = Date.now() - startTime;
                const minLoadingTimeMs = 500;
                if (elapsed < minLoadingTimeMs) {
                    await new Promise((resolve) => setTimeout(resolve, minLoadingTimeMs - elapsed));
                }
            } catch (e) {
                logger.error("Error changing phonebook consent", e);
                setConsentType(previousConsentType);
                setConsentError(true);
            } finally {
                setIsUpdating(false);
            }
        },
        [client, consentType],
    );

    return (
        <div className="mx_SetPhonebookConsent" data-testid="mx_SetPhonebookConsent">
            <div className="mx_SettingsFlag">
                <div className="mx_SetPhonebookConsent_heading_manager">
                    <Heading size="4">{_t("pg|settings|general|consent_title")}</Heading>
                </div>
            </div>
            <SettingsSubsectionText>{_t("pg|settings|general|consent_body")}</SettingsSubsectionText>
            <Root className="mx_SetPhonebookConsent_options">
                {consentOptions.map((option) => (
                    <details key={option.value} className="mx_SetPhonebookConsent_option">
                        <summary className="mx_SetPhonebookConsent_option_summary">
                            <Field name="consentType" className="mx_SetPhonebookConsent_option_field">
                                {isUpdating && consentType === option.value ? (
                                    <InlineSpinner />
                                ) : (
                                    <RadioControl
                                        name="consentType"
                                        value={option.value}
                                        checked={consentType === option.value}
                                        onChange={() => onConsentChanged(option.value)}
                                        disabled={isUpdating}
                                    />
                                )}
                            </Field>
                            <div className="mx_SetPhonebookConsent_option_header">
                                <span className="mx_SetPhonebookConsent_option_title">
                                    {_t(option.titleKey)}
                                </span>
                                <span className="mx_SetPhonebookConsent_option_subtitle">
                                    {_t(option.subtitleKey)}
                                </span>
                            </div>
                            <ChevronDownIcon className="mx_SetPhonebookConsent_option_chevron" />
                        </summary>
                        <div className="mx_SetPhonebookConsent_option_content">
                            <ul className="mx_SetPhonebookConsent_option_bullets">
                                {option.bullets.map((bulletKey, index) => (
                                    <li key={index}>
                                        {_t(bulletKey, { mxId: client.getUserId() }, { b: (sub: string) => <strong>{sub}</strong> })}
                                    </li>
                                ))}
                            </ul>
                            {option.warningKey && (
                                <div className="mx_SetPhonebookConsent_option_warning">
                                    <WarningIcon className="mx_SetPhonebookConsent_option_warning_icon" />
                                    <span>{_t(option.warningKey)}</span>
                                </div>
                            )}
                        </div>
                    </details>
                ))}
                {consentError && (
                    <div className="mx_SetPhonebookConsent_error">
                        <WarningIcon className="mx_SetPhonebookConsent_error_icon" />
                        <span>{_t("pg|settings|general|consent_error")}</span>
                    </div>
                )}
            </Root>
            <p className="mx_SetPhonebookConsent_disclaimer">{_t("pg|settings|general|consent_disclaimer")}</p>
        </div>
    );
};

export default PGSetPhonebookConsent;
