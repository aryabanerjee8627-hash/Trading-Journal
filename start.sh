#!/bin/bash

echo "Running migrations..."
python manage.py migrate || echo "⚠️ Migrations failed, continuing..."

echo "Starting Gunicorn..."
gunicorn trading_journal.wsgi:application --bind 0.0.0.0:$PORT --workers 1
