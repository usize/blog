---
layout: default
title: "The LLM is the Horse"
---

# The LLM is the Horse
### ...and the regex is the wheelbarrow.

#### [usize](https://github.com/usize) March 2026

When the [Claude Code source was leaked](https://github.com/chatgptprojects/claude-code/blob/642c7f944bbe5f7e57c05d756ab7fa7c9c5035cc/src/utils/userPromptKeywords.ts#L8), one detail that caught people's attention was the use of regular expressions for basic sentiment detection. A function called `matchesNegativeKeyword` uses a regex to track when people curse at Claude more or less, haha. Someone on Hacker News said:

<img src="regex.png" alt="HN comment: An LLM company using regexes for sentiment analysis? That's like a truck company using horses to transport parts. Weird choice." style="max-width: 720px; width: 100%;">

I see why they might say that, but the analogy is backwards.

## LLMs are like horses 

**The LLM is the horse**. Horses are magnificent. They're strong and capable of navigating complex terrain. But they eat massive amounts of food, need medical care and probably a lot of other things I don't know about since I've never owned a horse!

LLMs are the same: powerful and flexible. But every invocation comes at a relatively high cost due to the capex and opex required to run them at scale.

## Regular expressions are like wheelbarrows 

The humble regex is more like a wheelbarrow. It relies on human [brain] power. Someone has to design and write/push it. It will never suddenly do something cool and useful that you didn't expect. But you'll also never have to convince it to do what you want on the fly and its cheap to operate.

Because of these properties--cheap, simple to maintain and predictable--wheelbarrows will always be useful. In fact, I could imagine some highly complex android using a wheelbarrow. Because *the expensive, complex and adaptable and the cheap, simple and straightforward compliment one another*.

## This pattern applies all over 

This same tension shows up in the work I've been doing with the [AI Gateway Working Group](https://www.kubernetes.dev/blog/2026/03/09/announcing-ai-gateway-wg/), where we've been debating support for out-of-band body processing.

The question boils down to: when a gateway needs to make a decision based on the contents of a request body, should that logic run *inside* the gateway (in-process), or should the body be shipped off to an external service for evaluation (out-of-band)?

I've argued that out-of-band processing has real advantages for complex workloads.

For example, when the policy is expensive to implement--say, [running a complicated routing algorithm](https://llm-d.ai/docs/architecture/Components/inference-scheduler)--it makes sense to offload that work to a dedicated service. And if you design it to fail open, you limit the blast radius when/if it crashes since it's a separate process from the proxy itself. 

But for many common cases, simpler is better. Consider something as simple as promoting the model name from a JSON request body to a header so the gateway can route on it. John Howard [wrote about exactly this pattern](https://blog.howardjohn.info/posts/cel-is-good/) in the context of [agentgateway](https://agentgateway.dev/), where a CEL expression like `json(request.body).model` replaces what would otherwise require standing up a 5,000-line external processor in Envoy, heh. 

The flexibility and limited blast radius aren't as needed here. So it makes more sense to run it in the proxy.

I [brought this topic up during a panel at Cloud Native AI Day](https://colocatedeventseu2026.sched.com/event/2DY4J/panel-routing-intelligence-vs-traffic-control-architectural-tradeoffs-for-ai-inference-in-gateway-api-etai-lev-ran-ibm-abdullah-gharaibeh-google-morgan-foster-red-hat-john-howard-soloio) in Amsterdam, where we discussed these architectural tradeoffs in the context of AI inference and Gateway API. Answering the question of "to ext_proc or not to ext_proc" with "why not both" may seem cagey, but I mean it. Just like there's room for regular expressions and LLMs to exist side by side in the world of NLP, there's room for out of band processors and inline processors in the proxy. :D 

The simple and the complex, living together in harmony.

## tl;dr

For the same reason I expect wheelbarrows to be in use 100 years from now--though maybe pushed by an android--I expect regular expressions to be in heavy use as well. Why? Because there's always a place for simple and complex to live together side by side, like the way sand fills the gaps in a jar full of pebbles. And likewise, when we're engineering complex systems we should make room for the simple path.
