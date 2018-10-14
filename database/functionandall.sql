
## When system broeadcast new settings / configuration applied in the system
DROP FUNCTION notify_system_changed() CASCADE;
CREATE FUNCTION notify_system_changed() RETURNS trigger AS $$
DECLARE
BEGIN
  PERFORM pg_notify('watch_system', '{"job":"setting_changed","id_setting":"' || NEW.id_setting ||'","value":"' || NEW.value ||'","time_create":"' || NEW.time_create || '"}' );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER watched_system_changed AFTER INSERT ON table_settings
FOR EACH ROW EXECUTE PROCEDURE notify_system_changed();

## When system wants to push message to android client
DROP FUNCTION notify_system_pushnotif() CASCADE;
CREATE FUNCTION notify_system_pushnotif() RETURNS trigger AS $$
DECLARE
  device_token    text;
BEGIN
  device_token = 'null';
  IF NEW.device_token IS NOT NULL THEN 
    device_token = '"'||NEW.device_token||'"';
  END IF;
  PERFORM pg_notify('watch_system', '{"job":"push_notification","device_token":' || device_token ||',"title":"' || NEW.title ||'","message":"' || NEW.message ||'","sender":"' || NEW.sender ||'","time_create":"' || NEW.time_create || '","sent":' || NEW.sent || '}' );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER watched_system_pushnotif AFTER INSERT ON table_notifications
FOR EACH ROW EXECUTE PROCEDURE notify_system_pushnotif();

## Create a sales order number automatically before entered in the database
DROP FUNCTION custom_generatednumber_so() CASCADE;
CREATE FUNCTION custom_generatednumber_so() RETURNS trigger AS $$
DECLARE
BEGIN
	NEW.generated_number = 'SO/'||NEW.id||'/'||to_char(NEW.time_create,'DD')||'/'||to_char(NEW.time_create,'MM')||'/'||to_char(NEW.time_create,'YYYY');
  	RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_generatednumber_so BEFORE INSERT ON table_trolley_confirm
FOR EACH ROW EXECUTE PROCEDURE custom_generatednumber_so();

## Create a topup order number automatically before entered in the database
DROP FUNCTION custom_generatednumber_topup() CASCADE;
CREATE FUNCTION custom_generatednumber_topup() RETURNS trigger AS $$
DECLARE
BEGIN
  NEW.generated_number = 'TOPUP/'||NEW.id||'/'||to_char(NEW.time_create,'DD')||'/'||to_char(NEW.time_create,'MM')||'/'||to_char(NEW.time_create,'YYYY');
    RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_generatednumber_topup BEFORE INSERT ON table_topup
FOR EACH ROW EXECUTE PROCEDURE custom_generatednumber_topup();

## Create a Veritrans order number automatically before entered in the database
-- DROP FUNCTION custom_generatednumber_order() CASCADE;
-- CREATE FUNCTION custom_generatednumber_order() RETURNS trigger AS $$
-- DECLARE
-- BEGIN
--   NEW.generated_number = 'SO/VT/'||NEW.id||'/'||to_char(NEW.time_create,'DD')||'/'||to_char(NEW.time_create,'MM')||'/'||to_char(NEW.time_create,'YYYY');
--     RETURN new;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER custom_generatednumber_order BEFORE INSERT ON table_order
-- FOR EACH ROW EXECUTE PROCEDURE custom_generatednumber_order();

## When system wants to push message to android client
DROP FUNCTION notification_push() CASCADE;
CREATE FUNCTION notification_push() RETURNS trigger AS $$
DECLARE
	sent    text;
BEGIN
	sent = replace(NEW.sent::text,'"','\"');
	PERFORM pg_notify('watch_system', '{"job":"push_notification","device_token":"' || NEW.device_token ||'","sent":"' || sent ||'","time_create":"' || NEW.time_create ||'"}' );
  	RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_push AFTER INSERT ON table_notification
FOR EACH ROW EXECUTE PROCEDURE notification_push();

