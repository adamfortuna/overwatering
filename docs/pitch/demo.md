# Live demo: click path and fallbacks

The demo slot is **1:10–3:00** in `script.md`, about 1 minute 50 seconds. The example lot is
**603 E South Temple** (the Governor's Mansion, parcel `09314870040000`). It's precomputed, so it
doesn't depend on USDA. Never demo Adam's own address.

Backup slides 14–26 in `overwatering.pptx` show every step in the same order. If the Wi-Fi dies,
stay in Slides and click through them.

## Before you go on (15 minutes ahead)

- [ ] Use Chrome in a clean window with zoom at **125%** so the room can read it. Hide the
      bookmarks bar.
- [ ] Open these tabs in order:
  1. https://overwater.ing (home, search box empty)
  2. https://overwater.ing/p/84102/09314870040000 (the lot, as a fallback for search)
  3. https://overwater.ing/native?lawn=11141&eto=slc&city=Salt+Lake+City&county=Salt+Lake&back=%2Fp%2F84102%2F09314870040000
  4. http://localhost:8080 (the OpenSprinkler demo controller, logged in, on **Programs**)
- [ ] Put `scripts/fixtures/sample_slc_bill.png` on the desktop as **sample-bill.png**. Pull
      first: the Oct 28 version is sized for the mansion's lawn.
- [ ] Start the controller, then put the July program on it:
      ```bash
      scripts/opensprinkler-demo.sh                          # needs Docker Desktop running
      scripts/opensprinkler-demo.sh sync --date 2027-07-14   # July: Mon/Wed/Fri, 4 × 7 min
      ```
      The OpenSprinkler page at localhost:8080 loads its app from ui.opensprinkler.com, so it
      needs the internet too. Password: `opendoor`.
- [ ] In a Terminal window next to Chrome, put both commands in history so that up-arrow
      finds them: `scripts/opensprinkler-demo.sh sync` and
      `scripts/opensprinkler-demo.sh sync --date 2027-07-14`.
- [ ] Load the lot page once so the aerial photo is cached.
- [ ] Do one warm-up bill upload, then reload the page. This checks the Claude key in
      production.
- [ ] Try the live lot (step 9). If it doesn't measure on the venue Wi-Fi, plan to skip it.
- [ ] Have the backup video on the desktop (see the last section).
- [ ] Have your phone hotspot ready as a second network.

## Click path

| Time | Do | Say | If it fails |
|---|---|---|---|
| 1:10 | **Tab 1.** Type `603 E South Temple` in the search box. Click **603 E SOUTH TEMPLE ST 84102**. | "Any address in Utah. Let's take the Governor's Mansion." | Search hangs: switch to **tab 2**. Site down: go to slide 14. |
| 1:20 | **Lot page.** Point at the aerial photo, then at the **Your lawn** card. | "2024 USDA aerial photo. Green is lawn, dark green is trees we left out, red is buildings. 11,141 square feet of lawn, confidence high. Get a shape wrong and you tap it; that correction trains the model." | The photo is blank: talk over the numbers, which come from our own data. Then use slide 15. |
| 1:35 | Point at the line under the big number: **29 inches**, **201,642 gallons a year**. | "In Salt Lake's weather that lawn needs about 29 inches a season. That's 200,000 gallons a year." | Same as above. |
| 1:45 | In the **1 · Today** card, click **Add your water bill** and choose `sample-bill.png`. Wait about 5 s for **119,272 gal/yr**. | "Upload a bill. Claude reads twelve months off the photo. This lawn gets 119,000 gallons a year more than it needs." | See **Bill step** below. Slide 16. |
| 2:00 | Click **Build my watering plan →**. Click **Pop-up spray heads**, then **A basic timer**. | "Spray heads and a basic timer, like most Utah yards. Here's the one thing to change, and the schedule month by month." | Slides 17–18. |
| 2:10 | Scroll to **Get this schedule as a calendar**. Point at the yellow **This week** line. | "Subscribe once and it follows the state's weekly watering guide. This week the state says no watering in Salt Lake County." | Slide 19. |
| 2:20 | **Terminal:** up-arrow to `scripts/opensprinkler-demo.sh sync`, press Enter. It prints **Switched off program 1 … for the week**. Then go to **tab 4** and reload **Programs**. **Enabled** is unchecked. | "Or let it drive the controller. This is OpenSprinkler's real firmware. This week, it switched itself off." | If the program is hidden, open the footer menu and pick **Show Disabled**. Otherwise use slide 20. |
| 2:30 | **Terminal:** `scripts/opensprinkler-demo.sh sync --date 2027-07-14`. It prints **Mon, Wed, Fri at 05:00: 4 × 7 min**. Reload **Programs**. | "In July: Monday, Wednesday, Friday at 5 a.m., four short cycles a zone, so it soaks in. Same open API for Rachio and Hydrawise next." | Slides 20–21. |
| 2:40 | **Tab 3** (or click **What going native looks like →** on the lot). Show the before and after. | "Or go native. This lot would save about 145,000 gallons a year." | Slide 22. |
| 2:48 | **Tab 2**: scroll to **2 · One time**. | "And Utah pays you to do it. Up to $33,423 here, from Central Utah Water Conservancy District. It knows the city, the water system and the program." | Slide 23. |
| 2:55 | *(Optional, only if the warm-up worked.)* Click **← another address** and type `67 W 200 N`. Pick the **St. George** result. | "None of that was precomputed for St. George. The browser just measured it: 10,800 square feet, needing 42 inches a season." | Skip it and say the line over slide 24. |
| 3:00 | Switch back to Slides, slide 7. | | |

## Watch out

- **Don't leave a shape changed on the mansion lot.** Corrections are saved for everyone (the
  page says "3 corrections so far"). If you tap a shape to show it off, keep tapping until it's
  green again. The cycle is lawn → not lawn → converted → trees → lawn (four taps).
