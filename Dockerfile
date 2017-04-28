FROM ubuntu:16.10

RUN apt-get update && \
  apt-get install -y curl && \
  curl -sL https://deb.nodesource.com/setup_7.x | bash - && \
  apt-get update && \
  apt-get install -y \
    nodejs git make g++ \
    libgif-dev libjpeg-dev libpng-dev libwebp-dev \
    libboost-all-dev libcairo2-dev libpango1.0-dev libmapnik-dev && \
  apt-get clean

COPY . /app
WORKDIR /app
RUN npm install

VOLUME /conf
USER daemon
ENTRYPOINT node ./index.js /conf/config.json 3000

EXPOSE 3000
