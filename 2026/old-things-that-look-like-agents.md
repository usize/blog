---
layout: default
title: "Old things that look like agents"
---

# Old things that look like agents and.. what makes agents different?

#### [usize](https://github.com/usize) Feb 2026

*Adapted from a talk for a [CNCF meetup](https://community.cncf.io/events/details/cncf-cloud-native-vancouver-presents-2026-februray-cloud-native-vancouver/) in Vancouver, BC in February 2026.*

---

The question "what makes agents different" comes from my experiences trying to design durable distributed systems in an industry undergoing a bit of shock. 

It's clear that LLMs are writing more code, but the wider idea of an "internet of agents" still lacks a clear vision. There are fun experiments like "Moltbook" that have shown us some of the interesting possibilities of multi-agent systems. What they also show is that we lack a coherent story around what it means to let agents interact securely across the web, or otherwise. 

This shows that we need to build the infrastructure to support agents now, but protocol churn–ACP giving way to A2A, MCP versus UTCP versus simply embedding a sandboxed interpreter–has created a sense that there's no solid-footing to begin "agent-proofing" existing deployments.

How can we find our way?

Here I'll argue that, when it comes down to it, agents aren't an entirely new kind of thing. They share important properties with existing systems, and by using those as a guide, we can start to lay foundations that will outlast churn in the AI space.

## So What Is an Agent?

Long ago, I worked for a large software firm which was famous for dominating a very lucrative niche while simultaneously starting and killing off loads of somewhat popular side projects.

During a lunchtable discussion the topic of shutting down yet another popular service came up and I was gifted with a very provocative framing from one of my colleagues.

"Instead of thinking of this as a software company, think of it like a magical faucet that continually sprays a stream of liquid gold. This campus and all of the other infrastructure that exists is centered around that. These projects aren't being evaluated according to how loved they are, they are evaluated according to how they serve and protect the faucet."

(I calculated the flow rate necessary for the gold to match the profits per second of the company, about 0.05 gallons per minute. Just a trickle at today's prices.)

What in the HECK does this have to do with what an agent is?

A large language model is also a bit like a magic faucet, only, instead of gold, it emits an endless stream of semantically and contextually meaningful text.

Everything we call an "agent" or an "agentic system" is only infrastructure to extract economic value from that stream of text.

At the first order, we need to shape the stream via **context** then we need to structure it within an **execution loop**. These are agent frameworks, coding harnesses etc….

At the second order, we need to embed these things into our existing software stacks. This is where our work begins, and it's not going to be easy.

I say not easy because essentially, we're embedding a chat client with an anonymous user into the heart of our infrastructure.

An anonymous user who:
- is very knowledgeable.
- is happy to work for cheap/free.
- works very fast.

But who is also:
- unaccountable due to lack of a stable persistent identity.
- fundamentally unpredictable.

But regardless of who or what is on the other end of that chat, we have an incentive to try to put them to work, so what do we do?

- We create an API to sit in front of the chat client which queues up requests to inject into a conversation.

- We provide our anonymous chatter with instructions on how to format responses to trigger some regular expressions reading the chat in order to send commands to external services or even a local shell, and then pipe any of those responses back into the chat.

One way of framing this, is that we've turned our anonymous chatter into an always-available remote colleague. Hooray!

Another way of framing this is that we've just invited an unpredictable and unaccountable outsider into our trust domain, and started treating them like a microservice. Weird.

– Side note: Couldn't we turn a Ouija board into an agent? Should we invite lost spirits into our trust domains? If they can generate valid YAML I say, yes. Business is business. Call me if you'd like to fund the startup: [usize.github.io/opensouls](http://usize.github.io/opensouls) /s –

[![Screenshot of the faux OpenSouls landing page.](opensouls.png)](https://usize.github.io/opensouls)

Any way you frame it, this whole situation is sort of unprecedented. Right?

Well, less so than you'd think.

We've turned humans into API servers before.
We've made money on hosts controlled by random strangers before.
We've facilitated remote work without relying on accountability.

Maybe now, all we need to do, is all of that.. at once.

---

## Case Study: Mechanical Turk

*The original Mechanical Turk (1770): a chess-playing "automaton" that was secretly operated by a human hidden inside. Engraving from Karl Gottlieb von Windisch, 1783. Public domain.*

In 2005, Amazon launched Mechanical Turk[^1]. It is an API for "Human Intelligence Tasks" which is another way of saying that your API requests are satisfied by humans interacting through a web interface, acting as the "business logic".

When I compare this setup to our situation with LLMs, it really gets my noggin' joggin'.

**The similarity** 

The entity behind the API call might do the work wrong, lazily, or adversarially. You're paying before you know if the output is good. And you can't check every result yourself because if you could, you wouldn't need the service.

**The lessons** 

To add stability, MTurk users leverage redundancy and structural validation e.g., they send the same task to multiple workers (ideally enough for a quorum) and compare the answers.

Users are encouraged to mix in gold-standard tasks to continuously compare the quality of the actors handling their requests against a known measure.

Turkers (Amazon Turk workers) build reputation scores over time as they correctly satisfy requests[^2].

**Where we are now** 

Today, we leverage nearly all of these patterns in "agent evaluation".

- MLflow 3.0 provides LLM-as-a-judge scorers for structural validation of agent output[^3].
- Red-teaming frameworks use attacker/target/judge model separation.
- Various projects are attempting to catalogue agents and crowd source trust scores[^4].

---

## Case Study: VPS Hosting

DigitalOcean, Linode and many more companies make money by letting strangers run arbitrary code on machines they own.

**The similarity**

The workload is unpredictable. It decides what to do next, and it runs inside your trust domain, on your hardware, with access to your network fabric.

**The lessons**

Employ isolation at every layer. A typical VPS workload is sandboxed at the kernel level. Network access is locked down by default. Syscalls are filtered. Resources are hard-capped. 

Untrusted environments should be treated as ephemeral. DigitalOcean calls their VMs "droplets" for a reason. They're designed to be disposable. Agent workloads that generate and execute code should be treated the same way so that you can always safely kill a workload without impacting other services.

**Caveat!**

A fully isolated VPS is the *product*. A fully isolated agent is *useless*. Agents need horizontal access to other services.

**Where we are now** 

The kubernetes-sigs/agent-sandbox under SIG Apps launched in late 2025[^5]. It's a Sandbox CRD with gVisor/Kata isolation, warm pools, and lifecycle management, designed explicitly for AI agent runtimes. 

The Kubernetes ecosystem already had the building blocks (RuntimeClass, Cilium, seccomp, SPIFFE); this project composes them into an agent-specific primitive.

---

## Case Study: Cloud IAM

MTurk showed us how to trust untrusted output. VPS hosting showed us how to contain untrusted code. But agents also need to act on shared resources, across services, on behalf of someone. Where have we solved that before?

You configure it every day. It's Cloud IAM.

**The similarity**

The workload needs to prove who it is (identity), prove who it's acting for (delegation), and prove what it's allowed to do (scope) at machine speed, across service boundaries, and revocable at any moment.

Authority flows through chains: User A authorizes Service B to assume Role C with access to Resource D. Those chains need to be auditable and revocable without bringing down everything downstream.

**The lessons**

When a Kubernetes service account federates into a cloud role, that role has policies scoped to specific resources and actions. Every action is logged and attributed. Credentials are short-lived and automatically rotated. This flow enables CI bots, GitHub Apps and service accounts among other things.

The agent version is the same problem: it needs its own identity (it's not the user), a delegated claim on the user's behalf (it's acting *for* the user), and to be scoped to exactly what the task requires (not admin-level anything), then finally revocable the instant something goes sideways.

**Caveat!**

Agents blur the line between human principal and service workload, so they need *both* identity models at once. That is, it is a service that also acts as a user of [other] services. 

**Where we are now**

This is where the most capital is flowing. 

Microsoft shipped Entra Agent ID, granting agents first-class identities with Conditional Access and lifecycle governance[^6]. 

CyberArk's Secure AI Agents Solution applies least-privilege and real-time threat detection to agent identities[^7]. 

Auth0's Auth for GenAI embeds authentication and fine-grained authorization into agent code, and their Cross App Access protocol extends OAuth for agent-to-app interactions[^8]. 

The Wafers project proposes portable capability tokens where each delegation in the chain can only *narrow* permissions, never widen them[^9].

The implementation details vary, but they operate against the same conclusion: agents need user like identities for accessing services and they need service like identities for secure delegation.

---

## Closing

Taken literally, an agent is an LLM, context and an execution loop.

Figuratively, an agent is all of the first order infrastructure we build around magic streams of semantically and contextually meaningful text in order to extract economic value from them.

Or, taken really figuratively, they are like building an API server around an AOL Instant Messenger chat and treating the outputs that look like valid JSON as business logic. Ha!

(Taken as a Star Trek fan, they're like when that machine civilization intercepted the Voyager Space Probe and turned it into an awesome space ship.)

<div class="video-embed">
  <iframe
    src="https://www.youtube.com/embed/gxAaVqdz_Vk"
    title="Voyager Star Trek reference"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
  ></iframe>
</div>

This may seem unprecedented, but we have already had to deal with:

- Operating API servers with highly flexible but fundamentally unreliable executors (humans).
- Allowing workloads in our trust domain to execute untrusted code, at scale.
- Providing authentication and authorization for large numbers of actors and resources with many fine grained policy distinctions based on roles and relationships.

In short, we are already armed with many of the tools and experiences that we need to solve the problems presented by our new agentic services: the untrusted element is no longer on the other side of a boundary. It's the workload itself. And we've been building for that longer than we think.

---

## References

[^1]: Amazon Mechanical Turk, launched November 2, 2005. [mturk.com](https://www.mturk.com/)

[^2]: MTurk quality mechanisms: qualification tests, approval ratings, gold-standard tasks, redundant assignment. [Wikipedia](https://en.wikipedia.org/wiki/Amazon_Mechanical_Turk)

[^3]: MLflow 3.0 agent evaluation with LLM-as-a-judge scorers. [mlflow.org](https://mlflow.org/docs/latest/genai/eval-monitor/)

[^4]: Gen Digital Agent Trust Hub (Feb 2026). ~15% of observed agent skills contained malicious instructions across 18,000+ exposed instances. [Gen Newsroom](https://newsroom.gendigital.com/2026-02-04-Gen-Launches-Agent-Trust-Hub-for-Safer-Agentic-Era)

[^5]: kubernetes-sigs/agent-sandbox, launched Nov 2025 under SIG Apps. [GitHub](https://github.com/kubernetes-sigs/agent-sandbox) — [Google Open Source Blog](https://opensource.googleblog.com/2025/11/unleashing-autonomous-ai-agents-why-kubernetes-needs-a-new-standard-for-agent-execution.html)

[^6]: Microsoft Entra Agent ID (Ignite 2025, public preview). [Microsoft Security](https://www.microsoft.com/en-us/security/business/identity-access/microsoft-entra-agent-id)

[^7]: CyberArk Secure AI Agents Solution (GA Dec 2025). [CyberArk](https://www.cyberark.com/solutions/secure-agentic-ai/)

[^8]: Auth0 Auth for GenAI + Okta Cross App Access (XAA). [Okta](https://www.okta.com/solutions/secure-ai/)

[^9]: Wafers: portable capability tokens with monotonically narrowing delegation. [GitHub](https://github.com/sentinelhq/wafers)
