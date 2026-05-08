# Council Dashboard Framework

**Date:** 2026-04-28  
**Status:** Draft framework  
**Purpose:** Define how the Council Dashboard measures the reality behind the Council Navigation System.

---

## 1. Role

The Council Dashboard is the measurement layer.

It does not replace the Council Navigation System. Navi explains what is being built, where each item stands, and where discussion should happen. The Dashboard records the measurable proof behind those claims.

Every active Navi card should eventually connect to Dashboard metrics.

```text
Navi card
  -> concrete KPI or operational signal
  -> Dashboard metric ID
  -> latest value
  -> previous value
  -> weekly change
  -> source / proof
```

---

## 2. Metric Rules

Dashboard metrics must be concrete and verifiable.

The Dashboard separates **KPIs** from **Operational Signals**.

**KPIs** are outcome indicators that Stables does not fully control. They show community response, adoption, usage, feedback, attention, or external behavior.

Examples:

- `x_followers`: count
- `x_engagement_actions`: count
- `telegram_community_members`: count
- `interested_ambassadors`: count
- `showcase_feedback_total`: count

**Operational Signals** are things Stables can directly produce, set up, publish, or mark complete. They are needed for transparency, but they are not KPIs.

Examples:

- `channel_selector_implemented`: yes/no
- `demo_minima_wallet_baseline_verified`: yes/no
- `x_recent_posts`: count of Stables publication output
- `send_cleanup_review_state`: status
- `community_telegram_ready`: yes/no

Weak metrics:

- “Improve channel truth”
- “Clarify onboarding”
- “Grow community”
- “Prepare feedback”

If a metric cannot be checked from a file, app route, GitHub issue, Telegram count, feedback ledger, agent log, or manual weekly snapshot, it is not ready to be a Dashboard metric.

---

## 3. First Dashboard Categories

The first public Dashboard should use these categories:

1. **Community Reach**
   - social profiles, follower counts, engagement actions.

2. **Group Readiness**
   - Telegram/community surfaces, feedback destinations, StablesAgent availability.

3. **Ambassador Momentum**
   - interested ambassadors, ambassador topic activity, questions and objections.

4. **App Demo Readiness**
   - channel selector, channel truth model, demo wallet baseline, onboarding message, release readiness.

5. **App UX Review**
   - Send cleanup, FX activity visibility, activity filters, amount selector review.

6. **Protocol Copy Alignment**
   - Coverage Fund UI order, cf/yield language, demo token truth, mechanics copy alignment.

7. **Public Feedback**
   - Showcase/public feedback counts, GitHub feedback, categories, unresolved issues.

8. **StablesAgent Interaction**
   - agent questions, answer gaps, knowledge base update needs.

9. **Navi Progress**
   - Navi item counts, status counts, average advancement, linked metric coverage.

---

## 4. Source Types

The first Dashboard can be manual, but each metric needs a source type.

Accepted first-release source types:

- `file`
- `app-route`
- `github`
- `telegram-manual`
- `social-manual`
- `agent-log`
- `manual-weekly-snapshot`

Each metric should store:

- metric ID,
- category,
- indicator type: `KPI` or `Operational Signal`,
- indicator rule,
- name,
- description,
- unit,
- latest value,
- previous value,
- weekly change,
- history,
- last measured,
- source,
- source type,
- related Navi item IDs,
- notes.

---

## 5. Linking Navi And Dashboard

Navi cards should list Dashboard metric IDs in their `metrics` field.

Dashboard metrics should list the Navi card IDs in `relatedNaviItems`.

The UI relationship should be:

- Navi expanded card shows the metric chips.
- Metric chip links to the Dashboard with `?navi=<item-id>` or `#metric-<metric-id>` later.
- Dashboard metric cards show their related Navi item chips.
- Dashboard can later filter by Navi item.

For now, static linking is enough. The priority is to make the data relationship real.

---

## 6. First Current-Work Metric Set

The first Navi-linked metric set should cover what is actually being handled now:

- MiniDapp Channel Structure,
- Demo MINIMA Wallet Baseline,
- Wallet and Activity Cleanup,
- Coverage Fund UI Alignment,
- Demo Release Readiness,
- Public Feedback Intake,
- Ambassador Network.

Deeper protocol implementation, oracle work, production contracts, and sovereign device work should not receive active execution metrics until those workstreams actually begin.
