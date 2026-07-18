# syntax=docker/dockerfile:1
FROM nginx:1.27-alpine

COPY index.html /usr/share/nginx/html/index.html

# Default nginx config already serves /usr/share/nginx/html on port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
