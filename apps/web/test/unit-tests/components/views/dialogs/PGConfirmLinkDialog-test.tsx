//
// Copyright 2026 Belgian Secure Communications (BSC)
//
// SPDX-License-Identifier: AGPL-3.0-only
// Please see LICENSE files in the repository root for full details.
//

/* eslint-disable matrix-org/require-copyright-header */

import React from "react";
import { render, screen } from "jest-matrix-react";
import userEvent from "@testing-library/user-event";

import PGConfirmLinkDialog from "../../../../../src/components/views/dialogs/PGConfirmLinkDialog";

describe("PGConfirmLinkDialog", () => {
    const defaultProps = {
        url: "https://example.com/page",
        displayedText: "Click here",
        isSuspicious: false,
        onFinished: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("general link warning", () => {
        it("renders general warning dialog", () => {
            const { asFragment } = render(<PGConfirmLinkDialog {...defaultProps} />);
            expect(asFragment()).toMatchSnapshot();
        });

        it("displays the URL in the message", () => {
            render(<PGConfirmLinkDialog {...defaultProps} />);
            expect(screen.getByText(defaultProps.url)).toBeInTheDocument();
        });

        it("shows general title", () => {
            render(<PGConfirmLinkDialog {...defaultProps} />);
            expect(screen.getByRole("heading", { name: "Open link?" })).toBeInTheDocument();
        });
    });

    describe("suspicious link warning", () => {
        const suspiciousProps = {
            ...defaultProps,
            url: "https://evil-site.com",
            displayedText: "https://trusted-site.com",
            isSuspicious: true,
        };

        it("renders suspicious warning dialog", () => {
            const { asFragment } = render(<PGConfirmLinkDialog {...suspiciousProps} />);
            expect(asFragment()).toMatchSnapshot();
        });

        it("displays the actual URL", () => {
            render(<PGConfirmLinkDialog {...suspiciousProps} />);
            expect(screen.getByText(suspiciousProps.url)).toBeInTheDocument();
        });

        it("shows suspicious title", () => {
            render(<PGConfirmLinkDialog {...suspiciousProps} />);
            expect(screen.getByRole("heading", { name: "Double-check this link" })).toBeInTheDocument();
        });

        it("applies danger class to primary button", () => {
            render(<PGConfirmLinkDialog {...suspiciousProps} />);
            const continueButton = screen.getByTestId("dialog-primary-button");
            expect(continueButton).toHaveClass("danger");
        });
    });

    describe("user interactions", () => {
        it("calls onFinished with true when Continue is clicked", async () => {
            const onFinished = jest.fn();
            render(<PGConfirmLinkDialog {...defaultProps} onFinished={onFinished} />);

            await userEvent.click(screen.getByTestId("dialog-primary-button"));

            expect(onFinished).toHaveBeenCalledWith(true);
        });

        it("calls onFinished with false when Cancel is clicked", async () => {
            const onFinished = jest.fn();
            render(<PGConfirmLinkDialog {...defaultProps} onFinished={onFinished} />);

            await userEvent.click(screen.getByTestId("dialog-cancel-button"));

            expect(onFinished).toHaveBeenCalledWith(false);
        });
    });
});
