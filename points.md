# ICHOR Points Economy

The single source of truth for `User.points` — what earns it, what costs it, and why. If a
number here and a number in code ever disagree, the code is the bug; fix the code, not this
file, unless you're deliberately rebalancing (in which case update both together).

Every change is a row in `PointsLedger` (`models/PointsLedger.ts`), inserted through
`award()` (`lib/points.ts`). Each row has a caller-built `uniqueKey` that's enforced unique at
the database level — the same event can never award twice, even if a webhook replays or a
cron sweep runs twice. `User.points` is the materialized sum of every ledger row for that
user, floored at zero — the two must always agree; if they ever don't, trust the ledger and
repair the balance to match it, not the other way around.

## Philosophy

**Fewer owners, more kilometers.** A territory is worth the most to whoever holds it alone
and keeps running through it. The moment it splits between two owners, or sits unvisited, its
earning power drops. Consistency compounds (streak milestones, daily-first-post), effort pays
per kilometer regardless of streaks, and honesty pays (clean diet logging). Points reward
showing up and dominating; they penalize dilution and no-shows, never a bad day.

---

## 1. Per-run rewards

Awarded on every GPS-verified run (Strava sync or manual GPS import — screenshots/manual
entry never qualify, see `isTerritoryEligibleRun`). This anti-cheat gate is deliberate: an
unverified screenshot can't be trusted the way a GPS trace can, so it stays required even
though it means OCR/manual posts currently earn no points here. At most **2 scoring runs per
day** count (`DAILY_SCORING_RUN_CAP` in `lib/points.ts`) — logging ten short junk runs to farm
rewards doesn't out-earn two real ones.

| Reason | Amount | Basis |
|---|---|---|
| `BASE_ACTIVITY` | +10, every qualifying run | Flat reward just for logging a real run, every time (within the daily cap). |
| `DISTANCE_BONUS` | +5 × km run | Every kilometer, every run. A 10K pays 50, a marathon pays ~211. |
| `PACE_BONUS_FAST` | +50 | Average pace under 5:00/km. Only runs ≥3km qualify — a fast 400m doesn't count as a fast run. |
| `PACE_BONUS_MID` | +30 | Average pace 5:00–6:00/km. |
| `PACE_BONUS_SLOW` | +10 | Average pace 6:00–7:00/km. Slower than 7:00/km pays nothing. |
| `DAILY_FIRST_POST` | +20, once/day | The first qualifying run of the day, on top of `BASE_ACTIVITY`. |
| `STREAK_7` | +100, once ever | Hitting a 7-day streak for the first time. Re-hitting 7 after a later reset doesn't re-pay. |
| `STREAK_30` | +500, once ever | Hitting a 30-day streak for the first time. |
| `THRESHOLD_5K` / `10K` / `15K` / `HALF` / `30K` / `FULL` | 25 / 60 / 110 / 200 / 350 / 600 | Distance milestones, highest band only per run. |
| `PB_5K` / `PB_10K` | 150 / 250 | A new personal-best pace in the 5K or 10K distance band, compared against every prior verified run. |
| `PB_LONGEST` | 100 | A new longest-ever distance. |

## 2. Diet rewards

Diet logging is separate from the run pipeline — it fires when a post includes a diet
description, classified by `classifyDiet()` (Gemini). This is **in addition to** the existing
`User.integrityPoints` bonus (which still drives the profile's integrity tier badge — see
`integrityTier()` in `lib/scoring.ts`); a clean log now pays into both stats.

| Reason | Amount | Basis |
|---|---|---|
| `DIET_CLEAN` | +50 | Majority whole foods, lean protein, complex carbs, adequate hydration. |
| `DIET_NEUTRAL` | +25 | Mixed quality or an under-described log. |
| — | 0 | A `CHEAT` classification pays nothing here (it already carries a separate -10% calorie penalty on the weekly score — see `lib/scoring.ts`). |

## 3. Territory rewards

Territories are run-shaped land (see the territory-formation rules below).

