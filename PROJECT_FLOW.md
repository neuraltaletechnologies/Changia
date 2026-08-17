# Changia Full Project Flow Documentation

This document is the full expected flow for the Changia project. It converts the
core explanation into clear product requirements before any frontend, backend,
database, or API documentation changes are implemented.

Changia must behave like a fundraising organization platform, not only a fast
money collection system. The platform supports fundraising campaigns where
people can contribute money, items, or other forms of help. It must also support
donor management, donor pools, reminders, payment tracking, campaign completion
proof, public campaign stories, and administrative review.

## 1. Core Identity Of The Platform

Changia is a fundraising organization system.

The public website text should make users feel that Changia is for organized
fundraising, charity, community support, and accountability. The wording should
not make Changia sound like only an easy or fast money collection platform.

Changia may collect and track money, but the system must also support:

- Donated items
- In-kind support
- Community help
- Campaign updates
- Proof of how contributions were used
- Public completed campaign stories

The main trust message is that Changia helps organizations manage support from
start to finish.

## 2. Main User Types

The system must support these user types:

- Public visitors
- Donors and supporters
- Campaign managers
- Organization administrators
- System administrators

Every user type must have access to the Settings option, but the settings shown
must depend on the user's role and permissions.

## 3. Public Landing Page Flow

The landing page is the first public entry point.

The landing page must:

- Present Changia as a fundraising organization platform
- Explain that Changia supports money, items, and other forms of contribution
- Show selected top campaigns
- Allow users to open campaign details
- Allow users to browse more campaigns
- Use a corporate, minimal, complete visual style

The landing page content must avoid wording that suggests Changia only collects
money quickly. Better wording should focus on organized fundraising, community
support, transparency, and campaign accountability.

## 4. Campaign Page And Featured Campaign Flow

Organization administrators and system administrators must be able to choose the
top three campaigns.

The selected top three campaigns must appear:

- On the landing page
- On the campaigns page

When a public user clicks one of those campaigns, the user must see the full
campaign details.

Public campaign details should include:

- Campaign title
- Campaign story
- Campaign manager or organization information
- Campaign target
- Amount already received
- Donor/supporter count
- Contribution type, such as money, items, or in-kind help
- Campaign status
- Start date and end date where available
- Contribution instructions
- Payment or contribution feedback state where applicable
- Campaign updates
- Proof and completion story if the campaign is completed

Only approved public campaigns should appear publicly.

## 5. Blog And Completed Campaign Flow

The blog must show completed campaigns in detail.

A completed campaign blog story must show the campaign from start to finish:

- What the campaign was about
- Why support was needed
- What type of support was requested
- How much money, items, or help was received
- How the contribution was used
- Proof images showing the use of the contribution
- The final result
- The completion date

When a campaign is completed, the campaign manager is required to provide proof.
This is mandatory.

Required completion proof:

- Proof images or image URLs
- Blog update or completion story

The proof images and blog update are then used to show the completed campaign in
the public blog.

Important rule:

- A campaign manager cannot create a new campaign if they have any completed
  campaign that is missing the required blog update or proof images.

This rule protects donor trust and forces accountability before managers start
new fundraising work.

## 6. Campaign Completion Rules

A campaign can move toward completion when:

- The target is reached
- The end date has arrived
- The campaign work is done
- An administrator closes it
- The campaign manager reports that the campaign was successful

The system must support feedback states after contribution or payment, such as:

- Contribution received
- Money received
- Payment pending confirmation
- Campaign target reached
- Campaign has ended
- Campaign money or required support is complete
- Campaign completed successfully

The campaign should not be treated as fully completed for public blog purposes
until proof images and the completion story are submitted.

## 7. Campaign Manager Flow

A campaign manager manages campaigns, donors, donor pools, reminders, and
campaign completion updates.

The campaign manager can:

- Create multiple donor pools
- Give each pool a name
- Assign each pool a category
- Add donors directly
- Import donors into donor pools
- Create campaigns
- Import donor pools when creating a campaign
- Import donor pools after a campaign has already started
- View donor payment status inside a campaign
- Select unpaid or partially paid donors
- Send reminders through approved channels
- Configure automatic resend settings where allowed
- Submit proof images and completion blog updates

The campaign manager can only see donor pools that belong to them. Donor pools
created by one manager must not be visible to another campaign manager.

## 8. Donor Pool Flow

A donor pool is a reusable group of donors.

Managers must be able to create many donor pools. Each pool must have:

