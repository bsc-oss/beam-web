//
// Copyright 2026 Belgian Secure Communications (BSC)
//
// SPDX-License-Identifier: AGPL-3.0-only
// Please see LICENSE files in the repository root for full details.
//

// @vitest-environment happy-dom

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { render, screen, waitFor } from "test-utils-rtl";
import fetchMock from "@fetch-mock/vitest";
import { type ValidatedAuthMetadata } from "matrix-js-sdk/src/matrix";
import { mkServerConfig, unmockPlatformPeg } from "test-utils";

import SdkConfig from "../../../SdkConfig";
import PgLoginComponent from "./PgLogin";

vi.useRealTimers();

describe("PgLogin - PG TEST", function () {
    beforeEach(function () {
        SdkConfig.put({
            brand: "test-brand",
            disable_custom_urls: true,
            pg_enable_email_login: true,
        });
    });

    afterEach(function () {
        fetchMock.mockClear();
        SdkConfig.reset(); // we touch the config, so clean up
        unmockPlatformPeg();
    });

    function getRawComponent(
        ref: React.RefObject<PgLoginComponent | null> | null = null,
        hsUrl = "",
        isUrl = "",
        delegatedAuthentication?: ValidatedAuthMetadata,
    ): React.ReactElement {
        return (
            <PgLoginComponent
                ref={ref}
                serverConfig={mkServerConfig(hsUrl, isUrl, delegatedAuthentication)}
                onServerConfigChange={() => {}}
            />
        );
    }

    function getComponent(
        ref: React.RefObject<PgLoginComponent | null> | null = null,
        hsUrl?: string,
        isUrl?: string,
        delegatedAuthentication?: ValidatedAuthMetadata,
    ): ReturnType<typeof render> {
        return render(getRawComponent(ref, hsUrl, isUrl, delegatedAuthentication));
    }

    it("should show email input field", async () => {
        const componentRef = React.createRef<PgLoginComponent>();

        getComponent(componentRef);

        expect(screen.getByText("Enter your email")).toBeInTheDocument();
        expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
    });

    it("should render error", async () => {
        const componentRef = React.createRef<PgLoginComponent>();

        getComponent(componentRef, "", "");

        // Force the component to show error state by bypassing email picker
        act(() => {
            if (componentRef.current) {
                (componentRef.current as any).setState({
                    showEmailHomeserverPicker: false,
                    errorText: "test error text",
                });
            }
        });

        await waitFor(() => {
            expect(screen.getByText(/test error text/)).toBeInTheDocument();
        });

        // Check for reload button
        const reloadButton = screen.getByRole("button", { name: "Reload" });
        expect(reloadButton).toBeInTheDocument();
    });
});
