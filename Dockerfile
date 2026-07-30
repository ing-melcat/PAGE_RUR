# ETAPA 1: Construcción de React (Vite)
FROM node:20-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ETAPA 2: Configuración del Servidor PHP-Apache
FROM php:8.2-apache AS production-stage

# Instalar dependencias del sistema y extensiones de PHP necesarias (PostgreSQL, zip para Composer)
RUN apt-get update && apt-get install -y \
    libpq-dev \
    git \
    unzip \
    && docker-php-ext-install pdo pdo_pgsql opcache \
    && rm -rf /var/lib/apt/lists/*

# Configurar OPcache para máxima optimización en producción
RUN { \
        echo 'opcache.memory_consumption=128'; \
        echo 'opcache.interned_strings_buffer=8'; \
        echo 'opcache.max_accelerated_files=4000'; \
        echo 'opcache.revalidate_freq=60'; \
        echo 'opcache.fast_shutdown=1'; \
        echo 'opcache.enable_cli=1'; \
    } > /usr/local/etc/php/conf.d/opcache-recommended.ini

# Habilitar mod_rewrite para React Router y headers de seguridad
RUN a2enmod rewrite headers

# Instalar Composer globalmente
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Configurar el DocumentRoot de Apache
ENV APACHE_DOCUMENT_ROOT /var/www/html
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Copiar el Frontend compilado desde la etapa 1
COPY --from=build-stage /app/dist /var/www/html/

# Copiar el Backend (API) a su propia carpeta
COPY api /var/www/html/api/

# Crear la carpeta de uploads y copiar contenido si existe
COPY uploads /var/www/html/api/uploads/
RUN chown -R www-data:www-data /var/www/html/api/uploads \
    && chmod -R 775 /var/www/html/api/uploads

# Instalar dependencias de PHP (LiveKit SDK) con Composer
WORKDIR /var/www/html/api
RUN composer install --no-dev --optimize-autoloader

# Ajustar permisos para que Apache pueda servir los archivos
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Exponer puerto 80
EXPOSE 80
CMD ["apache2-foreground"]
