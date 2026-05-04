# Changelog

## 0.1.0 (2026-05-02)


### Features

* **action:** parallel commit analysis + reuse gitsky's size schema ([5a51361](https://github.com/znat/gitpulse/commit/5a51361557c94a614892a3235ca626c03c389422))
* **action:** Phase 2 v0 — local git → LLM → story JSON pipeline ([85cefa5](https://github.com/znat/gitpulse/commit/85cefa5567601d771c238cb96b4720318f10c429))
* **action:** Phase 2.1+2.2 — lift gitsky's prompt + schema; add anthropic protocol ([d189e06](https://github.com/znat/gitpulse/commit/d189e06b3261a2f09e2d936fdc711d9056712b67))
* **action:** Phase 2.3 + size assessment ([1815780](https://github.com/znat/gitpulse/commit/18157808076990bf486b0e37354872d43dc95097))
* **action:** Phase 3 — fetch-from-site state restore ([3de6587](https://github.com/znat/gitpulse/commit/3de6587cfb4fa6d472de14197c0db11ac8e1f39e))
* **action:** resolve direct-push GitHub handles via Commit.author.user ([be5dbf6](https://github.com/znat/gitpulse/commit/be5dbf6af73eef2c05c8be9c1c57d19468fb19f0))
* autoversioned releases via release-please ([#11](https://github.com/znat/gitpulse/issues/11)) ([cfc2c86](https://github.com/znat/gitpulse/commit/cfc2c86a934a5354ca88ca3903fba51b3416015c))
* one-click GitHub release workflow ([#9](https://github.com/znat/gitpulse/issues/9)) ([fdce44d](https://github.com/znat/gitpulse/commit/fdce44dfb29a7adebeac782d55974bd068210967))
* **site:** author byline is plain text (no link) ([2a3ee86](https://github.com/znat/gitpulse/commit/2a3ee867add21c900566089eb8d9ee6dff6d8b96))
* **site:** content collection — read stories from JSON, render feed + detail pages ([fbbe018](https://github.com/znat/gitpulse/commit/fbbe018163c06566fe9fc0a8fd11098d68b530f6))
* **site:** external links open in new tab (target=_blank, rel=noopener noreferrer) ([99e629e](https://github.com/znat/gitpulse/commit/99e629ed51a9526ca1ee82c84a52ff01f7697a57))
* **site:** full editorial layout — masthead, section nav, day groups, fixes & housekeeping ([640c870](https://github.com/znat/gitpulse/commit/640c8707aa44ea95dc1caa2bc7ede424bad484b3))
* **site:** keyword-rich SEO paths — /stories/&lt;id&gt;/&lt;slug&gt;/ ([d5e91cd](https://github.com/znat/gitpulse/commit/d5e91cdcf9afcd0e04969622f1f113b3abb0fcf0))
* **site:** lift gitsky editorial design — TopBar, RepoHeader, SizeBars, meta row ([985a21a](https://github.com/znat/gitpulse/commit/985a21a7a05da13f4c39a3e8de0232445141933a))
* **site:** proper logo + theme toggle (system default) ([6012e79](https://github.com/znat/gitpulse/commit/6012e791ac143321f6e1ddef8b87a2be77e468e1))
* **site:** SEO port — robots, sitemap, OG images, JSON-LD, per-page metadata ([c8a2fe2](https://github.com/znat/gitpulse/commit/c8a2fe254a87a95fd507545f866f5cd1b8530705))


### Bug Fixes

* **action:** defaultBranch falls back to HEAD when origin/HEAD missing (post-checkout) ([9312109](https://github.com/znat/gitpulse/commit/9312109dba81ad4e7e9496d49e97f29720ac0ee4))
* **action:** drop broken author URL on direct-push stories ([#2](https://github.com/znat/gitpulse/issues/2)) ([0a1dbbc](https://github.com/znat/gitpulse/commit/0a1dbbcd1fdc05be964d5c8f48ae43af03ab9596))
* **action:** handle &lt;think&gt; reasoning blocks (MiniMax, DeepSeek-R1, etc.) ([a3f785c](https://github.com/znat/gitpulse/commit/a3f785c06accde66b2e6e1bf466836fdcd93fbcd))
* **action:** resolve outDir against repo root, not yarn-workspace cwd ([f749d3b](https://github.com/znat/gitpulse/commit/f749d3bf279317c521bb33d7bff1d0666337200a))
* **action:** trust LangChain structured-output, drop strict re-validation ([9f91f7a](https://github.com/znat/gitpulse/commit/9f91f7aadbb6c4a00de7a87b433cf1cacf4b44b4))
* **site:** favicon path respects basePath; home title matches reference ([08d7a04](https://github.com/znat/gitpulse/commit/08d7a04e52e0deb6990d6f167457b4f851c8be80))
* **site:** give OG images a .png extension for correct Content-Type ([c4f8c76](https://github.com/znat/gitpulse/commit/c4f8c76503665ae61aeb396d155476d15ee6a432))
* **site:** logo font + favicon match the editorial reference ([ac038cc](https://github.com/znat/gitpulse/commit/ac038cc0f4f913ab35e7676071165a176037e95e))
* **site:** split fs-based loaders out of stories module ([0d591c6](https://github.com/znat/gitpulse/commit/0d591c65b477796f10c06407b3bbec5044500b69))
