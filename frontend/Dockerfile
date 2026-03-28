FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_AUTH_SERVICE_URL=http://localhost:8081/api/v1/auth
ARG VITE_VENUE_VENDOR_SERVICE_URL=http://localhost:3001/api/v1
ARG VITE_EVENT_SERVICE_URL=http://localhost:3002/api/v1
ARG VITE_BOOKING_SERVICE_URL=http://localhost:8082/api/v1

ENV VITE_AUTH_SERVICE_URL=$VITE_AUTH_SERVICE_URL
ENV VITE_VENUE_VENDOR_SERVICE_URL=$VITE_VENUE_VENDOR_SERVICE_URL
ENV VITE_EVENT_SERVICE_URL=$VITE_EVENT_SERVICE_URL
ENV VITE_BOOKING_SERVICE_URL=$VITE_BOOKING_SERVICE_URL

RUN npm run build

FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist ./

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
