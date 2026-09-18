# Running Autevo on a real phone

The web preview is for judging layout. Fonts, safe areas, the keyboard, the keychain,
push and in-app purchases only tell the truth on a device. This is how to get it onto
one from a Windows machine, without a Mac and without an Apple Developer account.

## What this route can and cannot show you

A free Apple ID signs an app for seven days and cannot grant two entitlements:

- **Push notifications do not work.** Registration fails at sign-in; the failure is
  swallowed and sign-in carries on, so nothing is blocked.
- **In-app purchases do not work.** With no RevenueCat key in the build, the credits
  sheet says purchases are unavailable rather than pretending otherwise.

Everything else is real: Sora rendering natively, the safe areas top and bottom, the
tab bar against the home indicator, the keyboard over the sell flow and the message
composer, `expo-secure-store` keeping you signed in across a relaunch, the photo
picker and the HEIC conversion, and the language switcher.

Both missing pieces need the Apple Developer Program, which is also what EAS needs to
build and sign for you. At that point none of the steps below apply any more.

## 1. Point the build at an API it can reach

The phone cannot reach `127.0.0.1` — that is the phone itself. Find your machine's
address on the wifi (`ipconfig`, the IPv4 address of your wireless adapter, usually
`192.168.x.x`) and start Laravel so it accepts connections from off the machine:

```
php artisan serve --host=0.0.0.0 --port=8000
```

Windows Firewall will ask the first time. Allow it on private networks.

The phone and the machine have to be on the same wifi. `app.json` allows plain HTTP to
the local network for exactly this; anything off the local network still has to be
HTTPS, so production is unaffected.

Sign-in codes go to `api/storage/logs/laravel.log` while `OTP_DRIVER=log`, so no
WhatsApp account is needed to get in.

## 2. Build the IPA

iOS code cannot be compiled anywhere but macOS, so GitHub's runners do it. In the
repository on GitHub: **Actions → iOS unsigned IPA → Run workflow**, and give it the
API address from step 1, for example `http://192.168.1.20:8000/api/v1`.

It takes twenty minutes or so. When it finishes, download the
`autevo-unsigned-ipa` artifact and unzip it to get `autevo-unsigned.ipa`.

macOS runner minutes bill at ten times the rate of Linux ones, so on a private
repository a free plan is worth a handful of builds a month. Re-signing an IPA you
already have costs nothing, so only rebuild when the code has changed.

## 3. Install it

Either tool works. Both re-sign the IPA with your Apple ID as they install it.

- **Sideloadly** — plug the phone in, drag the IPA in, enter your Apple ID, install.
  Manual, and you repeat it every seven days.
- **AltStore** — more to set up, but it refreshes the app over wifi before it expires,
  so it keeps working.

Use an Apple ID you do not mind entering into a third-party tool. A free account holds
three sideloaded apps at once.

On first launch, **Settings → General → VPN & Device Management** and trust the
developer, or iOS refuses to open it.

## 4. What to actually look at

The web preview cannot answer any of these:

- The tab bar sits above the home indicator, with all five labels whole.
- The Call and Message bar, the sell flow's Continue bar and the message composer all
  clear the home indicator, and each keeps its own background down to the screen edge.
- Sora is the font everywhere. If something falls back to the system face, the font
  did not load.
- The keyboard does not cover the field being typed into, in the sell flow, the
  message composer and the profile editor.
- Closing the app and reopening it leaves you signed in.
- Taking a photo with the camera and choosing one from the library both upload, and
  a HEIC photo arrives as a JPEG.
- Text size at the largest accessibility setting does not clip any row.

## Later, with a paid account

`eas build --platform ios --profile preview` builds and signs on Expo's machines and
installs over the air, with no Mac and no sideloader. That build can do push and can
test in-app purchases against the sandbox. `eas submit` uploads to App Store Connect
from Windows too — the Mac is only ever needed for the simulator and Xcode itself.
