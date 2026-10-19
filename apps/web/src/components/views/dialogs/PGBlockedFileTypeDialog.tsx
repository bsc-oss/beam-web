//
// Copyright 2026 Belgian Secure Communications (BSC)
//
// SPDX-License-Identifier: AGPL-3.0-only
// Please see LICENSE files in the repository root for full details.
//

import React from "react";

import { _t } from "../../../languageHandler";
import type ContentMessages from "../../../ContentMessages";
import BaseDialog from "./BaseDialog";
import DialogButtons from "../elements/DialogButtons";
import { getFileBlockedReason } from "../../../utils/PGFileBlockList";

interface Props {
    badFiles: File[];
    totalFiles: number;
    contentMessages: ContentMessages;
    onFinished: (upload?: boolean) => void;
}

/**
 * Tells the user about files that have blocked file types and cannot be uploaded.
 */
const BlockedFileTypeDialog = ({ badFiles, totalFiles, contentMessages, onFinished }: Props): React.ReactElement => {
    const onCancelClick = (): void => {
        onFinished(false);
    };

    const onUploadClick = (): void => {
        onFinished(true);
    };

    // Get the blocked reasons for display
    const blockedReasons = badFiles.map((file) => {
        const reason = getFileBlockedReason(file);
        return `${file.name} (${reason})`;
    });

    let message: React.ReactNode;
    let buttons: React.ReactNode;

    if (totalFiles === 1 && badFiles.length === 1) {
        // Single file, and it's blocked
        message = (
            <div>
                <p>
                    {_t("pg|upload_file|error_file_type_blocked", {
                        fileName: badFiles[0].name,
                        reason: getFileBlockedReason(badFiles[0]),
                    })}
                </p>
            </div>
        );
        buttons = (
            <DialogButtons
                primaryButton={_t("action|ok")}
                hasCancel={false}
                onPrimaryButtonClick={onCancelClick}
                focus={true}
            />
        );
    } else if (totalFiles === badFiles.length) {
        // All files are blocked
        message = (
            <div>
                <p>{_t("pg|upload_file|error_all_files_type_blocked")}</p>
                <ul>
                    {blockedReasons.map((reason, index) => (
                        // oxlint-disable-next-line react/no-array-index-key -- PG_CHANGED
                        <li key={index}>{reason}</li>
                    ))}
                </ul>
            </div>
        );
        buttons = (
            <DialogButtons
                primaryButton={_t("action|ok")}
                hasCancel={false}
                onPrimaryButtonClick={onCancelClick}
                focus={true}
            />
        );
    } else {
        // Some files are blocked, some are okay
        const howManyOthers = totalFiles - badFiles.length;
        message = (
            <div>
                <p>{_t("pg|upload_file|error_some_files_type_blocked")}</p>
                <ul>
                    {blockedReasons.map((reason, index) => (
                        // oxlint-disable-next-line react/no-array-index-key -- PG_CHANGED
                        <li key={index}>{reason}</li>
                    ))}
                </ul>
            </div>
        );
        buttons = (
            <DialogButtons
                primaryButton={_t("upload_file|upload_n_others_button", { count: howManyOthers })}
                onPrimaryButtonClick={onUploadClick}
                hasCancel={true}
                cancelButton={_t("upload_file|cancel_all_button")}
                onCancel={onCancelClick}
                focus={true}
            />
        );
    }

    return (
        <BaseDialog
            className="mx_BlockedFileTypeDialog"
            onFinished={onCancelClick}
            title={_t("pg|upload_file|error_blocked_title")}
            contentId="mx_Dialog_content"
        >
            <div id="mx_Dialog_content">{message}</div>

            {buttons}
        </BaseDialog>
    );
};

export default BlockedFileTypeDialog;
