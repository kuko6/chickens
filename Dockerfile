FROM denoland/deno:2.8.0

WORKDIR /app

COPY deno.json deno.lock* ./
RUN deno ci

COPY . .
RUN deno task build

EXPOSE 3000

CMD ["deno", "task", "prod"]
