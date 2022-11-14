FROM node:14-alpine
ENV NODE_ENV=production

WORKDIR /app
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install --production
COPY --chown=node:node . .
CMD [ "node", "index.js", "steal", "-f", "steal.json" ]

