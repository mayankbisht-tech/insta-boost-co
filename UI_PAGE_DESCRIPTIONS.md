# UI Page Descriptions

This document lists every route-backed screen in the codebase and the visible UI text on each one. It also includes the shared shells, the protected-state screens, and the route redirects.

Text and placement are described from the user's point of view:
- Top-left, top-center, top-right
- Left column, center, right column
- Above / below / inside a card
- Header / body / footer positions

---

## Route Map

### Public routes
- `/` -> `Landing`
- `/auth` -> `Auth`
- `/auth/admin` -> redirects to `/auth`
- `*` -> `NotFound`

### Creator routes
- `/dashboard` -> `Dashboard`
- `/campaign/:id` -> `CampaignDetail`
- `/campaign/:id/leaderboard` -> `Leaderboard`
- `/submissions` -> `Submissions`
- `/instagram` -> `InstagramConnect`
- `/payments` -> `Payments`
- `/notifications` -> `Notifications`

### Admin routes
- `/admin` -> `AdminOverview`
- `/admin/campaigns` -> `AdminCampaigns`
- `/admin/submissions` -> `AdminSubmissions`
- `/admin/users` -> `AdminUsers`
- `/admin/payments` -> `AdminPayments`

### Superadmin route
- `/superadmin` -> `SuperadminDashboard`

### Helper / fallback routes
- `Index` -> placeholder fallback page
- `ProtectedRoute`, `AdminRoute`, `SuperadminRoute` -> blocked-access screens when needed

---

## Shared Layouts

### Creator Dashboard Shell

Used by:
- `Dashboard`
- `CampaignDetail`
- `Leaderboard`
- `Submissions`
- `InstagramConnect`
- `Payments`
- `Notifications`

Structure:
- A sticky full-width header runs across the top.
- Left side: logo block with the Go Clips image and brand name.
- Center on desktop: navigation links.
- Right side: role badge, notifications icon, username text, and sign-out button.
- On mobile: the nav collapses into a slide-down menu under the header.
- Page content sits below the header inside a centered container.

Header text and positions:
- Left brand block: `Go Clips`, with the smaller subtitle `Creator dashboard` below it.
- Center nav links: `Dashboard`, `Submissions`, `Instagram`, `Payments`.
- Right side:
  - Optional `Admin` or `Superadmin` pill.
  - Bell icon for notifications.
  - Username or email display.
  - Log out icon button.

Mobile behavior:
- The menu button appears on the left.
- The nav links move into a vertical panel below the header.

### Admin Shell

Used by:
- `AdminOverview`
- `AdminCampaigns`
- `AdminSubmissions`
- `AdminUsers`
- `AdminPayments`

Structure:
- Desktop uses a fixed left sidebar and right-side content area.
- Mobile uses a top header and horizontal nav chips.

Sidebar text and positions:
- Top block:
  - Logo plus `Go Clips`
  - Subtitle `Admin Panel`
- Middle nav:
  - `Overview`
  - `Campaigns`
  - `Submissions`
  - `Payments`
  - `Users`
- Bottom block:
  - Optional `Superadmin Panel`
  - `Creator Dashboard`
  - `Sign Out`

Mobile header text and positions:
- Top row: logo and `Go Clips` on the left, sign-out button on the right.
- Second row: nav chips for the same sections.
- Optional `Superadmin Panel` link below the chips.

### Superadmin Shell

Used by:
- `SuperadminDashboard`

Structure:
- Full-width top header.
- Left side: shield icon, title, and subtitle.
- Right side: `Admin Panel`, `Creator View`, and `Sign Out`.
- Main content sits below in a centered container.

Header text and positions:
- Title: `Go Clips Superadmin`
- Subtitle: `Manual verification, admin oversight, and account controls`

---

## Public Pages

### Landing `/`

Overall look:
- Full-screen editorial-style landing page.
- Dark/glassy background treatment with glowing circles and soft gradients.
- Two-column hero section on desktop.
- The right side contains a framed campaign artwork card.

Top header:
- Left: clickable logo block with image, brand name, and tagline.
- Right: `Log in` and `Get started`.

Visible text:
- Brand title: `GoClips`
- Tagline: `Creator rewards, made clean`
- Hero headline: `Turn Clips Into Income`
- Hero paragraph: `Join a platform built for creators to earn from content clipping with easy submissions, real-time tracking, and fast payouts.`
- Primary CTA: `Start now`
- Right-side label: `Featured campaign`
- Badge text on the artwork:
  - `Campaign earnings`
  - `Clean and visible`
  - `Revenue`
  - `INR 0.00`
  - `until approved`

