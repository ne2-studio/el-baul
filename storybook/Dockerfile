# Builds the static Storybook site for app/'s component library and serves it with
# a minimal nginx image - same build/serve split as app/Dockerfile. Needs the whole
# app/ tree (not just this directory) to build, so unlike the other services here
# the build context is the repo root; see docker-compose.yaml and the CI workflow.
FROM node:22-alpine AS build
WORKDIR /src

COPY app/package.json app/package-lock.json ./
RUN npm ci

COPY app/. .

RUN npm run build-storybook

FROM nginx:alpine

COPY app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/storybook-static/ /usr/share/nginx/html/

EXPOSE 80
