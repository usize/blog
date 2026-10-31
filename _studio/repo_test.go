package main

import (
	"strings"
	"testing"
	"time"
)

const sample = `## September 2026

[Cope versus Hope](2026/september/cope-versus-hope.md)

Coming soon.

----

## June 2026

[Old](a.md)

Old summary.

----

[Older](b.md)

## Drafts

[Draft](2026/drafts/x.md)

Quick heuristics.

----
Disclaimer
`

func d(y int, m time.Month) time.Time { return time.Date(y, m, 1, 0, 0, 0, 0, time.UTC) }

func TestNewSectionAtTop(t *testing.T) {
	got := UpsertEntry(sample, "New", "2026/october/new.md", "Hi.", nil, d(2026, 10))
	if !strings.HasPrefix(got, "## October 2026\n\n[New](2026/october/new.md)\n\nHi.\n\n----\n\n## September 2026") {
		t.Fatalf("got:\n%s", got)
	}
}

func TestMoveDraftIntoExistingSection(t *testing.T) {
	got := UpsertEntry(sample, "Draft", "2026/june/x.md", "", []string{"2026/drafts/x.md"}, d(2026, 6))
	if strings.Contains(got, "drafts/x.md") {
		t.Fatalf("old entry/empty section kept:\n%s", got)
	}
	if !strings.Contains(got, "## June 2026\n\n[Draft](2026/june/x.md)\n\nQuick heuristics.\n\n----\n\n[Old]") {
		t.Fatalf("got:\n%s", got)
	}
}

func TestStubReplacedAndEmptySectionDropped(t *testing.T) {
	got := UpsertEntry(sample, "Cope versus Hope", "2026/september/cope-versus-hope.md", "Real summary.", []string{"2026/september/cope-versus-hope.md"}, d(2026, 10))
	if !strings.HasPrefix(got, "## October 2026\n\n[Cope versus Hope]") || strings.Contains(got, "September") || strings.Contains(got, "Coming soon") {
		t.Fatalf("got:\n%s", got)
	}
}

func TestNewestAppendedWhenOnlySection(t *testing.T) {
	got := UpsertEntry("", "A", "2026/may/a.md", "S", nil, d(2026, 5))
	if !strings.HasPrefix(got, "## May 2026\n\n[A](2026/may/a.md)\n\nS\n") {
		t.Fatalf("got:\n%q", got)
	}
}

func TestAdjacentEntriesWithoutSeparatorSurvive(t *testing.T) {
	in := "## Drafts\n\n[One](1.md)\n\nfirst.\n\n~~[Two](2.md)~~\n\n~~second~~\n\nAbandoned: [PR](x)\n\n----\nDisclaimer\n"
	got := UpsertEntry(in, "One", "2026/may/1.md", "", []string{"1.md"}, d(2026, 5))
	for _, want := range []string{"~~[Two](2.md)~~", "~~second~~", "Abandoned: [PR](x)", "[One](2026/may/1.md)\n\nfirst."} {
		if !strings.Contains(got, want) {
			t.Fatalf("missing %q in:\n%s", want, got)
		}
	}
	if strings.Count(got, "first.") != 1 {
		t.Fatalf("duplicated:\n%s", got)
	}
}
