/*
Copyright 2026 Belgian Secure Communications (BSC)

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { type Room } from "matrix-js-sdk/src/matrix";

/**
 * PG_CHANGED: Resolve the email of a user in a room.
 * Falls back to the member data of other shared rooms when the member is hidden
 * (or has no email) in the given room.
 */
function getUserEmail(room: Room | null | undefined, userId: string): string | undefined {
    if (!room) return undefined;
    return room.getMember(userId)?.email || room.resolveRoomMemberFromOtherRooms?.(userId)?.email || undefined;
}

/**
 * PG_CHANGED: The label to show for a user: their email, with the Matrix ID as fallback.
 */
export function getUserEmailOrId(room: Room | null | undefined, userId: string): string {
    return getUserEmail(room, userId) ?? userId;
}
