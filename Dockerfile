FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node package.json game.mjs server.mjs ./
COPY --chown=node:node public ./public
RUN mkdir /app/data && chown node:node /app/data
USER node
ENV BIND_ADDRESS=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node","server.mjs"]