- Name
- Category
- Owner campaign manager
- Donors
- Created date
- Updated date
- Campaign usage history where needed

Example donor pool categories:

- Family
- School
- Student
- Office
- Friends
- Community
- Other

The donor pool must show summary status, including:

- Total donors
- Total expected amount
- Total amount paid
- Number of unpaid donors
- Number of partially paid donors
- Number of fully paid donors

Organization administrators and system administrators must be able to view donor
pools across the scope they control.

An organization administrator can enter a specific manager's context and:

- Create a donor pool for that manager
- Create a donor directly for that manager
- View that manager's donor pools
- Manage donor records according to admin permissions

System administrators can view and manage donor pools across the platform where
platform-level permission allows it.

## 9. Donor Details Flow

A donor record should include:

- Name
- Gender
- Email
- Position or relationship
- Phone number
- Preferred contact method
- Payment method details
- Total amount paid across campaigns under the relevant manager
- Campaign contribution history
- Donor pool membership

For campaign managers, donor totals should apply to campaigns visible to that
manager.

For organization administrators, donor totals should apply across the
organization.

For system administrators, donor totals should be visible across the full system
where permitted.

Administrators must be able to perform CRUD actions on donors and donor pools.
They must also be able to sort and filter donors and donor pools.

CRUD means:

- Create
- Read
- Update
- Delete

Sorting and filtering should apply to fields such as:

- Name
- Pool
- Category
- Campaign
- Payment status
- Total amount paid
- Created date
- Preferred contact method
- Manager

## 10. Importing Donor Pools Into Campaigns

A campaign manager can import donor pools into a campaign:

- At the start of creating the campaign
- In the middle of an active campaign

When a pool is imported into a campaign, the campaign must show each imported
donor and the donor's status for that campaign.

Campaign donor statuses:

- Not paid
- Partially paid
- Paid in full

The system must show:

- The amount expected from each donor where applicable
- The amount paid by each donor
- Whether the donor still needs a reminder
- The total amount paid by each imported pool
- The total campaign amount received from all imported pools

## 11. Duplicate Donor Handling

The system must prevent redundant donor records under the same manager.

A duplicate may happen when the same donor appears in different pools under the
same manager.

When duplicate donors are detected:

1. The system identifies the possible duplicate donor.
2. The system asks the user which pool the donor should stay in.
3. The selected pool keeps the donor.
4. The redundant donor membership is removed or merged.
5. Payment history must remain attached to the correct donor.

The system should avoid duplicate reminders, incorrect totals, and repeated
donor records.

## 12. Payment Status Flow

For every donor in a campaign, the system compares the expected amount with the
confirmed paid amount.

The status rules are:

- If the confirmed paid amount is zero, the donor is not paid.
- If the confirmed paid amount is more than zero but less than expected, the
  donor is partially paid.
- If the confirmed paid amount is equal to or greater than expected, the donor
  is paid in full.

The campaign manager must be able to select donors based on these statuses.

The most important use case is selecting donors who are:

- Not paid
- Partially paid

Those selected donors can receive reminders.

## 13. Reminder Flow

The campaign manager must be able to send payment or contribution reminders to
selected donors.

Reminder channels:

- WhatsApp Business API
- SMS
- Email

Reminder sending flow:

1. The manager opens a specific campaign.
2. The manager views donors imported into that campaign.
3. The manager filters or selects donors who are not paid or partially paid.
4. The manager chooses the reminder channel or allows the system to use donor
   preference.
5. The manager chooses a reminder template.
6. The manager reviews the reminder batch.
7. The manager confirms sending.
8. The system sends reminders only after confirmation.

The system should use each donor's preferred method where possible.

For example:

- If the donor prefers WhatsApp, use WhatsApp Business API.
- If the donor prefers SMS, use SMS.
- If the donor prefers email, use email.

If the preferred method is unavailable, the system should either ask the manager
to choose another method or use the next allowed fallback method.

## 14. Automatic Reminder Resend Flow

The system must support automatic resend settings, but the manager must stay in
control.

Automatic resend flow:

1. The manager enables resend for a specific campaign reminder.
2. The system asks the manager to choose the resend interval.
3. The manager chooses which donor pools or donor statuses are included.
4. The system prepares future resend batches based on donor payment status.
5. Before each resend is sent, the manager must confirm the batch.
6. The system sends the reminder only after confirmation.

The resend interval may be options such as:

- Every day
- Every two days
- Weekly
- Custom interval

The resend option must work for:

