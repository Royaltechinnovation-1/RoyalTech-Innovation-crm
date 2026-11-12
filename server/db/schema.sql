CREATE DATABASE IF NOT EXISTS royaltech_crm
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE royaltech_crm;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  role VARCHAR(40) NOT NULL,
  department VARCHAR(80) NOT NULL,
  avatar_initials VARCHAR(8) NOT NULL,
  manager_id VARCHAR(32) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_manager FOREIGN KEY (manager_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(32) PRIMARY KEY,
  lead_id VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  company VARCHAR(160) NOT NULL,
  email VARCHAR(160) NOT NULL,
  phone VARCHAR(40) NULL,
  source VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL,
  owner_id VARCHAR(32) NOT NULL,
  value DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  next_follow_up DATE NULL,
  created_at DATE NOT NULL,
  sheet_row_id VARCHAR(64) NULL,
  INDEX idx_leads_owner (owner_id),
  INDEX idx_leads_status (status),
  CONSTRAINT fk_leads_owner FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sheet_config (
  id VARCHAR(32) PRIMARY KEY,
  spreadsheet_id VARCHAR(160) NOT NULL,
  sheet_name VARCHAR(120) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  last_synced_at DATETIME NULL
);

CREATE TABLE IF NOT EXISTS sheet_sync_logs (
  id VARCHAR(32) PRIMARY KEY,
  lead_id VARCHAR(32) NOT NULL,
  status VARCHAR(40) NOT NULL,
  message VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  company VARCHAR(160) NOT NULL,
  email VARCHAR(160) NOT NULL,
  phone VARCHAR(40) NULL,
  account_manager_id VARCHAR(32) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATE NOT NULL,
  CONSTRAINT fk_clients_manager FOREIGN KEY (account_manager_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS proposals (
  id VARCHAR(32) PRIMARY KEY,
  proposal_code VARCHAR(32) NOT NULL,
  lead_id VARCHAR(32) NOT NULL,
  title VARCHAR(200) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL,
  valid_until DATE NOT NULL,
  body_text TEXT NULL,
  created_at DATE NOT NULL,
  last_sent_at DATETIME NULL,
  CONSTRAINT fk_proposals_lead FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE TABLE IF NOT EXISTS proposal_mail_logs (
  id VARCHAR(32) PRIMARY KEY,
  proposal_id VARCHAR(32) NOT NULL,
  to_email VARCHAR(160) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(40) NOT NULL,
  message VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_proposal_mail_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(id)
);

CREATE TABLE IF NOT EXISTS mail_config (
  id VARCHAR(32) PRIMARY KEY,
  provider VARCHAR(40) NOT NULL,
  from_email VARCHAR(160) NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  connected_at DATETIME NULL
);

CREATE TABLE IF NOT EXISTS sales_targets (
  id VARCHAR(32) PRIMARY KEY,
  owner_id VARCHAR(32) NOT NULL,
  period VARCHAR(40) NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL,
  achieved_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_targets_owner FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sales_activities (
  id VARCHAR(32) PRIMARY KEY,
  lead_id VARCHAR(32) NULL,
  owner_id VARCHAR(32) NOT NULL,
  activity_type VARCHAR(40) NOT NULL,
  title VARCHAR(200) NOT NULL,
  activity_date DATE NOT NULL,
  CONSTRAINT fk_act_lead FOREIGN KEY (lead_id) REFERENCES leads(id),
  CONSTRAINT fk_act_owner FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  role_title VARCHAR(120) NOT NULL,
  department VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL,
  join_date DATE NOT NULL,
  salary DECIMAL(12,2) NULL,
  manager_id VARCHAR(32) NULL
);

CREATE TABLE IF NOT EXISTS candidates (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  role_title VARCHAR(120) NOT NULL,
  stage VARCHAR(40) NOT NULL,
  email VARCHAR(160) NOT NULL,
  created_at DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id VARCHAR(32) PRIMARY KEY,
  employee_id VARCHAR(32) NOT NULL,
  leave_type VARCHAR(40) NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  CONSTRAINT fk_leave_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  client_id VARCHAR(32) NULL,
  manager_id VARCHAR(32) NOT NULL,
  status VARCHAR(40) NOT NULL,
  progress INT NOT NULL DEFAULT 0,
  deadline DATE NOT NULL,
  budget DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_projects_manager FOREIGN KEY (manager_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_tasks (
  id VARCHAR(32) PRIMARY KEY,
  project_id VARCHAR(32) NOT NULL,
  title VARCHAR(200) NOT NULL,
  assignee_id VARCHAR(32) NOT NULL,
  status VARCHAR(40) NOT NULL,
  due_date DATE NOT NULL,
  CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(32) PRIMARY KEY,
  client_id VARCHAR(32) NOT NULL,
  number VARCHAR(40) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL,
  due_date DATE NOT NULL,
  issued_at DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(32) PRIMARY KEY,
  client_id VARCHAR(32) NOT NULL,
  invoice_id VARCHAR(32) NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS website_enquiries (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  status VARCHAR(40) NOT NULL,
  source VARCHAR(80) NOT NULL,
  created_at DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id VARCHAR(32) PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  department VARCHAR(80) NOT NULL,
  language VARCHAR(40) NOT NULL DEFAULT 'English',
  timezone VARCHAR(80) NOT NULL DEFAULT 'IST (GMT+5:30)',
  theme VARCHAR(40) NOT NULL DEFAULT 'Light',
  density VARCHAR(40) NOT NULL DEFAULT 'Comfortable',
  two_factor TINYINT(1) NOT NULL DEFAULT 1,
  show_online TINYINT(1) NOT NULL DEFAULT 1,
  notify_tasks TINYINT(1) NOT NULL DEFAULT 1,
  notify_projects TINYINT(1) NOT NULL DEFAULT 1,
  notify_bugs TINYINT(1) NOT NULL DEFAULT 1,
  notify_messages TINYINT(1) NOT NULL DEFAULT 1,
  notify_team TINYINT(1) NOT NULL DEFAULT 0,
  password VARCHAR(120) NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES users(id)
);
