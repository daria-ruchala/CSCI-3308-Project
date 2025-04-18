#!/bin/bash

# DO NOT PUSH THIS FILE TO GITHUB
# This file contains sensitive information and should be kept private

# TODO: Set your PostgreSQL URI - Use the External Database URL from the Render dashboard
PG_URI="postgresql://group8:kOeAdRjJQeuj0LvaS86hgNWN6sMCynKw@dpg-d00oq2buibrs73en6utg-a.oregon-postgres.render.com/users_db_ybrh"

# Execute each .sql file in the directory
for file in init_data/*.sql; do
    echo "Executing $file..."
    psql $PG_URI -f "$file"
done