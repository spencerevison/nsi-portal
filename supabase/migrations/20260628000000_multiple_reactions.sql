-- Back to one row per (target, user, emoji) so people can add several
-- different emoji to the same post/comment. Existing rows already fit.

alter table public.post_reaction
  drop constraint post_reaction_pkey,
  add constraint post_reaction_pkey primary key (post_id, user_id, emoji);

alter table public.comment_reaction
  drop constraint comment_reaction_pkey,
  add constraint comment_reaction_pkey primary key (comment_id, user_id, emoji);
