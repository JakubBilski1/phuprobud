# Build statyczny: Astro generuje czysty HTML/CSS/JS, zdjecia sa juz zoptymalizowane
# w repozytorium (scripts/obrazy.mjs), wiec build nie przetwarza obrazow. Celowo lekki:
# serwer z Coolify dzieli pamiec z kilkudziesiecioma aplikacjami.
FROM node:24-alpine AS build
WORKDIR /app
ENV NODE_OPTIONS=--max-old-space-size=768 \
    ASTRO_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx/naglowki.conf /etc/nginx/snippets/naglowki.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Przekierowania ze starych adresow sa generowane przy buildzie; to konfiguracja, nie strona.
RUN mv /usr/share/nginx/html/przekierowania.conf /etc/nginx/snippets/przekierowania.conf && nginx -t
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
