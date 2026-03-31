BUNDLE := $(shell brew --prefix ruby)/bin/bundle

.PHONY: install serve

install:
	$(BUNDLE) install

serve: install
	$(BUNDLE) exec jekyll serve --livereload
