# To impersonate, or not to impersonate?  

#### [usize](https://github.com/usize) Jan 2026

Right now, it seems we're in the pre-Alpha stage of the coming 'Agentic Web'. It's an exciting time, because in terms of implementation details:

1. There's enough theory and prior art to provide us with a general direction.
2. We've yet to put enough of that theory into practice to figure out what really works.

<aside>
I can imagine that this may have some parallels to where the "World Wide Web" was in the early 90's. Nobody knew how world changing the "World Wide Web" would be, but on a technical level things were a bit less directionally uncertain.
</aside>

This creates a difficult situation for people building infrastructure in the here and now. Because on the one hand, there's a general trend they can follow but on the other hand, if they get caught up in the hype and prematurely optimize they risk wasting a lot of valuable time and energy.

This is very clear right now in conversations happening around "On Behalf Of" semantics.

Directionally, it's very clear that when a user grants access to an agent that relationship should be considered. But what does that entail?

Minimally:

1. Distinct Agent identity.
2. Integreated with a secure token service.
3. Integrated with some policy engine.

All so that you can initiate a flow that looks like:

<claude: generate some JWT claims with an act audience sub etc... capturing the token being minted for a user -> agent -> resource>

When instead you could simply:

- Allow users to pass tokens generated from an OAuth flow directly to the agent (or via a secret broker).

 or

- Configure access for the agent itself. 

You don't need to calculate new scopes or mint tokens or configure complicated policies.

And actually, this can be fine.

Christian Posta wrote a nice article about this. He says:

    “The most practical approach right now is to stay within a single system. Let the agent inherit the user’s credentials and work inside familiar guardrails.”

    “You might have a marketing agent that uses Sarah’s Salesforce token to pull leads, her HubSpot credentials to run a campaign, and her Google Analytics access to generate a report.

    Yes, it’s still credential sprawl. But it works. And it delivers immediate value while respecting existing auth boundaries.”

    source: [https://blog.christianposta.com/cracks-in-our-identity-foundations/](https://blog.christianposta.com/cracks-in-our-identity-foundations/)

But the obvious question is: when does this break down?

## When 'on behalf of' isn't overkill

There is a set of authorization policies which **imply** 'on behalf of' semantics.

These are any policy of the form: User Alice MAY/MAY NOT access Resource Foo USING Agent Bar.

This is because:
  - Even if Alice can access Resource Foo on her own, she should NOT access it using Agent Bar.
  - Even if Agent Bar can access Resource Foo, it should NOT access it when Alice asks it to.

When would you use a policy of this form in the real world?

- An HR agent is being rolled out, and only a subset of employees can use it to modify records regardless of if they can modify those records otherwise.
- A research agent can only run in non-interactive batch mode for a subset of users.
- Alice shares a document with Bob, granting him edit permissions. Alice has an Agent that can make changes to the document at her request. Bob can chat with the agent about the document, but it won't make edits on his behalf.

### What does it look like to implement this logic without explicit 'on behalf of' semantics?
