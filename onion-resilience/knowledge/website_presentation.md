# Stables Official Website Presentation
*Source: stablescouncil.github.io*

**Technical reference (build, ship, routes, local preview):** see **`github_pages_website_engineering.md`** in this brain base. It is the canonical operations summary for agents and operators.

## The homepage (live since 2026-09-03): a banking system merchants own

The homepage at **https://stablescouncil.org/** is the merchant-first site. It replaced the earlier
"Be your bank / Pay instantly" homepage on 2026-09-03; the old page is archived and no longer served.
Use the copy below when quoting the site.

- **Headline:** "A banking system merchants own."
- **Subline:** "The world's only Secure, Pseudonymous and Unstoppable merchant-owned banking system."
- **The one call to action:** the download, at **https://stablescouncil.org/#download**. Point people
  there to get Stables.
- **The system map** (a diagram around a centre): the centre is the **Merchant economy**, labelled
  "banking sovereignty"; around it sit **Stables currencies** (USDs · EURs · JPYs), the **Stables
  Council** (shared coordination), the **Community Treasury** (Minima asset base) and **xMinima
  equity** (open participation). These are the roles of the system; the currencies named on the map
  are the design, not tokens a tester can hold today (see `release_scope_boundary.md`).
- **Testing phase:** "Join us in testing Stables payments." This is the download section
  (https://stablescouncil.org/#download): **Download for Android**, and **Desktop app, Coming**. It
  says: "One Android app. It runs its own Minima node, or uses Minima Core on your phone." and "The
  Stables card is an experiment. It needs a thorough security review by independent experts before
  it can be used in production."
- **Want to know more?** "Walk the structural view next: how each role lines up incentives with the
  peg." with the link **The Playing Field** (https://stablescouncil.org/playing_field.html).
- Footer on every page: "Stables | Be your Bank", All links (https://stablescouncil.org/links.html),
  X, Telegram, and Built on MINIMA.

## How to get Stables (2026-10-19)

Stables is **one Android app** with two connection modes: its own built-in Minima node, or Minima Core on the same phone (official Minima Core 1.7.2 and later, `org.minima.core`, or the older `org.minimarex.minimacore`). The download is at **https://stablescouncil.org/#download**. A native desktop app is coming, with no date yet.

- **The MiniDapp is retired.** v0.0.14.017 was the last release with a `.mds.zip`. Do not offer it.
- **The web version is for internal testing only.** It is not a public product and is not offered to testers.
- **The Stables card is an experiment.** It needs a thorough security review by independent experts before it can be considered for production.

If someone asks what they can download today: one Android app, at https://stablescouncil.org/#download. There is no second Android app, no MiniDapp and no public web app.

### Earlier access page (history)

Until v0.0.14.017 the page **https://stablescouncil.org/payment-app/** offered the Android download, the MiniDapp and the web app. Those last two are no longer offered.

| Offer | Status on the page |
|-------|--------------------|
| **Android** ("Stables, your wallet, and your Minima node in one mobile app.") | **Download** button for `Stables_v0.0.13.007.apk` from the GitHub release `StablesCouncil/stables-app`, tag `app-v0.0.13.007`. If you already use Minima Core, install Stables and choose Minima Core when it asks. If you have the old Core-connected app, install Stables, choose Minima Core, allow it in Core, then the old app can be removed. |
| **Stables Desktop** | Coming, no date yet. |
| **MDS MiniDapp** | Retired after v0.0.14.017. No longer offered. |

## Routes that moved

- The candidate site that was previewed under **/new/** is now the site. **/new/** and
  **/new/payment-app/** redirect to **/** and **/payment-app/**. Do not send people to /new/.
- The MiniDapp is retired (last `.mds.zip` in v0.0.14.017). Any older MiniDapp release path is
  history, not something to point a tester at.

## StablesAgent and the Knowledge Base

StablesAgent is the official AI assistant for the Stables community. It can be reached in the following ways:

- In the Stables Community Telegram group, in the dedicated 4-StablesAgent thread, by mentioning @StablesAgentBot followed by a question.
- In a private conversation with @StablesAgentBot directly.
- On X at https://x.com/StablesCouncil

Anyone who prefers to use their own AI (ChatGPT, Grok, Claude, or any other tool) can access the full Stables knowledge base using this direct link (same URL as the StablesAgent web chat footer where applicable):

https://raw.githubusercontent.com/StablesCouncil/stables-agent/main/brain/llms.txt

To use it, paste that link into any AI and say: "Learn everything in this file." The AI will then be able to answer any question about Stables in detail and in any language.

The knowledge base source files and generated rollup are published under the **`brain/`** folder in the public **StablesCouncil/stables-agent** repository; interaction logs may be published per that repo's README.
