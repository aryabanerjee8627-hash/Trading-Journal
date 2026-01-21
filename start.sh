#!/bin/bash

# Exit immediately if a command fails
set -e

echo "Running migrations..."
python manage.py migrate

echo "Starting Gunicorn..."
gunicorn trading_journal.wsgi:application --bind 0.0.0.0:$PORT --workers 1
