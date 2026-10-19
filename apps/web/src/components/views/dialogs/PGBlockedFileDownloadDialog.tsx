//
// Copyright 2026 Belgian Secure Communications (BSC)
//
// SPDX-License-Identifier: AGPL-3.0-only
// Please see LICENSE files in the repository root for full details.
//

import React from "react";

import { _t } from "../../../languageHandler";
import BaseDialog from "./BaseDialog";
import DialogButtons from "../elements/DialogButtons";

interface Props {
    fileName: string;
    reason?: string;
    onFinished: () => void;
}

/**
 * Tells the user that a file cannot be downloaded because its file type is blocked.
 */
const PGBlockedFileDownloadDialog = ({ fileName, reason, onFinished }: Props): React.ReactElement => {
    const onOkClick = (): void => {
        onFinished();
    };

    return (
        <BaseDialog
            className="mx_BlockedFileDownloadDialog"
            onFinished={onOkClick}
            title={_t("pg|download_file|error_blocked_title")}
            contentId="mx_Dialog_content"
        >
            <div id="mx_Dialog_content">
                <p>
                    {_t("pg|download_file|error_file_type_blocked", {
                        fileName: fileName,
                        reason: reason ?? _t("pg|download_file|unknown_type"),
                    })}
                </p>
            </div>

            <DialogButtons
                primaryButton={_t("action|ok")}
                hasCancel={false}
                onPrimaryButtonClick={onOkClick}
                focus={true}
            />
        </BaseDialog>
    );
};

export default PGBlockedFileDownloadDialog;
