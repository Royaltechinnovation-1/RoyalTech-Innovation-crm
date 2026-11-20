USE royaltech_crm;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE sheet_sync_logs;
TRUNCATE TABLE sheet_config;
TRUNCATE TABLE sales_activities;
TRUNCATE TABLE sales_targets;
TRUNCATE TABLE payments;
TRUNCATE TABLE invoices;
TRUNCATE TABLE project_tasks;
TRUNCATE TABLE projects;
TRUNCATE TABLE leave_requests;
TRUNCATE TABLE candidates;
TRUNCATE TABLE employees;
TRUNCATE TABLE website_enquiries;
TRUNCATE TABLE proposal_mail_logs;
TRUNCATE TABLE proposals;
TRUNCATE TABLE mail_config;
TRUNCATE TABLE clients;
TRUNCATE TABLE leads;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO users (id, name, email, role, department, avatar_initials, manager_id) VALUES
('u1', 'Aryan Mehta', 'aryan@royaltech.io', 'founder', 'Super Admin', 'AM', NULL),
('u2', 'Vaishnavi Arora', 'hr@royaltechinnovation.co.in', 'hr_admin', 'HR', 'VA', NULL),
('u3', 'Rahul Verma', 'rahul@royaltech.io', 'sales_manager', 'Sales', 'RV', NULL),
('u4', 'Sara Khan', 'sara@royaltech.io', 'sales_executive', 'Sales', 'SK', 'u3'),
('u5', 'Vikram Shah', 'vikram@royaltech.io', 'project_manager', 'Delivery', 'VS', NULL),
('u6', 'Ananya Iyer', 'ananya@royaltech.io', 'developer', 'Engineering', 'AI', 'u5'),
('u7', 'Omar Siddiqui', 'omar@royaltech.io', 'website_admin', 'Marketing', 'OS', NULL),
('u8', 'Meera Joshi', 'meera@royaltech.io', 'finance_admin', 'Finance', 'MJ', NULL),
('u9', 'Simran Kaur', 'simran@royaltech.io', 'sales_executive', 'Sales', 'SK', 'u3'),
('u10', 'Aditi Rao', 'aditi@royaltech.io', 'sales_executive', 'Sales', 'AR', 'u3'),
('u11', 'Pankaj Mehta', 'pankaj@royaltech.io', 'sales_executive', 'Sales', 'PM', 'u3'),
('u12', 'Kabir Das', 'kabir@royaltech.io', 'developer', 'Engineering', 'KD', 'u5'),
('u13', 'Riya Sen', 'riya@royaltech.io', 'developer', 'Engineering', 'RS', 'u5');

