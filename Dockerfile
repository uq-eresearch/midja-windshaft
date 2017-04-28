FROM alpine:edge

RUN echo "@testing http://nl.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories && \
  apk update && \
  apk add -u \
    bash git make g++ nodejs-current-npm \
    giflib-dev libjpeg-turbo-dev libpng-dev libwebp-dev \
    boost-dev cairo-dev pango-dev \
    mapnik@testing mapnik-dev@testing && \
  rm -rf /var/cache/apk/*
RUN ln -s /usr/include/mapnik/mapnik/mapbox /usr/include/mapbox
RUN find /usr/include/mapnik/mapnik/agg -type f -exec ln -s {} /usr/include/ \;

COPY . /app
WORKDIR /app
RUN npm install

VOLUME /conf
USER daemon
ENTRYPOINT node ./index.js /conf/db.json 3000

EXPOSE 3000
