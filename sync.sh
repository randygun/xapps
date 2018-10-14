#!/bin/sh
rm -rf database/appku_xapps.sql;
pg_dump -d appku_xapps > database/appku_xapps.sql;
git add --all;
git commit -am "$*";
git push origin master;
