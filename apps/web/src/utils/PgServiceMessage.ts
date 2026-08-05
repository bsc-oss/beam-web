//
// Copyright 2026 Belgian Secure Communications (BSC)
//
// SPDX-License-Identifier: AGPL-3.0-only
// Please see LICENSE files in the repository root for full details.
//

import { logger } from "matrix-js-sdk/src/logger";

import SdkConfig from "../SdkConfig";
import { getCurrentLanguage } from "../languageHandler";
import { objectHasDiff } from "./objects";

export const SERVICE_MESSAGE_POLL_INTERVAL_MS = 15 * 60 * 1000;
export const SERVICE_MESSAGE_TOAST_KEY = "service_message";

interface IServiceMessageContent {
    title: string;
    message: string;
}

interface IServiceMessagePayload {
    id: number;
    isActive: boolean;
    isCritical: boolean;
    allowPersistentDismissalWeb: boolean;
    content: Record<string, IServiceMessageContent>;
}

export interface IServiceMessageDisplay {
    id: number;
    title: string;
    message: string;
    isCritical: boolean;
    allowPersistentDismissalWeb: boolean;
}

function getServiceMessageEndpoint(): string | undefined {
    const configuredEndpoint = SdkConfig.get("pg_notice_url");
    // Only fetch service messages if pg_notice_url is explicitly configured
    return configuredEndpoint || undefined;
}

function getLocalizedServiceMessageContent(
    content: Record<string, IServiceMessageContent>,
): IServiceMessageContent | undefined {
    const currentLanguage = getCurrentLanguage().toLowerCase();
    const baseLanguage = currentLanguage.split(/[-_]/)[0];

    return content[currentLanguage] ?? content[baseLanguage] ?? content.en ?? Object.values(content)[0];
}

function getServiceMessageDismissalKey(id: number): string {
    return `service_message_dismissed_${id}`;
}

export function isSameServiceMessage(
    left?: IServiceMessageDisplay,
    right?: IServiceMessageDisplay,
): boolean {
    if (left === right) {
        return true;
    }

    if (!left || !right) {
        return false;
    }

    return !objectHasDiff(left, right);

}

export function isServiceMessagePersistentlyDismissed(serviceMessage: IServiceMessageDisplay): boolean {
    return (
        serviceMessage.allowPersistentDismissalWeb &&
        Boolean(localStorage.getItem(getServiceMessageDismissalKey(serviceMessage.id)))
    );
}

export function persistServiceMessageDismissal(serviceMessage: IServiceMessageDisplay): void {
    if (!serviceMessage.allowPersistentDismissalWeb) {
        return;
    }

    localStorage.setItem(getServiceMessageDismissalKey(serviceMessage.id), "1");
}

export async function fetchServiceMessage(): Promise<IServiceMessageDisplay | undefined> {
    const endpoint = getServiceMessageEndpoint();
    if (!endpoint) {
        return undefined;
    }

    try {
        const response = await fetch(endpoint, {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
            cache: "no-cache",
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const payload: IServiceMessagePayload = await response.json();
        if (!payload.isActive) {
            return undefined;
        }

        const localizedContent = getLocalizedServiceMessageContent(payload.content);
        if (!localizedContent) {
            throw new Error("Service message payload did not include any localized content");
        }

        return {
            id: payload.id,
            title: localizedContent.title,
            message: localizedContent.message,
            isCritical: payload.isCritical,
            allowPersistentDismissalWeb: payload.allowPersistentDismissalWeb,
        };
    } catch (error) {
        logger.error("Failed to fetch service message", error);
        return undefined;
    }
}