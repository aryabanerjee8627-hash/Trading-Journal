#!/bin/bash
python manage.py migrate
gunicorn trading_journal.wsgi:application
