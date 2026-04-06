-- Thêm admin vào bảng User
INSERT INTO [Users](RoleID, Username, Email, PasswordHash, Phone, IsActive, CreatedAt)
VALUES (
    (SELECT RoleID FROM Roles WHERE RoleName = 'Admin'),
    'admin',
    'admin@club.edu.vn',
    '$2a$11$qR5X9YzL1mN8kH7jF6dA3eB2cV4bN6mP9oI7uY5tR3wE2qA1sD4fG6hJ9kL0',
    '0901234567',
    1,
    GETDATE()
);
SELECT * FROM ExecutiveBoard;
SELECT * FROM Roles;
INSERT INTO [Users] (RoleID, Username, Email, PasswordHash, Phone, IsActive, CreatedAt)
VALUES (
    1,  -- Admin
    'admin',
    'admin@club.edu.vn',
    '$2a$11$qR5X9YzL1mN8kH7jF6dA3eB2cV4bN6mP9oI7uY5tR3wE2qA1sD4fG6hJ9kL0',
    '0901234567',
    1,
    GETDATE()
);
SELECT UserID, RoleID, Username, Email, Phone, IsActive, CreatedAt 
FROM [Users];
INSERT INTO [Users] (RoleID, Username, Email, PasswordHash, Phone, IsActive, CreatedAt)
VALUES (
    1,  -- Admin
    'admin',
    'admin@club.edu.vn',
    '$2a$11$qR5X9YzL1mN8kH7jF6dA3eB2cV4bN6mP9oI7uY5tR3wE2qA1sD4fG6hJ9kL0',
    '0901234567',  -- Phone phải trong dấu nháy đơn
    1,
    GETDATE()
);
-- Xem tất cả cột của bảng Users
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Users'
ORDER BY ORDINAL_POSITION;

INSERT INTO [Users] (RoleID, Username, Email, PasswordHash, Phone, IsActive, CreatedAt, CreatedDate)
VALUES (
    1,  -- RoleID = Admin
    'admin',
    'admin@club.edu.vn',
    '$2a$11$qR5X9YzL1mN8kH7jF6dA3eB2cV4bN6mP9oI7uY5tR3wE2qA1sD4fG6hJ9kL0',
    '0901234567',
    1,  -- IsActive
    GETDATE(),  -- CreatedAt
    GETDATE()   -- CreatedDate
);

SELECT * FROM [Users];

UPDATE [Users] 
SET PasswordHash = '$2a$12$YywEcGu3hDIRnqR4rm/LukzigZvxtMjDkfSKhwFyoZLrF6qH/Ye',
    UpdatedAt = GETDATE()
WHERE Username = 'admin';
SELECT * FROM [Users];

UPDATE Users 
SET PasswordHash = '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.'
WHERE Username = 'admin';
SELECT * FROM [Users];
UPDATE Users SET RoleID = 1 WHERE Username = 'admin';
SELECT * FROM [Users];
DELETE FROM Users WHERE Username = 'admin';
UPDATE Users SET RoleID = 1 WHERE Username = 'admin';