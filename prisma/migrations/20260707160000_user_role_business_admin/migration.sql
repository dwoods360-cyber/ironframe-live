-- Designated business operators for perimeter workforce apps (:8082–:8086).
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'BUSINESS_ADMIN';
