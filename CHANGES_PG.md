# Changes in PG web 1.0.7 (29-04-2026)
Improvements 🙌:

- Add missing translations

# Changes in PG web 1.0.6 (07-04-2026)
Upstream merge ✨:

- v1.12.13 (https://github.com/element-hq/element-web/tree/v1.12.13)

# Changes in PG web 1.0.5 (xx-03-2026)

Improvements 🙌:

- Show user email instead of mxId for incoming calls
- Hide profile actions (send message, verify, ...) for service accounts, filter out service accounts from the search feature
- Add config option to disable presence
- Show app links on QR code login page

# Changes in PG web 1.0.4 (05-03-2026)

Improvements 🙌:

- Prevent room list re-ordering after changing the function/role

# Changes in PG web 1.0.3 (05-03-2026)

Improvements 🙌:

- Turn on eager loading of room members so we have the data available for local search
- Show display name & email for a room with a hidden user, if it's available from another room

# Changes in PG web 1.0.2 (26-02-2026)

Improvements 🙌:

- Update colors to remove leftover green
- Use of latest design token & compound web
- Change matrix.to to share.beam.belgium.be

Bugfix 🐛:

- Fix so that file download still works when service workers are not running

# Changes in PG web 1.0.1 (13-02-2026)
Features ✨:

- Re-add chat export

Bugfix 🐛:

- Fix issue where chat export would give Unable To Decrypt for most messages
- Fix issue, where in certain cases, after being logged out because your session expired. You will get a popup: you were logged out for security reasons. When logging in with QR code, the login spinner keeps hanging forever, you will never be logged in.

Improvements 🙌:

- New translations

# Changes in PG web 1.0.0 (13-02-2026)
Improvements 🙌:

- Dynamic help url based on user's language
- Show user email on identity reset

# Changes in PG web 0.0.17 (xx-xx-2025)
Bugfix 🐛:

- Hide call button when you are the only participant in a room
- Fix call icon missing when more than 3 people in a room

# Changes in PG web 0.0.16 (xx-xx-2025)
Improvements 🙌:

- Add ability to disable creation of threads using feature flag: setting_defaults|UIFeature.threads

# Changes in PG web 0.0.15 (xx-xx-2025)
Improvements 🙌:

- Hide copy link buttons
- Disable slash commands with UIFeature
- Include new translations

Bugfix 🐛:

- Fix logo & background on configuration error page
- Don't filter server search results by local results, since local results don't always contain the full information, because of the phonebook tiers
- Update pg-js-sdk to version 0.0.9: fallback roomstate for event state resolution

# Changes in PG web 0.0.14 (xx-xx-2025)
Improvements 🙌:

- Use the pg-call for calling: beam-call version 0.0.13

# Changes in PG web 0.0.13 (xx-xx-2025)
Upstream merge ✨:

- v1.12.8 (https://github.com/element-hq/element-web/tree/v1.12.8)

Improvements 🙌:

- Update mobile guide to match Beam branding & link to Beam application on app stores

# Changes in PG web 0.0.11 (xx-xx-2025)

Improvements 🙌:

- New Beam branding assets - Added new Beam logos (dark, light, SVG variants) and updated auth header and space panel styling
- Hide location & sticker with feature flag
- Hide sidebar settings tab when spaces are disabled
- Hide labs tab when labs setting is disabled
- Preferences settings - Removed several non-relevant preference options for Beam
- Updated security settings for Beam - Customized SecurityUserSettingsTab with Beam-specific options
- Simplified voice settings - Removed irrelevant audio/video options
- Hide high contrast theme option - Removed from theme selection panel
- Hide email notification setting - Removed email notification toggle
- Updated help section - Changed disclosure policy URL, removed access token display
- Disable public room/space creation - Restricted users from creating public rooms and public/private spaces via ComponentVisibility
    - If you already have a public room, or a space, it will still be visible
- Simplified room settings - Hidden advanced options, set default history visibility to "Invited" (aligned with mobile)
- Hide message context menu options - Removed permalink, report, and view source buttons from message actions
- Simplified room summary sidebar - Removed non-essential options from the right panel (message search, files)
- Reworked SpotlightDialog for Beam
    - Limited search results to 20
    - Hide public room/space search when disabled
    - show email for DM contacts
    - removed global message search option
- Remove message search since this is not supported in web
- Hide invite button for DMs - Removed invite option from member list in direct message rooms
- Removed reverse QR code login - Disabled "Link new device" option, removed MAS references from sessions tab
- Set device display name on QR login - Automatically sets the device name after successful QR code authentication
- Updated rageshake identifier - Set BEAM-specific rageshake ID for bug reports
- Updated bug report dialog - Removed GitHub references when reporting bugs
- Updated dependencies - Upgraded pg-compound-web & pg-compound-design-tokens to 0.0.6
- Removed the warning message: the authenticity of this encrypted messages can't be guaranteed on this device.


Bugfix 🐛:

- Updated presence indicator color - Changed online status icon to use green color
- Fixed room display names with lazy loading - Preload room members after initial sync and recalculate room names to ensure correct DM display names


# Changes in PG web 0.0.8 (xx-xx-2025)

Bugfix 🐛:

- realigns matrix-js-sdk and element-web after regression from PG web 0.0.7.
Upstream changes done in 0.0.7 were based on element-web 1.12.7. In that version, pg-js-sdk needed to be based on https://github.com/matrix-org/matrix-js-sdk/releases/tag/v39.4.0 .


# Changes in PG matrix-js-sdk 0.0.1 (xx-xx-2025)

Upstream merge ✨:

- v1.11.109 (https://github.com/element-hq/element-web/tree/v1.11.109)

Features ✨:

-  Make logging in on this device possible with QR code (like Whatsapp does)

Improvements 🙌:

- Only allow QR code login

Bugfix 🐛:

-
