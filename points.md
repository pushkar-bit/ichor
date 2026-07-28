# ICHOR Points Economy

The single source of truth for `User.points` — what earns it, what costs it, and why. If a
number here and a number in code ever disagree, the code is the bug; fix the code, not this
file, unless you're deliberately rebalancing (in which case update both together).

Every change is a row in `PointsLedger` (`models/PointsLedger.ts`), inserted through
`award()` (`lib/points.ts`). Each row has a caller-built `uniqueKey` that's enforced unique at
the database level — the same event can never award twice, even if a webhook replays or a
cron sweep runs twice. `User.points` is the materialized sum, floored at zero.

## Design principle

**Fewer owners, more kilometers.** A territory is worth the most to whoever holds it alone
and keeps running through it. The moment it splits between two owners, or sits unvisited, its
earning power drops. Every rule below either rewards that ideal state directly, or penalizes
moving away from it.

---

## 1. Per-run rewards

Awarded on every GPS-verified run (Strava sync or manual GPS import — screenshots/manual
entry never qualify, see `isTerritoryEligibleRun`). At most **2 scoring runs per day** count
(`DAILY_SCORING_RUN_CAP` in `lib/points.ts`) — logging ten short junk runs to farm rewards
doesn't out-earn two real ones.

| Reason | Amount | Basis |
|---|---|---|
| `DAILY_ACTIVITY` | +10, once/day | Showing up today at all, independent of distance or pace. |
| `PER_KM_BONUS` | +3 × km run | Every kilometer, every run — the base "more distance = more points" reward. A 10K pays 30, a marathon pays ~127. |
| `THRESHOLD_5K` / `10K` / `15K` / `HALF` / `30K` / `FULL` | 25 / 60 / 110 / 200 / 350 / 600 | Distance milestones, highest band only per run (a marathon isn't six stacked awards). |
| `PACE_BAND` | 3–100, once/day | Faster average pace pays more (sub-4:00/km tops out at 100). Only runs ≥3km qualify — a fast 400m doesn't count as a fast run. |
| `PB_5K` / `PB_10K` | 150 / 250 | A new personal-best pace in the 5K or 10K distance band, compared against every prior verified run. |
| `PB_LONGEST` | 100 | A new longest-ever distance. |

## 2. Territory rewards

Territories are run-shaped land (see the territory-formation rules below). Two rules here are
the direct answer to *"for more distance covered on that territory, the territory's value
goes up, and the owner gets more points"* — including when someone **else's** run adds to
your land's value, not just your own.

| Reason | Amount | Basis |
|---|---|---|
| `TERRITORY_CLAIMED` | +200 flat | Your run claimed brand-new, previously unclaimed ground. |
| `TERRITORY_VALUE_GROWTH` | +5 × credited km | **Paid to the territory's owner**, not the runner, whenever ANY run (including the owner's own) meaningfully crosses their land (≥6% coverage — see below) and credits it distance. This is the "landlord" bonus: your land is worth more to you the more it gets run through, whether that traffic is you defending your own turf or someone else's attack attempt failing to take it. |
| `TERRITORY_DECAY` | −(value lost ÷ 10) | **Upkeep.** Land nobody has run in over 7 days loses 3% of its peak value per further quiet day (floored at 25% of peak), and the owner pays a tenth of the drop. Charged at most once per territory per day. See `lib/territoryUpkeep.ts`. |
| `HOLD_STREAK_BONUS` | +50 / +250 / +1000 | Holding the *same* ground unbroken for 7 / 30 / 100 days. Paid once each per hold — any transfer, split or raid resets `heldSince` and the milestone counter. |

**Why this also covers "territory goes down then automatically goes up"**: `TERRITORY_VALUE_GROWTH`
fires on every value increase, for whatever reason — recovering after a battle loss, growing
past a previous peak, anything. There's no separate "recovery" rule because none is needed:
any time the value climbs, the owner is paid for that climb.

**Decay and recovery are one loop.** `TERRITORY_DECAY` drains a quiet territory's
`valuePoints` down from its `peakValuePoints`; every credited km through it restores 20
points of value (`KM_TO_VALUE_RECOVERY` in `lib/territoryEngine.ts`), capped at that same
peak. So neglect costs you and running your ground pays you back, but nobody can inflate a
territory past what it actually earned. A split or a raid lowers the peak along with the
land, so a shrunken territory can't refill to what the whole thing used to be worth.

## 2b. Raid rewards

Raids (`lib/raids.ts`) are the instant, small-stakes alternative to a formal battle: they
resolve in the same request and can only ever take the strip the run covered.

| Reason | Amount | Basis |
|---|---|---|
| `RAID_WIN` | +40 | Your raid out-paced the run that claimed the land, so you carved off the ground you covered. The territory also loses 10% of its value in the division. |
| `RAID_REPELLED` | +15 | **Paid to the owner** when a raid on their land fails the pace comparison. Defending passively still pays. |

Deliberately far below `BATTLE_WIN` (+100): a raid is meant to be frequent and cheap, not a
faster route to the same reward.

## 2c. Land War

