# Google Play Data safety — answers

Play asks separately whether data is **collected** (leaves the device) and **shared** (goes to a
third party). Answer both honestly; Play compares the form against what the app actually does.

## Does the app collect or share data? Yes, collect. Sharing: only as listed below.

### Personal info
| Type | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|
| Name | Yes | No | Yes (optional) | App functionality |
| Phone number | Yes | No | No (it is the login) | App functionality, account management |
| Other info (town, language, dealer name) | Yes | No | Partly | App functionality |

### Photos and videos
| Type | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|
| Photos | Yes | No | No, to publish a listing | App functionality |

### Messages
| Type | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|
| Other in-app messages | Yes | No | No, to contact a seller | App functionality |

### Financial info
| Type | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|
| Purchase history | Yes | No | No | App functionality |

Payment information itself is **not collected**: Google Play takes the payment.

### App activity
| Type | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|
| Other actions (saved cars, saved searches) | Yes | No | Yes | App functionality, personalisation |

### App info and performance, Device or other IDs
Not collected. There is no analytics or crash SDK in the build. A push token is collected as
part of app functionality and is declared under "Other info".

## Security practices

- **Data is encrypted in transit.** Yes — the API is HTTPS only.
- **You can ask for data to be deleted.** Yes — in the app, and by writing to privacy@autevo.mk.
  Provide the deletion URL Play now requires: `https://autevo.mk/delete-account`, a page that
  explains the two taps in the app and offers the email route for someone who has uninstalled it.
- **Committed to Play Families policy:** not applicable, the app is not for children.
- **Independent security review:** no.

## Third parties that receive data, and why

Naming these in the form is not required for every processor, but keep the list current for the
privacy policy, which must match this form:

- Apple / Google — payment for credit packs.
- RevenueCat — purchase validation, so the API can grant credits.
- Meta (WhatsApp Cloud API) — delivers the one-time sign-in code.
- Firebase Cloud Messaging and APNs — deliver notifications.
- Hosting and object storage — the database and the photographs.
