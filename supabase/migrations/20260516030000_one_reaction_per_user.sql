-- One emoji per (target, user) — picking a new emoji replaces the prior
-- one instead of stacking. Mirrors how iMessage / Slack work.

-- First drop any duplicates that would block the new PK. Keep the most
-- recent row per (post, user) / (comment, user).
delete from public.post_reaction pr
using public.post_reaction newer
where pr.post_id = newer.post_id
  and pr.user_id = newer.user_id
  and pr.created_at < newer.created_at;

delete from public.comment_reaction cr
using public.comment_reaction newer
where cr.comment_id = newer.comment_id
  and cr.user_id = newer.user_id
  and cr.created_at < newer.created_at;

alter table public.post_reaction
  drop constraint post_reaction_pkey,
  add constraint post_reaction_pkey primary key (post_id, user_id);

alter table public.comment_reaction
  drop constraint comment_reaction_pkey,
  add constraint comment_reaction_pkey primary key (comment_id, user_id);
