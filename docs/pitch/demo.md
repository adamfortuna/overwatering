# Live demo: click path and fallbacks

The demo slot is **1:10–3:00** in `script.md`, about 1 minute 50 seconds. The example lot is
**603 E South Temple** (the Governor's Mansion, parcel `09314870040000`). Never demo Adam's own
address.

Backup slides 14–25 in `overwatering.pptx` show every step in the same order. If the Wi-Fi dies,
stay in Slides and click through them.

## Before you go on (15 minutes ahead)

- [ ] Use Chrome in a clean window, signed out, with zoom at **125%** so the room can read it.
      Hide the bookmarks bar.
- [ ] Open these tabs in order:
  1. https://overwater.ing (home, search box empty)
  2. https://overwater.ing/p/84102/09314870040000 (the lot, as a fallback for search)
  3. https://overwater.ing/watering?lawn=11141&eto=slc&back=%2Fp%2F84102%2F09314870040000
  4. https://overwater.ing/native?lawn=11141&eto=slc&city=Salt+Lake+City&county=Salt+Lake&back=%2Fp%2F84102%2F09314870040000
  5. The OpenSprinkler demo firmware (URL goes here once `connect/` ships)
- [ ] Put `scripts/fixtures/sample_slc_bill.png` on the desktop as **sample-bill.png**.
- [ ] Load the lot page once so the aerial tile is cached at the edge.
- [ ] Do a warm-up bill upload, then reload the page. This checks the Claude key in production.
- [ ] Do a warm-up live lot outside Salt Lake County (step 8). If it errors, plan to skip that step.
- [ ] Have the backup video on the desktop (see the last section).
- [ ] Phone hotspot ready as a second network.

## Click path

| Time | Do | Say | If it fails |
|---|---|---|---|
| 1:10 | **Tab 1.** Click the search box and type `603 E South Temple`. Click the first result, **603 E SOUTH TEMPLE ST 84102**. | "Any address in Utah. Let's take the Governor's Mansion." | Search hangs: switch to **tab 2**. Site down: go to slide 14. |
| 1:20 | **Lot page.** Point at the aerial photo, then the **Your lawn** card. | "2024 USDA aerial photo. Green is lawn, dark green is trees we left out, red is buildings. 11,141 square feet of lawn, confidence high. If we got a shape wrong you tap it, and that correction becomes training data." | Aerial photo is blank: talk over the numbers, which load from our own data. Then use slide 15. |
| 1:35 | Point at the line under the big number: **29 inches**, **201,642 gallons a year**. | "In Salt Lake's weather that lawn needs about 29 inches a season, 200,000 gallons a year." | Same as above. |
| 1:45 | **1 · Today** card → **Add your water bill** → choose `sample-bill.png`. Wait for "Read 12 months…". | "Upload a bill. Claude reads twelve months of usage off the photo." | See **Bill step** below. Slide 16. |
| 2:00 | Click **Build my watering plan →** (or **tab 3**). Click **Pop-up spray heads**, then **A basic timer**. | "Spray heads and a basic timer, like most Utah yards. The one thing to do: change the timer once a month, and save about 194,000 gallons a year. Here's the schedule, month by month." | Slides 17–18. |
| 2:15 | **Subscribe to the watering calendar.** *(In progress. Replace this row when the calendar ships.)* | "Subscribe, and the schedule follows the state's Weekly Lawn Watering Guide." | Slide 19 (placeholder until shipped). |
| 2:25 | **Tab 5: OpenSprinkler demo.** *(In progress. Replace this row when `connect/` ships.)* Show this week. Then switch to a July week. | "The controller reads the same schedule. This week the state says no watering, so it paused itself. In July, the minutes come back." | Slide 20 (placeholder until shipped). |
| 2:35 | **Tab 4** (or **What going native looks like →** on the lot). Show the before and after. | "Or go native. This lot would save about 145,000 gallons a year." | Slide 21. |
| 2:45 | Back on the lot page, scroll to **2 · One time**. | "And Utah pays you to do it. Up to $33,423 here, from Central Utah Water Conservancy District. It knows the city, the water system, and which program applies." | Slide 22. |
| 2:55 | *(Optional, only if the warm-up worked.)* Click **← another address** and type the live lot below. | "None of that was precomputed for St. George. The browser just measured it." | Skip it and say the line over slide 23. |
| 3:00 | Switch back to Slides, slide 7. | | |

## Watch out

- **Don't leave a shape changed on the mansion lot.** Corrections are saved for everyone (the
  page says "3 corrections so far"). If you tap a shape to show it, keep tapping until it is
  back to green. The cycle is lawn → not lawn → converted → trees → lawn.
- The lawn number (11,141 sq ft) already includes those three earlier corrections. The model's
  own range, before edits, is 12,796–13,737 sq ft. If someone asks, that's the correction loop
  doing its job.
- Numbers to have ready: lot 48,811 sq ft; 7,781 sq ft under trees, not counted; 2,019 sq ft
  already converted; Salt Lake reference ET 50.4 in/yr.

## Bill step

- **As of Oct 27, 11 pm:** the sample bill is a typical-home bill, so on the mansion's 11,141 sq ft
  lawn it reads as **"Right on target"** (83,782 gal/yr outdoors vs. 201,642 needed), not as an
  overwatering gap. The card still shows "Optimize your watering for next year: swap spray
  nozzles for rotary nozzles and save about 41,363 gallons a year." I've asked the app session
  for a sample bill sized for this lot. Until that lands, say: *"The Governor's Mansion is
  actually on target. Most of us aren't. Even so, here's the one change that saves 41,000
  gallons."*
- **If Claude doesn't answer**, the page falls back to manual entry. Open **Edit your bill**,
  leave the unit on CCF, and type the sample bill's months: Jan 6, Feb 6, Mar 7, Apr 10,
  May 18, Jun 28, Jul 32, Aug 30, Sep 22, Oct 12, Nov 7, Dec 6.

## Live lot outside Salt Lake County

- Candidate: **67 W 200 N, St. George** (Washington County, parcel `SG-464-CB`,
  https://overwater.ing/u/Washington/SG-464-CB). It's the hottest county in the state, with
  70 in/yr reference ET.
- **As of Oct 27, 11 pm, live measurement fails in production.** The page says "The 2024 aerial
  imagery service is not answering", and `/api/naip-info` returns 500 from the Worker even
  though USDA answers from elsewhere. I've reported it to the app session. Re-check before the
  pitch. If it still fails, skip the step.

## Backup video

Record the full click path once the calendar and controller steps are live. Use QuickTime
(File → New Screen Recording) on the Mac at 125% zoom, about 2 minutes. Put it on the desktop
and drop it into slide 6 if the network is unusable.