| Reason | Amount | Basis |
|---|---|---|
| `TERRITORY_CREATED` | +200 flat | Your run claimed brand-new, previously unclaimed ground. |
| `TERRITORY_VALUE_GROWTH` | +5 × credited km | **Paid to the territory's owner**, not the runner, whenever ANY run (including the owner's own) meaningfully crosses their land (≥6% coverage) and credits it distance — the "landlord" bonus. There's no separate "recovery after a dip" rule: this fires on every value increase for whatever reason, so climbing back after a battle loss is paid the same as first-time growth. |
| `TERRITORY_HOLD_WEEKLY` | +50 per territory | Paid to every territory's current owner on the weekly sweep (`checkAndAwardWeeklyTerritoryBonuses`, `POST /api/cron/weekly-territory-bonus`). |
| `TERRITORY_LEADERBOARD_1` / `_2` / `_3` | 75 / 40 / 20 | The same weekly sweep also ranks all territories by `fameScore` (the map's "Most Famous Territories" list) and pays the owners of the top 3. There's no per-runner-per-territory leaderboard in this data model — fame is the only real, existing "how alive is this land" ranking, so that's what this is built on rather than a fabricated one. |

## 4. Battle rewards and penalties

Battles happen when an attacker's run covers enough of someone else's territory and the
defender doesn't just repel them outright. Win/loss reasons differ by battle type:
**async challenges** use `ATTACK_WIN`/`DEFEND_WIN` (attacker/defender respectively); **scheduled
duels** always use `WAR_WIN` for whichever side wins.

| Reason | Amount | Basis |
|---|---|---|
| `ATTACK_WIN` | +200 | Attacker wins an async challenge. |
| `DEFEND_WIN` | +150 | Defender successfully repels an async challenge. |
| `WAR_WIN` | +300 | Either side wins a scheduled duel. |
| `TERRITORY_LOST` | -25 | Paid to the defender specifically when they lose the territory outright (not on a partial split — see `OWNERSHIP_DIVIDED_2` below). |
| — (`ATTACK_LOSS`, defined, 0 pts) | 0 | A losing attacker's run already has its calorie contribution to the weekly score zeroed out (`scoreMultiplier: 0` on the post, see `lib/scoring.ts`) — that's the real penalty. No separate ledger row is awarded for an amount of zero. |
| `BATTLE_STAT_PENALTY` | -25 | In a duel, having the weaker original stats even if you still won on the tiebreak metric. |
| `REFUSAL_BETTER` | -25 | Your stats were the stronger side in a refused attack, but refusing still costs *something*. |
| `REFUSAL_WORSE` | -75 | Your stats were the weaker side in a refused attack. |
| `OWNERSHIP_DIVIDED_2` | -5% of the value forfeited | **On top of** `REFUSAL_WORSE`/`REFUSAL_BETTER` — for when your territory actually splits into two owners (you keep part, the attacker takes the rest). Scaled to how much value you lost. |
| `OWNERSHIP_DIVIDED_3` | — | Defined for a future 3+-owner territory model. The current territory schema only supports single ownership with a `parentTerritoryId` split lineage — there's no mechanic that produces a 3-way split, so this reason is never actually awarded today. |
| `DUEL_DOUBLE_FORFEIT` | -50 (attacker) | Neither side showed up to a scheduled duel — the attacker pays more, since they started it. |
| `ASYNC_DOUBLE_FORFEIT` | -50 / -25 | Neither side submitted a run to an open challenge before the deadline. |

## 5. Leaderboard rewards

| Reason | Amount | Basis |
|---|---|---|
| `RANK_IMPROVEMENT_SMALL` | +10 | Climbed 1–5 places on the all-time points leaderboard since the last sweep. |
| `RANK_IMPROVEMENT_MID` | +25 | Climbed 6–15 places. |
| `RANK_IMPROVEMENT_LARGE` | +50 | Climbed 16+ places. |
| `RANK_1_WEEKLY` / `_2` / `_3` | 200 / 100 / 50 | Reaching that overall rank, paid once per week per rank (holding #1 all week doesn't re-pay every sweep). |

Both are computed by `checkAndAwardRankImprovements()` (`POST /api/cron/rank-bonus`) by
comparing each user's current position against `User.lastKnownRank`. Never penalizes a drop —
only climbing (or holding top-3) pays. Neither sweep is wired to a scheduler yet — call
manually or from a future cron, same pattern as the other `/api/cron/*` routes.

## 6. Clan points

A clan's collective standing is **computed on read**, not ledger-tracked — `PointsLedger`
rows always belong to a `User`, and a clan isn't a ledger-eligible actor in this schema, so
"clan points" are derived from its members' real, already-tracked stats rather than a
separate pool:

- **Collective km** (`getClanEmpire()` in `lib/clans.ts`): the sum of `totalDistanceKm` across
  every territory owned by any clan member — every kilometer anyone has run through the
  clan's collective land, member or not.
- **Collective points**: that collective km × the same per-km rate (`DISTANCE_BONUS_POINTS_PER_KM`)
  an individual runner earns — the clan's land "pays" at the same rate a person does.
- **Clan leaderboard score** (`getClanList()`): each member's individual weekly score, summed,
  plus 200 points per territory the clan holds (`zonesHeld`).

This is the same computed-not-stored pattern the clan leaderboard already used before this
change — extended, not replaced.

---

## Territory formation and attack rules

These aren't points rules, but they're the game rules the points economy above is built on
top of — listed here so the whole picture is in one place.

- **Forming a territory**: a GPS-verified run of **at least 2km** that covers unclaimed
  ground claims that ground as a new territory (`MIN_CLAIM_RUN_KM` in `lib/territoryEngine.ts`).
  Below 2km, a run can still cross and add fame/value to *existing* territories, but can't
  found a new one — the composer shows "Run at least 2km to claim territory." when this happens.
- **Attacking a territory**: two gates, both must pass.
  1. **Distance**: your attacking run must be at least `min(that territory's claim distance, 3km)`.
     A 2km territory only needs a 2km attack run; a 2.5km territory needs 2.5km; anything
     3km or larger only ever needs 3km.
  2. **Overlap**: your run's corridor must cover at least **6%** of the target territory's
     area (`ATTACK_COVERAGE_THRESHOLD` in `lib/territoryEngine.ts`).
- **Fame/value-growth coverage**: any run crossing **at least 6%** of an existing territory
  credits it — a distinct-runner count, a visit, and (per section 3 above) points to the
  owner. Below 6%, a run that merely clips a corner doesn't count for anything.
