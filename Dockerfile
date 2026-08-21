FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV RENDER=true

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl wget gnupg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir playwright==1.49.1 \
    && playwright install chromium \
    && playwright install-deps chromium

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE $PORT

CMD ["sh", "-c", "cd api && python -m uvicorn main:app --host 0.0.0.0 --port $PORT"]
