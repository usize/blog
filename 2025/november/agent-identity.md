# Handing Your Phone to a Stranger, Why Agents Need Their Own Identity  

#### [usize](https://github.com/usize) Oct 2025

In a lot of conversations, I see MCP and A2A positioned as competators. 

I believe that this not the case, and indeed having a separate way of describing agent communication and discovery and tool description and invocation is very valuable.

One of the big reasons for this, are questions of identity.

## Tool Use Maps Cleanly onto Intention

If I use a tool, I often have a well known expected set of actions (and through that, a well known boundary butween success and failure).

In other words, we can expect tools to be *deterministic*.

It also means that tool use effectively conveys the *intention* of the caller.

Because of that **it is not unreasonable for a tool to act directly on behalf of a caller**.

This makes MCP servers a fair candidate for [delegated auth](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization) patterns.

In other words, if a tools needs to list my private github repos, I'll argue that it's okay to pass that tool a temporary access token minted under my own identity.

## Agent Use Obfuscates Intention

By comparisson, when I ask an Agent to do something for me I don't have a clear mapping of my request to its actions.

This is because at its core, an Agent is a stochastic and highly context dependent.

Put simply, the behavior of the agent may not reflect your expections -or- intentions.

The result is that **letting an Agent assume your identity as a user is a very bad idea**.

For example, when you asked your db-helper-agent to clean up the database you probably didn't mean for it to drop all of the tables. 

Unfortunately, access logs show that it was your *username* who made the request. 😅

What's worse, that layers of indirection in the logs makes it harder for us to trace back exactly what went wrong since the actions your agent took are jumbled together with whatever else was going on under your identity at the time. How can we pick apart what was *you* and what was the *agent*? 

![A diagram showing the different between stochastic and deterministic systems.](agent-vs-tool.png)

## The Test

Think of it this way.

Using a tool is like sending a post card. You have a well structured input, and an expected result.

Delegating work to an Agent is like asking a stranger for help.

If you want a stranger to summarize an email for you, do you give them your email account's username and password? Or do you forward the email to them.

If you want that stranger to tell somebody something for you, do you hand them your cellphone and let them text from your phone number?

Maybe if you like to live dangerously.. 😎

But the more reasonable thing would asking them to pass the message on themselves, and then verify your intentions with the recipient later.

## In Practice

What this means in practice is that the way we handle identity and authorization has fundamentally different implications depending on whether we are dealing with "tools" -- which I'm defining as deterministic -- and "Agents" which I'm defining as "stochastic". 

When we use a tool, we can attach our own temporary auth token to the outgoing request and it should be okay for the tool to pass it on to a third party in our name.

Go ahead and make your MCP Server an Oauth client -- though beware of the [confused deputy problem](https://en.wikipedia.org/wiki/Confused_deputy_problem).

When we use an Agent though, we need that agent to request its own temporary token minted under its own identity with some sort of footnote that says "this is on behalf of *user*".

In the GitHub example, what you'd want to do is create an account for your agent and give it access to your organization or your repos the way you would a colleague.

Then your Agent can then use some sort of [token exchange](https://www.keycloak.org/securing-apps/token-exchange) to exchange its [workload identity](https://spiffe.io/docs/latest/spiffe-about/spiffe-concepts/) for a token minted for its account.

If the agent wants to use a GitHub MCP server, it will pass this token on to it so that the **tool** it calls can act on **its** behalf.

Where this gets tricky is cases where such flows only support Oauth2.0 via a web flow, but there are ways around it and protocol level improvements that I'll save for another time. 

