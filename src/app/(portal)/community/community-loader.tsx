import Link from "next/link";
import { Pin, MessageCircle, Clock } from "lucide-react";
import { listPosts, timeAgo } from "@/lib/community";
import { getCurrentCapabilities } from "@/lib/current-user";
import { Card, CardContent } from "@/components/ui/card";
import { MemberAvatar } from "../directory/member-avatar";
import { NewPostForm } from "./new-post-form";
import { PostActions } from "./post-actions";

export async function CommunityLoader() {
  const [posts, caps] = await Promise.all([
    listPosts(),
    getCurrentCapabilities(),
  ]);

  const canWrite = caps.has("community.write");
  const canModerate = caps.has("community.moderate");

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

      <div className="space-y-4">
        {posts.map((post) => (
          <Link key={post.id} href={`/community/${post.id}`} className="block">
            <Card
              className={
                post.pinned
                  ? "border-amber-200 bg-amber-50/30"
                  : "hover:border-border/80"
              }
            >
              <CardContent className="p-4 py-0">
                <div className="flex items-start gap-3">
                  {post.pinned && (
                    <Pin className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold">{post.title}</h2>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                      {post.body}
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
                        <Clock className="size-3" />
                        {timeAgo(post.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="size-3" />
                        {post.comment_count}
                      </span>
                    </div>
                  </div>
                  {canModerate && (
                    <PostActions postId={post.id} pinned={post.pinned} />
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
