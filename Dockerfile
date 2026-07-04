FROM busybox:stable

WORKDIR /www
COPY index.html favicon.svg ./
COPY assets ./assets

EXPOSE 80

# -f: foreground, -v: log to stderr, -p: port, -h: document root
CMD ["httpd", "-f", "-v", "-p", "80", "-h", "/www"]