Positions:
- Header brand is top-left.
- Buttons are top-right.
- Hero headline is left column, large and high on the page.
- Paragraph sits directly under the headline.
- CTA sits below the paragraph.
- Artwork card is right column and vertically centered.
- Floating badges sit on top of the artwork near the bottom-left and mid-right.

Bottom feature area:
- The page visually emphasizes a three-card feature row below the hero area.
- In the current code, the most prominent visible text remains the headline, supporting paragraph, CTA, and artwork labels.

Redirect behavior:
- Signed-in users are redirected away from the landing page to their role-based area.

### Auth `/auth`

Overall look:
- Centered glass-style auth card on a full-screen background.
- Large decorative Go Clips artwork on the right side on wide screens.
- A rotated `GoClips` wordmark sits behind the form area on large screens.
- A circular back button floats at the top-left.

Top-left control:
- Arrow button goes back to `/`.
- Tooltip/title text: `Back to Landing`

Card title area:
- Main title in the center.
- In login/signup mode: `Go Clips Portal`
- In forgot-password mode: `Reset Password`
- Forgot-password subtitle: `We will send an OTP to your registered email.`

Mode switch:
- `Log In`
- `Sign Up`
- In forgot-password mode: `Back to Log In`

Login mode texts and positions:
- `Email` label above the email input.
- Placeholder: `you@example.com`
- `Password` label above the password input.
- Placeholder: `Password`
- `Forgot password?` link aligned to the right below the password field.
- Submit button: `Log In`

Sign up mode, step 1 texts and positions:
- `Full Name`
- Placeholder: `John Doe`
- `Username`
- Placeholder: `yourname`
- Helper text below username:
  - `Pick a unique username (3-20 letters or numbers).`
  - Or status text like `Checking availability...`, `Username is available.`, `That username is already taken.`, `Use 3-20 letters or numbers only.`
- `Email`
- Placeholder: `you@example.com`
- Helper note below email:
  - `We will send a one-time OTP before password setup.`
- Submit button: `Get OTP`

Sign up mode, step 2 texts and positions:
- Read-only `Email`
- Read-only `Full Name`
- Read-only `Username`
- `OTP`
- Placeholder: `Enter the OTP from your email`
- Submit button: `Verify OTP`
- Back button below submit: `Back`

Sign up mode, step 3 texts and positions:
- Read-only `Verified Email`
- Read-only `Username`
- `Password`
- Placeholder: `Create password`
- `Rewrite Password`
- Placeholder: `Rewrite password`
- Submit button: `Create Account`
- Back button below submit: `Back`

Forgot-password mode, step 1 texts and positions:
- `Email`
- Placeholder: `you@example.com`
- Submit button: `Send OTP`

Forgot-password mode, step 2 texts and positions:
- Read-only `Email`
- `OTP`
- Placeholder: `Enter the OTP from your email`
- Submit button: `Verify OTP`
- Back button below submit: `Back`

Forgot-password mode, step 3 texts and positions:
- Read-only `Verified Email`
- `New Password`
- Placeholder: `New password`
- `Confirm Password`
- Placeholder: `Confirm new password`
- Submit button: `Reset Password`
- Back button below submit: `Back`

General auth layout details:
- Inputs are stacked vertically with labels above each field.
- Primary submit button spans the full card width.

Redirect behavior:
- Already signed-in users are redirected to `/dashboard`, `/admin`, or `/superadmin` based on role.

### Not Found `*`

Overall look:
- Minimal centered error page.
- Content is vertically and horizontally centered.

Visible text:
- Large heading: `404`
- Message: `Oops! Page not found`
- Link: `Return to Home`

Positions:
- The `404` sits at the top of the centered stack.
- The error message sits below it.
- The home link is below the message.

---

## Creator Pages

### Dashboard `/dashboard`

Top section:
- A row of four stat cards appears at the top.
- Each card has a label in the upper-left and a number below it.

Stat card text:
- `Total Submissions`
- `Approved`
- `Rejected`
- `Pending`

Second row:
- Three larger summary cards.

Left summary card:
- Title: `Total Earnings`
- Value shown below in large text.

Middle summary card:
- Title: `Estimated Earnings`
- Value shown below in large text.

Right summary card:
- Title: `Creator Snapshot`
- Nested label: `Connected Instagram`
- Nested status text varies, commonly:
  - `Ready for reel submissions`
  - `Verified and ready to start`
  - `Sign in required`

