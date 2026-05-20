-- Profile body & climbing-start fields
-- Reach can be negative if shorter than height (ape index < 0).
alter table profiles
  add column height_cm int check (height_cm is null or (height_cm between 80 and 250)),
  add column reach_cm int check (reach_cm is null or (reach_cm between 80 and 270)),
  add column climbing_start_date date check (climbing_start_date is null or climbing_start_date <= current_date);
