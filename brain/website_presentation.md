# Stables Official Website Presentation
*Source: stablescouncil.github.io*

**Technical reference (build, ship, routes, local preview):** see **`github_pages_website_engineering.md`** in this brain base. It is the canonical operations summary for agents and operators.

## The homepage (live since 2026-09-03): a banking system merchants own

The homepage at **https://stablescouncil.org/** is the merchant-first site. It replaced the earlier
"Be your bank / Pay instantly" homepage on 2026-09-03; the old page is archived and no longer served.
Use the copy below when quoting the site.

- **Headline:** "A banking system merchants own."
- **Subline:** "The world's only Secure, Pseudonymous and Unstoppable merchant-owned banking system."
- **The one call to action:** **Access dApp**, which opens **https://stablescouncil.org/payment-app/**.
  The header carries the same Access dApp button on every page.
- **The system map** (a diagram around a centre): the centre is the **Merchant economy**, labelled
  "banking sovereignty"; around it sit **Stables currencies** (USDs · EURs · JPYs), the **Stables
  Council** (shared coordination), the **Community Treasury** (Minima asset base) and **xMinima
  equity** (open participation). These are the roles of the system; the currencies named on the map
  are the design, not tokens a tester can hold today (see `release_scope_boundary.md`).
- **Testing phase:** "Join us in testing Stables payments."
- **Want to know more?** "Walk the structural view next: how each role lines up incentives with the
  peg." with the link **The Playing Field** (https://stablescouncil.org/playing_field.html).
- Footer on every page: "Stables | Be your Bank", All links (https://stablescouncil.org/links.html),
  X, Telegram, Access dApp, and Built on MINIMA.

## The application access page: /payment-app/

**https://stablescouncil.org/payment-app/**, headline "You can run Stables on its own." It offers
four ways to run Stables, in this order, and only the first is available today:

| Offer | Status on the page |
|-------|--------------------|
| **Standalone Android** ("Stables, your wallet, and your Minima node in one mobile app.") | **Download** button, "Test channel v0.0.11.63. Test tokens only, no value." The button downloads `Stables_v0.0.11.63.apk` from the GitHub release `StablesCouncil/stables-app`, tag `app-v0.0.11.63`. |
| **Stables Desktop** ("Stables and a Minima node you control in one simple desktop installation.") | Planned prototype. |
| **Minima-connected Android** ("Use Stables with the official Minima Core Android app.") | **Download** button, "Requires the official Minima Core Android app. Test channel v0.0.11.63. Test tokens only, no value." The button downloads `StablesCore_v0.0.11.63.apk` from the same GitHub release as the standalone app (since 2026-09-06). |
| **MDS MiniDapp** ("Install Stables inside MinimaOS and use your existing node.") | Coming soon. The standalone Android app is released first. |

If someone asks what they can download today: the standalone Android app, from that page or the
GitHub release. Everything else on the page is coming soon or planned.

## Routes that moved

- The candidate site that was previewed under **/new/** is now the site. **/new/** and
  **/new/payment-app/** redirect to **/** and **/payment-app/**. Do not send people to /new/.
- The MiniDapp release path on **/links.html** shows Public Testing as the active channel and the
  Showcase and Demo channels as superseded.

## StablesAgent and the Knowledge Base

StablesAgent is the official AI assistant for the Stables community. It can be reached in the following ways:

- In the Stables Community Telegram group, in the dedicated 4-StablesAgent thread, by mentioning @StablesAgentBot followed by a question.
- In a private conversation with @StablesAgentBot directly.
- On X at https://x.com/StablesCouncil

Anyone who prefers to use their own AI (ChatGPT, Grok, Claude, or any other tool) can access the full Stables knowledge base using this direct link (same URL as the StablesAgent web chat footer where applicable):

https://raw.githubusercontent.com/StablesCouncil/stables-agent/main/brain/llms.txt

To use it, paste that link into any AI and say: "Learn everything in this file." The AI will then be able to answer any question about Stables in detail and in any language.

The knowledge base source files and generated rollup are published under the **`brain/`** folder in the public **StablesCouncil/stables-agent** repository; interaction logs may be published per that repo's README.
