# A Bulls App — Android, Google Play, and Solana dApp Store Handoff

Android packaging begins after `https://abullsapp.com` is deployed and passes the Cloudflare smoke test.

## Immutable identity

- Android package: `com.abullsapp.app`
- Release key: reuse the existing `A-Bulls-App-release.keystore`
- Never commit, upload, replace, expose, or lose the keystore or its passwords.
- Every update must use the same applicable signing/upload identity.

## Trusted Web Activity build

1. Install the current Bubblewrap CLI in a controlled build environment.
2. Initialize or update the wrapper from `https://abullsapp.com/manifest.webmanifest`.
3. Confirm package `com.abullsapp.app`, app name `A Bulls App`, start URL `/`, scope `/`, and orientation `any`.
4. Point Bubblewrap at the existing release keystore and existing alias. Do not allow it to create a replacement key.
5. Build both the signed APK and Play App Bundle.
6. Preserve `app-release-signed.apk` for device/Solana-store testing and `app-release-bundle.aab` for Google Play.

## Digital Asset Links

Obtain the SHA-256 fingerprint for the locally signed APK/upload key. If Google Play App Signing is enabled, also obtain the Play app-signing certificate fingerprint from Play Console. Publish the applicable fingerprints at:

`https://abullsapp.com/.well-known/assetlinks.json`

The file must identify package `com.abullsapp.app` with relation `delegate_permission/common.handle_all_urls`. A wrong fingerprint causes browser chrome to appear instead of a verified full-screen Trusted Web Activity.

## Device acceptance test

- Install the signed APK on an Android phone.
- Confirm no URL bar appears after Digital Asset Links verification.
- Test cold start, rotation, back behavior, offline restart, service-worker update, low-memory recovery, and network reconnect.
- Test the particle field, exact entity focus, Replay, Compare, What If disclosure, Trickster local export, and Bull Invaders touch controls/audio.
- Confirm no wallet connection, signature, transaction, seed phrase, private-key, custody, or payment flow exists.

## Google Play

- Use the existing app record for package `com.abullsapp.app`, or create it once if none exists.
- Upload the signed AAB through an internal test track first.
- Complete Data Safety, content rating, app access, privacy-policy URL, store listing, screenshots, feature graphic, and testing requirements.
- Verify the Play-distributed signing certificate is present in `assetlinks.json` before production rollout.
- Promote only after internal testing passes on real phones.

## Solana dApp Store

- Use the signed APK, not the AAB.
- Create/verify the Publisher Portal account and KYC/KYB.
- Use one durable publisher wallet and preserve access to it for future updates.
- Prepare listing metadata, icon, screenshots, privacy URL, and the reviewed publisher-policy declarations.
- Upload the APK and assets through the selected storage provider, approve the required publisher signing transactions, and submit for review.
- Future updates must increase version code/name and use the same Android signing key and publisher wallet.

The in-app product remains read-only. Publisher-portal wallet signatures are an owner/store-publication action outside the app and do not change the app’s no-wallet-connect rule.
