FROM node:20-alpine

WORKDIR /app/grader/ts

# Copy only grader first for better caching
COPY grader/ts/package.json grader/ts/package-lock.json* ./
RUN npm ci || npm install

COPY grader/ts ./
# problems are needed for tests
COPY problems ../../problems

RUN npm run check

CMD ["npm","test"]
