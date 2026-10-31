BUNDLE := $(shell brew --prefix ruby)/bin/bundle

.PHONY: install serve

install:
	$(BUNDLE) install

serve: install
	$(BUNDLE) exec jekyll serve --host 0.0.0.0 --livereload

.PHONY: studio studio-release

# Local authoring app (see _studio/). `make studio` builds ./studio for this machine.
studio:
	cd _studio && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o ../studio .

# Static binaries for macOS and Linux in ./dist
studio-release:
	@for t in darwin/arm64 darwin/amd64 linux/amd64 linux/arm64; do \
		echo $$t; cd _studio && CGO_ENABLED=0 GOOS=$${t%/*} GOARCH=$${t#*/} go build -trimpath -ldflags="-s -w" -o ../dist/studio-$${t%/*}-$${t#*/} . && cd ..; \
	done
