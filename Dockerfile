FROM nginx
COPY --chown=nginx ./dist/gitlab-search-ui/ /www/data
COPY nginx.conf /etc/nginx/nginx.conf
