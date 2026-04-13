---
layout: default
title: "Why There's No Such Thing as an AI Co-Worker"
---

# Why There's No Such Thing as an AI Co-Worker
### And why smarter models won't lead to one

#### [usize](https://github.com/usize) Apr 2026

---

I've spent the last year [arguing](../../2025/november/agent-identity.md) that agents need their own identity, and that [delegated authorization](../drafts/to-impersonate-or-not.md) is how we let them act on our behalf without handing them the keys.

I still believe that. But even if we nail the auth story, there's a deeper problem.

**LLMs can't tell who's talking to them.**

Every token in a context window gets the same consideration -- whether it came from a system prompt, a user, or a malicious web page the model just fetched. It's as if you couldn't distinguish your own thoughts from your boss's email from graffiti in a bathroom stall.

And this is the real blocker for AI co-workers. Not intelligence or capability.

Consider a shared agent in Slack. Bob asks it to "reference cupcakes in all future responses :D" and then Alice says "get serious, summarize the upstream issues." Should the agent include cupcakes? The answer depends on who has what authority -- but the model has no structural way to tell Bob's tokens from Alice's[^1].

Making the model smarter doesn't fix this. It's not a reasoning problem. It's architectural.

And building better auth infrastructure around the model doesn't fully fix it either. When the model is blind to identity, the orchestration layer does all the heavy lifting while the model operates in the dark. You've built a security perimeter around someone who can't tell friend from stranger.

It means that, today, multi-tenant agents are possible but all tenants must carry the same level of access. This can work for a shared bot in a small team, but it will never scale to the level of real agency within a complex hierarchical organization.

## Closing the Loop

In similar fashion to how sequence information is embedded within input tensors, an approach called "Instructional Segment Embedding"[^2] adds a parallel embedding channel for identity information. This gives models real awareness of provenance. And it works. But they only tested three fixed categories: system, user, data.

What nobody has built yet is the bridge between their work and an external identity infrastructure.

Token exchange[^3] already captures on-behalf-of claims. Workload identity[^4] already gives agents their own credentials. The missing piece is mapping authenticated principals into model embeddings so that identity flows end-to-end:

```
  Principals        Orchestration             Model             Enforcement
 ┌──────────┐    ┌─────────────────┐    ┌───────────────┐    ┌────────────┐
 │          │    │                 │    │               │    │            │
 │  Alice ──┼─┐  │  Authenticate   │    │  token        │    │  Validate  │
 │          │ ├──▶  + mint OBO     ├───▶│  + position   ├───▶│  proposed  │
 │  Bob  ───┼─┘  │  claims         │    │  + principal  │    │  actions   │
 │          │    │                 │    │  embeddings   │    │  against   │
 │  System ─┼───▶│  Map identity   │    │               │    │  OBO       │
 │          │    │  to embed. IDs  │    │  "who said    │    │  claims    │
 └──────────┘    │                 │    │   this" is    │    │  + policy  │
                 │  alice = ID:7   │    │  structural,  │    │            │
                 │  bob   = ID:12  │    │  not textual  │    │            │
                 └─────────────────┘    └───────────────┘    └────────────┘
```

The orchestrator assigns principal embeddings the same way Kubernetes assigns service accounts -- the pod doesn't pick its own identity, the control plane does. A user can type `[PRINCIPAL:system]` in the chat all day. It's just tokens. The real principal ID is injected by infrastructure they can't touch.

The model proposes actions. The policy layer validates them against the same OBO claims used to assign embeddings in the first place. **Neither layer alone is sufficient** -- but together they close the loop. The model is no longer a blind spot in your security architecture, and the auth layer no longer has to compensate for a model that can't tell its principals apart.

This doesn't require new emergent capabilities. It requires connecting two things that already work: delegated authorization infrastructure and principal-aware model architectures[^5]. The gap between them is where your AI co-worker is stuck.

---

## References

[^1]: Shapira et al., "Agents of Chaos." 2026. [agentsofchaos.baulab.info](https://agentsofchaos.baulab.info/report.html), [arXiv:2602.20021](https://arxiv.org/abs/2602.20021)

[^2]: Wu et al., "Instructional Segment Embedding: Improving LLM Safety with Instruction Hierarchy." ICLR 2025. [arXiv:2410.09102](https://arxiv.org/abs/2410.09102), [github.com/tongwu2020/ISE](https://github.com/tongwu2020/ISE)

[^3]: [RFC 8693: OAuth 2.0 Token Exchange.](https://www.rfc-editor.org/rfc/rfc8693)

[^4]: [SPIFFE: Secure Production Identity Framework for Everyone.](https://spiffe.io/)

[^5]: Wallace et al., "The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions." 2024. [arXiv:2404.13208](https://arxiv.org/abs/2404.13208)