## Logging access token when user renew token
DROP FUNCTION log_token_access() CASCADE;
CREATE FUNCTION log_token_access() RETURNS trigger AS $$
DECLARE
BEGIN
  INSERT INTO table_log_tokenaccess (id_user) VALUES (NEW.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_token_access
    AFTER UPDATE OF token_access ON table_user
    FOR EACH ROW
    WHEN (OLD.token_access IS DISTINCT FROM NEW.token_access)
    EXECUTE PROCEDURE log_token_access();

## Update product category in store owner when admin add / modify category
DROP FUNCTION update_product_category() CASCADE;
CREATE FUNCTION update_product_category() RETURNS trigger AS $$
DECLARE
BEGIN
  UPDATE table_product_category SET name=NEW.name, description=NEW.description WHERE id_template=NEW.id;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION insert_product_category() CASCADE;
CREATE FUNCTION insert_product_category() RETURNS trigger AS $$
DECLARE
BEGIN
  INSERT INTO table_product_category (name,description,id_template,id_store) SELECT NEW.name, NEW.description,NEW.id, id FROM table_store;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_category
    AFTER UPDATE ON template_product_category
    FOR EACH ROW
    EXECUTE PROCEDURE update_product_category();

CREATE TRIGGER insert_product_category AFTER INSERT ON template_product_category
FOR EACH ROW EXECUTE PROCEDURE insert_product_category();

## Ask value of concurrent user accessing system
DROP FUNCTION notify_system_concurrent_request() CASCADE;
CREATE FUNCTION notify_system_concurrent_request() RETURNS trigger AS $$
DECLARE
BEGIN
  PERFORM pg_notify('watch_system', '{"job":"ask_concurrent_count","id":' || NEW.id ||'}' );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER watched_system_concurrent_request AFTER INSERT ON table_concurrent_request
FOR EACH ROW EXECUTE PROCEDURE notify_system_concurrent_request();

## Return value of concurrent user accessing system
DROP FUNCTION notify_system_concurrent_reply() CASCADE;
CREATE FUNCTION notify_system_concurrent_reply() RETURNS trigger AS $$
DECLARE
BEGIN
  PERFORM pg_notify('watch_system', '{"job":"ask_concurrent_count_reply","core":' || NEW.core ||',"id_request":' || NEW.id_request ||',"concurrent_api":' || NEW.concurrent_api ||'}' );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER watched_system_concurrent_reply AFTER INSERT ON table_concurrent
FOR EACH ROW EXECUTE PROCEDURE notify_system_concurrent_reply();

## Sending mail notification when order is rejected
DROP FUNCTION notify_email_reject() CASCADE;
CREATE FUNCTION notify_email_reject() RETURNS trigger AS $$
DECLARE
BEGIN
  PERFORM pg_notify('watch_system', '{"job":"order_reject","id_order":"' || OLD.id ||'"}' );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_email_reject
    AFTER UPDATE OF reject_who ON table_trolley_confirm
    FOR EACH ROW
    EXECUTE PROCEDURE notify_email_reject();

## Sending mail notification when order is completed
DROP FUNCTION notify_email_complete();
CREATE FUNCTION notify_email_complete() RETURNS trigger AS $$
DECLARE
BEGIN
  PERFORM pg_notify('watch_system', '{"job":"order_complete","id_order":"' || OLD.id ||'"}' );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_email_complete
    AFTER UPDATE OF is_close ON table_trolley_paid
    FOR EACH ROW
    EXECUTE PROCEDURE notify_email_complete();

## Sending mail notification when order is paid
DROP FUNCTION notify_email_paid();
CREATE FUNCTION notify_email_paid() RETURNS trigger AS $$
DECLARE
BEGIN
  PERFORM pg_notify('watch_system', '{"job":"seller_paid","id_order":"' || OLD.id ||'"}' );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_email_paid
    AFTER UPDATE OF is_seller_paid ON table_trolley_paid
    FOR EACH ROW
    EXECUTE PROCEDURE notify_email_paid();

## Sending mail when new email queued
DROP FUNCTION notify_email_pool() CASCADE;
CREATE FUNCTION notify_email_pool() RETURNS trigger AS $$
DECLARE
BEGIN
  PERFORM pg_notify('watch_system', (row_to_json(NEW)::jsonb || jsonb_build_object('job','email_pool'))::text);
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_email_pool AFTER INSERT ON table_email
FOR EACH ROW EXECUTE PROCEDURE notify_email_pool();


INSERT INTO constant_setting (code,description) VALUES ('contact_center','Application contact center. User able to contact following details when have problem') RETURNING id;
INSERT INTO table_settings (id_setting,value) VALUES (23,'PT Tunjuk Material');



    