- Email
- WhatsApp Business API
- SMS

Important restrictions:

- Anomalous or unmatched pools must never have automatic resend enabled.
- The manager must confirm each resend before it is sent.
- The resend should apply only to donors who are still not paid or partially
  paid at the time of sending.
- Donors who have already paid in full should not receive resend reminders.

## 15. Anomalous Or Unknown Payment Flow

Some payments may be received from donors who are not known or whose payment
method is not registered.

These payments must be saved in an anomalous or unknown pool.

This can happen when:

- A donor pays using a different phone number
- A donor pays using a payment method not registered in their profile
- The payment provider returns a payment without enough donor identity
- A manual payment is recorded without matching donor details

Anomalous payment flow:

1. The system receives or records the payment.
2. The system cannot match it to a known donor.
3. The payment is saved in the anomalous pool.
4. The manager or administrator reviews the anomalous payment.
5. The payment can be reattached to a known donor.
6. If needed, the donor's payment method details are updated.
7. After matching, the payment counts toward the correct donor, donor pool, and
   campaign.

Anomalous donors or unmatched payments must not be included in automatic resend
settings.

## 16. Organization Administrator Flow

An organization administrator controls and reviews all organization activity.

The organization administrator can:

- View all campaigns created by all campaign managers in the organization
- View full details of every campaign
- View campaign amount details
- View payment proof
- View donor details
- View donor pools
- View campaign manager activity
- Approve campaigns
- Pause campaigns
- Cancel campaigns
- Complete campaigns where organization rules allow it
- Choose the top three campaigns shown publicly
- View completed campaign blog updates
- View proof images
- Create donor pools for a specific campaign manager
- Create donors for a specific campaign manager
- Perform CRUD on donors and donor pools
- Sort and filter donor and donor pool records
- Access Settings

Full campaign details visible to the administrator should include:

- Campaign title
- Campaign manager
- Campaign story
- Campaign target
- Amount received
- Contribution type
- Donor board
- Donor pools attached to the campaign
- Payment status by donor
- Payment proof
- Unmatched payments
- Reminder history
- Completion proof images
- Blog update
- Campaign status and dates

## 17. System Administrator Flow

The system administrator has platform-level control.

The system administrator can:

- View all organizations
- View all users
- View all campaigns
- View all campaign managers
- View all donor pools
- View all donors
- View all campaign details
- View payment proof and amount details
- View audit logs
- Manage platform settings
- Choose platform-level top campaigns where needed
- Review completed campaign blog updates
- Review proof images
- Perform platform-level CRUD where permitted
- Sort and filter system-level records
- Access Settings

System administrators can see across the whole platform. Organization
administrators can see across their own organization only. Campaign managers can
see only their own campaign and donor management scope.

## 18. Settings Requirement

The Settings option must be visible to all dashboard user types.

Settings visibility:

- Campaign manager: account settings and manager-level preferences
- Organization administrator: organization settings and allowed admin settings
- System administrator: platform settings and system-level controls

Settings should include role-appropriate controls only. A campaign manager
should not see system-level controls. An organization administrator should not
see controls outside their organization.

## 19. Frontend Requirements To Implement Later

The frontend must be updated to match this full flow.

Required frontend areas:

- Landing page content
- Corporate minimal theme
- Campaigns page
- Campaign detail page
- Blog page
- Completed campaign detail page
- Dashboard navigation
- Settings visibility for all roles
- Campaign manager donor pool screens
- Donor screens
- Campaign creation and campaign edit flow
- Campaign donor board
- Reminder send and resend screens
- Anomalous payment review screen
- Admin campaign review pages
- System administrator review pages

The frontend must make the system feel like a complete fundraising organization
platform.

## 20. Backend Requirements To Implement Later

The backend must support the required behavior with proper role permissions and
data validation.

Required backend areas:

- Campaign management
- Public campaign listing
- Featured top three campaigns
- Campaign detail API
- Completed campaign blog/story API
- Donor pool management
- Donor management
- Donor pool import into campaign
- Duplicate donor detection and resolution
- Payment status calculation
- Donation and contribution recording
- Anomalous payment storage and matching
- Reminder templates
- Reminder sending
- Automatic resend scheduling
- Completion proof and blog update enforcement
- Settings access by role
- Admin and system administrator permissions
- Audit logging

The backend must enforce the rule that a manager cannot create a new campaign
if they have a completed campaign missing proof images or a blog update.

## 21. Database Requirements To Implement Later

