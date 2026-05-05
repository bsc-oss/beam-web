//
// Copyright 2026 Belgian Secure Communications (BSC)
//
// SPDX-License-Identifier: AGPL-3.0-only
// Please see LICENSE files in the repository root for full details.
//

import SdkConfig from "../SdkConfig";
import Modal from "../Modal";
import PGBlockedFileDownloadDialog from "../components/views/dialogs/PGBlockedFileDownloadDialog";
import PGDownloadVirusWarningDialog from "../components/views/dialogs/PGDownloadVirusWarningDialog";

/**
 * Check if a file type is blocked based on extension or MIME type.
 * Uses the `blocked_file_extensions` and `blocked_file_mime_types` config options.
 *
 * @param fileName The name of the file (used for extension check)
 * @param mimeType The MIME type of the file (optional)
 * @returns true if the file type is blocked, false otherwise
 */
export function isFileTypeBlocked(fileName: string, mimeType?: string): boolean {
    const blockedExtensions: string[] = SdkConfig.get("blocked_file_extensions") ?? [];
    const blockedMimeTypes: string[] = SdkConfig.get("blocked_file_mime_types") ?? [];

    // Check file extension
    const lowerFileName = fileName.toLowerCase();
    const lastDotIndex = lowerFileName.lastIndexOf(".");
    if (lastDotIndex !== -1) {
        const extension = lowerFileName.substring(lastDotIndex);
        if (blockedExtensions.some((ext) => ext.toLowerCase() === extension)) {
            return true;
        }
    }

    // Check MIME type
    if (mimeType && blockedMimeTypes.some((mime) => mime.toLowerCase() === mimeType.toLowerCase())) {
        return true;
    }

    return false;
}

/**
 * Get the reason why a file is blocked (extension or MIME type)
 *
 * @param fileName The name of the file
 * @param mimeType The MIME type of the file (optional)
 * @returns The blocked extension or MIME type, or undefined if not blocked
 */
export function getBlockedReason(fileName: string, mimeType?: string): string | undefined {
    const blockedExtensions: string[] = SdkConfig.get("blocked_file_extensions") ?? [];
    const blockedMimeTypes: string[] = SdkConfig.get("blocked_file_mime_types") ?? [];

    const lowerFileName = fileName.toLowerCase();
    const lastDotIndex = lowerFileName.lastIndexOf(".");
    if (lastDotIndex !== -1) {
        const extension = lowerFileName.substring(lastDotIndex);
        const matchedExt = blockedExtensions.find((ext) => ext.toLowerCase() === extension);
        if (matchedExt) {
            return matchedExt;
        }
    }

    if (mimeType) {
        const matchedMime = blockedMimeTypes.find((mime) => mime.toLowerCase() === mimeType.toLowerCase());
        if (matchedMime) {
            return matchedMime;
        }
    }

    return undefined;
}

/**
 * Check if a File object is blocked based on its name and type.
 *
 * @param file The File object to check
 * @returns true if the file type is blocked, false otherwise
 */
export function isFileBlocked(file: File): boolean {
    return isFileTypeBlocked(file.name, file.type);
}

/**
 * Get the blocked reason for a File object.
 *
 * @param file The File object to check
 * @returns The blocked extension or MIME type, or undefined if not blocked
 */
export function getFileBlockedReason(file: File): string | undefined {
    return getBlockedReason(file.name, file.type);
}

/**
 * Check if the file type is blocked and show a dialog if so.
 * @param fileName The name of the file
 * @param mimeType The MIME type of the file (optional)
 * @returns true if the file is blocked, false otherwise
 */
export function checkAndShowBlockedDialog(fileName: string, mimeType?: string): boolean {
    if (isFileTypeBlocked(fileName, mimeType)) {
        Modal.createDialog(PGBlockedFileDownloadDialog, {
            fileName: fileName,
            reason: getBlockedReason(fileName, mimeType),
        });
        return true;
    }
    return false;
}

/**
 * Show a warning dialog about virus scanning and wait for user confirmation.
 * @param fileName The name of the file
 * @returns true if the user wants to proceed, false otherwise
 */
export async function showVirusWarningDialog(fileName: string): Promise<boolean> {
    const { finished } = Modal.createDialog(PGDownloadVirusWarningDialog, {
        fileName: fileName,
    });
    const [proceed] = await finished;
    return proceed ?? false;
}
