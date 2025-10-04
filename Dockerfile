FROM node:18-bullseye

USER root
RUN apt-get update && \
    apt-get install -y ffmpeg webp git && \
    rm -rf /var/lib/apt/lists/*

USER node
