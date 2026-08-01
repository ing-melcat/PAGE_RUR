FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias necesarias para compilar el SDK de LiveKit si hiciera falta
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Comando para iniciar el receptor
CMD ["python", "robot_receiver_prod.py"]
