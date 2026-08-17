CREATE TABLE IF NOT EXISTS organization_settings (
  organization_id      BIGINT UNSIGNED PRIMARY KEY,
  registration_number  VARCHAR(100) NULL,
  default_channel      ENUM('SMS','WHATSAPP','EMAIL') NOT NULL DEFAULT 'SMS',
  language             ENUM('en','sw') NOT NULL DEFAULT 'en',
  timezone             ENUM('eat','utc') NOT NULL DEFAULT 'eat',
  date_format          ENUM('dmy','mdy','ymd') NOT NULL DEFAULT 'dmy',
  notifications        JSON NULL,
  security             JSON NULL,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_org_settings_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;
