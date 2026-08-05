//
// Copyright 2026 Belgian Secure Communications (BSC)
//
// SPDX-License-Identifier: AGPL-3.0-only
// Please see LICENSE files in the repository root for full details.
//

/* eslint-disable matrix-org/require-copyright-header */
import React, { type ReactElement, type CSSProperties } from "react";

import BaseDialog from "./BaseDialog";
import DialogButtons from "../elements/DialogButtons";
import { _t } from "../../../languageHandler";

// Styling based on ".mx_EventTile_content .markdown-body code:not(pre *)" from _EventTile.pcss
const codeStyle: CSSProperties = {
    backgroundColor: "var(--cpd-color-bg-subtle-secondary)",
    border: "1px solid var(--cpd-color-border-interactive-secondary)",
    borderRadius: "4px",
    padding: "2px 6px",
    fontFamily: "monospace",
    wordBreak: "break-all",
};

interface Props {
    /**
     * The destination URL that will be opened
     */
    url: string;
    /**
     * The text that was displayed to the user (anchor text)
     */
    displayedText: string;
    /**
     * Whether this link is considered suspicious (RTL override or host mismatch)
     */
    isSuspicious: boolean;
    /**
     * Callback when the dialog is closed
     * @param proceed - true if the user clicked Continue, false if cancelled
     */
    onFinished(proceed?: boolean): void;
}

/**
 * A dialog that warns users before opening external links.
 * Shows an enhanced warning for suspicious links (RTL characters or mismatched hosts).
 */
const ConfirmLinkDialog = ({ url, displayedText, isSuspicious, onFinished }: Props): ReactElement => {
    const onContinue = (): void => {
        onFinished(true);
    };

    const onCancel = (): void => {
        onFinished(false);
    };

    let title: string;
    let description: React.ReactNode;

    if (isSuspicious) {
        title = _t("pg|dialog|confirm_link|suspicious_title");
        description = (
            <div className="pg_ConfirmLinkDialog_content">
                <p>
                    {_t(
                        "pg|dialog|confirm_link|suspicious_message",
                        {
                            text: displayedText,
                            url: url,
                        },
                        {
                            code: (sub) => <code style={codeStyle}>{sub}</code>,
                        },
                    )}
                </p>
                <p>{_t("pg|dialog|confirm_link|suspicious_confirm")}</p>
            </div>
        );
    } else {
        title = _t("pg|dialog|confirm_link|general_title");
        description = (
            <div className="pg_ConfirmLinkDialog_content">
                <p>
                    {_t(
                        "pg|dialog|confirm_link|general_message",
                        { url },
                        {
                            code: (sub) => <code style={codeStyle}>{sub}</code>,
                        },
                    )}
                </p>
                <p>{_t("pg|dialog|confirm_link|general_confirm")}</p>
            </div>
        );
    }

    return (
        <BaseDialog
            className="pg_ConfirmLinkDialog"
            onFinished={onFinished}
            title={title}
            contentId="pg_ConfirmLinkDialog_content"
            hasCancel={true}
        >
            <div className="mx_Dialog_content" id="pg_ConfirmLinkDialog_content">
                {description}
            </div>
            <DialogButtons
                primaryButton={_t("action|continue")}
                primaryButtonClass={isSuspicious ? "danger" : undefined}
                onPrimaryButtonClick={onContinue}
                hasCancel={true}
                onCancel={onCancel}
            />
        </BaseDialog>
    );
};

export default ConfirmLinkDialog;
