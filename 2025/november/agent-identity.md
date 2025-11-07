# Handing Your Phone to a Stranger, Why Agents Need Their Own Identity  

#### [usize](https://github.com/usize) Oct 2025

In a lot of conversations, I see MCP and A2A positioned as competators.

I believe that this not the case, and indeed having a separate way of describing agent communication and discovery and tool description and invocation is very valuable.

One of the big reasons for this, are questions of identity.

## Tool Use Maps Cleanly onto Intention

If I use a tool, I often have a well known expected outcome (and through that, a well known boundary butween success and failure).

In other words, tools are expected to be *deterministic*.

It also means that tool use effectively conveys the *intention* of the caller.

Because of that **it is not unreasonable for a tool to assume the identity of a caller**.

In other words, if a tools needs to list my private github repos, I'll argue that it's okay to pass that tool a temporary access token minted under my own identity.

This makes MCP servers a fair candidate for delegated auth and token exchange patterns.

## Agent Use Obfuscates Intention

By comparisson, when I ask an Agent to do something for me I don't have a clear up front way of defining what "success" will look like.

This is because at its core, an Agent is a stochastic and highly context dependent.

Put simply, you can't really know exactly how it will behave in response to a given request.

The result is that **letting an Agent assume your identity as a user is a very bad idea** -- the behavior of the agent may not reflect your intentions.

For example, when you asked it to clean up the database you probably didn't mean for it to drop all of the tables. 

The other is that layers of indirection prevent us from mapping out observed behaviors so that we can regain a bit of the control we have over deterministic systems via drift detection. 

![A diagram showing the different between stochastic and deterministic systems.](agent-vs-tool.png)

## The Test

Think of it this way.

Using a tool is like sending a post card. You have a well structured input, and an expected result.

Delegating work to an Agent is like asking a stranger for help.

If you want a stranger to summarize an email for you, do you give them your email account's username and password? Or do you forward the email to them.

If you want that stranger to tell somebody something for you, do you hand them your cellphone and let them text from your phone number?

Or do you ask them to pass the message on themselves, and then verify your intentions with the recipient later?

## In Practice

What this means in practice is that the way we handle identity and authorization has fundamentally different implications depending on whether we are dealing with "tools" -- which I'm defining as deterministic -- and "Agents"
which I'm defining as "stochastic". 

When we use a tool, we can attach our own temporary auth token to the outgoing request and it should be okay for the tool to pass it on to a third party in our name.

When we use an Agent, we need that agent to request its own temporary token minted under its own identity with some sort of footnote that says "this is on behalf of *user*".

In the GitHub example, what you'd want to do is create an account for your agent. Give it access to your organization or your repos the way you would a colleague, and let it handle the rest.

Where this gets tricky is cases where such flows only support Oauth2.0 via a web flow, but there are ways around it and protocol level improvements that I'll save for another time.

