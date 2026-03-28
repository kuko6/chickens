FROM denoland/deno:2.7.7

WORKDIR /app

COPY deno.json deno.lock* ./
RUN deno install

COPY . .
RUN deno task build

EXPOSE 3000

CMD ["deno", "task", "prod"]
