# Etapa de build
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build --configuration=production

# Etapa de producción
FROM nginx:alpine
COPY --from=build /app/dist/avicola-frontend/ /usr/share/nginx/html/
COPY nginx-simple.conf /etc/nginx/conf.d/default.conf
EXPOSE 80