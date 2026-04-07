import Link from "next/link";
import {
  FileText,
  Users,
  MessageSquare,
  Mail,
  Pin,
  Clock,
  MessageCircle,
} from "lucide-react";
import { getCurrentAppUser, getCurrentCapabilities } from "@/lib/current-user";
import { Card, CardContent } from "@/components/ui/card";
import { MemberAvatar } from "./directory/member-avatar";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { timeAgo } from "@/lib/utils";

const quickLinks = [
  {
    href: "/documents",
    icon: FileText,
    label: "Documents",
    desc: "Browse community files",
  },
  {
    href: "/directory",
    icon: Users,
    label: "Directory",
    desc: "Find member contacts",
  },
  {
    href: "/community",
    icon: MessageSquare,
    label: "Community",
    desc: "Posts and discussions",
  },
];

export default async function HomePage() {
  const [user, caps] = await Promise.all([
    getCurrentAppUser(),
    getCurrentCapabilities(),
  ]);

  // fetch pinned posts + recent activity
  const { data: pinnedPosts } = await supabaseAdmin
    .from("post")
    .select(
      `id, title, body, created_at,
       author:author_id ( first_name, last_name, avatar_url ),
       comment(count)`,
    )
    .eq("pinned", true)
    .order("created_at", { ascending: false })
    .limit(3);

  const { data: recentPosts } = await supabaseAdmin
    .from("post")
    .select(
      `id, title, created_at,
       author:author_id ( first_name, last_name, avatar_url )`,
    )
    .eq("pinned", false)
    .order("created_at", { ascending: false })
    .limit(5);

  const allQuickLinks = [
    ...quickLinks,
    ...(caps.has("email.send")
      ? [{ href: "/email/compose", icon: Mail, label: "Send Email", desc: "Email the community" }]
      : []),
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome{user ? `, ${user.first_name}` : ""}
        </h1>
        <p className="text-muted-foreground">
          North Secretary Island Community Portal
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {allQuickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full transition-colors hover:border-accent-200 hover:bg-accent-50/30">
              <CardContent className="p-4">
                <link.icon className="mb-2 size-5 text-accent-600" />
                <h3 className="text-sm font-medium">{link.label}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {link.desc}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Announcements (pinned posts) */}
      {pinnedPosts && pinnedPosts.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Announcements
          </h2>
          <div className="space-y-2">
            {pinnedPosts.map((post) => {
              const author = post.author as unknown as {
                first_name: string;
                last_name: string;
                avatar_url: string | null;
              } | null;
              const countArr = post.comment as unknown as { count: number }[];
              return (
                <Link key={post.id} href={`/community/${post.id}`}>
                  <Card className="border-amber-200 bg-amber-50/30 transition-colors hover:bg-amber-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <Pin className="mt-0.5 size-4 shrink-0 text-amber-500" />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold">
                            {post.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {post.body}
                          </p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              {author && (
                                <MemberAvatar
                                  member={{
                                    first_name: author.first_name,
                                    last_name: author.last_name,
                                    avatar_url: author.avatar_url,
                                  }}
                                  size="sm"
                                />
                              )}
                              {author
                                ? `${author.first_name} ${author.last_name}`
                                : "Unknown"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {timeAgo(post.created_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="size-3" />
                              {countArr?.[0]?.count ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {recentPosts && recentPosts.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Recent Activity
          </h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {recentPosts.map((post) => {
                const author = post.author as unknown as {
                  first_name: string;
                  last_name: string;
                  avatar_url: string | null;
                } | null;
                return (
                  <Link
                    key={post.id}
                    href={`/community/${post.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    {author && (
                      <MemberAvatar
                        member={{
                          first_name: author.first_name,
                          last_name: author.last_name,
                          avatar_url: author.avatar_url,
                        }}
                        size="sm"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium">
                        {post.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {author
                          ? `${author.first_name} ${author.last_name}`
                          : "Unknown"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(post.created_at)}
                    </span>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
