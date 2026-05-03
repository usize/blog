#!/usr/bin/env bash
set -euo pipefail

VOICEBOX_URL="http://localhost:17493"
VOICEBOX_DATA_DIR="$HOME/Library/Application Support/sh.voicebox.app"
PROFILE_ID="7071493a-5c0d-4b89-ac50-3b042e7d2ed5"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPTS_DIR="$SCRIPT_DIR/scripts"
AUDIO_DIR="$SCRIPT_DIR/audio"

mkdir -p "$AUDIO_DIR"

generate_slide() {
    local slide_num="$1"
    local padded
    padded=$(printf "%02d" "$slide_num")
    local txt_file="$SCRIPTS_DIR/slide-${padded}.txt"
    local out_file="$AUDIO_DIR/slide-${padded}.wav"
    local mp3_file="$AUDIO_DIR/slide-${padded}.mp3"

    if [ ! -f "$txt_file" ]; then
        echo "ERROR: $txt_file not found" >&2
        return 1
    fi

    echo "==> Slide ${padded}..."

    local payload
    payload=$(python3 -c "
import json, sys
text = sys.stdin.read()
print(json.dumps({'profile_id': sys.argv[1], 'text': text, 'language': 'en'}))
" "$PROFILE_ID" < "$txt_file")

    local response
    response=$(curl -sf -X POST \
        "$VOICEBOX_URL/generate" \
        -H "Content-Type: application/json" \
        -d "$payload")

    local gen_id
    gen_id=$(python3 -c "import json,sys; print(json.load(sys.stdin)['id'])" <<< "$response")
    echo "    id: $gen_id"

    # Poll /history/{id} which returns plain JSON (status endpoint uses SSE)
    local status="generating"
    local history_response=""
    local attempts=0
    while [ "$status" = "generating" ] || [ "$status" = "queued" ]; do
        sleep 3
        history_response=$(curl -sf "$VOICEBOX_URL/history/${gen_id}")
        status=$(python3 -c "import json,sys; print(json.load(sys.stdin).get('status','unknown'))" <<< "$history_response")
        printf "    status: %-12s\r" "$status"
        attempts=$((attempts + 1))
        if [ "$attempts" -ge 120 ]; then
            echo ""
            echo "ERROR: Timed out on slide ${padded}" >&2
            return 1
        fi
    done
    echo ""

    if [ "$status" != "completed" ]; then
        echo "ERROR: Generation failed for slide ${padded}: $status" >&2
        echo "$history_response" >&2
        return 1
    fi

    local rel_path
    rel_path=$(python3 -c "import json,sys; print(json.load(sys.stdin).get('audio_path') or '')" <<< "$history_response")
    local audio_path="$VOICEBOX_DATA_DIR/$rel_path"

    if [ -n "$rel_path" ] && [ -f "$audio_path" ]; then
        cp "$audio_path" "$out_file"
    else
        curl -sf "$VOICEBOX_URL/audio/${gen_id}" -o "$out_file"
    fi

    echo "    saved: $out_file"

    ffmpeg -i "$out_file" -codec:a libmp3lame -q:a 4 "$mp3_file" -y 2>/dev/null
    echo "    saved: $mp3_file"
}

if [ $# -gt 0 ]; then
    for n in "$@"; do
        generate_slide "$n"
    done
else
    for i in $(seq 1 24); do
        generate_slide "$i"
    done
fi
