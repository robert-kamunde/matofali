# Google Play release checklist

Google's rules change; check each item in Play Console on the day you submit. Sources checked on 27 October 2026: [new personal account testing requirement](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) (12 testers, 14 consecutive days, closed track) and [target API level](https://developer.android.com/google/play/requirements/target-sdk) (new apps and updates target API 36 from 31 August 2026). The project targets API 36.

Status key: ✅ ready in this repository · ⬜ needs Robert

## App identity

| Item | Value | Status |
| --- | --- | --- |
| App name on the store | Matofali: Brick Breaker | ✅ (`store/listing-*.md`) |
| App name under the icon | Matofali | ✅ |
| Application ID | `com.matofali.game`. **Permanent after the first upload.** Change it in `capacitor.config.json` and `android/app/build.gradle` before then if you prefer another. | ⬜ confirm |
| Version name / code | 1.0.0 / 1 (`android/app/build.gradle`). Raise the code by 1 for every upload. | ✅ |
| Minimum Android | 7.0 (API 24) | ✅ |
| Target API | 36 | ✅ |

## Build and signing

1. Create a GitHub repository (empty, private is fine) and push this folder. The workflow `.github/workflows/android.yml` builds a debug APK and a release AAB on every push. ⬜
2. Create an **upload key** once, on your own computer (needs a Java JDK):

   ```
   keytool -genkeypair -v -keystore matofali-upload.jks -alias matofali -keyalg RSA -keysize 2048 -validity 10000
   ```

   Store the `.jks` file and both passwords in two safe places (for example a password manager and an encrypted USB drive). Never commit them. ⬜
3. Add four GitHub repository secrets (Settings → Secrets and variables → Actions):
   - `MATOFALI_UPLOAD_KEYSTORE_BASE64`: the output of `base64 -w0 matofali-upload.jks` (macOS: `base64 -i matofali-upload.jks`)
   - `MATOFALI_UPLOAD_KEYSTORE_PASSWORD`
   - `MATOFALI_UPLOAD_KEY_ALIAS` (`matofali` above)
   - `MATOFALI_UPLOAD_KEY_PASSWORD` ⬜
4. Re-run the workflow; download `app-release.aab` from the run's artifacts. ⬜
5. In Play Console, accept **Play App Signing** when you upload the first bundle (Google keeps the final signing key; your upload key can be reset if lost). ⬜

Building locally instead: install Android Studio, then `npm ci && npm run build && npx cap sync android && cd android && ./gradlew bundleRelease`, with `android/keystore.properties` containing `storeFile`, `storePassword`, `keyAlias`, `keyPassword`.

## Store listing

| Item | File | Status |
| --- | --- | --- |
| App icon 512 × 512 PNG | `store/icon-512.png` | ✅ |
| Feature graphic 1024 × 500 | `store/feature-graphic-1024x500.png` | ✅ |
| Phone screenshots (1080 × 1920) | `store/screenshots/` (home, four levels, game over) | ✅ captured from the web build in a phone-sized browser; retake on a device if you prefer |
| Short and full description, Swahili and English | `store/listing-sw.md`, `store/listing-en.md` | ✅ text ready; ⬜ native-speaker review |
| Category | Game → Arcade | ✅ |
| Contact email | Required by Play Console | ⬜ |

## Policy forms

| Form | Answer for version 1 | Status |
| --- | --- | --- |
| Privacy policy URL | Host `docs/privacy-policy.html` (for example with GitHub Pages) and paste its public URL. | ⬜ |
| Data safety | No data collected, no data shared. Data is not encrypted in transit because none is transmitted. Users cannot request deletion because nothing leaves the device (uninstalling removes it). | ⬜ fill in |
| Ads | "No, my app does not contain ads" | ⬜ |
| Content rating (IARC questionnaire) | Category: Game. No violence, sexuality, language, controlled substances, gambling, user interaction or sharing of location. Expected result: suitable for all ages. | ⬜ |
| Target audience | 13 and over for version 1 (avoids the Families policy; revisit later) | ⬜ |
| App access | All functionality available without login | ⬜ |
| Government app, financial features, health | No | ⬜ |

## Testing and launch

1. Internal testing track: upload the AAB, add yourself and a few testers, install from the Play link, run `docs/TEST_PLAN.md` device checks. ⬜
2. Closed testing track: at least 12 testers opted in for 14 consecutive days. Ask them to play and send feedback (a WhatsApp group works); note issues in a simple list. ⬜
3. Apply for production access in Play Console (Google usually replies within 7 days). ⬜
4. Production: staged rollout, start at 20%, watch Android vitals (crash rate and ANR rate) for 2–3 days, then 50%, then 100%. ⬜
5. After launch: check vitals and reviews weekly; reply in the reviewer's language. ⬜

## Rule for any future change

Version 1 collects and transmits no player data. If ads, analytics, accounts or online features are added later, stop and update the privacy policy, the Data safety form and the ads declaration before release.
