# Attention is still valuable, and novelty is still not impact 

#### [usize](https://github.com/usize) Jan 2026

During the first evening of Mozilla's [2015 all-hands](https://wiki.mozilla.org/All_Hands/2015_Whistler) I was mingling my way through a mixer when I struck up a conversation with a very fascinating and delightful individual. 

Many of their comments were so thoughtful that they had the quality of stack frames piling up until they struck a base case and collapsed into a coherent thesis. 

And as our conversation wound down, when I reached for one of the stock questions that I use to avoid awkwardly abrupt dead space in social functions.

> "What's a guiding principle you live by?"

I received a similarly well-structured response.

> "**Never work on something unless you'd be happy to find out that somebody else already did it for you.**"

It's saying something more than "don't re-invent the wheel."

It's saying:

> "It feels good to be the person who does a thing. It makes you proud of yourself. But it doesn't scale."

They'd learned this lesson by running clubs in university and quickly becoming overwhelmed with commitments. 

Which is exactly right. A leader doing hands-on work instead of delegating is often a failure mode.

But there's something even more interesting here, beyond the scope of encouraging delegation.

It updates the common heuristic of 

`do_the_thing = feels_good && has_not_been_done_yet` 

with an additional predicate: `&& is_worthwhile`

where `is_worthwhile = happy_if_it_already_exists`.

The genius is that this reframes the decision in terms of expected real-world utility, not personal satisfaction.

It's pushing us away from "[hill-climbing](https://en.wikipedia.org/wiki/Hill_climbing)" our way toward low-utility work that can come by simply chasing a first-order sense of accomplishment.

I've applied this heuristic in my own life many times over the past 11 years.

Of course, there are cases where it fails:

  - When a thing clearly needs to exist, but nobody has done it because it's difficult `||` scary `||` painful.
  - When grinding for short term recognition necessary to build credibility and leverage.

Less than a year later I failed to follow this advice when I volunteered to re-write some standard library methods in JavaScript that truthfully did not impact my life directly. And I still feel happy that I did, because it was _cool_.

But when I've been able to follow it, it's served me well.

It's helped me to:

  - Avoid high-complexity (nerd cred) low reward work like implementing a DSL, ha.
  - Recognize opportunities to hand off tasks to people with more 'skin in the game' concerning the outcome.

And is particularly useful during this era when LLMs have made it so cheap to explore that space of all possible widgets that could be built.

Because, ironically, being able to build widgets faster does not actually help you find a global maximum of utility faster.

Instead, it risks getting trapped in a local maxima. Where widget a begets widget b which begets widget c and so on.

Attention is still valuable, and novelty is still not impact.
