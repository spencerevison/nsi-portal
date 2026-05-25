import Link from "next/link";
import { Upload } from "lucide-react";
import { getCurrentAppUser } from "@/lib/current-user";
import { Card, CardContent } from "@/components/ui/card";
import { PinnedCard } from "@/components/pinned-card";
import { MemberAvatar } from "./directory/member-avatar";
import {
  ProfileVerificationCard,
  type VerificationProfile,
} from "./profile-verification-card";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { listFolders } from "@/lib/documents";
import { getProfileData } from "@/lib/directory";
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

export default async function HomePage() {
  const user = await getCurrentAppUser();

  // newest pinned post — drives the "From the message board" preview card
  const { data: pinnedRows } = await supabaseAdmin
    .from("post")
    .select(
      `id, title, body, created_at,
       author:author_id ( first_name, last_name, avatar_url ),
       comment(count)`,
    )
    .eq("pinned", true)
    .order("created_at", { ascending: false })
    .limit(1);

  const pinnedPost = pinnedRows?.[0] ?? null;

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

  // verification card shows whenever the user hasn't confirmed their info.
  // the page heading does the welcoming; onboarded_at is still tracked so we
  // can stop greeting returning members, but the card itself stays focused on
  // the verification ask.
  const needsVerification = !!user && !user.profile_confirmed_at;

  let verificationProfile: VerificationProfile | null = null;
  if (needsVerification && user) {
    const profile = await getProfileData(user.id);
    if (profile) {
      verificationProfile = {
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone,
        lot_number: profile.lot_number,
        address: profile.address,
        custom_fields: profile.custom_fields.map((f) => ({
          field_name: f.field_name,
          value: f.value,
        })),
      };
    }
  }

  // shape pinned post for <PinnedCard>
  const pinnedAuthor = pinnedPost?.author as unknown as {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
  const pinnedCommentArr = pinnedPost?.comment as unknown as
    | { count: number }[]
    | undefined;
  const pinnedReplyCount = pinnedCommentArr?.[0]?.count ?? 0;

  const hasPinned = !!pinnedPost;
  const hasActivity = activityFeed.length > 0;

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

      {needsVerification && verificationProfile && (
        <ProfileVerificationCard profile={verificationProfile} />
      )}

      <div
        className={
          hasPinned ? "grid gap-5 md:grid-cols-[1.4fr_1fr]" : "grid gap-5"
        }
      >
        {hasPinned && pinnedPost && (
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-accent-900 text-lg font-semibold tracking-[-0.005em]">
                From the message board
              </h2>
              <Link
                href="/community"
                className="text-accent-600 text-xs font-medium hover:underline"
              >
                All posts →
              </Link>
            </div>
            <PinnedCard
              variant="preview"
              title={pinnedPost.title}
              body={pinnedPost.body}
              author={{
                name: pinnedAuthor
                  ? `${pinnedAuthor.first_name} ${pinnedAuthor.last_name}`
                  : "Unknown",
                avatarUrl: pinnedAuthor?.avatar_url ?? null,
              }}
              postedAt={pinnedPost.created_at}
              replyCount={pinnedReplyCount}
              href={`/community/${pinnedPost.id}`}
            />
          </section>
        )}

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-accent-900 text-lg font-semibold tracking-[-0.005em]">
              Recent activity
            </h2>
          </div>
          <Card>
            <CardContent className="divide-border divide-y p-0">
              {!hasActivity ? (
                <p className="text-muted-foreground px-4 py-6 text-center text-sm">
                  No recent activity yet.
                </p>
              ) : (
                activityFeed.map((item) =>
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
                      <div className="bg-cream-200 text-accent-600 flex size-7 items-center justify-center rounded-md">
                        <Upload aria-hidden="true" className="size-3.5" />
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
                )
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
