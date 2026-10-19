/*
Copyright 2026 Belgian Secure Communications (BSC)

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// PG_CHANGED: tests for the fork's external URL confirmation dialog wired into linkify
// via urlEventListeners (moved here from shared-components' linkify.test.ts, which
// cannot import apps/web modules).

import Modal from "../../src/Modal";
import ConfirmLinkDialog from "../../src/components/views/dialogs/PGConfirmLinkDialog";
import { urlEventListeners } from "../../src/Linkify";

describe("urlEventListeners (external URL handling)", () => {
    let windowOpenSpy: jest.SpyInstance;
    let modalSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        windowOpenSpy = jest.spyOn(window, "open").mockImplementation(() => null);
        modalSpy = jest.spyOn(Modal, "createDialog").mockReturnValue({
            finished: Promise.resolve([false]),
            close: jest.fn(),
        } as any);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    function clickLink(href: string, displayedText = href): MouseEvent {
        const handlers = urlEventListeners(href);

        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.textContent = displayedText;

        const event = new MouseEvent("click", { bubbles: true });
        Object.defineProperty(event, "target", { value: anchor });
        event.preventDefault = jest.fn();

        (handlers!.click as (e: MouseEvent) => void)(event);
        return event;
    }

    it("should show confirm dialog for external URLs", () => {
        const href = "https://example.com";
        const event = clickLink(href);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(modalSpy).toHaveBeenCalledWith(ConfirmLinkDialog, {
            url: href,
            displayedText: href,
            isSuspicious: false,
        });
    });

    it("should open external link when user confirms the dialog", async () => {
        const href = "https://example.com";
        modalSpy.mockReturnValue({
            finished: Promise.resolve([true]),
            close: jest.fn(),
        } as any);

        clickLink(href);
        await Promise.resolve(); // Let the promise resolve

        expect(windowOpenSpy).toHaveBeenCalledWith(href, "_blank", "noopener,noreferrer");
    });

    it("should not open external link when user cancels the dialog", async () => {
        const href = "https://example.com";
        modalSpy.mockReturnValue({
            finished: Promise.resolve([false]),
            close: jest.fn(),
        } as any);

        clickLink(href);
        await Promise.resolve(); // Let the promise resolve

        expect(windowOpenSpy).not.toHaveBeenCalled();
    });

    it("should detect suspicious links and pass isSuspicious flag", () => {
        const href = "https://evil.com";
        const displayedText = "https://safe.com";
        clickLink(href, displayedText);

        expect(modalSpy).toHaveBeenCalledWith(ConfirmLinkDialog, {
            url: href,
            displayedText: displayedText,
            isSuspicious: true,
        });
    });
});
