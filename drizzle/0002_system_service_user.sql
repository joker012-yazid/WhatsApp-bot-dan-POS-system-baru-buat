DO $$
BEGIN
  INSERT INTO "user" (id, name, email, email_verified, image, created_at, updated_at)
  VALUES ('system_service_user', 'System Automation', 'system@local', true, NULL, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
END $$;

