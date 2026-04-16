import Link from "next/link";
import {
  FileText,
  Users,
  MessageSquare,
  Mail,
  Pin,
  Clock,
  MessageCircle,
  Upload,
} from "lucide-react";
import { getCurrentAppUser, getCurrentCapabilities } from "@/lib/current-user";
import { Card, CardContent } from "@/components/ui/card";
import { MemberAvatar } from "./directory/member-avatar";
import { WelcomeBanner } from "./welcome-banner";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { listFolders } from "@/lib/documents";
import { timeAgo } from "@/lib/utils";

type ActivityItem =
  | {
      kind: "post";
      id: string;
      title: string;
      timestamp: string;
      author: {
        first_name: string;
        last_name: string;
        avatar_url: string | null;
      } | null;
    }
  | {
      kind: "upload";
      id: string;
      timestamp: string;
      uploaderName: string;
      documentName: string;
      count: number;
      folderName: string;
      folderHref: string;
    };

const BATCH_WINDOW_MS = 60_000;

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
    label: "Message Board",
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

  // recent document uploads for the activity feed
  const [{ data: recentDocs }, allFolders] = await Promise.all([
    supabaseAdmin
      .from("document")
      .select(
        `id, display_name, uploaded_at, uploaded_by, folder_id,
         uploader:uploaded_by ( first_name, last_name ),
         folder:folder_id ( name, slug, parent_id )`,
      )
      .order("uploaded_at", { ascending: false })
      .limit(10),
    listFolders(),
  ]);

  // build folder slug map for resolving subfolder URLs
  const folderMap = new Map(allFolders.map((f) => [f.id, f]));

  function folderHref(folder: { slug: string; parent_id: string | null }) {
    if (folder.parent_id) {
      const parent = folderMap.get(folder.parent_id);
      if (parent) return `/documents/${parent.slug}/${folder.slug}`;
    }
    return `/documents/${folder.slug}`;
  }

  // collapse batch uploads (same user + folder within 60s)
  type DocRow = NonNullable<typeof recentDocs>[number];
  type DocGroup = {
    docs: DocRow[];
    uploaderName: string;
    folderName: string;
    folderHref: string;
  };

  const docGroups: DocGroup[] = [];
  for (const doc of recentDocs ?? []) {
    const uploader = doc.uploader as unknown as {
      first_name: string;
      last_name: string;
    } | null;
    const folder = doc.folder as unknown as {
      name: string;
      slug: string;
      parent_id: string | null;
    };
    const prev = docGroups[docGroups.length - 1];
    const prevDoc = prev?.docs[prev.docs.length - 1];
    const timeDiff = prevDoc
      ? Math.abs(
          new Date(prevDoc.uploaded_at).getTime() -
            new Date(doc.uploaded_at).getTime(),
        )
      : Infinity;

    if (
      prev &&
      prevDoc?.uploaded_by === doc.uploaded_by &&
      prevDoc?.folder_id === doc.folder_id &&
      timeDiff <= BATCH_WINDOW_MS
    ) {
      prev.docs.push(doc);
    } else {
      docGroups.push({
        docs: [doc],
        uploaderName: uploader
          ? `${uploader.first_name} ${uploader.last_name}`
          : "Unknown",
        folderName: folder.name,
        folderHref: folderHref(folder),
      });
    }
  }

  // merge posts + doc uploads into a unified feed
  const postItems: ActivityItem[] = (recentPosts ?? []).map((post) => {
    const author = post.author as unknown as {
      first_name: string;
      last_name: string;
      avatar_url: string | null;
    } | null;
    return {
      kind: "post" as const,
      id: post.id,
      title: post.title,
      timestamp: post.created_at,
      author,
    };
  });

  const uploadItems: ActivityItem[] = docGroups.map((g) => ({
    kind: "upload" as const,
    id: g.docs[0].id,
    timestamp: g.docs[0].uploaded_at,
    uploaderName: g.uploaderName,
    documentName:
      g.docs.length === 1
        ? g.docs[0].display_name
        : `${g.docs.length} documents`,
    count: g.docs.length,
    folderName: g.folderName,
    folderHref: g.folderHref,
  }));

  const activityFeed = [...postItems, ...uploadItems]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 7);

  // check if this is a first-time user who hasn't dismissed the welcome
  const showWelcome = user && !user.onboarded_at;

  let profileIncomplete = false;
  if (showWelcome && user) {
    const { data: profile } = await supabaseAdmin
      .from("app_user")
      .select("phone, lot_number")
      .eq("id", user.id)
      .single();
    profileIncomplete = !profile?.phone && !profile?.lot_number;
  }

  const allQuickLinks = [
    ...quickLinks,
    ...(caps.has("email.send")
      ? [
          {
            href: "/email/compose",
            icon: Mail,
            label: "Send Email",
            desc: "Email the community",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-8">
      {showWelcome ? (
        <WelcomeBanner
          firstName={user.first_name}
          showProfilePrompt={profileIncomplete}
        />
      ) : (
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome{user ? `, ${user.first_name}` : ""}
          </h1>
          <p className="text-muted-foreground">
            North Secretary Island Community Portal
          </p>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {allQuickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:border-accent-200 hover:bg-accent-50/30 h-full transition-colors">
              <CardContent className="p-4">
                <link.icon
                  aria-hidden="true"
                  className="text-accent-600 mb-2 size-5"
                />
                <h3 className="text-sm font-medium">{link.label}</h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
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
          <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
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
                  <Card className="hover:border-border/80 border-l-3 border-l-amber-500 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <Pin
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0 text-amber-500"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold">
                            {post.title}
                          </h3>
                          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                            {post.body}
                          </p>
                          <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
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
                              <Clock aria-hidden="true" className="size-3" />
                              {timeAgo(post.created_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle
                                aria-hidden="true"
                                className="size-3"
                              />
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
      {activityFeed.length > 0 && (
        <div>
          <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
            Recent Activity
          </h2>
          <Card>
            <CardContent className="divide-border divide-y p-0">
              {activityFeed.map((item) =>
                item.kind === "post" ? (
                  <Link
                    key={`post-${item.id}`}
                    href={`/community/${item.id}`}
                    className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3 transition-colors"
                  >
                    {item.author && (
                      <MemberAvatar
                        member={{
                          first_name: item.author.first_name,
                          last_name: item.author.last_name,
                          avatar_url: item.author.avatar_url,
                        }}
                        size="sm"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium">
                        {item.title}
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        {item.author
                          ? `${item.author.first_name} ${item.author.last_name}`
                          : "Unknown"}
                      </p>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {timeAgo(item.timestamp)}
                    </span>
                  </Link>
                ) : (
                  <Link
                    key={`doc-${item.id}`}
                    href={item.folderHref}
                    className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3 transition-colors"
                  >
                    <div className="bg-muted flex size-7 items-center justify-center rounded-full">
                      <Upload
                        aria-hidden="true"
                        className="text-muted-foreground size-3.5"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium">
                        {item.documentName}
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          to {item.folderName}
                        </span>
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        {item.uploaderName}
                      </p>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {timeAgo(item.timestamp)}
                    </span>
                  </Link>
                ),
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
