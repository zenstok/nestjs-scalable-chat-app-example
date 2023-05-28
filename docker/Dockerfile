FROM node:18.13.0-alpine AS development

WORKDIR /usr/src/app
COPY package.json ./
COPY yarn.lock ./

RUN yarn install --frozen-lockfile \
&& yarn cache clean

COPY . .

RUN yarn build

CMD yarn install; yarn start:debug;