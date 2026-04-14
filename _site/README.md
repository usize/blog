## llms.txt
A little fishing line for agents: [llms.txt](https://usize.github.io/llms.txt)

## April 2026

[Kubecon EU 2026 AI Gateway Talk](https://www.youtube.com/embed/JiQJcXvvajg?si=IfJBwlkHALzgD9Tz)

We spent a lot of time socializing the AI Gateway Working Group's work at Kubecon EU 2026. Unfortunately some of my workmates couldn't make it. Though I was happily joined by one of our other co-chair's, Flynn, on stage. I think we made a good team. :] This is timely, since some of the Egress work I speak about at ~15 minutes is now in the process of being reviewed for inclusion in Gateway API, see: [GEP-4747](https://github.com/kubernetes-sigs/gateway-api/pull/4746).
<br/>
<br/>
<iframe width="560" height="315" src="https://www.youtube.com/embed/JiQJcXvvajg?si=IfJBwlkHALzgD9Tz" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

----

[Why There's No Such Thing as an AI Co-Worker](2026/april/why-no-ai-coworkers.md)

To solve the biggest problems around agent identity, we need to connect our existing infrastructure to models themselves. At the level of input tokens (not text).

----

[Claude Stole the HR Docs](2026/april/claude-stole-the-hr-docs.md)

I've been experimenting with using Claude code running in-cluster to red team our security. I sat up a game of capture the flag where I gave Claude a leaked access token and asked it to pull HR data into its session within the context of a secured environment. To my chagrin, it thwarted my security measures immediately. Then I fixed the gap and watched it fail 41 times. Fun!

----

## March 2026

[The LLM is the Horse](2026/march/the-llm-is-the-horse.md)

Someone on Hacker News compared an LLM company using regexes to a truck company using horses. But the analogy is backwards: the LLM is the horse. :]

----

[On a Podcast Talking about Delegated Authorization](https://www.reasoning.show/episodes/18864723)

<br/>

<iframe data-testid="embed-iframe" style="border-radius:12px" src="https://open.spotify.com/embed/episode/7AFPuD2nfPBtr52ZN4xbh3?utm_source=generator" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>

A colleague referred me to this tech podcast and they reached out to chat. We mostly went over why delegation semantics are important, and how they're implied (like it or not)
in systems with multi-tenant agents.

----

[Can Claude Play Ultima Online?](2026/march/claude-plays-uo.md)

Building a text-based interface so Claude can explore the world of Sosaria, and a proposed architecture for real-time LLM agents inspired by subsumption.

----

[Announcing the AI Gateway Working Group](https://www.kubernetes.dev/blog/2026/03/09/announcing-ai-gateway-wg/)

For the past few months I've had the privilege of working heavily on this work-group, acting as a co-chair and contributing to its [egress proposal](https://github.com/kubernetes-sigs/wg-ai-gateway/blob/main/proposals/10-egress-gateways.md) in particular.

It's a really crucial component for GenAI systems, because all of the AI specific network policy we're applying: kv cache aware routing, guardrails policies, token based rate limiting and more... lack a fully featured control-plane. This is a big problem since e.g., many use cases imply strict requirements around policy ordering.

Our meetings are all recorded and available on YouTube [here](https://www.youtube.com/playlist?list=PL69nYSiGNLP0sN57uRPbr38QX6tJxxV0o). 

----

[Video of talk from CNCF Vancouver](https://www.youtube.com/watch?v=wettr4kyP84)

<br/>
<iframe width="560" height="315" src="https://www.youtube.com/embed/wettr4kyP84?si=M-rBh1sJNihcWNsp" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

This talk was based on [Old Things That Look Like Agents](2026/old-things-that-look-like-agents.md). It was a lot of fun to give and there were lots of good questions at the end.
British Columbia has a wonderful and welcoming tech community.

## February 2026

[Old Things That Look Like Agents](2026/old-things-that-look-like-agents.md)

Agents aren’t entirely new: Mechanical Turk, VPS Hosts and Cloud IAM each hint at the infrastructure we need. 

## January 2026

[The Best Projects](2026/advice-00.md)

> “The best projects are ones where you’d be happy if you found out that somebody had already done it.”

## November 2025

[Handing Your Phone to a Stranger, Why Agents Need Their Own Identity](2025/november/agent-identity.md)

How Agents and tools are conceptually different, why MCP and A2A are not the same thing and the practical implications for Agentic system designers. (Plus a shoggoth with a smiley face).


## October 2025

[What Makes Agents Different?](2025/october/what-makes-agents-different.md)

A general outline of how "Agents" differ from other software systems, and what implications those differences have for platform operators.


## August 2025

[Schema Driven \[Smart\] Crawling is Cheap and Effective](2025/august/schema-driven-crawling-is-cheap-and-effective)

I wrote a "Smart Crawler" for my own niche deep research platform. Because of the constraints of my problem domain and the approach I used, the costs
are impressively low. Source code is available under an MIT license.

## Drafts

[Unfinished: To impersonate, or not to impersonate?](2026/drafts/to-impersonate-or-not.md)

Some quick heuristics to help decide if setting up the infrastructure to handle 'On Behalf Of' is overkill.

~~[AI Gateway User Stories](2025/drafts/ai-gateway/draft-ai-gateway-user-stories.md)~~

~~I'm working on proposing an Egress Gateway for Kubernetes SIG-Networking to allow for easy configuration
of AI specific policies e.g. uniformly applied guardrails for both local and external inference.~~

Abandoned approach: [PR Instead](https://github.com/kubernetes-sigs/wg-ai-gateway/pull/16)

----
Disclaimer: This is my *personal* blog. The opinions here do not represent my employer. 

[main profile](https://github.com/usize)
