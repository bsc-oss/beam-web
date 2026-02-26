/*
Copyright 2025 Belgian Secure Communications

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { render, screen, fireEvent, waitFor } from "jest-matrix-react";
import { AutoDiscovery, AutoDiscoveryAction } from "matrix-js-sdk/src/matrix";

import PgEmailBasedHomeserverPicker from "../../../../../src/components/views/auth/PGEmailBasedHomeserverPicker";
import SdkConfig from "../../../../../src/SdkConfig";
import AutoDiscoveryUtils from "../../../../../src/utils/AutoDiscoveryUtils";

// Mock dependencies
jest.mock("matrix-js-sdk/src/matrix");
jest.mock("../../../../../src/utils/AutoDiscoveryUtils");

describe("PgEmailBasedHomeserverPicker - PG TEST", () => {
    let mockOnHomeserverSelected: jest.Mock;

    beforeEach(() => {
        mockOnHomeserverSelected = jest.fn();
        jest.clearAllMocks();
        
        // Setup SdkConfig with pg_service_url
        SdkConfig.put({
            pg_service_url: "https://api.example.com",
        });
    });

    afterEach(() => {
        SdkConfig.reset();
        // Reset fetch mock
        if (global.fetch && typeof global.fetch === 'function' && 'mockRestore' in global.fetch) {
            (global.fetch as jest.MockedFunction<typeof fetch>).mockRestore();
        }
    });

    it("should render email input form with default content", () => {
        render(<PgEmailBasedHomeserverPicker onHomeserverSelected={mockOnHomeserverSelected} />);
        
        expect(screen.getByText("Enter your email")).toBeInTheDocument();
        expect(screen.getByText(/Please provide your official government email address/)).toBeInTheDocument();
        expect(screen.getByRole("textbox", { name: /email address/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText("name@organisation.be")).toBeInTheDocument();
    });

    it("should validate email format and enable/disable continue button", async () => {
        render(<PgEmailBasedHomeserverPicker onHomeserverSelected={mockOnHomeserverSelected} />);
        
        const emailInput = screen.getByRole("textbox", { name: /email address/i });
        const continueButton = screen.getByRole("button", { name: /continue/i });
        
        // Initially disabled (using aria-disabled instead of disabled)
        expect(continueButton).toHaveAttribute("aria-disabled", "true");
        
        // Invalid email
        fireEvent.change(emailInput, { target: { value: "invalid-email" } });
        await waitFor(() => {
            expect(continueButton).toHaveAttribute("aria-disabled", "true");
        });
        
        // Valid email
        fireEvent.change(emailInput, { target: { value: "test@example.be" } });
        await waitFor(() => {
            expect(continueButton).not.toHaveAttribute("aria-disabled", "true");
        });
    });

    it("should update email value when typing", async () => {
        render(<PgEmailBasedHomeserverPicker onHomeserverSelected={mockOnHomeserverSelected} />);
        
        const emailInput = screen.getByRole("textbox", { name: /email address/i });
        
        fireEvent.change(emailInput, { target: { value: "user@example.be" } });
        
        expect(emailInput).toHaveValue("user@example.be");
    });

    it("should disable continue button when input is empty", async () => {
        render(<PgEmailBasedHomeserverPicker onHomeserverSelected={mockOnHomeserverSelected} />);
        
        const emailInput = screen.getByRole("textbox", { name: /email address/i });
        
        fireEvent.change(emailInput, { target: { value: "test@example.be" } });
        expect(emailInput).toHaveValue("test@example.be");
        
        // Clear the input
        fireEvent.change(emailInput, { target: { value: "" } });
        expect(emailInput).toHaveValue("");
        
        const continueButton = screen.getByRole("button", { name: /continue/i });
        await waitFor(() => {
            expect(continueButton).toHaveAttribute("aria-disabled", "true");
        });
    });

    test("should show email is not supported error when api return 403", async () => {
        // Mock the fetch function
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 403,
            json: async () => ({
                title: "Err:Homeserver:UnknownEmailDomain"
            }),
        });

        render(<PgEmailBasedHomeserverPicker onHomeserverSelected={mockOnHomeserverSelected} />);
        
        const emailInput = screen.getByRole("textbox", { name: /email address/i });
        const continueButton = screen.getByRole("button", { name: /continue/i });
        
        // Enter a valid email format
        fireEvent.change(emailInput, { target: { value: "test@unsupported.com" } });
        
        // Click continue to trigger the API call
        fireEvent.click(continueButton);
        
        // Wait for the error message to appear
        await waitFor(() => {
            expect(screen.getByText("The email domain you entered is not supported. Please check your email or try a different one.")).toBeInTheDocument();
        });
        
        // Verify fetch was called with correct URL
        expect(global.fetch).toHaveBeenCalledWith(
            "https://api.example.com/homeserver/find-by-email?email=test%40unsupported.com",
            expect.objectContaining({
                method: "GET",
                headers: {
                    "Accept": "application/json",
                },
            })
        );
    });

    test("should successfully lookup homeserver and call onHomeserverSelected", async () => {
        // Mock successful fetch response
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                baseDomain: "matrix.example.org"
            }),
        });

        // Mock AutoDiscovery.findClientConfig
        const mockFindClientConfig = AutoDiscovery.findClientConfig as jest.MockedFunction<typeof AutoDiscovery.findClientConfig>;
        const mockDiscoveryResult = {
            "m.homeserver": {
                state: AutoDiscoveryAction.SUCCESS,
                base_url: "https://matrix.example.org",
            },
            "m.identity_server": {
                state: AutoDiscoveryAction.SUCCESS,
                base_url: "",
            },
        };
        mockFindClientConfig.mockResolvedValue(mockDiscoveryResult);

        // Mock AutoDiscoveryUtils.buildValidatedConfigFromDiscovery
        const mockBuildValidatedConfig = AutoDiscoveryUtils.buildValidatedConfigFromDiscovery as jest.MockedFunction<typeof AutoDiscoveryUtils.buildValidatedConfigFromDiscovery>;
        const mockValidatedConfig = {
            hsUrl: "https://matrix.example.org",
            hsName: "matrix.example.org",
            hsNameIsDifferent: false,
            isUrl: "",
            isDefault: false,
            isNameResolvable: true,
            warning: "",
        };
        mockBuildValidatedConfig.mockResolvedValue(mockValidatedConfig);

        render(<PgEmailBasedHomeserverPicker onHomeserverSelected={mockOnHomeserverSelected} />);
        
        const emailInput = screen.getByRole("textbox", { name: /email address/i });
        const continueButton = screen.getByRole("button", { name: /continue/i });
        
        // Enter a valid email
        fireEvent.change(emailInput, { target: { value: "user@example.org" } });
        
        // Click continue to trigger the API call
        fireEvent.click(continueButton);
        
        // Wait for the homeserver lookup to complete
        await waitFor(() => {
            expect(mockOnHomeserverSelected).toHaveBeenCalledWith(mockValidatedConfig, "user@example.org");
        });
        
        // Verify fetch was called with correct URL
        expect(global.fetch).toHaveBeenCalledWith(
            "https://api.example.com/homeserver/find-by-email?email=user%40example.org",
            expect.objectContaining({
                method: "GET",
                headers: {
                    "Accept": "application/json",
                },
            })
        );

        // Verify AutoDiscovery was called
        expect(AutoDiscovery.findClientConfig).toHaveBeenCalledWith("matrix.example.org");

        // Verify buildValidatedConfigFromDiscovery was called
        expect(AutoDiscoveryUtils.buildValidatedConfigFromDiscovery).toHaveBeenCalledWith(
            "matrix.example.org",
            mockDiscoveryResult
        );
    });

    test("should show error when API returns success but no baseDomain", async () => {
        // Mock fetch response without baseDomain
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({}), // No baseDomain in response
        });

        render(<PgEmailBasedHomeserverPicker onHomeserverSelected={mockOnHomeserverSelected} />);
        
        const emailInput = screen.getByRole("textbox", { name: /email address/i });
        const continueButton = screen.getByRole("button", { name: /continue/i });
        
        // Enter a valid email
        fireEvent.change(emailInput, { target: { value: "user@example.org" } });
        
        // Click continue to trigger the API call
        fireEvent.click(continueButton);
        
        // Wait for the error message to appear
        await waitFor(() => {
            expect(screen.getByText("No homeserver found for this email address")).toBeInTheDocument();
        });
        
        // Verify onHomeserverSelected was not called
        expect(mockOnHomeserverSelected).not.toHaveBeenCalled();
    });
});