INSERT INTO leads (id, lead_id, name, company, email, phone, source, status, owner_id, value, notes, next_follow_up, created_at) VALUES
('l1', 'RT-1001', 'Amelia Hart', 'Northpine Studio', 'amelia@northpine.co', '+1 415 220 0198', 'Website', 'negotiation', 'u4', 24000, 'Annual CRM seats', '2026-11-08', '2026-09-12'),
('l2', 'RT-1002', 'Jonah Reeves', 'Cedar & Co', 'jonah@cedar.co', '+1 628 441 7720', 'LinkedIn', 'proposal', 'u3', 58000, 'Warehouse rollout', '2026-11-14', '2026-10-03'),
('l3', 'RT-1003', 'Priya Nair', 'Mossline Foods', 'priya@mossline.com', '+1 312 908 4411', 'Referral', 'qualified', 'u4', 31200, 'Ops suite', '2026-11-16', '2026-10-18'),
('l4', 'RT-1004', 'Leo Marsh', 'Quiet Harbor', 'leo@quietharbor.io', '+1 206 555 0190', 'Upwork', 'new', 'u9', 8500, 'Pilot interest', '2026-11-10', '2026-08-22'),
('l5', 'RT-1005', 'Helena Ortiz', 'Brightleaf Retail', 'helena@brightleaf.com', '+1 917 444 2201', 'Website', 'won', 'u3', 42000, 'Annual support', NULL, '2026-07-14'),
('l6', 'RT-1006', 'Tom Ellis', 'Harborline Logistics', 'tom@harborline.com', '+1 503 771 0091', 'LinkedIn', 'lost', 'u4', 19000, 'Budget deferred', NULL, '2026-06-02'),
('l7', 'RT-1007', 'Maya Chen', 'Lumen Labs', 'maya@lumenlabs.io', '+1 415 900 2211', 'Website', 'contacted', 'u3', 27500, 'Demo booked', '2026-11-18', '2026-11-01'),
('l8', 'RT-1008', 'Ravi Patel', 'Orbit Retail', 'ravi@orbitretail.in', '+91 98765 11223', 'Referral', 'proposal', 'u4', 46500, 'Multi-store CRM', '2026-11-21', '2026-10-28'),
('l9', 'RT-1009', 'Nina Shah', 'TechCorp Solutions', 'nina@techcorp.io', '+91 98111 22001', 'LinkedIn', 'qualified', 'u3', 38000, 'Enterprise seats', '2026-11-09', '2026-10-05'),
('l10', 'RT-1010', 'Omar Farooq', 'BluePeak Media', 'omar@bluepeak.com', '+1 212 555 0188', 'Website', 'new', 'u9', 12000, 'Inbound form', '2026-11-11', '2026-11-02'),
('l11', 'RT-1011', 'Elena Cruz', 'Summit Soft', 'elena@summitsoft.com', '+1 646 220 4410', 'Upwork', 'contacted', 'u10', 15500, 'Freelance lead', '2026-11-13', '2026-10-22'),
('l12', 'RT-1012', 'Arjun Desai', 'NovaGrid', 'arjun@novagrid.in', '+91 98220 33445', 'LinkedIn', 'negotiation', 'u11', 52000, 'ERP add-on', '2026-11-15', '2026-09-28'),
('l13', 'RT-1013', 'Sofia Alvarez', 'Bloom Co', 'sofia@bloom.co', '+1 310 771 0099', 'Website', 'proposal', 'u10', 29500, 'Pricing for 40 seats', '2026-11-17', '2026-10-12'),
('l14', 'RT-1014', 'Kabir Singh', 'Plainfield Labs', 'kabir@plainfield.io', '+1 408 555 7721', 'Referral', 'won', 'u9', 18000, 'Starter pack', NULL, '2026-08-19'),
('l15', 'RT-1015', 'Meera Nair', 'Atlas Works', 'meera@atlasworks.in', '+91 99001 11223', 'LinkedIn', 'won', 'u11', 12000, 'Monthly retainer', NULL, '2026-09-02'),
('l16', 'RT-1016', 'Daniel Cho', 'Riverbank AI', 'daniel@riverbank.ai', '+1 650 441 2200', 'Upwork', 'qualified', 'u3', 41000, 'AI ops CRM', '2026-11-19', '2026-10-30'),
('l17', 'RT-1017', 'Isha Kapoor', 'Greenfield Foods', 'isha@greenfield.in', '+91 98765 44321', 'Website', 'contacted', 'u4', 22000, 'Retail CRM', '2026-11-12', '2026-11-03'),
('l18', 'RT-1018', 'Chris Nolan', 'Harbor Analytics', 'chris@harboranalytics.com', '+1 617 555 0199', 'Referral', 'new', 'u10', 9800, 'Trial request', '2026-11-07', '2026-11-05'),
('l19', 'RT-1019', 'Fatima Noor', 'Skyline Retail', 'fatima@skyline.ae', '+971 50 123 4567', 'LinkedIn', 'proposal', 'u11', 61000, 'GCC rollout', '2026-11-22', '2026-09-20'),
('l20', 'RT-1020', 'Ben Torres', 'Copperline', 'ben@copperline.co', '+1 720 555 0144', 'Website', 'won', 'u3', 15000, 'Support renewal', NULL, '2026-08-08');

INSERT INTO clients (id, name, company, email, phone, account_manager_id, status, created_at) VALUES
('cl1', 'Helena Ortiz', 'Brightleaf Retail', 'helena@brightleaf.com', '+1 917 444 2201', 'u3', 'active', '2026-07-20'),
('cl2', 'Priya Nair', 'Mossline Foods', 'priya@mossline.com', '+1 312 908 4411', 'u4', 'active', '2026-10-30'),
('cl3', 'Kabir Singh', 'Plainfield Labs', 'kabir@plainfield.io', '+1 408 555 7721', 'u9', 'active', '2026-08-25'),
('cl4', 'Meera Nair', 'Atlas Works', 'meera@atlasworks.in', '+91 99001 11223', 'u11', 'active', '2026-09-10'),
('cl5', 'Ben Torres', 'Copperline', 'ben@copperline.co', '+1 720 555 0144', 'u3', 'active', '2026-08-15');

INSERT INTO mail_config (id, provider, from_email, enabled, connected_at) VALUES
('mc1', 'smtp', 'proposals@royaltech.io', 0, NULL);

