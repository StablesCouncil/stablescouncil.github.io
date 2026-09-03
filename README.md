# Stables

> **Money that is truly yours. Secure, Pseudonymous and Unstoppable.**

Stables is a global money platform designed for everyone. Built on the **[Minima](https://minima.global)** network, it provides universal access to stable value without traditional intermediaries, ensuring your money remains under your absolute control at all times.

## Local preview and source

This folder is the single authoring source for the public website and Pages-hosted application.
Root HTML, `/new/`, shared assets, and `dapp/` are served directly. Publish checkouts are release
targets, not authoring sources.

1. Run **`npm install`** once per clone.
2. Run **`npm start`** from this folder.
3. Open **`http://localhost:8080/new/`** for the website candidate,
   **`http://localhost:8080/dapp/3-test/?preview=webapp`** for the active Web harness, and
   **`http://localhost:8080/work/`** for the local review navigator.
4. Follow **`LOCALHOST_DEV_ENVIRONMENT.md`** when connecting the Web harness to a local node.

The Eleventy templates under `src/` are retained for explicitly scoped legacy-template maintenance.
`npm run build` is not a normal prerequisite for direct root or `/new/` edits. Use
`npm run start:eleventy` only when work specifically requires the retained template server.

Run the current website-candidate gate while the direct preview server is available:

```powershell
npm run verify:website-candidate
```

The gate validates the exact shared header and footer across 12 secondary pages at mobile and
desktop widths, the ten-route pre-build contract, the two-width founder-review surface, both
five-width candidate pages, the controlled MDS package bytes, and D028 brand continuity across the
registered website pages and active Web application. Browser profiles are isolated under the
operating-system temp directory and removed after each run.

## The Vision

We believe that financial freedom should not be a privilege. Stables leverages the power of Minima to create a banking system that is:

*   **Secure**: Your assets are protected by the fundamental principles of a truly decentralized network.
*   **Pseudonymous**: Privacy is a right. Transact freely without compromising your personal identity.
*   **Unstoppable**: Designed to be resilient, borderless, and always accessible, no matter where you are in the world.

## Project Status

The Stables platform is currently under active development by the **Council**. We are committed to a transparent, step-by-step disclosure of our progress as we move toward a global launch.

---

## Access the Presentation

Explore the core concepts and the roadmap of the Stables platform through our interactive presentation:

*   **[Stables Presentation](https://stablescouncil.github.io/)** – A unified presentation with built-in multi-language support (English, French, Spanish, German, and Farsi). Use the language switcher in the top-right corner to change languages.

---

## Join the Council

Follow our journey and stay updated with the latest developments on our official channels:

*   **Website**: [stablescouncil.org](https://stablescouncil.org/)
*   **X (Twitter)**: [@StablesCouncil](https://x.com/StablesCouncil)
*   **Instagram**: [@stablescouncil](https://www.instagram.com/stablescouncil)
*   **Telegram**: [Stables Community](https://t.me/stablescommunity)
*   **Discord**: [Stables Council](https://discord.gg/rTdqwRGPXR)
*   **Email**: [StablesCouncil@protonmail.com](mailto:StablesCouncil@protonmail.com)

---

*Stables is built on the Minima network. Web, MiniDapp, standalone Android, and Core-connected
Android remain coordinated release surfaces under the repository four-platform rule.*
