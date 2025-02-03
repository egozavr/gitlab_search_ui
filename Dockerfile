FROM nginx:stable-alpine
COPY --chown=nginx ./dist/gitlab-search-ui/browser/ /www/data
COPY nginx.conf /etc/nginx/nginx.conf
