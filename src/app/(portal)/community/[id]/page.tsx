import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pin, Clock } from "lucide-react";
import { getPost, listComments, timeAgo } from "@/lib/community";
import { getCurrentAppUser, getCurrentCapabilities } from "@/lib/current-user";
import { Card, CardContent } from "@/components/ui/card";
import { MemberAvatar } from "../../directory/member-avatar";
import { CommentForm } from "./comment-form";
import { CommentActions } from "./comment-actions";
import { PostActions } from "../post-actions";
import { PostAttachments, CommentAttachments } from "./attachments";
import { Reactions } from "../reactions";
import { RichTextContent } from "@/components/rich-text-content";
import clsx from "clsx";

type Params = Promise<{ id: string }>;

export default async function PostPage({ params }: { params: Params }) {
  const { id } = await params;

  const [post, comments, caps, user] = await Promise.all([
    getPost(id),
    listComments(id),
    getCurrentCapabilities(),
    getCurrentAppUser(),
  ]);

  if (!post) notFound();

  const canWrite = caps.has("community.write");
  const canModerate = caps.has("community.moderate");
  const currentUserId = user?.id ?? "";
  const currentUserName = user ? `${user.first_name} ${user.last_name}` : "";
  const currentUserAvatar = user?.avatar_url ?? null;

  return (
    <div className="space-y-6">
      <Link
        href="/community"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to Message Board
      </Link>

      {/* Post — body before metadata */}
      <Card
        className={clsx("py-0!", {
          "border-l-[3px] border-l-amber-500": post.pinned,
        })}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              {post.pinned && <Pin className="mt-1 size-4 text-amber-500" />}
              <h1 className="text-lg font-semibold">{post.title}</h1>
            </div>
            <PostActions
              postId={post.id}
              title={post.title}
              body={post.body}
              pinned={post.pinned}
              isOwner={post.author_id === currentUserId}
              canModerate={canModerate}
            />
          </div>
          <RichTextContent html={post.body} className="mt-4" />
          {post.attachments.length > 0 && (
            <PostAttachments attachments={post.attachments} />
          )}
          {canWrite && (
            <div className="mt-4">
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
          <div className="border-border text-muted-foreground mt-4 flex items-center gap-3 border-t pt-4 text-xs">
            <span className="flex items-center gap-1.5">
              <MemberAvatar
                member={{
                  first_name: post.author_name.split(" ")[0] ?? "",
                  last_name: post.author_name.split(" ").slice(1).join(" "),
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
          </div>
        </CardContent>
      </Card>

      {/* Comments — flat list with dividers, not individual cards */}
      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-medium">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </h2>

        {comments.length > 0 && (
          <div className="divide-border divide-y">
            {comments.map((comment) => (
              <div key={comment.id} className="py-4 first:pt-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <MemberAvatar
                      member={{
                        first_name: comment.author_name.split(" ")[0] ?? "",
                        last_name: comment.author_name
                          .split(" ")
                          .slice(1)
                          .join(" "),
                        avatar_url: comment.author_avatar,
                      }}
                      size="sm"
                    />
                    <span className="font-medium">{comment.author_name}</span>
                    <span className="text-muted-foreground">
                      {timeAgo(comment.created_at)}
                    </span>
                  </div>
                  {(canModerate || comment.author_id === currentUserId) && (
                    <CommentActions
                      commentId={comment.id}
                      postId={post.id}
                      body={comment.body}
                      isOwner={comment.author_id === currentUserId}
                      canModerate={canModerate}
                    />
                  )}
                </div>
                <RichTextContent html={comment.body} className="mt-1.5 pl-8" />
                {comment.attachments.length > 0 && (
                  <div className="pl-8">
                    <CommentAttachments attachments={comment.attachments} />
                  </div>
                )}
                {canWrite && (
                  <div className="mt-2 pl-8">
                    <Reactions
                      target="comment"
                      targetId={comment.id}
                      postId={post.id}
                      currentUserId={currentUserId}
                      currentUserName={currentUserName}
                      currentUserAvatar={currentUserAvatar}
                      reactions={comment.reactions}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Comment input — button below textarea, right-aligned */}
        {canWrite && (
          <div className="mt-4">
            <CommentForm postId={post.id} />
          </div>
        )}
      </div>
    </div>
  );
}