INSERT INTO proposals (id, proposal_code, lead_id, title, amount, status, valid_until, body_text, created_at, last_sent_at) VALUES
('p1', 'PROP-0012', 'l1', 'Website Development Proposal', 24000, 'sent', '2026-11-30', 'Proposal for Northpine Studio website and CRM seats.', '2026-11-01', '2026-11-02 10:00:00'),
('p2', 'PROP-0011', 'l2', 'ERP Solution Proposal', 58000, 'draft', '2026-12-20', 'Warehouse rollout proposal for Cedar & Co.', '2026-11-05', NULL),
('p3', 'PROP-0010', 'l5', 'Mobile App Proposal', 42000, 'accepted', '2026-10-15', 'Annual support and mobile module for Brightleaf Retail.', '2026-09-20', '2026-09-22 14:00:00'),
('p4', 'PROP-0009', 'l3', 'Custom Software Proposal', 31200, 'pending', '2026-12-05', 'Ops suite proposal for Mossline Foods.', '2026-10-25', '2026-10-28 11:30:00'),
('p5', 'PROP-0008', 'l4', 'Digital Marketing Proposal', 8500, 'rejected', '2026-11-10', 'Pilot marketing + CRM package for Quiet Harbor.', '2026-10-01', '2026-10-05 09:00:00'),
('p6', 'PROP-0007', 'l8', 'Multi-store CRM Proposal', 46500, 'sent', '2026-12-12', 'Multi-store CRM rollout for Orbit Retail.', '2026-10-29', '2026-10-30 16:00:00'),
('p7', 'PROP-0006', 'l7', 'Product Demo Follow-up Quote', 27500, 'draft', '2026-12-01', 'Quote following Lumen Labs product demo.', '2026-11-08', NULL),
('p8', 'PROP-0005', 'l12', 'NovaGrid Negotiation Quote', 38000, 'pending', '2026-11-28', 'Updated commercial terms for NovaGrid.', '2026-11-03', '2026-11-04 12:00:00');

INSERT INTO sales_targets (id, owner_id, period, target_amount, achieved_amount) VALUES
('st1', 'u3', 'Oct 2026', 100000, 72000),
('st2', 'u4', 'Oct 2026', 60000, 42000),
('st3', 'u9', 'Oct 2026', 45000, 28000),
('st4', 'u10', 'Oct 2026', 45000, 21000),
('st5', 'u11', 'Oct 2026', 50000, 36000);

INSERT INTO sales_activities (id, lead_id, owner_id, activity_type, title, activity_date) VALUES
('a1', 'l5', 'u3', 'call', 'Deal won — Brightleaf annual support', '2026-11-10'),
('a2', 'l2', 'u3', 'proposal', 'Proposal sent to Cedar & Co', '2026-11-09'),
('a3', 'l10', 'u9', 'email', 'New lead added — BluePeak Media', '2026-11-08'),
('a4', 'l7', 'u3', 'demo', 'Product demo for Lumen Labs', '2026-11-08'),
('a5', 'l12', 'u11', 'meeting', 'Negotiation meeting with NovaGrid', '2026-11-07'),
('a6', 'l9', 'u3', 'call', 'Follow-up call with TechCorp Solutions', '2026-11-06'),
('a7', 'l13', 'u10', 'proposal', 'Proposal sent to Bloom Co', '2026-11-05'),
('a8', 'l14', 'u9', 'call', 'Deal won — Plainfield Labs starter pack', '2026-11-04');

INSERT INTO employees (id, name, email, role_title, department, status, join_date, salary, manager_id) VALUES
('e1', 'Vaishnavi Arora', 'hr@royaltechinnovation.co.in', 'HR Admin', 'HR', 'active', '2023-03-01', 92000, NULL),
('e2', 'Rahul Verma', 'rahul@royaltech.io', 'Sales Manager', 'Sales', 'active', '2022-08-15', 110000, NULL),
('e3', 'Sara Khan', 'sara@royaltech.io', 'Sales Executive', 'Sales', 'active', '2024-01-10', 68000, 'e2'),
('e4', 'Vikram Shah', 'vikram@royaltech.io', 'Project Manager', 'Delivery', 'active', '2021-11-02', 105000, NULL),
('e5', 'Ananya Iyer', 'ananya@royaltech.io', 'Full-stack Developer', 'Engineering', 'active', '2023-06-20', 86000, 'e4'),
('e6', 'Dev Patel', 'dev@royaltech.io', 'Junior Developer', 'Engineering', 'onboarding', '2026-11-03', 52000, 'e4');

INSERT INTO candidates (id, name, role_title, stage, email, created_at) VALUES
('cand1', 'Ishaan Bose', 'React Developer', 'interview', 'ishaan@mail.com', '2026-10-28'),
('cand2', 'Lina Fernandes', 'Sales Executive', 'screening', 'lina@mail.com', '2026-11-02'),
('cand3', 'Kabir Singh', 'QA Engineer', 'applied', 'kabir@mail.com', '2026-11-08');

