ARG BASE_IMAGE=node:20-alpine
FROM ${BASE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM ${BASE_IMAGE}
WORKDIR /app
RUN sed -i 's|https://dl-cdn.alpinelinux.org|https://mirrors.tuna.tsinghua.edu.cn|g' /etc/apk/repositories && apk add --no-cache openssh-client
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 5000
CMD ["node", "dist/index.js"]