The database must store enough information to support the full flow.

Expected data areas:

- Users
- Roles
- Organizations
- Campaign managers
- Campaigns
- Featured campaign selection
- Campaign completion proof
- Blog updates or completed campaign stories
- Donors
- Donor pools
- Donor pool membership
- Campaign donor imports
- Expected donor contribution amounts
- Donations and contribution records
- Payment method details
- Anomalous or unmatched payments
- Reminder templates
- Reminder batches
- Automatic resend settings
- Reminder send history
- Settings
- Audit logs

Database constraints should protect ownership rules. For example, a campaign
manager should not be able to access another manager's private donor pool.

## 22. API Documentation Requirement

The backend API README must be updated after implementation so it documents the
new behavior.

The API documentation should include:

- Authentication and role permissions
- Public campaign endpoints
- Featured campaign endpoints
- Campaign detail endpoints
- Completed campaign blog/story endpoints
- Campaign creation rules
- Campaign completion proof endpoints
- Donor pool CRUD endpoints
- Donor CRUD endpoints
- Donor pool import endpoints
- Duplicate donor resolution endpoints
- Donation and payment status endpoints
- Anomalous payment endpoints
- Reminder template endpoints
- Reminder send endpoints
- Automatic resend endpoints
- Settings endpoints
- Admin and system administrator endpoints
- Example requests and responses

The API documentation must clearly explain which user roles can call each
endpoint.

## 23. Visual Theme Requirement

The website should use a corporate, minimal, complete visual theme.

Preferred colors:

- Blue
- Green
- Blue and green together if balanced well

The theme should feel:

- Professional
- Trustworthy
- Clean
- Fundraising-focused
- Organized
- Not playful
- Not overly colorful
- Not like a quick money transfer product

The design should support public trust and organization credibility.

## 24. Permission Summary

Campaign manager:

- Manages own campaigns
- Manages own donor pools
- Manages own donors
- Imports own donor pools into campaigns
- Sends reminders for own campaigns
- Completes campaigns with proof and blog update
- Cannot see other managers' private donor pools
- Cannot create a new campaign if a completed campaign is missing proof or blog
  update
- Can access Settings

Organization administrator:

- Views all campaigns inside the organization
- Views all managers inside the organization
- Views all donor pools inside the organization
- Can create donor pools or donors for a specific manager
- Can choose top three public campaigns
- Can review amount details and proof
- Can perform CRUD, sort, and filter within organization scope
- Can access Settings

System administrator:

- Views and manages platform-wide records where allowed
- Views organizations, users, campaigns, donors, donor pools, audit logs, and
  settings
- Can choose platform-level top campaigns where required
- Can perform system-level CRUD, sort, and filter
- Can access Settings

Public visitor:

- Views landing page
- Views public campaigns
- Views campaign details
- Views completed campaign blog stories
- Can contribute through approved contribution channels

Donor/supporter:

- Contributes money, items, or other support
- Receives contribution feedback
- May receive reminders if known, unpaid, or partially paid
- Must never provide a mobile-money PIN directly to Changia

## 25. Core Rules That Must Not Be Broken

- Changia is a fundraising organization platform, not only a money collection
  tool.
- Admins can choose the top three public campaigns.
- Public users can open top campaigns and see full campaign details.
- Completed campaigns must appear in the blog with full start-to-finish details.
- Campaign completion requires proof images and a blog update.
- A manager cannot create a new campaign if a completed campaign is missing
  required proof or blog update.
- Managers can create multiple named and categorized donor pools.
- One manager's donor pools are private from other managers.
- Admins can view and manage donor pools within their scope.
- Admins can enter a specific manager's context to create donors or donor pools.
- Donor pools can be imported when creating a campaign or during a campaign.
- Imported campaign donors must show not paid, partially paid, or paid in full.
- Managers can remind unpaid and partially paid donors.
- Reminders can use WhatsApp Business API, SMS, or email.
- Automatic resend requires interval selection.
- Every automatic resend batch must be confirmed before sending.
- Anomalous pools must never have automatic resend enabled.
- Unknown payments are saved as anomalous and can be reattached to known donors.
- Donor payment methods can be updated when a donor pays with a new method.
- Admins and system administrators can perform CRUD, sorting, and filtering
  according to their scope.
- Payment feedback must tell users whether money was received, pending, ended,
  reached, or completed successfully.
- Settings must be available to all user types.
- The frontend, backend, database, and backend API README must all be updated to
  obey this flow during implementation.
