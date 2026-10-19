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
    onFinished: (proceed: boolean) => void;
}

/**
 * Warns the user that files cannot be scanned for viruses due to end-to-end encryption.
 */
const PGDownloadVirusWarningDialog = ({ fileName, onFinished }: Props): React.ReactElement => {
    const onProceed = (): void => {
        onFinished(true);
    };

    const onCancel = (): void => {
        onFinished(false);
    };

    return (
        <BaseDialog
            className="mx_DownloadVirusWarningDialog"
            onFinished={onCancel}
            title={_t("pg|download_file|virus_warning_title")}
            contentId="mx_Dialog_content"
        >
            <div id="mx_Dialog_content">
                <p>
                    {_t("pg|download_file|virus_warning_description", {
                        fileName: fileName,
                    })}
                </p>
                <p>{_t("pg|download_file|virus_warning_advice")}</p>
            </div>

            <DialogButtons
                primaryButton={_t("action|download")}
                primaryButtonClass="danger"
                cancelButton={_t("action|cancel")}
                hasCancel={true}
                onPrimaryButtonClick={onProceed}
                onCancel={onCancel}
                focus={false}
            />
        </BaseDialog>
    );
};

export default PGDownloadVirusWarningDialog;