Campaign section:
- Section heading: `Active Campaigns`
- Loading state: spinner only.
- Empty state text: `No campaigns available.`

Campaign tiles:
- Each tile is a campaign card plus a footer row.
- Footer row text:
  - Category badge, such as `Sports`, `General`, or `Gambling`
  - Optional badge: `Top Paying`
  - Button: `View Details`

Positions:
- Stats are at the top.
- Earnings cards are below the stats.
- `Active Campaigns` sits beneath the summary row.
- Campaign cards render in a grid below that heading.

### Campaign Detail `/campaign/:id`

Top controls:
- Back button: `Back`

Main content:
- Optional campaign banner image at the top.
- Main card below the image.

Card header text:
- Category badge
- Status badge
- Title
- Description

Earnings block:
- Text: `INR <value> per 1M views`
- Positioned below description in a highlighted row.

Payment block:
- Heading: `Max payment per reel`
- Rupee value below it.

Guardrails block:
- Heading: `Submission guardrails`
- Body lines:
  - `Submit the reel within 120 minutes of upload.`
  - `Each reel can be used only once across the platform, so duplicate submissions are blocked.`
  - `The reel must belong to the same Instagram account you connected here.`
  - `Upload times and account ownership are verified automatically.`

Campaign brief block:
- Heading: `Campaign brief`
- Subtext: `Google Drive attachment`
- Button: `Open link`

Leaderboard button:
- `View Leaderboard`

Rules section:
- Heading: `Campaign Rules`
- Each rule is rendered as a separate line in the list.

Submission area:
- Warning text when submission is blocked:
  - `Connect your Instagram account to submit reels.`
  - Or `This campaign is closed.`
- Open form heading/label:
  - `Instagram Reel URL`
- Placeholder:
  - `instagram.com/reel/... or https://www.instagram.com/reel/...`
- Helper text:
  - `We verify the upload time automatically before accepting the submission.`
- Buttons:
  - `Submit`
  - `Cancel`
- Collapsed submit button:
  - `Submit Reel`

Positions:
- Back button sits above the main card on the left.
- Banner image sits at the top of the centered column.
- All campaign details are in a single narrow center column.

### Leaderboard `/campaign/:id/leaderboard`

Top controls:
- Back button: `Back`

Title row:
- Title: `Leaderboard`
- Campaign title appears inline to the right with a dash separator.

States:
- Loading: spinner centered.
- Empty: `No submissions yet for this campaign.`

Table headings:
- `Rank`
- `Creator`
- `Views`
- `Earnings`

Row details:
- Creator is shown as `@username`
- Views are right-aligned
- Earnings are right-aligned and shown as a number

Positions:
- Back button is top-left.
- Title row is directly below it.
- Table fills the main content card.

### Submissions `/submissions`

Top heading:
- `My Submissions`

Filter row:
- `Status`
- `Campaign`
- `Date`

Filter options:
- Status:
  - `All Status`
  - `Pending`
  - `Approved`
  - `Rejected`
  - `Flagged`
- Campaign:
  - `All Campaigns`
  - Campaign titles from the user's list
- Date:
  - `All Time`
  - `Last 7 Days`
  - `Last 30 Days`

Loading state:
- Spinner only.

Empty state:
- `No submissions found.`
- Helper line: `Submit a reel from a campaign to see it here.`

Each submission card:
- Campaign title at top-left.
- Status badge beside it.
- Optional analytics badge beside status.
- Reel link text: `View reel`
- Metadata lines:
  - `Uploaded: ...`
  - `Submission window closed: ...`
  - `Submitted: ...`
  - `Analytics synced ...` or `Analytics not synced yet`
- Rejection note:
  - `Admin note: ...`

Metric boxes:
- `Views`
- `Plays`
- `Likes`
- `Comments`

Footer text:
- If rejected or flagged:
  - `This reel is not earning right now because its status is rejected or flagged.`
- Otherwise:
  - `Analytics updates are managed by admin only.`

Footer earnings:
- Right side shows the earnings amount.

Positions:
- Title at top-left.
- Filters directly below the title.
- Each submission is a large stacked card.
- Metrics are on the right side on larger screens and below details on smaller screens.

### Instagram Connect `/instagram`

Top heading:
- `Instagram Connect`

Intro text:
- `Generate your verification code, add it to your Instagram bio, then run the check yourself. No superadmin approval is needed now.`

