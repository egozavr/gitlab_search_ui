FROM nginx:stable-alpine
COPY --chown=nginx ./dist/gitlab_search_ui/browser/ /www/data
COPY nginx.conf /etc/nginx/nginx.conf
