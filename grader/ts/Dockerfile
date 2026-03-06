FROM node:20-alpine

WORKDIR /app/grader/ts

# Copy only grader first for better caching
COPY grader/ts/package.json grader/ts/package-lock.json* ./
RUN npm ci || npm install

COPY grader/ts ./
# problems are needed for tests
COPY problems ../../problems
# submissions are needed for smoke grading
COPY submissions ../../submissions

RUN npm run check

# Smoke grade the sample submission (includes timeout/log plumbing)
RUN npm run grade -- --problem sum-two --submission submissions/ts/sum-two/submission.ts --timeout-ms 2000

CMD ["npm","test"]
