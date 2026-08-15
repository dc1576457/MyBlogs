FROM node:20-bullseye-slim

# Install python and ffmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg python3 ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5000
CMD ["npm", "start"]