INSERT INTO leave_requests (id, employee_id, leave_type, date_from, date_to, status) VALUES
('lv1', 'e3', 'Annual', '2026-11-18', '2026-11-20', 'pending'),
('lv2', 'e5', 'Sick', '2026-11-08', '2026-11-08', 'approved'),
('lv3', 'e6', 'Casual', '2026-11-25', '2026-11-25', 'pending');

INSERT INTO projects (id, name, client_id, manager_id, status, progress, deadline, budget) VALUES
('pr1', 'Website Redesign', 'cl1', 'u5', 'active', 70, '2026-12-15', 42000),
('pr2', 'Mobile App Development', 'cl2', 'u5', 'active', 45, '2027-01-20', 31200),
('pr3', 'E-commerce Platform', NULL, 'u5', 'active', 80, '2026-12-01', 18000),
('pr4', 'CRM Analytics Suite', 'cl1', 'u5', 'active', 55, '2027-02-10', 26500),
('pr5', 'Client Portal Refresh', 'cl2', 'u5', 'planned', 18, '2027-03-01', 15400);

INSERT INTO project_tasks (id, project_id, title, assignee_id, status, due_date) VALUES
('t1', 'pr1', 'Develop user authentication API', 'u6', 'doing', '2026-11-13'),
('t2', 'pr1', 'QA permissions matrix', 'u6', 'todo', '2026-11-18'),
('t3', 'pr2', 'Client kickoff deck', 'u5', 'done', '2026-11-05'),
('t4', 'pr2', 'API contract for inventory sync', 'u6', 'blocked', '2026-11-22'),
('t5', 'pr3', 'Homepage wireframes', 'u12', 'todo', '2026-11-30'),
('t6', 'pr1', 'Fix responsive issues on dashboard', 'u6', 'todo', '2026-11-14'),
('t7', 'pr2', 'Database optimization pass', 'u12', 'doing', '2026-11-15'),
('t8', 'pr1', 'API integration for sheets sync', 'u6', 'done', '2026-11-10'),
('t9', 'pr2', 'Review inventory sync PR', 'u5', 'done', '2026-11-12'),
('t10', 'pr3', 'Checkout flow polish', 'u13', 'doing', '2026-11-16'),
('t11', 'pr3', 'Payment gateway QA', 'u13', 'todo', '2026-11-21'),
('t12', 'pr4', 'Build analytics widgets', 'u6', 'doing', '2026-11-19'),
('t13', 'pr4', 'Seed dashboard demo data', 'u12', 'done', '2026-11-11'),
('t14', 'pr4', 'Role-based chart filters', 'u13', 'blocked', '2026-11-17'),
('t15', 'pr5', 'Portal IA workshop notes', 'u5', 'todo', '2026-11-25'),
('t16', 'pr1', 'Deploy staging CRM theme', 'u12', 'done', '2026-11-09'),
('t17', 'pr2', 'Push notification service', 'u13', 'todo', '2026-11-28'),
('t18', 'pr3', 'Order status emails', 'u6', 'todo', '2026-11-24');

INSERT INTO invoices (id, client_id, number, amount, status, due_date, issued_at) VALUES
('inv1', 'cl1', 'INV-2041', 14000, 'paid', '2026-10-01', '2026-09-15'),
('inv2', 'cl1', 'INV-2055', 14000, 'sent', '2026-12-01', '2026-11-01'),
('inv3', 'cl2', 'INV-2058', 8500, 'overdue', '2026-11-01', '2026-10-10');

INSERT INTO payments (id, client_id, invoice_id, amount, payment_date, status) VALUES
('pay1', 'cl1', 'inv1', 14000, '2026-09-28', 'received'),
('pay2', 'cl2', 'inv3', 8500, '2026-11-15', 'pending');

INSERT INTO website_enquiries (id, name, email, subject, status, source, created_at) VALUES
('w1', 'Jordan Lee', 'jordan@acme.io', 'Product demo request', 'new', 'Contact form', '2026-11-09'),
('w2', 'Sofia Alvarez', 'sofia@bloom.co', 'Pricing for 40 seats', 'in_progress', 'Pricing page', '2026-11-07');

INSERT INTO sheet_config (id, spreadsheet_id, sheet_name, enabled, last_synced_at) VALUES
('sc1', '1RoyalTechSalesLeadsSheetDemo', 'Leads', 1, NULL);

UPDATE leads SET sheet_row_id = CONCAT('row_', lead_id) WHERE sheet_row_id IS NULL;
