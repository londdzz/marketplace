# Apple App Privacy questionnaire — answers

Answer it from what the app actually sends, not from what a marketplace usually collects. Every
line below points at the code that does it, so it can be checked again when something changes.

## Data collected and linked to the user's identity

| Apple category | What it is | Why | Tracking? | Where in the code |
|---|---|---|---|---|
| Contact Info → Phone Number | The number the account signs in with | App Functionality, Product Personalization (it is the identity) | No | `POST /auth/otp/request`, `otp_codes`, `users.phone` |
| Contact Info → Name | Display name, dealer business name — both optional | App Functionality | No | `PATCH /me` |
| User Content → Photos or Videos | Photographs of the car being sold | App Functionality | No | `POST /listings/{id}/photos` |
| User Content → Other User Content | Listing text, description, messages, reports | App Functionality | No | listings, messages, reports |
| Identifiers → User ID | The account id | App Functionality | No | all authenticated endpoints |
| Purchases → Purchase History | Which credit pack was bought and when | App Functionality | No | `credit_transactions`, RevenueCat webhook |
| Location → Coarse Location | **Town chosen from a list, not read from the device** | App Functionality | No | `users.city_id`, `listings.city_id` |

Apple counts a town the person types or picks as coarse location. It is declared, and the app
asks for no location permission at all — there is no `NSLocationWhenInUseUsageDescription` in
the Info.plist, and no location API is called anywhere.

## Data collected and not linked to identity

| Apple category | What it is | Why |
|---|---|---|
| Diagnostics → Crash Data / Performance Data | Only if a crash reporter is added later | App Functionality |

None today: no analytics SDK, no crash SDK, no advertising SDK is in the build. If one is
added, this questionnaire must be updated in the same release.

## Data not collected

Health, Financial Info (the stores take the payment; we never see a card), Contacts, Browsing
History, Search History from other apps, Sensitive Info, Advertising Data, Device ID for
tracking, Email Address (the column exists and is nullable; the app never asks for one).

## Tracking

**No.** Nothing is shared with a data broker, nothing is used to target advertising, and there
is no cross-app or cross-site tracking. Do not add the App Tracking Transparency prompt: asking
for permission the app does not use is itself a rejection.

## Push notifications

Declared as App Functionality. The token is a device push token stored against the account,
registered after sign-in and deleted on sign-out. Notifications carry replies to messages, a
saved search finding a car, and a listing about to expire — never advertising.

## Account deletion

Required by Apple since 2022 and present: **Profile → Delete my account**, two taps from
anywhere. It deletes the account and everything attached to it, not just "deactivates" it, and
the API endpoint behind it is `DELETE /me`.
