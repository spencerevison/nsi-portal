-- optional labels + a second number; existing phone stays the primary
alter table app_user
  add column if not exists phone_label text,
  add column if not exists phone2 text,
  add column if not exists phone2_label text;
