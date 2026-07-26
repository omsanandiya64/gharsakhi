CREATE INDEX idx_bookings_customer  ON bookings(customer_id, created_at DESC);
CREATE INDEX idx_bookings_worker    ON bookings(worker_id, created_at DESC);
CREATE INDEX idx_bookings_status    ON bookings(status);
CREATE INDEX idx_bookings_service   ON bookings(service_id);
CREATE INDEX idx_wtx_actor          ON wallet_transactions(actor, actor_id, created_at DESC);
CREATE INDEX idx_workers_online     ON workers(is_online) WHERE is_blocked = FALSE;
CREATE INDEX idx_worker_areas_area  ON worker_areas(area_id);
CREATE INDEX idx_reviews_worker     ON reviews(worker_id);
