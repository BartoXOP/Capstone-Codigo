# Imagen base con Node y Expo CLI
FROM node:18

# Instala expo-cli globalmente
RUN npm install -g expo-cli

# Crea un directorio para tu app
WORKDIR /app

# Copia los archivos del proyecto
COPY package*.json ./

# Instala dependencias
RUN npm install

# Copia todo el código
COPY . .

# Expone el puerto de Expo (19000)
EXPOSE 19000

# Comando por defecto al iniciar el contenedor
CMD ["npx", "expo", "start", "--tunnel"]
