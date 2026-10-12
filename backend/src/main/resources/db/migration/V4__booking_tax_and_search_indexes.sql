ALTER TABLE bookings ADD COLUMN tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER total_amount;
CREATE INDEX idx_accommodations_city ON accommodations(city);
CREATE INDEX idx_accommodations_price ON accommodations(price_per_night);
CREATE INDEX idx_bookings_status_dates ON bookings(status, check_in, check_out);
