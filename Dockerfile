FROM node:alpine
WORKDIR /app
COPY package.json .
COPY . .
RUN npm install
EXPOSE 80
CMD ["npm", "start"]
