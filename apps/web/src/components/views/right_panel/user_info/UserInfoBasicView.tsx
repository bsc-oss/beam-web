/*
Copyright 2026 Belgian Secure Communications (BSC)
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.

Modified by Belgian Secure Communications for Beam application on 2026-04-30
*/

import React from "react";
import { type RoomMember, type User, type Room } from "matrix-js-sdk/src/matrix";
import { MenuItem } from "@vector-im/compound-web";
import { DeleteIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../../../../languageHandler";
import { useUserInfoBasicViewModel } from "../../../viewmodels/right_panel/user_info/UserInfoBasicViewModel";
import { PowerLevelSection } from "./UserInfoPowerLevels";
import { Container } from "../UserInfo";
import { IgnoreToggleButton } from "./UserInfoIgnoreButtonView";
import Spinner from "../../elements/Spinner";
import { UserInfoAdminToolsContainer } from "./UserInfoAdminToolsContainer";
import { UserInfoBasicOptionsView } from "./UserInfoBasicOptionsView";
import { isServiceAccount } from "../../../../utils/PgServiceAccount"; // PG_CHANGED

/**
 * There are two types of components that can be displayed in the right panel concerning userinfo
 * Basic info or Encryption Panel
 */
export const UserInfoBasicView: React.FC<{
    room: Room;
    member: User | RoomMember;
}> = ({ room, member }) => {
    const vm = useUserInfoBasicViewModel(room, member);
    let synapseDeactivateButton;
    let spinner;
    let memberDetails;
    let adminToolsContainer;

    if (vm.showDeactivateButton) {
        synapseDeactivateButton = (
            <MenuItem
                role="button"
                onSelect={async (ev) => {
                    ev.preventDefault();
                    vm.onSynapseDeactivate();
                }}
                label={_t("user_info|deactivate_confirm_action")}
                kind="critical"
                Icon={DeleteIcon}
            />
        );
    }

    if (room && (member as RoomMember).roomId) {
        // hide the Roles section for DMs as it doesn't make sense there
        // PG_CHANGED: Hide power levels for service accounts
        if (!vm.isRoomDMForMember && !isServiceAccount(member.userId)) {
            memberDetails = (
                <PowerLevelSection user={member as RoomMember} room={room} roomPermissions={vm.roomPermissions} />
            );
        }

        adminToolsContainer = (
            <UserInfoAdminToolsContainer
                powerLevels={vm.powerLevels}
                member={member as RoomMember}
                room={room}
                isUpdating={vm.pendingUpdateCount > 0}
                startUpdating={vm.startUpdating}
                stopUpdating={vm.stopUpdating}
            >
                {synapseDeactivateButton}
            </UserInfoAdminToolsContainer>
        );
    } else if (synapseDeactivateButton) {
        adminToolsContainer = <Container>{synapseDeactivateButton}</Container>;
    }

    if (vm.pendingUpdateCount > 0) {
        spinner = <Spinner />;
    }

    return (
        <React.Fragment>
            <UserInfoBasicOptionsView room={room} member={member}>
                {memberDetails}
            </UserInfoBasicOptionsView>
            {adminToolsContainer}
            {!vm.isMe && (
                <Container>
                    <IgnoreToggleButton member={member} />
                </Container>
            )}
            {spinner}
        </React.Fragment>
    );
};
