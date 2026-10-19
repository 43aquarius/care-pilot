#!/bin/bash
# Devpost project creation via proper session flow
set -e
cd /home/z/my-project/hackathon
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
JAR=devpost_jar.txt

# Seed jar with the original cookies
rm -f "$JAR"
cat > "$JAR" << 'EOF'
# Netscape HTTP Cookie File
.devpost.com	TRUE	/	TRUE	0	jwt	eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MTA3ODY4OTl9.2sxA6KuQTSGs-m1BggFUxtEs64iYMsoOG0y9_2Gbu0M
.devpost.com	TRUE	/	TRUE	0	remember_user_token	W1sxMDc4Njg5OV0sIko4X05BeHpIV3RFMkxjYjhHdGI3IiwiMTc5MjI4Nzg0NC40MTg2MDIiXQ%3D%3D--325186fd8d04bb981ccbc6bbf93ccd6ba03eaf81
EOF

echo "=== Step 1: GET manage page (refresh session) ==="
curl -s -c "$JAR" -b "$JAR" -H "User-Agent: $UA" \
  "https://devpost.com/submit-to/31511-healthhack-48/manage/submissions" -o manage_fresh.html
echo "cookies now:"
grep -c devpost "$JAR" || true

TOKEN=$(python3 -c "
import re
c = open('manage_fresh.html').read()
t = re.findall(r'name=\"authenticity_token\"[^>]*value=\"([^\"]+)\"', c)
# The create-project form token
m = re.search(r'<form id=\"create-project-blank-state-cta\".*?authenticity_token\" value=\"([^\"]+)\"', c, flags=re.S)
print(m.group(1) if m else (t[0] if t else ''))
")
echo "token: ${TOKEN:0:30}..."

if [ -z "$TOKEN" ]; then
  echo "FAILED to get token"
  exit 1
fi

echo "=== Step 2: POST create project ==="
curl -s -c "$JAR" -b "$JAR" -H "User-Agent: $UA" \
  -H "Origin: https://devpost.com" \
  -H "Referer: https://devpost.com/submit-to/31511-healthhack-48/manage/submissions" \
  -X POST "https://devpost.com/submit-to/31511-healthhack-48/manage/submissions" \
  --data-urlencode "utf8=✓" \
  --data-urlencode "authenticity_token=$TOKEN" \
  -o create_result.html -w "HTTP %{http_code} => %{redirect_url}\n"

python3 -c "
import re
c = open('create_result.html').read()
print('size:', len(c))
print('title:', re.findall(r'<title>([^<]*)', c)[:1])
print('recaptcha mention:', 'recaptcha' in c.lower())
"
