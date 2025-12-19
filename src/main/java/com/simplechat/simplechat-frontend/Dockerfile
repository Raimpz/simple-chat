# 1. Build Stage
FROM node:18-alpine as build
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build

# 2. Production Stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# If you created an nginx.conf inside this folder, uncomment the next line:
# COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]