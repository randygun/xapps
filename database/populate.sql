/* POPULATE LOCATION: longitude,latitude 4326 */
SELECT NOW();
INSERT INTO table_location_gps (name,description,geom_location) SELECT 'Location '||series.no,'Description '||series.no,ST_GeographyFromText(series.lokasi) FROM (SELECT row_number() OVER() AS no, 'SRID=4326;POINT('||longitude.value||' '||latitude.value||')' AS lokasi FROM (SELECT 1 AS dummy, generate_series(0,145)*0.004463+106.643884 AS value) longitude LEFT JOIN (SELECT 0 AS dummy, generate_series(0,90)*-0.004266-6.086228 AS value) latitude ON longitude.dummy!=latitude.dummy) series;
/* POPULATE ADMIN */
SELECT NOW();
INSERT INTO table_user (username,password,id_role) SELECT CONCAT('admin',series.no),MD5(series.no::text),1 FROM (SELECT generate_series(1,10) AS no) series;
/* POPULATE EMPLOYEE */
SELECT NOW();
INSERT INTO table_user (username,password,id_role) SELECT CONCAT('employee',series.no), MD5(series.no::text),4 FROM (SELECT row_number() OVER() AS no FROM ((SELECT 0 AS dummy FROM table_user WHERE id_role=2) usr LEFT JOIN (SELECT generate_series(1,10) AS no) series ON series.no!=usr.dummy) raw ) series;
/* POPULATE REKENING*/
SELECT NOW();
INSERT INTO table_rekening (name_bank,name_owner,no_rekening) SELECT 'Bank '||series.no,'Owner '||series.no,'Rekening '||series.no FROM (SELECT generate_series(1,13286) AS no) series;
/* POPULATE SCHEDULE*/
SELECT NOW();
INSERT INTO table_schedule (time_open,time_close,sun,mon,tue,wed,thu,fri,sat) SELECT '00:00:00','23:59:59',TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE FROM (SELECT generate_series(1,13286) AS no) series;
/* POPULATE STORE*/
SELECT NOW();
INSERT INTO table_store (avatar,name,address,phone,id_location,id_schedule) SELECT 'http://appku.id:3009/images/tbgambar.jpg','Store Name '||location.id,'Store Address '||location.id,'Store Phone '||location.id,location.id,schedule.id FROM (SELECT row_number() OVER() AS no, id FROM table_location_gps) location LEFT JOIN table_schedule schedule ON schedule.id=location.id; 
/* POPULATE BUYER */
SELECT NOW();
INSERT INTO table_user (username,password,id_role,id_rekening) SELECT CONCAT('buyer',series.no),MD5(series.no::text),3,series.no FROM (SELECT generate_series(1,10) AS no) series;
/* POPULATE SELLER */
SELECT NOW();
INSERT INTO table_user (username,password,id_role,id_store,id_rekening) SELECT CONCAT('seller',series.no),MD5(series.no::text),2,store.id,series.no FROM (SELECT generate_series(1,13286) AS no) series LEFT JOIN table_store store ON store.id=series.no;
/* POPULATE NOTIFICATION */
SELECT NOW();
INSERT INTO table_notification (id_user,message) SELECT usr.id,'Message '||series.no FROM (SELECT 0 AS dummy,id FROM table_user) usr LEFT JOIN(SELECT generate_series(1,10) AS no) series ON series.no!=usr.dummy;
/* POPULATE ADS */
SELECT NOW();
INSERT INTO table_ads (ads) SELECT '[{"image":"http://appku.id:3009/images/1.jpg","text":"Dummy ADS","site":"http://detik.com"},{"image":"http://appku.id:3009/images/2.jpg","text":"Dummy ADS","site":"http://detik.com"},{"image":"http://appku.id:3009/images/3.jpg","text":"Dummy ADS","site":"http://detik.com"},{"image":"http://appku.id:3009/images/4.jpg","text":"Dummy ADS","site":"http://detik.com"},{"image":"http://appku.id:3009/images/5.jpg","text":"Dummy ADS","site":"http://detik.com"},{"image":"http://appku.id:3009/images/6.jpg","text":"Dummy ADS","site":"http://detik.com"}]' FROM (SELECT generate_series(1,1) AS no) series;
INSERT INTO table_ads (ads) SELECT '[{"image":"http://appku.id:3009/images/11.jpg","text":"Dummy ADS","site":"http://detik.com"},{"image":"http://appku.id:3009/images/12.jpg","text":"Dummy ADS","site":"http://detik.com"},{"image":"http://appku.id:3009/images/13.jpg","text":"Dummy ADS","site":"http://detik.com"}]' FROM (SELECT generate_series(1,1) AS no) series;
INSERT INTO table_ads (ads) SELECT '[{"image":"http://appku.id:3009/images/21.jpg","text":"Dummy ADS","site":"http://detik.com"},{"image":"http://appku.id:3009/images/22.jpg","text":"Dummy ADS","site":"http://detik.com"},{"image":"http://appku.id:3009/images/23.jpg","text":"Dummy ADS","site":"http://detik.com"},{"image":"http://appku.id:3009/images/24.jpg","text":"Dummy ADS","site":"http://detik.com"},{"image":"http://appku.id:3009/images/25.jpg","text":"Dummy ADS","site":"http://detik.com"}]' FROM (SELECT generate_series(1,1) AS no) series;
/* POPULATE CATEGORY */
SELECT NOW();
INSERT INTO table_product_category (name,description,id_store) SELECT 'Category Name '||store.id||series.no,'Category Description '||store.id||series.no,store.id FROM table_store store LEFT JOIN (SELECT 0::bigint AS dummy,generate_series(1,10) AS no) series ON series.dummy!=store.id;
/* POPULATE PRODUCT */
SELECT NOW();
INSERT INTO table_product (name,description,id_category,price,unit,avatar,packaging,dimension) SELECT 'Semen Holcim','Semen Holcim',category.id,series.no*category.id,'sak','http://appku.id:3009/images/semen1.png','1 sak','1m x 1m' FROM table_product_category category LEFT JOIN (SELECT 1::bigint AS dummy,generate_series(1,1) AS no) series ON series.dummy=((category.id%10)+1) WHERE series.no IS NOT NULL;
INSERT INTO table_product (name,description,id_category,price,unit,avatar,packaging,dimension) SELECT 'Semen Gresik','Semen Gresik',category.id,series.no*category.id,'sak','http://appku.id:3009/images/semen2.jpg','1 sak','1m x 1m' FROM table_product_category category LEFT JOIN (SELECT 2::bigint AS dummy,generate_series(1,1) AS no) series ON series.dummy=((category.id%10)+1) WHERE series.no IS NOT NULL;
INSERT INTO table_product (name,description,id_category,price,unit,avatar,packaging,dimension) SELECT 'Genteng Asoka','Genteng Asoka',category.id,series.no*category.id,'koli','http://appku.id:3009/images/genteng01.jpg','1 koli isi 100','20cm x 10cm' FROM table_product_category category LEFT JOIN (SELECT 3::bigint AS dummy,generate_series(1,1) AS no) series ON series.dummy=((category.id%10)+1) WHERE series.no IS NOT NULL;
INSERT INTO table_product (name,description,id_category,price,unit,avatar,packaging,dimension) SELECT 'Genteng Kanmuri','Genteng Kanmuri',category.id,series.no*category.id,'koli','http://appku.id:3009/images/genteng2.jpg','1 koli isi 100','20cm x 10cm' FROM table_product_category category LEFT JOIN (SELECT 4::bigint AS dummy,generate_series(1,1) AS no) series ON series.dummy=((category.id%10)+1) WHERE series.no IS NOT NULL;
INSERT INTO table_product (name,description,id_category,price,unit,avatar,packaging,dimension) SELECT 'Cat Nippon Paint','Cat Nippon Paint',category.id,series.no*category.id,'kaleng','http://appku.id:3009/images/cat1.png','1 kaleng isi 5 liter','25cm x 15cm' FROM table_product_category category LEFT JOIN (SELECT 5::bigint AS dummy,generate_series(1,1) AS no) series ON series.dummy=((category.id%10)+1) WHERE series.no IS NOT NULL;
INSERT INTO table_product (name,description,id_category,price,unit,avatar,packaging,dimension) SELECT 'Cat Catylac','Cat Catylac',category.id,series.no*category.id,'kaleng','http://appku.id:3009/images/cat2.png','1 kaleng isi 5 liter','25cm x 15cm' FROM table_product_category category LEFT JOIN (SELECT 6::bigint AS dummy,generate_series(1,1) AS no) series ON series.dummy=((category.id%10)+1) WHERE series.no IS NOT NULL;
INSERT INTO table_product (name,description,id_category,price,unit,avatar,packaging,dimension) SELECT 'Sink Elite','Sink Elite',category.id,series.no*category.id,'unit','http://appku.id:3009/images/sink1.jpg','1 unit','2m x 1m' FROM table_product_category category LEFT JOIN (SELECT 7::bigint AS dummy,generate_series(1,1) AS no) series ON series.dummy=((category.id%10)+1) WHERE series.no IS NOT NULL;
INSERT INTO table_product (name,description,id_category,price,unit,avatar,packaging,dimension) SELECT 'Sink American Standard','Sink American Standard',category.id,series.no*category.id,'unit','http://appku.id:3009/images/sink2.jpg','1 unit','2m x 1m' FROM table_product_category category LEFT JOIN (SELECT 8::bigint AS dummy,generate_series(1,1) AS no) series ON series.dummy=((category.id%10)+1) WHERE series.no IS NOT NULL;
INSERT INTO table_product (name,description,id_category,price,unit,avatar,packaging,dimension) SELECT 'Bata Merah','Bata Merah',category.id,series.no*category.id,'truk','http://appku.id:3009/images/bata1.jpg','1 truk isi 300','10cm x 5cm' FROM table_product_category category LEFT JOIN (SELECT 9::bigint AS dummy,generate_series(1,1) AS no) series ON series.dummy=((category.id%10)+1) WHERE series.no IS NOT NULL;
INSERT INTO table_product (name,description,id_category,price,unit,avatar,packaging,dimension) SELECT 'Bata Ringan','Bata Ringan',category.id,series.no*category.id,'truk','http://appku.id:3009/images/bata2.jpg','1 truk isi 300','10cm x 5cm' FROM table_product_category category LEFT JOIN (SELECT 10::bigint AS dummy,generate_series(1,1) AS no) series ON series.dummy=((category.id%10)+1) WHERE series.no IS NOT NULL;
/* POPULATE LOCATION HISTORY */
SELECT NOW();
INSERT INTO table_location_history (id_user,id_location) SELECT usr.id,location.id FROM (SELECT id%10 AS keypoint,* FROM table_user ) usr LEFT JOIN (SELECT id%10 AS keypoint,* FROM table_location_gps) location ON location.keypoint = usr.keypoint;
/* POPULATE RELATED */
SELECT NOW();
INSERT INTO table_product_related (id_main,id_related) SELECT main.id, related.id FROM (SELECT prod.id,store.id AS id_store from table_store store LEFT JOIN table_product_category cat ON cat.id_store=store.id LEFT JOIN table_product prod ON prod.id_category=cat.id) main LEFT JOIN (SELECT prod.id,store.id AS id_store from table_store store LEFT JOIN table_product_category cat ON cat.id_store=store.id LEFT JOIN table_product prod ON prod.id_category=cat.id) related ON main.id!=related.id AND main.id_store=related.id_store;
/* POPULATE TROLLEY */
SELECT NOW();
INSERT INTO table_trolley (id_user,id_product,qty) SELECT usr.id,product.id,10 FROM (SELECT * FROM table_user WHERE id_role=3) usr LEFT JOIN table_product_category category ON category.id_store=((usr.id%10)+1) LEFT JOIN table_product product ON product.id_category=category.id;

/* FINISH */
SELECT NOW();