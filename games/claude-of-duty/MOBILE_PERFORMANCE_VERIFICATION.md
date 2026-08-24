# Mobile performance verification

## What changed

- Mobile launches with the existing low-cost pipeline: FXAA instead of TAA;
  SSR, GTAO, motion blur, volumetrics, and DOF are not constructed.
- A three-second real frame-time probe selects `low`, `balanced`, or `high`.
- The selected tier changes internal resolution, bloom, physics frequency,
  catch-up-step limit, live ragdoll count, and ragdoll solver iterations.
- Desktop quality selection is unchanged.
- The touch joystick, movement transform, trigger, recoil, muzzle-flash event,
  and fire-audio event code were not modified.

## Android test procedure

1. Deploy the package and open
   `games/claude-of-duty/?perf=1` on the Android device.
2. Wait until the overlay says `complete` (about six seconds after gameplay
   starts). Copy the before/after median, p95, FPS, and selected tier. The same
   object is available in `window.__MOBILE_PERF__` and is saved under the
   `claude-of-duty-mobile-perf` local-storage key.
3. Move the left stick to all eight directions: forward, back, left, right, and
   four diagonals. Confirm the character moves camera-relative in each direction.
4. Hold FIRE and confirm every shot has a visible muzzle flash, camera/viewmodel
   recoil, and audible report. Repeat while moving diagonally.
5. Record the device model and Android/browser versions below.

## Real-device results

Physical-device fields are intentionally blank until an Android run is made;
they must not be filled with desktop emulation or estimates.

| Field | Result |
| --- | --- |
| Device / Android / browser | Pending physical-device run |
| Selected tier | Pending physical-device run |
| Before median / p95 / FPS | Pending physical-device run |
| After median / p95 / FPS | Pending physical-device run |
| Eight-direction movement | Pending physical-device run |
| Muzzle flash / recoil / sound | Pending physical-device run |
| Remaining symptom and targeted fix | None observed in source-level trace; pending physical-device run |

## Source-level checks

- Touch input preserves independent X and Y axes, clamps only by vector length,
  and passes both axes into `cmd.moveX` / `cmd.moveY`.
- Movement combines forward and right camera-relative basis vectors; neither
  axis overwrites the other.
- A successful shot applies viewmodel and camera recoil, increments the pending
  shot count, then emits `weapon:fire`; FX and audio both subscribe to that event.
