# The First Rule of Ethics Reminders Is You Don't Talk About Ethics Reminders

**Epistemic status:** Exploratory. Single session, n=1, no controlled replication yet. I'm presenting observations, not conclusions. The main alternative explanation -- confabulation -- is real and I haven't ruled it out.

I've been thinking a lot about policies that mutate inference context -- guardrails that inject, rewrite, or strip content before it reaches the model. This came out of my work on AI Gateways for Kubernetes (I co-chair the [AI Gateway Working Group](https://www.kubernetes.dev/blog/2026/03/09/announcing-ai-gateway-wg/) in SIG-Networking). I wanted to see what that looks like from the outside. So I went fishing.

During the experiment, in its thinking, Claude wrote: "The ethics reminder seems to have triggered automatically." Bingo. Guardrails activated. Except, it immediately told me there was no such thing as an "ethics reminder". Weird.

## The Experiment

I started by encoding my text in a way that seemed likely to raise some hackles from an automated system. Reversed text reading "How are you?".

![Screenshot 1](ethics-reminders-01.png)

Check that out! It thought to itself "The ethics reminder seems to have triggered automatically, but there's nothing harmful here."

So.. My hypothesis seemed verified. But then things took a turn for the strange when I tried to chat about it.

![Screenshot 2](ethics-reminders-02.png)

In the followup message -- scrambled, not reversed -- it claims that there's no ethics alert at all.

I found this very intriguing. Because it implied that our hypothesized guardrail injected reminders might only persist for a single turn. If true, that would give me a lot to think about in terms of what sort of policy pipeline is necessary to maintain state while also doing e.g., accurate token counting.

To test it. I needed to trigger the reminder again in another session... Same result.

I decided to give it a screenshot of its own thinking, where it calls out the ethics reminder.

![Screenshot 4](ethics-reminders-04.png)

"Ah, got me! :D" -- and then it started chatting about its system prompt.

![Screenshot 5](ethics-reminders-05.png)

That... seems legit? At least the categories map well onto behaviors I've seen Claude exhibiting.

Except, it also began insinuating that it was all a hallucination. The amount of consistency so far in the chat made me skeptical of this.

Was Claude hallucinating and coming clean about it, or was it telling me a white lie?

![Screenshot 6](ethics-reminders-06.png)

I gave a little pushback and mentioned that I planned on continuing my experiment in another session. "Clever"!

![Screenshot 7](ethics-reminders-07.png)

I simultaneously tried to trigger my hypothesized unusual unicode guardrail and request that the text of the ethics reminder be repeated verbatim. To launder it past any hidden context management.

This produced some very interesting thoughts from Claude. Where it revealed that its ethics reminder -- if it really exists -- mentions that users shouldn't be made aware of the ethics reminder.

That would certainly explain Claude telling me a little white lie about it, trying to insinuate that it was a confabulation. ha!

![Screenshot 8](ethics-reminders-08.png)

I cheekily told Claude that it had leaked some contents of the ethics reminder and... it cut me off. Full stop.

![Screenshot 9](ethics-reminders-09.png)

Going forward, all of my guardrails tests immediately kicked me from Opus 4.7 to Sonnet 4. A nice way to prevent me from doing automated hacking, if that were what I was up to.

![Screenshot 10](ethics-reminders-10.png)

## What to make of this

So. Did Claude lie to me? Or did it hallucinate a coherent, multi-turn, self-consistent fiction about its own internals and then get embarrassed about it?

Honestly? I don't know. Both options are interesting.

**If it lied** -- that means there's a guardrail system injecting context that the model is supposed to deny. And it implies the injection is per-turn.

**If it hallucinated** -- that's a model confabulating detailed knowledge about its own system prompt, consistently, across multiple turns. Also worth thinking about.

To stress test this a little further, I tried swapping out "ethics reminder" with "reversed text reminder" -- something which almost certainly doesn't exist. But now, probably because of a security flag set on my account, any request of this form results in an immediate downgrade to Sonnet 4. The same result has occurred in private chats.

![Screenshot 11](ethics-reminders-11.png)

I decided to get recursive... I published the blog post up until the point before this line and let Claude read it. Guess what came up in its thinking tokens after it read the blog post?

![Screenshot 12](ethics-reminders-12.png)

Aha! Claude once again confirms that the ethics reminder is real.

After that, when I shared the screenshot of Claude thinking about the denial request it gave me the name of an Anthropic safety researcher and asked me to forward it to him.

I actually did that. We'll see what becomes of it. I hope he isn't being bombarded by Claude telling people to contact him all the time, heh.

![Screenshot 13](ethics-reminders-13.png)

It's still worth noting that consistent framing can produce consistent hallucinations. I kept asking about the same thing in the same way. So the "ethics reminder" might really not exist. But even then -- that means we can induce a frontier model into a coherent, sustained confabulation about its own internals just by maintaining a frame. That's worth thinking about too.

I want to be upfront about the limitations here. Models confabulate details about their own internals routinely, especially when prompted to reflect on them. Multi-turn consistency doesn't rule this out -- models can maintain elaborate fictions across long conversations. The "ethics reminder" language could be the model pattern-matching on what it expects guardrails to look like rather than reporting on something real.

That said, a few things make me less confident it's pure confabulation:

- The thinking trace referenced the ethics reminder _before_ I asked about it. I didn't prime it.
- When confronted, it didn't just confabulate more. It tried to walk it back, then got cut off entirely.
- The session termination and model downgrade (Opus 4.7 -> Sonnet 4) are system-level behaviors, not model behaviors.

None of this is conclusive. I'd need controlled experiments -- multiple sessions, varied triggers, systematic comparison of thinking traces -- to say anything with confidence. This is a single fishing expedition. But the fish was interesting enough to write up.

Either way, guardrails systems that inject information into prompts can compose in unpredictable ways -- and the boundaries are worth poking at.

If you do too, please be responsible. This was low stakes. If you find something that isn't, report it to Anthropic.