Current connection card:
- Handle text:
  - `@username` or `No Instagram linked yet`
- Status badge:
  - `not_connected`
  - `code_generated`
  - `approval_pending`
  - `approved`
  - `rejected`
  - `pending`
  - `verified`
  - `failed`
  - `expired`
- Followers text:
  - `X followers`
- Optional code text:
  - `Code: ...`

Setup card:
- Heading: `Setup`
- Helper text: `Enter another Instagram username to connect more accounts.`
- Field label: `Instagram Username`
- Placeholder: `@yourhandle`
- Button: `Generate Verification Code`

Verification Request card:
- Heading: `Verification Request`
- Loading: spinner.
- Empty state text:
  - `No verification request yet. Generate a code first, add it to your Instagram bio, then run the automatic check.`
- Request top row:
  - Status badge
  - `@instagram_username`
  - Button: `Verify Now`
- Tiles:
  - `Verification Code`
  - `Followers`
- Metadata lines:
  - `Submitted: ...`
  - `Expires: ...`
  - `Last checked: ...`
- Notes block:
  - `Verification Notes`
  - Or `No review notes yet.`

Connected Accounts section:
- Heading: `Connected Accounts`
- Each row shows:
  - `@username`
  - status badge
  - follower count
  - code text if present
  - `Added <date>`

Positions:
- Title and intro sit at the top.
- Current connection card is first.
- Setup and verification cards are side by side on desktop.
- Connected accounts appears below when present.

### Payments `/payments`

Top heading:
- `Payments`

Intro text:
- `Add your UPI details, get them verified, then request withdrawals after your campaigns end and earnings become withdrawable.`

Unverified payment profile card:
- Heading: `UPI Details`
- Helper text:
  - `These details are reviewed by admin before withdrawals are enabled.`
- Input labels:
  - `UPI ID`
  - `Full Name`
  - `Phone Number`
- Placeholders:
  - `yourname@bank`
  - `Name on bank account`
  - `10-digit phone`
- Button text:
  - `Submit for Verification`
  - Or `Update & Verify` when profile exists
- Status badge shows the profile status if present.
- Admin note text:
  - `Admin note: ...`
- Warning line:
  - `Your payment details must be verified before you can request a withdrawal.`

Verified payment card:
- Heading: `Withdrawal`
- Tabs:
  - `Withdraw`
  - `History`

Withdraw tab text:
- Latest request row:
  - `Latest request: INR ...`
  - Status badge with `Done`, `Pending`, or `Rejected`
- Summary cards:
  - `Withdrawable Earnings`
  - `Estimated Earnings`
  - `Already Paid`
- Main amount block:
  - `Withdrawable Amount`
  - Helper note: `Only approved earnings from ended campaigns are counted here.`
- Button:
  - `Request Withdrawal`
  - Or `Requesting...`, `Pending...`
- Hint lines:
  - `You need more approved earnings from ended campaigns before you can request a payout.`
  - `Once requested, the withdrawal cannot be cancelled.`

History tab text:
- Empty state: `No withdrawal requests yet.`
- Each row shows:
  - `Requested INR ... on ...`
  - `Reviewed on ...`
  - `Admin note: ...` if rejected

Positions:
- Page intro is at the top.
- The main card is centered and max-width.
- Tabs sit in the top-right of the verified card header.

### Notifications `/notifications`

Top heading:
- `Notifications`

States:
- Loading: spinner only.
- Empty state: `No notifications yet.`

Each notification card:
- Main line: notification message text.
- Secondary line: timestamp.

Positions:
- Page title sits top-left.
- Notifications stack vertically underneath.
- Unread notifications have a left accent border.

---

## Admin Pages

### Admin Overview `/admin`

Top heading:
- `Dashboard Overview`

Subtitle:
- `Monitor your platform metrics in real-time`

Loading state:
- `Loading dashboard...`

Stat cards:
- `Visible Users`
- `Campaigns`
- `Submissions`
- `Approved`
- `Rejected`
- `Pending`
- `Eligible`
- `Total Views`

Second row cards:
- `Total Earnings`
- `Unique Content`

Positions:
- Heading block sits top-left.
- Stat cards appear immediately below in a grid.
- Two large summary cards appear below the grid.

### Admin Campaigns `/admin/campaigns`

Top heading:
- `Campaign Management`

Subtitle:
- `Create and manage your marketing campaigns`

Top-right button:
- `New Campaign`

Loading state:
- `Loading campaigns...`

Empty state:
- `No campaigns yet. Create one to get started!`