- The lawn number (11,141 sq ft) already includes those three earlier corrections. The model's
  own range, before edits, is 12,796–13,737 sq ft. If someone asks, that's the correction loop
  doing its job.
- Numbers to have ready: lot 48,811 sq ft; 7,781 sq ft under trees, not counted; 2,019 sq ft
  already converted; Salt Lake reference ET 50.4 in/yr; the bill shows 320,914 gal/yr
  outdoors.
- After the pitch, run `scripts/opensprinkler-demo.sh stop`.

## Bill step

- The sample bill (updated Oct 28) gives **119,272 gal/yr** of overwatering on this lot. The
  plan's top fix is to swap spray nozzles for rotary nozzles, about 41,363 gal/yr.
- **If Claude doesn't answer**, the page falls back to manual entry. Open **Edit your bill**,
  leave the unit on CCF, and type: Jan 10, Feb 10, Mar 11, Apr 26, May 58, Jun 92, Jul 108,
  Aug 102, Sep 70, Oct 40, Nov 12, Dec 10.

## Live lot outside Salt Lake County

- The lot is **67 W 200 N, St. George** (Washington County, parcel `SG-464-CB`,
  https://overwater.ing/u/Washington/SG-464-CB). It measured 10,834 sq ft of lawn needing
  42 inches a season (284,181 gal/yr), with a rebate of up to $21,668.
- **Caveat (Oct 28):** usda.gov's DNSSEC is broken, so DNS resolvers that validate DNSSEC can't
  find the imagery host. That includes Cloudflare, Google 8.8.8.8 and Comcast. The site now
  asks USDA from your browser, which works only if your laptop's DNS doesn't validate DNSSEC.
  Test it on the venue Wi-Fi; if it fails, skip the step and use slide 24.

## Backup video

Record the full click path once on the Mac. Use QuickTime (File → New Screen Recording) at 125%
zoom; it runs about 2 minutes. Keep it on the desktop and play it over slide 6 if the network
is unusable.
