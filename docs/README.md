# docs

Everything the stores ask for, and the two documents that have to be public before release.

| File | What it is |
|---|---|
| `privacy-policy.en.md`, `privacy-policy.mk.md` | Privacy policy. Must be hosted and reachable without signing in. |
| `terms.en.md`, `terms.mk.md` | Terms of use. |
| `store/listing.en.md`, `store/listing.mk.md` | Names, descriptions, keywords, categories. |
| `store/iap-products.md` | The three credit packs, as consumables, in both stores and RevenueCat. |
| `store/app-privacy.md` | Apple's App Privacy questionnaire, answered from the code. |
| `store/data-safety.md` | Play's Data safety form, answered from the code. |
| `store/screenshots.md` | Sizes, the six frames, and the script that captures them. |
| `store/screenshots/` | The captured sets: `ios-en`, `ios-mk`, `android-en`, `android-mk`, and the Play feature graphic. |
| `store/pre-submission-checklist.md` | **Read this first.** The blockers, then everything else. |
| `credentials.md` | Where every value in `PLACEHOLDERS.md` comes from, in the order to collect them. |

The policy and the terms carry `[COMPANY LEGAL NAME]` and `[REGISTERED ADDRESS]` placeholders,
and both name `vetura.mk` addresses that do not exist yet. Neither can be published as is.

Regenerate the screenshots after any design change:

    cd app && node scripts/store-screenshots.js
