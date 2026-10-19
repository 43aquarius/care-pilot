#!/bin/bash
# Devpost authenticated fetch helper
COOKIES='__mp_opt_in_out_1c828346e9fae00dbc3a117657f65895=1; _gid=GA1.2.1353509706.1792287674; CookieControl={"necessaryCookies":["__zlcmid","__mp_opt_in_out_*","platform.notifications.newsletter.dismissed","AWSALB","AWSALBCORS"],"optionalCookies":{"analytics":"accepted","marketing":"accepted","socialsharing":"accepted"},"initialState":{"type":"closed"},"statement":{},"consentDate":1792287673118,"consentExpiry":90,"interactedWith":true,"user":"2F17CC0E-18C8-4BB4-8672-844D6BDCD8BA"}; jwt=eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MTA3ODY4OTl9.2sxA6KuQTSGs-m1BggFUxtEs64iYMsoOG0y9_2Gbu0M; remember_user_token=W1sxMDc4Njg5OV0sIko4X05BeHpIV3RFMkxjYjhHdGI3IiwiMTc5MjI4Nzg0NC40MTg2MDIiXQ%3D%3D--325186fd8d04bb981ccbc6bbf93ccd6ba03eaf81; _gcl_au=1.1.1881358382.1792291569; _twpid=tw.1792291572077.947422221777933349'

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

curl -s -H "User-Agent: $UA" -H "Cookie: $COOKIES" -H "Accept: application/json" "$@"
