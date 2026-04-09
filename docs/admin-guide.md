# NSI Community Portal — Admin Guide

This guide covers the admin features of the NSI Community Portal. You need the **Admin** role to access the admin area.

---

## Getting to Admin

Click **Admin** in the top navigation bar (desktop) or hamburger menu (mobile). The admin area has tabs for **Members**, **Groups**, **Roles**, and **Support**.

---

## 1. Member Management

### Viewing Members

The Members page shows a searchable, sortable table of all members. You can search by name, email, lot number, or role. Click any column header to sort.

Each member has a status:
- **Draft** — profile created, no invitation sent yet
- **Invited** — invitation email sent, hasn't signed up yet
- **Active** — signed up and using the portal
- **Revoked** — invitation was revoked before they signed up
- **Inactive** — account deactivated by an admin

### Adding a Member

1. Click **Add member**
2. Fill in their email (required), first name, last name, lot number, and role
3. Click **Send invitation**

This creates their profile and sends a Clerk invitation email. When they click the link and set a password, their account becomes Active.

### Bulk Import (CSV)

1. Click **Import CSV**
2. Download the template or prepare a CSV with columns: `email`, `first_name`, `last_name`, `lot_number`, `role`
3. Upload the file — you'll see a preview with validation
4. Invalid rows are highlighted in red with the specific error
5. Click **Import** to send invitations for all valid rows
6. Results show which succeeded and which failed

### Editing a Member

1. Click the three-dot menu on a member row
2. Select **Edit**
3. Update name, lot number, role, and directory fields (Children, Dogs, etc.)
4. Click **Save changes**

### Managing Invitations

From the three-dot menu:
- **Send invitation** — available for Draft or Revoked members
- **Resend invitation** — available for Invited members (revokes the old invite and sends a fresh one)
- **Revoke invitation** — available for Invited members (prevents them from signing up)

### Deactivating / Reactivating

- **Deactivate** — blocks an Active member from accessing the portal. They'll see an "Access unavailable" screen on their next visit.
- **Reactivate** — restores access for an Inactive member.

### Deleting a Member

1. Deactivate the member first (you can't delete an active member)
2. Click the three-dot menu and select **Delete**
3. Confirm in the dialog — this permanently removes their profile and Clerk account

---

## 2. Document Library

The document library is at `/documents`. You need the `documents.write` capability to upload and manage files.

### Uploading Files

1. Navigate to a folder
2. Click the **Upload** button, or drag and drop files onto the upload zone
3. Supported formats: PDF, Word, Excel, images (JPEG, PNG, GIF, WEBP), plain text
4. Maximum file size: 25 MB

### Managing Folders

Right-click (or use the kebab menu on) a folder in the sidebar:
- **Create subfolder** — enter a name; it will be slugified for the URL
- **Rename** — update the folder name
- **Delete** — removes the folder, all subfolders, and all files inside them (cannot be undone)

### Deleting Files

Hover over a file row and click the delete icon. Confirm in the dialog. This removes the file permanently.

---

## 3. Groups

Groups are used for sending targeted emails. Manage them from **Admin > Groups**.

### Creating a Group

1. Click **Create group**
2. Enter a name (required) and description (optional)
3. Click **Create**

### Adding Members to a Group

1. Click a group name to open its detail page
2. Use the **Add to group** dropdown to select a member
3. Click **Add to group**

### Removing Members

On the group detail page, click the X button next to a member's name.

### Editing / Deleting a Group

From the three-dot menu on the groups list:
- **Edit** — update the name and description
- **Delete** — removes the group (members are not affected, just unlinked)

---

## 4. Roles & Permissions

Roles control what members can do on the portal. Manage them from **Admin > Roles**.

### Default Roles

The portal comes with default roles (Admin, Member, etc.). The default role (marked with a badge) is automatically assigned to new members if no other role is specified.

### Creating a Role

1. Click **Create role**
2. Enter a name and optional description
3. Click **Create**
4. Navigate to the role to configure its capabilities

### Editing Capabilities

1. Click a role name (or select **Edit capabilities** from its menu)
2. Check or uncheck capabilities in the grid — they're grouped by category:
   - **admin** — access to the admin area
   - **documents** — read and write access to the document library
   - **community** — read, write, and moderate the message board
   - **email** — send group emails
   - **support** — manage support requests
3. Click **Save capabilities**

### Deleting a Role

You can only delete a role if no members are assigned to it. Reassign members to another role first.

---

## 5. Sending Email

Go to **Email** in the main navigation (requires the `email.send` capability).

### Composing a Group Email

1. Click **Compose** (or navigate to `/email/compose`)
2. Select one or more groups as recipients — the recipient count updates live
3. Enter a subject and message body
4. Click **Send** and confirm in the dialog

Emails are sent to all active members in the selected groups. Replies go to your email address.

### Email History

Navigate to **Email > History** to see all previously sent emails with subject, date, recipient count, and delivery status.

---

## 6. Support Requests

Members can submit help requests from the **Help** page. These land in **Admin > Support** (requires the `support.manage` capability).

### Viewing Requests

Filter by status (New, Read, Complete) or category (Bug/Issue, Feature Request, Question, Other). Click any row to view the full message.

### Managing Requests

- Requests auto-advance from **New** to **Read** when you open them
- Use the quick-action buttons (eye, check, rotate icons) to change status without opening
- In the detail dialog, click **Mark complete** or **Reopen**
- Click **Reply via email** to open your email client with the member's address pre-filled

---

## Tips

- **Members can manage their own name, email, and avatar** through the Account Settings button (managed by Clerk). Admins don't need to update these.
- **Notification preferences** are self-serve — each member controls whether they get emails for new posts and replies on their Profile page.
- **The portal URL** is [nsiportal.ca](https://nsiportal.ca). Share this with members when they have questions about logging in.
