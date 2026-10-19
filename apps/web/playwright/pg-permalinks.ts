/*
Copyright 2026 Belgian Secure Communications (BSC)

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// PG_CHANGED: playwright-local copy of the fork's permalink constants.
// Kept in sync with src/utils/permalinks/MatrixToPermalinkConstructor.ts, which
// playwright specs must not import directly (the src tree needs ambient types
// that conflict with the playwright TypeScript project).
export const host = "share.beam.belgium.be";
export const baseUrl = `https://${host}`;
export const permalinkPrefix = `${baseUrl}/#/`;
export const baseUrlPattern = `^(?:https?://)?${host.replace(".", "\\.")}/#/(.*)`;
