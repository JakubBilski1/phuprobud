# Astro w trybie serwerowym: strony sa renderowane ze zmianami z panelu /admin/ (Postgres),
# pliki statyczne podaje nginx. Zdjecia sa juz zoptymalizowane w repozytorium
# (scripts/obrazy.mjs), wiec build nie przetwarza obrazow. Celowo lekki: serwer z Coolify
# dzieli pamiec z kilkudziesiecioma aplikacjami.
FROM node:24-alpine AS build
WORKDIR /app
ENV NODE_OPTIONS=--max-old-space-size=768 \
    ASTRO_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.29-alpine
# Serwer jest zbudowany w jeden pakiet (vite.ssr.noExternal), wiec poza samym Node nie potrzebuje node_modules.
RUN apk add --no-cache libstdc++
COPY --from=build /usr/local/bin/node /usr/local/bin/node
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx/naglowki.conf /etc/nginx/snippets/naglowki.conf
COPY --from=build /app/dist /app/dist
COPY start.sh /app/start.sh
# Przekierowania ze starych adresow sa generowane przy buildzie; to konfiguracja, nie strona.
RUN mv /app/dist/client/przekierowania.conf /etc/nginx/snippets/przekierowania.conf \
    && chmod +x /app/start.sh && nginx -t && node --version
ENV NODE_ENV=production \
    NODE_OPTIONS=--max-old-space-size=192
EXPOSE 80
# Strona glowna przechodzi przez nginx i Node, wiec sprawdza oba.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
CMD ["/app/start.sh"]
