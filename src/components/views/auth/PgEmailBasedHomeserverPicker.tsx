//
// Copyright 2026 Belgian Secure Communications (BSC)
//
// SPDX-License-Identifier: AGPL-3.0-only
// Please see LICENSE files in the repository root for full details.
//

import React, { useState } from "react";

import { _t } from "../../../languageHandler";
import AccessibleButton from "../elements/AccessibleButton";
import { type ValidatedServerConfig } from "../../../utils/ValidatedServerConfig";
import { PGHomeserverLookupService } from "../../../utils/PGHomeserverLookupService";
import StyledCheckbox from "../elements/StyledCheckbox";
import ExternalLink from "../elements/ExternalLink";
import { CheckIcon, EmailIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import Field from "../elements/Field";
import { IFieldState, IValidationResult } from "../elements/Validation";
import * as Email from "../../../email";

interface IProps {
    onHomeserverSelected: (config: ValidatedServerConfig, email: string) => void;
}

const PGEmailBasedHomeserverPicker = ({
    onHomeserverSelected,
}: IProps) => {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isTermsChecked, setIsTermsChecked] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [errorMessageTerms, setErrorMessageTerms] = useState<string | null>(null);

    const handleTermsCheckedChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setErrorMessageTerms("");
        setIsTermsChecked(e.target.checked);
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setEmail(e.target.value);
        // Clear error when email is changed
        if (errorMessage) {
            setErrorMessage(null);
        }
    };

    const validateFields = (): boolean => {
        let isValid = true;

        if (!Email.looksValid(email)){
            setErrorMessage(_t("pg|auth|homeserver_selector|lookup_invalid_email"));
            isValid = false;
        }

        if (!isTermsChecked) {
            setErrorMessageTerms(_t("pg|auth|homeserver_selector|lookup_terms_not_checked"));
            isValid = false;
        }

        return isValid;
    }

    const lookupHomeserverFromEmail = async (): Promise<void> => {
        if (!validateFields()) {
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        try {
            const result = await PGHomeserverLookupService.lookupByEmail(email);
            onHomeserverSelected(result.config, result.email);
        } catch (error) {
            if (error instanceof Error) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage(_t("pg|auth|homeserver_selector|lookup_failed"));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const onValidateEmail = async (fieldState: IFieldState): Promise<IValidationResult> => {
        if (Email.looksValid(fieldState.value ?? "")) {
            return { valid: true };
        }

        return {
            valid: false,
            feedback: _t("pg|auth|homeserver_selector|lookup_invalid_email")
        };
    };

    return (
        <div className="pg_EmailBasedHomeserverPicker">
            <div className="pg_EmailBasedHomeserverPicker_header">
                <h2>{_t("pg|auth|homeserver_selector|title")}</h2>
                <p>{_t("pg|auth|homeserver_selector|subtitle")}</p>
            </div>

            <div className="pg_EmailBasedHomeserverPicker_inputContainer">
                <Field
                    className="pg_EmailBasedHomeserverPicker_Field"
                    label={_t("auth|email_address")}
                    labelPlacement="before"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    onValidate={onValidateEmail}
                    autoFocus
                    autoComplete="email"
                    disabled={isLoading}
                    validateOnFocus={false}
                    prefixComponent={
                        <EmailIcon
                            width={20}
                            height={20} />}

                />

                {errorMessage && <div className="pg_EmailBasedHomeserverPicker_error">{errorMessage}</div>}

                <StyledCheckbox
                    checked={isTermsChecked}
                    onChange={handleTermsCheckedChange}
                    className="pg_EmailBasedHomeserverPicker_Check"
                >
                    {_t("pg|auth|terms_of_service_one")}
                    &nbsp;
                    <ExternalLink style={{ fontWeight: 'bold' }} href="https://web.testserver.local" rel="norefferer noopener" target="_blank">
                        {_t("pg|auth|terms_of_service_two")}
                    </ExternalLink>
                </StyledCheckbox>
                {errorMessageTerms && <div className="pg_EmailBasedHomeserverPicker_error">{errorMessageTerms}</div>}
                <AccessibleButton
                    kind="primary"
                    onClick={() => lookupHomeserverFromEmail()}
                    disabled={isLoading}
                    className="pg_EmailBasedHomeserverPicker_submitButton"
                >
                    <CheckIcon
                        width={25}
                        height={25} />
                    {(isLoading) ? _t("pg|auth|homeserver_selector|looking_up") : _t("pg|auth|homeserver_selector|continue_with_email")}
                </AccessibleButton>
            </div>
        </div>
    );
};

export default PGEmailBasedHomeserverPicker;
