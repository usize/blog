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
