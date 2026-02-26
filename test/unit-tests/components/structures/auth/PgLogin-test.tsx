//
// Copyright 2026 Belgian Secure Communications (BSC)
//
// SPDX-License-Identifier: AGPL-3.0-only
// Please see LICENSE files in the repository root for full details.
//

import React, { act } from "react";
import { render, screen, waitFor } from "jest-matrix-react";
import fetchMock from "fetch-mock-jest";
import { type OidcClientConfig } from "matrix-js-sdk/src/matrix";

import SdkConfig from "../../../../../src/SdkConfig";
import { mkServerConfig, unmockPlatformPeg } from "../../../../test-utils";
import PgLoginComponent from "../../../../../src/components/structures/auth/PgLogin";

jest.useRealTimers();

describe("PgLogin - PG TEST", function () {
    beforeEach(function () {
        SdkConfig.put({
            brand: "test-brand",
            disable_custom_urls: true,
        });
    });

    afterEach(function () {
        fetchMock.restore();
        SdkConfig.reset(); // we touch the config, so clean up
        unmockPlatformPeg();
    });

    function getRawComponent(
        ref: React.RefObject<PgLoginComponent | null> | null = null,
        hsUrl = "",
        isUrl = "",
        delegatedAuthentication?: OidcClientConfig,
    ) {
        return (
            <PgLoginComponent
                ref={ref}
                serverConfig={mkServerConfig(hsUrl, isUrl, delegatedAuthentication)}
                onServerConfigChange={() => { }}
            />
        );
    }

    function getComponent(
        ref: React.RefObject<PgLoginComponent | null> | null = null,
        hsUrl?: string,
        isUrl?: string,
        delegatedAuthentication?: OidcClientConfig) {
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
                        errorText: "test error text"
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
