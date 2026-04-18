-- Tighten the attachments bucket hard cap from 25 MB down to 15 MB.
-- Client + server code enforce the same limit; this is the last-line
-- defense if either is bypassed.

update storage.buckets
  set file_size_limit = 15728640 -- 15 MB
  where id = 'attachments';
