package main

import "testing"

func TestParseReview(t *testing.T) {
	post := "---\ntitle: x\n---\nHello wrold, this is fine."
	reply := "Sure!\n```json\n{\"summary\":\"ok\",\"comments\":[{\"quote\":\"wrold\",\"comment\":\"typo\",\"suggestion\":\"world\"},{\"quote\":\"not there\",\"comment\":\"hm\",\"suggestion\":\"x\"},{\"quote\":\"fine\",\"comment\":\"\"}]}\n```"
	rv := parseReview(reply, post)
	if rv.Summary != "ok" || len(rv.Comments) != 2 {
		t.Fatalf("got %+v", rv)
	}
	if rv.Comments[0].Suggestion != "world" || rv.Comments[1].Quote != "" || rv.Comments[1].Suggestion != "" {
		t.Fatalf("got %+v", rv.Comments)
	}
	if rv := parseReview("just prose, no json", post); rv.Raw == "" {
		t.Fatal("expected raw fallback")
	}
}

func TestTargetDiff(t *testing.T) {
	post := "I thinked about teh web alot. Then I thinked about it again."
	q, s := targetDiff(post, "I thinked about teh web alot.", "I thought about the web a lot.")
	if q != "thinked about teh web alot." || s != "thought about the web a lot." {
		t.Fatalf("got %q -> %q", q, s)
	}
	// Unchanged edges are trimmed; "thinked" appears twice so context is added until the quote is unique.
	q, s = targetDiff(post, "Then I thinked about it", "Then I thought about it")
	if q != " I thinked about " || s != " I thought about " {
		t.Fatalf("got %q -> %q", q, s)
	}
	if _, s = targetDiff(post, "web", "web"); s != "" {
		t.Fatal("no-op should drop suggestion")
	}
	if _, s = targetDiff(post, "again", "once more"); s != "once more" {
		t.Fatal("unique single word")
	}
}

func TestAgentOptions(t *testing.T) {
	a := builtinAgents[0]
	got, err := a.Options("sonnet", "high")
	if err != nil || len(got) != 4 || got[0] != "--model" || got[1] != "sonnet" || got[2] != "--effort" || got[3] != "high" {
		t.Fatalf("got %v %v", got, err)
	}
	if got, _ := a.Options("", ""); len(got) != 0 {
		t.Fatalf("defaults should add nothing, got %v", got)
	}
	if _, err := a.Options("--dangerous", ""); err == nil {
		t.Fatal("flag-like model accepted")
	}
	if _, err := a.Options("", "turbo"); err == nil {
		t.Fatal("unknown effort accepted")
	}
	if _, err := (Agent{Name: "x"}).Options("m", ""); err == nil {
		t.Fatal("agent without modelArgs accepted a model")
	}
}