Per-campaign action row:
- `Edit`
- `Delete`

Create/Edit dialog:
- Title:
  - `Edit Campaign`
  - `Create New Campaign`
- Field labels:
  - `Campaign Title`
  - `Category`
  - `Status`
  - `Campaign Budget (INR)`
  - `Max payment per reel (INR)`
  - `Rupees per 1,000 views`
  - `Rules (one per line)`
  - `Campaign Image URL`
  - `Google Drive Link`
- Helper text:
  - `Equivalent 1M rate: INR ...`
  - `This is used for the campaign preview image or banner.`
  - `Add the campaign brief, assets, or instructions for creators.`
- Buttons:
  - `Update Campaign` or `Create Campaign`
  - `Cancel`

Positions:
- Title and subtitle are top-left.
- New campaign button is top-right.
- Campaign cards render in a two-column grid.
- Dialog fields are stacked vertically.

### Admin Submissions `/admin/submissions`

Top heading:
- `Submissions Review`

Subtitle:
- `Review and manage user submissions`

Filter controls:
- Search placeholder:
  - `Search submissions by username, name, email, or user ID`
- Campaign filter
- Status filter

Loading state:
- `Loading submissions...`

Empty state:
- `No submissions found`

Each submission card:
- Creator row:
  - `@username`
  - status badge
  - optional analytics source badge
- Campaign title below creator row
- Reel link text: `View Reel`
- Metadata lines:
  - `Uploaded: ...`
  - `Window closes: ...`
  - `Submitted: ...`
  - `Synced ...` or `Not synced yet`
- Rejection note:
  - `Admin note: ...`

Metric boxes:
- `Views`
- `Plays`
- `Likes`
- `Comments`

Bottom action row:
- View input field
- `Save Views`
- `Sync`
- Earnings value
- Moderation buttons:
  - approve icon button
  - reject icon button
  - flag icon button

Review dialog:
- Title:
  - `Reject submission`
  - `Flag submission`
- Description:
  - `Add a message for the creator before sending the decision.`
- Textarea placeholder:
  - `Type the message you want the creator to receive`
- Buttons:
  - `Cancel`
  - `Submit Rejection`
  - `Submit Flag`

Positions:
- Heading and subtitle are top-left.
- Filters sit in one row below.
- Cards fill the main content area.
- Review dialog overlays the page.

### Admin Users `/admin/users`

Top heading:
- `User Management`

Subtitle:
- `Monitor and manage community members`

Top-right badge:
- `X users`

Search placeholder:
- `Search user analytics by username, name, email, or user ID`

Loading state:
- `Loading users...`

Empty state:
- `No users found for this search`

Table headings:
- `Name`
- `Username`
- `Email`
- `Instagram`
- `Followers`
- `Joined`

Row details:
- Username appears as `@username`
- Instagram connection text:
  - connected users show `@instagram_username`
  - disconnected users show `Not connected`
- Joined date appears on the far right

Positions:
- Title and subtitle are left.
- user count badge is right.
- search input sits under the title block.
- user table fills the width below.

### Admin Payments `/admin/payments`

Top heading:
- `Payments`

Subtitle:
- `Verify payment profiles and approve withdrawals`

Loading state:
- `Loading payment data...`

Tabs:
- `Payment Profiles`
- `Withdrawal Requests`

Payment Profiles tab:
- Empty state: `No payment profiles yet.`
- Each profile shows:
  - user name / `@username`
  - email
  - status badge
  - `UPI:`
  - `Name:`
  - `Phone:`
- Pending actions:
  - `Verify`
  - `Reject`
- Rejection note block:
  - `Rejection note`
  - placeholder: `Add reason for rejecting this payment profile`
  - buttons: `Submit Rejection`, `Cancel`
- Rejected note:
  - `Admin note: ...`

Withdrawal Requests tab:
- Empty state: `No payout requests yet.`
- Each payout shows:
  - user name / `@username`
  - email
  - status badge
  - `Amount:`
  - `UPI:`
  - `Phone:`
  - `Requested ...`
- Pending actions:
  - `Approve`
  - `Reject`
- Rejection note block:
  - `Rejection note`
  - placeholder: `Add reason for rejecting this withdrawal request`
  - buttons: `Submit Rejection`, `Cancel`
- Rejected note:
  - `Admin note: ...`

Positions:
- Intro sits at the top-left.
- Main content is a glass card with tabs.
- Profile and payout sections are stacked as bordered blocks.

---

