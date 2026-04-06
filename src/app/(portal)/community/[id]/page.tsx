import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pin, Clock } from "lucide-react";
import { getPost, listComments, timeAgo } from "@/lib/community";
import { getCurrentCapabilities } from "@/lib/current-user";
import { Card, CardContent } from "@/components/ui/card";
import { CommentForm } from "./comment-form";
import { CommentActions } from "./comment-actions";

type Params = Promise<{ id: string }>;

export default async function PostPage({ params }: { params: Params }) {
  const { id } = await params;

  const [post, comments, caps] = await Promise.all([
    getPost(id),
    listComments(id),
    getCurrentCapabilities(),
  ]);

  if (!post) notFound();

  const canWrite = caps.has("community.write");
  const canModerate = caps.has("community.moderate");

  return (
    <div className="space-y-4">
      <Link
        href="/community"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to Community
      </Link>

      {/* Post */}
      <Card className={post.pinned ? "border-amber-200 bg-amber-50/30" : ""}>
        <CardContent className="p-5">
          <div className="flex items-start gap-2">
            {post.pinned && <Pin className="mt-1 size-4 text-amber-500" />}
            <h1 className="text-lg font-semibold">{post.title}</h1>
          </div>
          <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
            <span>{post.author_name}</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {timeAgo(post.created_at)}
            </span>
          </div>
          <div className="mt-4 text-sm whitespace-pre-wrap">{post.body}</div>
        </CardContent>
      </Card>

      {/* Comments */}
      <div className="space-y-2">
        <h2 className="text-muted-foreground text-sm font-medium">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </h2>

        {comments.map((comment) => (
          <Card key={comment.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <span className="text-foreground font-medium">
                    {comment.author_name}
                  </span>
                  <span>{timeAgo(comment.created_at)}</span>
                </div>
                {canModerate && (
                  <CommentActions commentId={comment.id} postId={post.id} />
                )}
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{comment.body}</p>
            </CardContent>
          </Card>
        ))}

        {canWrite && <CommentForm postId={post.id} />}
      </div>
    </div>
  );
}
