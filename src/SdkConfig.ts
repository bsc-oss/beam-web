/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2024 New Vector Ltd.
Copyright 2019-2022 The Matrix.org Foundation C.I.C.
Copyright 2016 OpenMarket Ltd

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-02-06
*/

import { mergeWith } from "lodash";

import { SnakedObject } from "./utils/SnakedObject";
import { type IConfigOptions, type ISsoRedirectOptions } from "./IConfigOptions";
import { isObject, objectClone } from "./utils/objects";
import { type DeepReadonly, type Defaultize } from "./@types/common";

// see element-web config.md for docs, or the IConfigOptions interface for dev docs
export const DEFAULTS: DeepReadonly<IConfigOptions> = {
    // PG_CHANGED: Change Element refernces to Beam references
    brand: "Beam",
    website_url: "https://beam.belgium.be", // PG_CHANGED
    help_url: "https://beam.belgium.be/{LANG}/help",
    help_sections: {
        encryption: "encryption",
        identity_reset: "encryption18",
        device_verification: "encryption-device-verification",
        settings: "settings2",
        sharing: "e2ee-history-sharing",
        supported_browser: "supported-browser"
    },
    integrations_ui_url: "",
    integrations_rest_url: "",
    uisi_autorageshake_app: "beam-auto-uisi",
    show_labs_settings: false,
    force_verification: false,

    jitsi: {
        preferred_domain: "",
    },
    element_call: {
        use_exclusively: false,
        brand: "Beam Call",
    },

    // @ts-ignore - we deliberately use the camelCase version here so we trigger
    // the fallback behaviour. If we used the snake_case version then we'd break
    // everyone's config which has the camelCase property because our default would
    // be preferred over their config.
    desktopBuilds: {
        available: false,
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        logo: "",
        url: "",
    },

    feedback: {
        existing_issues_url:
            "",
        new_issue_url: "",
    },

    desktop_builds: {
        available: false,
        logo: "",
        url: "",
        url_macos: "",
        url_win64: "",
        url_win64arm: "",
        url_linux: "",
    },
    mobile_builds: {
        // PG_CHANGED: overriden in config file with the actual urls
        ios: "https://beam.belgium.be",
        apple_app_id: "", // PG_CHANGED
        android: "https://beam.belgium.be",
        fdroid: "",
    },
};

export type ConfigOptions = Defaultize<IConfigOptions, typeof DEFAULTS>;

function mergeConfig(
    config: DeepReadonly<IConfigOptions>,
    changes: DeepReadonly<Partial<IConfigOptions>>,
): DeepReadonly<IConfigOptions> {
    // return { ...config, ...changes };
    return mergeWith(objectClone(config), changes, (objValue, srcValue) => {
        // Don't merge arrays, prefer values from newer object
        if (Array.isArray(objValue)) {
            return srcValue;
        }

        // Don't allow objects to get nulled out, this will break our types
        if (isObject(objValue) && !isObject(srcValue)) {
            return objValue;
        }
    });
}

type ObjectType<K extends keyof IConfigOptions> = IConfigOptions[K] extends object
    ? SnakedObject<NonNullable<IConfigOptions[K]>>
    : SnakedObject<NonNullable<IConfigOptions[K]>> | null | undefined;

export default class SdkConfig {
    private static instance: DeepReadonly<IConfigOptions>;
    private static fallback: SnakedObject<DeepReadonly<IConfigOptions>>;

    private static setInstance(i: DeepReadonly<IConfigOptions>): void {
        SdkConfig.instance = i;
        SdkConfig.fallback = new SnakedObject(i);

        // For debugging purposes
        window.mxReactSdkConfig = i;
    }

    public static get(): IConfigOptions;
    public static get<K extends keyof IConfigOptions>(key: K, altCaseName?: string): IConfigOptions[K];
    public static get<K extends keyof IConfigOptions = never>(
        key?: K,
        altCaseName?: string,
    ): DeepReadonly<IConfigOptions> | DeepReadonly<IConfigOptions>[K] {
        if (key === undefined) {
            // safe to cast as a fallback - we want to break the runtime contract in this case
            return SdkConfig.instance || <IConfigOptions>{};
        }
        return SdkConfig.fallback.get(key, altCaseName);
    }

    public static getObject<K extends keyof IConfigOptions>(key: K, altCaseName?: string): ObjectType<K> {
        const val = SdkConfig.get(key, altCaseName);
        if (isObject(val)) {
            return new SnakedObject(val);
        }

        // return the same type for sensitive callers (some want `undefined` specifically)
        return (val === undefined ? undefined : null) as ObjectType<K>;
    }

    public static put(cfg: DeepReadonly<ConfigOptions>): void {
        SdkConfig.setInstance(mergeConfig(DEFAULTS, cfg));
    }

    /**
     * Resets the config.
     */
    public static reset(): void {
        SdkConfig.setInstance(mergeConfig(DEFAULTS, {})); // safe to cast - defaults will be applied
    }

    public static add(cfg: Partial<ConfigOptions>): void {
        SdkConfig.put(mergeConfig(SdkConfig.get(), cfg));
    }
}

export function parseSsoRedirectOptions(config: IConfigOptions): ISsoRedirectOptions {
    // Ignore deprecated options if the config is using new ones
    if (config.sso_redirect_options) return config.sso_redirect_options;

    // We can cheat here because the default is false anyways
    if (config.sso_immediate_redirect) return { immediate: true };

    // Default: do nothing
    return {};
}
