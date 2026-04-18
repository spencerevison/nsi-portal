"use client";

import {
  AttachmentList,
  type AttachmentDisplay,
} from "@/components/attachment-list";
import { getCommunityAttachmentUrl } from "../actions";

export function PostAttachments({
  attachments,
}: {
  attachments: AttachmentDisplay[];
}) {
  return (
    <AttachmentList
      attachments={attachments}
      onView={(id) => getCommunityAttachmentUrl("post", id)}
      onDownload={(id) =>
        getCommunityAttachmentUrl("post", id, { download: true })
      }
    />
  );
}

export function CommentAttachments({
  attachments,
}: {
  attachments: AttachmentDisplay[];
}) {
  return (
    <AttachmentList
      attachments={attachments}
      onView={(id) => getCommunityAttachmentUrl("comment", id)}
      onDownload={(id) =>
        getCommunityAttachmentUrl("comment", id, { download: true })
      }
      compact
    />
  );
}
