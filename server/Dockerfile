FROM node:20
WORKDIR /app
RUN mkdir -p data && chmod 777 data
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]