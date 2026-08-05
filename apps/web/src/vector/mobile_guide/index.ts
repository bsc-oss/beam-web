/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
PG_CHANGED: reworked page for Beam

Modified by Belgian Secure Communications for Beam application on 2026-02-06
*/

import "./index.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import {
    _t,
    normalizeLanguageKey,
    registerTranslations,
    setLocale,
} from "@element-hq/web-shared-components";

import { updateMobilePage } from "./mobile-apps.ts";
import { getVectorConfig } from "../getconfig.ts";

// Use absolute path since mobile_guide is served from a subdirectory
const I18N_BASE_PATH = "../i18n/";

interface Languages {
    [lang: string]: string;
}

export function getPGLanguages(): string[] {
    return ["en", "fr", "nl", "de"];
}

async function fetchLangsJson(): Promise<Languages> {
    const res = await fetch(I18N_BASE_PATH + "languages.json", { method: "GET" });
    if (!res.ok) {
        throw new Error(`Failed to load languages.json, got ${res.status}`);
    }
    return res.json();
}

async function fetchLanguage(langPath: string): Promise<object> {
    const res = await fetch(I18N_BASE_PATH + langPath, { method: "GET" });
    if (!res.ok) {
        throw new Error(`Failed to load ${langPath}, got ${res.status}`);
    }
    return res.json();
}

/**
 * Gets the best matching language from browser preferences
 */
async function loadLanguage(): Promise<void> {
    const browserLangs = navigator.languages ?? [navigator.language ?? "en"];
    const allLanguages = await fetchLangsJson();
    const pgLanguages = getPGLanguages();

    // Filter available languages to only include PG supported languages
    const availableLanguages: Languages = {};
    for (const lang of pgLanguages) {
        if (allLanguages[lang]) {
            availableLanguages[lang] = allLanguages[lang];
        }
    }

    let chosenLang = "en";
    for (const lang of browserLangs) {
        const normalized = normalizeLanguageKey(lang);
        if (availableLanguages[normalized]) {
            chosenLang = normalized;
            break;
        }
        // Try base language (e.g., "nl" for "nl-be", "de" for "de-de")
        const baseLang = normalized.split("-")[0];
        if (availableLanguages[baseLang]) {
            chosenLang = baseLang;
            break;
        }
    }

    // Load and register the language
    const langData = await fetchLanguage(availableLanguages[chosenLang]);
    registerTranslations(chosenLang, langData);
    setLocale(chosenLang);
    document.documentElement.setAttribute("lang", chosenLang);

    // Also load English as fallback if not already English
    if (chosenLang !== "en") {
        const enData = await fetchLanguage(availableLanguages["en"]);
        registerTranslations("en", enData);
    }
}

async function initPage(): Promise<void> {
    // Load config from parent directory (since mobile_guide is served from a subdirectory)
    const config = await getVectorConfig("../");

    await loadLanguage();

    updateMobilePage(config);
}

void initPage();
