#!/usr/bin/env bash
set -euo pipefail
release=${1:?commit SHA required}
[[ "$release" =~ ^[0-9a-f]{40}$ ]] || exit 2
app_root=/srv/worksquad/projects/cvwide
release_dir="$app_root/releases/$release"
exec 9>"$app_root/deploy.lock"
flock 9
mkdir -p "$release_dir"
tar -xzf "/tmp/cvwide-$release.tar.gz" -C "$release_dir"
rm -f "/tmp/cvwide-$release.tar.gz"
test -r "$app_root/secrets/app.env"
test -s "$app_root/data/state.json"
test -s "$app_root/seed.json"
mkdir -p "$release_dir/runtime-assets"
cp -a "$app_root/private-assets/." "$release_dir/runtime-assets/"
cp -a "$release_dir/public/assets/." "$release_dir/runtime-assets/"
previous=''
if [ -L "$app_root/current" ] && [ -f "$app_root/current/docker-compose.prod.yml" ]; then
 previous=$(readlink -f "$app_root/current")
fi
previous_fragment=$(readlink /etc/nginx/cvwide-maratik.conf || true)
compose(){ CVWIDE_RELEASE=$(basename "$1") docker compose -f "$1/docker-compose.prod.yml" -p cvwide "${@:2}"; }
rollback(){
 if [ -n "$previous" ] && [ -f "$previous/docker-compose.prod.yml" ]; then
  ln -sTfn "$previous" "$app_root/current"
  if ! compose "$previous" up -d --no-build; then
   echo 'Previous service could not restart; restoring routing as far as possible' >&2
  fi
 else
  compose "$release_dir" down || true
  rm -f "$app_root/current"
 fi
 if [ -n "$previous_fragment" ]; then
  ln -sfn "$previous_fragment" /etc/nginx/cvwide-maratik.conf
 else
  rm -f /etc/nginx/cvwide-maratik.conf
  touch /etc/nginx/cvwide-maratik.conf
 fi
 nginx -t && systemctl reload nginx
}
compose "$release_dir" build
trap 'trap - ERR; rollback; exit 1' ERR
compose "$release_dir" up -d --remove-orphans
ready=false
for attempt in $(seq 1 30); do
 if curl -fsS http://127.0.0.1:4312/healthz >/dev/null; then ready=true; break; fi
 sleep 2
done
[ "$ready" = true ]
ln -sTfn "$release_dir" "$app_root/current"
ln -sfn "$app_root/current/nginx.conf" /etc/nginx/cvwide-maratik.conf
nginx -t
systemctl reload nginx
public_ready=false
for attempt in $(seq 1 15); do
 if curl -fsS https://maratik.fun/cvwide/ | grep -q password-slots; then
  if [ "$(curl -sS -o /dev/null -w '%{http_code}' https://maratik.fun/cvwide/api/state)" = 401 ]; then public_ready=true; break; fi
 fi
 sleep 1
done
[ "$public_ready" = true ]
printf 'Activated cvwide %s\n' "$release"
trap - ERR
