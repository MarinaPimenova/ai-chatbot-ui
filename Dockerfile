FROM nginx:latest

# Copy the custom nginx.conf file to the container /etc/nginx/conf.d/default.conf
COPY  .nginx/nginx.conf /etc/nginx/nginx.conf
COPY  .nginx/default.conf /etc/nginx/conf.d/default.conf
#COPY  .nginx/nginx.local.conf /etc/nginx/nginx.conf

RUN mkdir -p /usr/share/nginx/html/ai-chatbot-ui
# Copy the built React app from the build stage to the nginx container
COPY dist /usr/share/nginx/html/ai-chatbot-ui

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
