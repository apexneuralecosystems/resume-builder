#!/usr/bin/env sh
set -eu

# Default to your production backend if not provided by the platform.
: "${BACKEND_BASE_URL:=https://resume.builderbackend.apexneural.cloud}"

# Render nginx config from template
envsubst '$BACKEND_BASE_URL' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'