| Reason | Amount | Basis |
|---|---|---|
| `LAND_WAR_BONUS` | +8 × credited km | During the weekend window (Sat 00:00 – Mon 00:00 UTC, the tail of the ICHOR week), a credited km through land held by a member of a **different clan** pays the runner on top of everything else. Both sides must be in a clan. Clan standings are summed from these ledger rows — there's no separate scoreboard to drift. See `lib/landWar.ts`. |

## 3. Battle rewards and penalties

Battles happen when an attacker's run covers enough of someone else's territory (see
"Attacking a territory" below) and the defender doesn't just repel them outright.

| Reason | Amount | Basis |
|---|---|---|
| `BATTLE_WIN` | +100 | Winning an async challenge or scheduled duel over a territory. |
| `BATTLE_STAT_PENALTY` | -25 | In a duel, having the weaker original stats even if you still won on the tiebreak metric. |
| `REFUSAL_BETTER` | -25 | Your stats were the stronger side in a refused attack, but refusing still costs *something* — free wins would be too free. |
| `REFUSAL_WORSE` | -75 | Your stats were the weaker side in a refused attack — the bigger penalty for being on the losing end of a fight you didn't even formally fight. |
| `OWNERSHIP_DIVIDED` | -5% of the value forfeited | **On top of** `REFUSAL_WORSE`/`REFUSAL_BETTER` — specifically for when your territory actually *splits* into two owners (you keep part, the attacker takes the rest). Scaled to how much value you actually lost: a near-total split costs far more than a corner clipped off. This is the direct answer to *"if ownership gets divided, points get deducted because the territory's value going down on the leaderboard for more owners."* |
| `DUEL_DOUBLE_FORFEIT` | -50 (attacker) | Neither side showed up to a scheduled duel — the attacker pays more, since they started it. |
| `ASYNC_DOUBLE_FORFEIT` | -50 / -25 | Neither side submitted a run to an open challenge before the deadline. |

## 4. Leaderboard reward

| Reason | Amount | Basis |
|---|---|---|
| `LEADERBOARD_RANK_UP` | +50 per place climbed, max +500 | Compares your current position on the all-time Points leaderboard against your last-seen position (`User.lastKnownRank`) and pays for any improvement. Never penalizes a drop — only climbing pays. Once per day per user, so a sweep running more than once a day can't double-pay the same climb. |

This isn't wired to a scheduler yet — call `POST /api/cron/rank-bonus` (same `CRON_SECRET`
bearer-auth pattern as the other cron routes) manually or from a scheduler once one's set up.
Every rank-dependent value is lazily correct in the meantime; this sweep just materializes the
bonus.

---

## Territory formation and attack rules

These aren't points rules, but they're the game rules the points economy above is built on
top of — listed here so the whole picture is in one place.

- **Forming a territory**: a GPS-verified run of **at least 2km** that covers unclaimed
  ground claims that ground as a new territory (`MIN_CLAIM_RUN_KM` in `lib/territoryEngine.ts`).
  Below 2km, a run can still cross and add fame/value to *existing* territories, but can't
  found a new one.
- **Attacking a territory**: two gates, both must pass.
  1. **Distance**: your attacking run must be at least `min(that territory's claim distance, 3km)`.
     A 2km territory only needs a 2km attack run; a 2.5km territory needs 2.5km; anything
     3km or larger only ever needs 3km — the requirement never asks for more than 3km, no
     matter how big the target is.
  2. **Overlap**: your run's corridor must cover at least **6%** of the target territory's
     area (`ATTACK_COVERAGE_THRESHOLD` = `FAME_MIN_COVERAGE` in `lib/territoryEngine.ts`) —
     the same bar as the fame/value-growth coverage requirement, so "enough to matter for
     fame" and "enough to threaten ownership" are the same threshold.
- **Raiding a territory**: same 6% floor as an attack, but capped at the top end —
  a run covering more than **35%** of the target (`RAID_MAX_COVERAGE` in `lib/raids.ts`)
  is too big to settle without the owner's involvement and must go through a full attack.
  A raid compares the raider's pace against the territory's claim-run pace, blind, and
  resolves immediately: win and you take exactly the strip your corridor covered (the
  territory keeps 90% of its value, divided by area); lose and nothing moves. Either way the
  land gets a 24h shield and can't be raided again for a day.
- **Fame/value-growth coverage**: any run crossing **at least 6%** of an existing territory
  credits it — a distinct-runner count, a visit, and (per section 2 above) points to the
  owner. Below 6%, a run that merely clips a corner doesn't count for anything.
- **Upkeep**: a territory untouched for **7 days** starts fading; after **35 quiet days** it
  is deleted and the ground returns to unclaimed. Any credited run resets the clock
  (`lastActivityAt`). Territories in an active battle are never faded or removed. Constants
  live in `lib/territoryUpkeep.ts`.
- **Districts**: each territory records the district it was claimed in (from the same
  reverse-geocode call that names it), and `lib/districts.ts` ranks holders by share of the
  *claimed* ground in that district — not of its real-world area, which no runner could
  ever meaningfully cover.
