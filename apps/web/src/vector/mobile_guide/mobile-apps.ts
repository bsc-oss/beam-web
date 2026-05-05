/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
PG_CHANGED: reworked page for Beam

Modified by Belgian Secure Communications for Beam application on 2026-02-06
*/

import {
    _t,
    type TranslationKey,
} from "@element-hq/web-shared-components";
import { IConfigOptions } from "../../IConfigOptions";

/*
 * Shared code that is used by the mobile guide and the mobile.element.io site.
 */

export enum MobileAppVariant {
    Beam = "beam",
}

/**
 * Applies translations to the page elements
 */
function applyTranslations(): void {
    // Update page title
    document.title = _t("pg|mobile_guide|page_title" as TranslationKey);

    // Parse the translation and set text content on individual elements
    const translation = _t("pg|mobile_guide|description" as TranslationKey);
    // Parse: "text1<link>linkText</link>text2<bold>boldText</bold>text3"
    const desktopMatch = translation.match(/^(.*?)<link>(.*?)<\/link>(.*?)<bold>(.*?)<\/bold>(.*)$/);
    if (desktopMatch) {
        const [, beforeLink, linkText, afterLink, boldText, afterBold] = desktopMatch;
        const textBeforeLink = document.getElementById("webapp_text_before_link");
        const linkContent = document.getElementById("webapp_link_text_content");
        const textAfterLink = document.getElementById("webapp_text_after_link");
        const boldContent = document.getElementById("webapp_bold_text");
        const textAfterBold = document.getElementById("webapp_text_after_bold");

        if (textBeforeLink) textBeforeLink.innerText = beforeLink;
        if (linkContent) linkContent.innerText = linkText;
        if (textAfterLink) textAfterLink.innerText = afterLink;
        if (boldContent) boldContent.innerText = boldText;
        if (textAfterBold) textAfterBold.innerText = afterBold;
    }

    // Parse website_link_text translation: "text1<link>linkText</link>text2"
    const websiteTranslation = _t("pg|mobile_guide|website_link_text" as TranslationKey);
    const websiteMatch = websiteTranslation.match(/^(.*?)<link>(.*?)<\/link>(.*)$/);
    if (websiteMatch) {
        const [, beforeLink, linkText, afterLink] = websiteMatch;
        const websiteTextBeforeLink = document.getElementById("website_text_before_link");
        const websiteLinkContent = document.getElementById("website_link_text_content");
        const websiteTextAfterLink = document.getElementById("website_text_after_link");

        if (websiteTextBeforeLink) websiteTextBeforeLink.innerText = beforeLink;
        if (websiteLinkContent) websiteLinkContent.innerText = linkText;
        if (websiteTextAfterLink) websiteTextAfterLink.innerText = afterLink;
    }

    const downloadHeading = document.getElementById("download_heading");
    if (downloadHeading) {
        downloadHeading.textContent = _t("pg|mobile_guide|download_heading" as TranslationKey);
    }

    const backButton = document.getElementById("back_to_beam_button");
    if (backButton) {
        backButton.onclick = onBackToBeamClick;
    }
}

function onBackToBeamClick(): void {
    // Cookie should expire in 4 hours
    document.cookie = "beam_mobile_redirect_to_guide=false;path=/;max-age=14400";
    window.location.href = "../";
}

export function updateMobilePage(config: IConfigOptions | undefined): void {
    applyTranslations();

    const appleId = config?.mobile_builds?.apple_app_id;
    const iosUrl = config?.mobile_builds?.ios;
    const androidUrl = config?.mobile_builds?.android;

    if (appleId) {
        const appleMeta = document.querySelector('meta[name="apple-itunes-app"]') as Element;
        appleMeta.setAttribute("content", `app-id=${appleId}`);
    }

    if (iosUrl) {
        (document.getElementById("app_store_link") as HTMLAnchorElement).href = iosUrl;
    }

    if (androidUrl) {
        (document.getElementById("play_store_link") as HTMLAnchorElement).href = androidUrl;
    }

    // Set the website URL from config
    const beamWebsiteButton = document.getElementById("link_to_beam_website_button");
    if (beamWebsiteButton && beamWebsiteButton instanceof HTMLAnchorElement && config?.website_url) {
        beamWebsiteButton.href = config.website_url;
    }
}
