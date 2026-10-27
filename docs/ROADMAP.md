# Roadmap and known limitations

## Known limitations of version 1.0.0

| # | Limitation | Impact | Plan |
| --- | --- | --- | --- |
| L-1 | Not yet built or run as an Android app: the development machine could not reach Google's Android download server. | Android-specific behaviour (Back button, pause on Home, vibration, insets, splash, icon) is implemented but unverified on a device. | Build through GitHub Actions, then run the device checklist. |
| L-2 | Performance measured only in an emulated phone browser (60 FPS median with the CPU slowed 6×). | Real budget-phone WebView performance unknown. | Device test on a 2 GB phone. |
| L-3 | Whether Android's "Remove animations" setting reaches the WebView's reduced-motion preference is unverified. | Particles and shake may still show for those users. | Check on device; add an in-app "reduce effects" switch if needed. |
| L-4 | Swahili text not yet reviewed by a native speaker. | Possible awkward phrasing. | docs/SWAHILI_REVIEW.md |
| L-5 | Ball speed capped at 14 (D-04) and toughening is +1 hit from round 2 only (D-07). | Late rounds get no harder after about level 17. | Tune with tester feedback. |
| L-6 | Pause screen toggles sound only; vibration and language are in Settings. | None in practice. | — |

No known critical or release-blocking defects in the automated test results.

## Future versions

| Version | Focus | Contents |
| --- | --- | --- |
| 1.0.x | Fixes from device and closed testing | Balance, touch feel, any device bugs |
| 1.1 | Polish | Recorded sound effects, optional "reduce effects" switch, more how-to-play detail |
| 2.0 | More content | 8–12 new levels (Ngorongoro, Twiga, Dar es Salaam skyline, Lake Victoria, Mount Meru), background music by a Tanzanian artist with written permission |
| 2.x | Compete | Google Play Games leaderboards, daily challenge, achievements. Requires updating the privacy policy and Data safety form first. |