## Superadmin Page

### Superadmin Dashboard `/superadmin`

Top metric cards:
- `Platform Views`
- `Total Earnings`
- `Unique Reels`
- `Analytics Coverage`

Second metric row:
- `Creator Verification Requests`
- `Admin Accounts`
- `Pending Admin Credentials`
- `Creators`
- Status card text:
  - current Apify run status, or `not-configured`
  - `Started ...` or `No run data yet.`

Admin credential issuer section:
- Title: `Admin Credential Issuer`
- Description:
  - `Superadmin can generate an email and password for a future admin. The admin role is granted only when that person logs in successfully for the first time.`
- Input placeholders:
  - `Admin full name`
  - `admin@example.com`
  - `Temporary password`
- Button:
  - `Create Admin Credentials`
- Table headings:
  - `Name`
  - `Email`
  - `Issued By`
  - `Issued At`
  - `Status`
- Status text:
  - `Pending first login`
  - or `Claimed by ...`

Platform summary section:
- `Total Users`
- `Connected Creators`
- `Active Campaigns`
- `Avg Views/Reel`

Campaign budget tracker:
- Heading: `Active Campaign Budget Tracker`
- Helper text:
  - `Live budget consumption updates are shared with admin, superadmin, and creator dashboards.`
- Badge:
  - `<count> active`
- Search placeholder:
  - `Search campaigns by title or category`
- Empty state:
  - `No active campaigns right now.`

Instagram Verification Overview:
- Heading: `Instagram Verification Overview`
- Helper text:
  - `Verification is now creator-managed. This section is read-only so the team can monitor outcomes without approving accounts manually.`
- Badge:
  - `<count> queued`
- Empty state:
  - `No pending verification requests right now.`
- Each request card shows:
  - creator name and email
  - `@instagram_username`
  - followers count
  - verification code
  - status
  - `Instagram ID`
  - `Submitted At`
  - `Expires At`
  - `Last Checked`
  - `Bio Snapshot`
  - `Bio contains token: Yes/No`
  - `Followers match: Yes/No`
  - `Checked followers: ...`
- Disabled action buttons:
  - `Creator Managed`
  - `Auto Verify Only`
  - `No Manual Fail`
  - `No Manual Expire`
  - `No Manual Reset`

Verification Statuses section:
- Heading: `Verification Statuses`
- Helper text:
  - `View all users with verification states and automatic check results.`
- Badge:
  - `<count> total`
- Table headings:
  - `User`
  - `Instagram`
  - `Status`
  - `Token`
  - `Bio`
  - `Followers`
  - `Actions`
- Actions column text:
  - `Creator managed`

Account Control section:
- Heading: `Account Control`
- Helper text:
  - `Pause, block, reactivate, or remove creators and admins.`
- Search placeholder:
  - `Search by name, email, role, or Instagram`
- Table headings:
  - `Account`
  - `Role`
  - `Instagram`
  - `Status`
  - `Created`
  - `Actions`
- Status buttons:
  - `active`
  - `paused`
  - `suspended`
  - `banned`
- Destructive button:
  - `Remove`

Positions:
- Each section is stacked vertically in the main content area.
- Metric cards appear first.
- Admin credential issuer comes after the metrics.
- Campaign tracker, verification sections, and account control follow below.

---

## Redirect / Helper Screens

### `Index`

Current content:
- Placeholder fallback screen with a centered image.
- It is not part of the app's main navigation.
- Visible alt text: `Your app will live here!`

### `AdminAuth`

Behavior:
- No UI is rendered.
- The route immediately redirects to `/auth`.

---

## Access-Blocked Screens

### `ProtectedRoute` blocked state

When:
- The user is signed in, but their account status is not `active`.

Visible text:
- Title: `Account Restricted`
- Message varies by status:
  - `Your account has been banned. Contact support if you think this is incorrect.`
  - `Your account is paused right now. Please wait for the superadmin to reactivate it.`
  - `Your account is suspended and cannot access the dashboard right now.`
- Button: `Log Out`

### `AdminRoute` blocked state

When:
- The signed-in user is not allowed to access the admin area.

Visible text:
- Title: `Account Restricted`
- Message: `Your account is not allowed to access the admin panel.`
- Button: `Log Out`

### `SuperadminRoute` blocked state

When:
- The signed-in user is not allowed to access the superadmin area.

Visible text:
- Title: `Account Restricted`
- Message: `Your superadmin account is not allowed to access this dashboard.`
- Button: `Log Out`
