#!/bin/bash

# Show each command as it runs (for debugging)
set -x

# Run migrations, fail loudly if error
python manage.py migrate || { echo "Migrations failed"; exit 1; }

# Start Gunicorn
gunicorn trading_journal.wsgi:application || { echo "Gunicorn failed"; exit 1; }
