import Link from "next/link";
import { MessageCircle, Clock } from "lucide-react";
import { listPosts, timeAgo } from "@/lib/community";
import { stripHtml } from "@/lib/rich-text";
import { getCurrentAppUser, getCurrentCapabilities } from "@/lib/current-user";
import { Card, CardContent } from "@/components/ui/card";
import { PinnedCard } from "@/components/pinned-card";
import { MemberAvatar } from "../directory/member-avatar";
import { NewPostForm } from "./new-post-form";
import { PostActions } from "./post-actions";
import { Reactions } from "./reactions";

export async function CommunityLoader() {
  const [posts, caps, user] = await Promise.all([
    listPosts(),
    getCurrentCapabilities(),
    getCurrentAppUser(),
  ]);

  const canWrite = caps.has("community.write");
  const canModerate = caps.has("community.moderate");
  const currentUserId = user?.id ?? "";
  const currentUserName = user ? `${user.first_name} ${user.last_name}` : "";
  const currentUserAvatar = user?.avatar_url ?? null;

  const pinnedPosts = posts.filter((p) => p.pinned);
  const otherPosts = posts.filter((p) => !p.pinned);

  return (
    <>
      {canWrite && <NewPostForm />}
      {!canWrite && (
        <div>
          <h1 className="text-xl font-semibold">Message Board</h1>
          <p className="text-muted-foreground text-sm">
            Announcements and discussions
          </p>
        </div>
      )}

      {posts.length === 0 && (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            No posts yet. Be the first to start a conversation.
          </CardContent>
        </Card>
      )}

      {pinnedPosts.length > 0 && (
        <div className="space-y-4">
          {pinnedPosts.map((post) => (
            <PinnedCard
              key={post.id}
              variant="listing"
              title={post.title}
              body={post.body}
              author={{
                name: post.author_name,
                avatarUrl: post.author_avatar,
              }}
              postedAt={post.created_at}
              replyCount={post.comment_count}
              href={`/community/${post.id}`}
              actions={
                <PostActions
                  postId={post.id}
                  title={post.title}
                  body={post.body}
                  pinned={post.pinned}
                  isOwner={post.author_id === currentUserId}
                  canModerate={canModerate}
                />
              }
              footer={
                canWrite ? (
                  <Reactions
                    target="post"
                    targetId={post.id}
                    postId={post.id}
                    currentUserId={currentUserId}
                    currentUserName={currentUserName}
                    currentUserAvatar={currentUserAvatar}
                    reactions={post.reactions}
                  />
                ) : null
              }
            />
          ))}
        </div>
      )}

      {otherPosts.length > 0 && (
        <div className="space-y-4">
          {otherPosts.map((post) => (
            <Card key={post.id} className="hover:border-border/80">
              <CardContent className="p-4 py-0">
                <div className="flex items-start gap-3">
                  {/* Link wraps only the title/body/meta so the reaction
                      chips below don't navigate when clicked. */}
                  <Link
                    href={`/community/${post.id}`}
                    className="min-w-0 flex-1 outline-none"
                  >
                    <h2 className="text-sm font-semibold">{post.title}</h2>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                      {stripHtml(post.body)}
                    </p>
                    <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5">
                        <MemberAvatar
                          member={{
                            first_name: post.author_name.split(" ")[0] ?? "",
                            last_name: post.author_name
                              .split(" ")
                              .slice(1)
                              .join(" "),
                            avatar_url: post.author_avatar,
                          }}
                          size="sm"
                        />
                        {post.author_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock aria-hidden="true" className="size-3" />
                        {timeAgo(post.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle aria-hidden="true" className="size-3" />
                        {post.comment_count}
                      </span>
                    </div>
                  </Link>
                  <PostActions
                    postId={post.id}
                    title={post.title}
                    body={post.body}
                    pinned={post.pinned}
                    isOwner={post.author_id === currentUserId}
                    canModerate={canModerate}
                  />
                </div>
                {canWrite && (
                  <div className="mt-3">
                    <Reactions
                      target="post"
                      targetId={post.id}
                      postId={post.id}
                      currentUserId={currentUserId}
                      currentUserName={currentUserName}
                      currentUserAvatar={currentUserAvatar}
                      reactions={post.reactions}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
