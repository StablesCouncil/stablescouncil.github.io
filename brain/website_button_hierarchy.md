# Website and MiniDapp: button hierarchy (public UI law)

**Audience:** StablesAgent, contributors, and anyone answering questions about Council HTML or the MiniDapp shell.

**Canonical spec (monorepo):** **`0_handshake/web_component_spec.md`**, section **COMPONENTS → Buttons**, including **Button hierarchy (mandatory)**. **`0_handshake/handshake.md`** §1 states the same obligation in brief.

## What the Agent must remember

1. **Classes only** from Council **`stables.css`**: **`btn btn-primary`** or **`btn btn-secondary`** inside **`<div class="buttons">`**. Do not invent local gradients or ghost styles for actions.

2. **`btn-primary`** (cyan-to-purple gradient): **one** main call to action per obvious visual group (hero row, card footer, modal, panel). Users must see a single clear “do this”.

3. **`btn-secondary`** (dark fill, cyan border): supporting actions (cancel, back, optional path, second choice). Use for anything that is not that single main step.

4. **Inactive or “coming soon only”** actions must **not** use **`btn-primary`**. Use **`btn-secondary`**, plain text, **`disabled`**, or omit the control. Do not keep gradient styling while meaning “unavailable”.

5. **Two primaries** side by side is allowed only when two **equal** commitments are intentional and noted in the change or PR; default is **at most one primary** per group.

6. **GitHub Pages deck pages** and the **MiniDapp shell** follow the same rule. Deck chrome and **`main`** layout: **`github_pages_website_engineering.md`**.

When in doubt, read **`web_component_spec.md`** in the monorepo before suggesting markup.
