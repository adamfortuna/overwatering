# Live demo: click path and fallbacks

<!-- Generated from docs/pitch/tools/demo.template.md by build_deck.py. Edit the template. -->

The demo slot is **1:10–3:00** in `script.md`, about 1 minute 50 seconds. It follows the flow on
slide 5: enter an address → confirm what's grass → see what going native saves → or lower your
water use today. The example lot is **603 E South Temple** (the Governor's Mansion, parcel
`09314870040000`). It's precomputed, so it doesn't depend on USDA. Never demo Adam's own address.

Numbers below were read off the live site at 2026-10-28 17:22 UTC. The lot had **7 shared
corrections** then, which make it 6,828 sq ft of lawn (the model's own range before
edits was 12,796–13,737). If anyone taps shapes on this lot, every number changes.
Rerun `node docs/pitch/tools/shots.mjs` and `build_deck.py` to refresh them.

Backup slides 11–24 show every step in order. If the Wi-Fi dies, stay in Slides and
click through them.

## Before you go on (15 minutes ahead)

- [ ] Use Chrome in a clean window with zoom at **125%**, and hide the bookmarks bar.
- [ ] Open these tabs in order:
  1. https://overwater.ing (home, search box empty)
  2. https://overwater.ing/p/84102/09314870040000 (the lot, as a fallback for search)
  3. https://overwater.ing/watering?lawn=6,828&eto=slc&back=%2Fp%2F84102%2F09314870040000
  4. http://localhost:8080 (the OpenSprinkler demo controller, logged in, on **Programs**)
- [ ] Start the controller (Docker Desktop must be running), then put the July program on it:
      `scripts/opensprinkler-demo.sh`, then `scripts/opensprinkler-demo.sh sync --date 2027-07-14`.
      The OpenSprinkler page loads its app from ui.opensprinkler.com, so it needs the internet
      too. Password: `opendoor`.
- [ ] In a Terminal window next to Chrome, put these commands in history so that up-arrow
      finds them: `scripts/opensprinkler-demo.sh sync` and `scripts/opensprinkler-demo.sh sync --date 2027-07-14`.
- [ ] Check this week's line in the calendar card on tab 3. At build time it said: *"Utah's Weekly Lawn Watering Guide says no watering in Salt Lake County this week."*.
- [ ] Load the lot page once so the aerial photo is cached.
- [ ] Try the live lot (the last step). If it doesn't measure on the venue Wi-Fi, plan to skip it.
- [ ] Have the backup video and your phone hotspot ready.

## Click path

| Time | Do | Say | If it fails |
|---|---|---|---|
| 1:10 | **1 · Enter your address.** On tab 1, type `603 E South Temple`. Click **603 E SOUTH TEMPLE ST 84102**. | "Any address in Utah. Let's take the Governor's Mansion." | Search hangs: go to **tab 2**. Site down: slide 12. |
| 1:20 | **2 · Confirm what's grass.** Point at the aerial photo, then the **Your lawn** card. Tap one green shape once, then tap it three more times so it's green again. | "The 2024 aerial photo. Green is lawn, dark green is trees, red is buildings: 6,828 square feet of lawn. Get a shape wrong and you tap it. That correction trains the model." | The photo is blank: talk over the numbers, which come from our own data. Slide 13. |
| 1:40 | **3 · See what going native saves.** Scroll to **3 · Every year: Go native** (89,236 gal/yr), then up to **2 · One time: Take the rebate**. | "Go native and this lot saves about 89,000 gallons a year. And Utah pays up to $20,484 here, from Central Utah Water Conservancy District. It knows the city, the water system and the program." | Slides 14–15. |
| 1:55 | Click **What going native looks like →**. Show the before and after. | "Here's what that looks like, the plants that grow here, and who to call." | Slide 14. |
| 2:05 | **4 · Lower your water use today.** Go to **tab 3**. Click **Pop-up spray heads**, then **A basic timer**. | "Or start today. Spray heads and a basic timer, like most Utah yards: here's the one thing to change, and the schedule month by month for this county." | Slide 16. |
| 2:15 | Scroll to **Get this schedule as a calendar**. Point at the **This week** line. | "Subscribe once and it follows the state's weekly watering guide." | Slide 18. |
| 2:25 | **Terminal:** run `scripts/opensprinkler-demo.sh sync`. It prints that it switched the program off. On **tab 4**, reload **Programs**: **Enabled** is unchecked. | "Or send it straight to the controller. This is OpenSprinkler's real firmware. This week the state says no watering, so it switched itself off." | If the program is hidden, open the footer menu and pick **Show Disabled**. Otherwise slide 19. |
| 2:35 | **Terminal:** `scripts/opensprinkler-demo.sh sync --date 2027-07-14`. It prints **Mon, Wed, Fri at 05:00: 4 × 7 min**. Reload **Programs**. | "In July: Monday, Wednesday, Friday at 5 a.m., four short cycles a zone, so it soaks in." | Slide 19. |
| 2:50 | *(Optional, only if the warm-up worked.)* On the lot, click **← another address** and type `67 W 200 N`. Pick the **St. George** result. | "None of that was precomputed for St. George. The browser just measured it: 10,834 square feet, needing 42 inches a season." | Skip it, or use slide 22. |
| 3:00 | Switch back to Slides, slide 6. | | |

## Watch out

- **Corrections on the mansion lot are saved for everyone.** If you tap a shape, tap until it's
  green again. The cycle is lawn → not lawn → converted → trees → lawn (four taps).
- Numbers to have ready: lot 48,811 sq ft; 7,781 sq ft under trees, not counted;
  about 29 inches (124,000 gallons) a year needed; Salt Lake reference ET 50.4 in/yr.
- After the pitch, run `scripts/opensprinkler-demo.sh stop`.

## Optional: the bill

If there's time, or someone asks how we check the result: on the lot, open **Add your water bill**
and upload `scripts/fixtures/sample_slc_bill.png`. Claude reads twelve months in about 5 seconds.
The page shows **197,334 gal/yr** of overwatering (320,914 gal/yr outdoors against
123,581 needed). If Claude doesn't answer, open **Edit your bill**, leave the unit on CCF,
and type: Jan 10, Feb 10, Mar 11, Apr 26, May 58, Jun 92, Jul 108, Aug 102, Sep 70, Oct 40,
Nov 12, Dec 10.

## Live lot outside Salt Lake County

- **67 W 200 N, St. George** (Washington County, https://overwater.ing/u/Washington/SG-464-CB): 10,834 sq ft
  of lawn needing 42 inches a season (284,181 gal/yr), with a rebate of up to $21,668.
- usda.gov's DNSSEC has been broken since Oct 27, so DNS resolvers that validate it can't find
  the imagery host. The site asks USDA from your browser instead, which works only if your
  laptop's DNS doesn't validate DNSSEC. Test it on the venue Wi-Fi.

## Backup video

Record the full click path once on the Mac. Use QuickTime (File → New Screen Recording) at 125%
zoom; it runs about 2 minutes. Keep it on the desktop and play it over slide 5 if the network is
unusable.
