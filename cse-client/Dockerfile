# ==============================================================================
# Ultra-Minimal Nginx Alpine-Slim Runtime
# Serves the compiled production React SPA bundle with gzip & client-side routing
# ==============================================================================
FROM nginx:alpine-slim AS runner

RUN rm -rf /usr/share/nginx/html/*
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
