/*
 * Copyright 2026 Belgian Secure Communications (BSC)
 * Copyright (c) 2025 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 *
 * Modified by Belgian Secure Communications for Beam application on 2026-02-06
 */
import { type Meta, type StoryFn } from "@storybook/react-vite";
import React, { type JSX } from "react";
import { fn } from "storybook/test";

import { useMockedViewModel } from "../../useMockedViewModel";
import {
    HistoryVisibleBannerView,
    type HistoryVisibleBannerViewActions,
    type HistoryVisibleBannerViewSnapshot,
} from "./HistoryVisibleBannerView";

type HistoryVisibleBannerProps = HistoryVisibleBannerViewSnapshot & HistoryVisibleBannerViewActions;

const HistoryVisibleBannerViewWrapper = ({ onClose, ...rest }: HistoryVisibleBannerProps): JSX.Element => {
    const vm = useMockedViewModel(rest, {
        onClose,
    });
    return <HistoryVisibleBannerView vm={vm} />;
};

export default {
    title: "composer/HistoryVisibleBannerView",
    component: HistoryVisibleBannerViewWrapper,
    tags: ["autodocs"],
    argTypes: {},
    args: {
        visible: true,
        // PG_CHANGED
        helpUrl: "https://beam.belgium.be/help#e2ee-history-sharing",
        onClose: fn(),
    },
} as Meta<typeof HistoryVisibleBannerViewWrapper>;

const Template: StoryFn<typeof HistoryVisibleBannerViewWrapper> = (args) => (
    <HistoryVisibleBannerViewWrapper {...args} />
);

export const Default = Template.bind({});
