-- ── Bước 1: Insert Users ──
INSERT INTO [Users] (RoleID, Username, Email, PasswordHash, IsActive, CreatedAt, CreatedDate)
VALUES
(2, 'tranleminh',     'tranleminh@ctxhdut.vn',     '$2a$11$placeholder', 1, GETUTCDATE(), GETUTCDATE()),
(2, 'dangvanhung',    'dangvanhung@ctxhdut.vn',     '$2a$11$placeholder', 1, GETUTCDATE(), GETUTCDATE()),
(2, 'nguyenvietlong', 'nguyenvietlong@ctxhdut.vn',  '$2a$11$placeholder', 1, GETUTCDATE(), GETUTCDATE()),
(3, 'ngovandactri',   'ngovandactri@ctxhdut.vn',    '$2a$11$placeholder', 1, GETUTCDATE(), GETUTCDATE()),
(3, 'huynhducha',     'huynhducha@ctxhdut.vn',      '$2a$11$placeholder', 1, GETUTCDATE(), GETUTCDATE());

-- ── Bước 2: Insert Members ──
INSERT INTO [Members] (UserID, FullName, Position, Department, DisplayOrder, AvatarUrl, Status, JoinDate)
VALUES
(
  (SELECT UserID FROM [Users] WHERE Username = 'tranleminh'),
  N'Trần Lê Minh', N'Chủ nhiệm', N'BCN', 1,
  '/uploads/members/bcn-1.webp', 'Active', GETUTCDATE()
),
(
  (SELECT UserID FROM [Users] WHERE Username = 'dangvanhung'),
  N'Đặng Văn Hưng', N'Phó Chủ nhiệm', N'BCN', 2,
  '/uploads/members/bcn-2.webp', 'Active', GETUTCDATE()
),
(
  (SELECT UserID FROM [Users] WHERE Username = 'nguyenvietlong'),
  N'Nguyễn Viết Nhật Long', N'Phó Chủ nhiệm', N'BCN', 3,
  '/uploads/members/bcn-3.jpg', 'Active', GETUTCDATE()
),
(
  (SELECT UserID FROM [Users] WHERE Username = 'ngovandactri'),
  N'Ngô Văn Đắc Trí', N'Trưởng ban', N'Truyền thông', 1,
  '/uploads/members/tt-1.jpg', 'Active', GETUTCDATE()
),
(
  (SELECT UserID FROM [Users] WHERE Username = 'huynhducha'),
  N'Huỳnh Đức Hà', N'Trưởng ban', N'Phong trào', 1,
  '/uploads/members/pt-1.jpg', 'Active', GETUTCDATE()
);

-- Xóa duplicate Users (giữ lại UserID nhỏ nhất)
DELETE FROM [Users]
WHERE UserID NOT IN (
  SELECT MIN(UserID)
  FROM [Users]
  WHERE Username IN (
    'tranleminh','dangvanhung','nguyenvietlong',
    'ngovandactri','huynhducha'
  )
  GROUP BY Username
)
AND Username IN (
  'tranleminh','dangvanhung','nguyenvietlong',
  'ngovandactri','huynhducha'
);

-- Xóa duplicate Members (giữ lại MemberID nhỏ nhất)
DELETE FROM [Members]
WHERE MemberID NOT IN (
  SELECT MIN(MemberID)
  FROM [Members]
  WHERE FullName IN (
    N'Trần Lê Minh', N'Đặng Văn Hưng', N'Nguyễn Viết Nhật Long',
    N'Ngô Văn Đắc Trí', N'Huỳnh Đức Hà'
  )
  GROUP BY FullName
)
AND FullName IN (
  N'Trần Lê Minh', N'Đặng Văn Hưng', N'Nguyễn Viết Nhật Long',
  N'Ngô Văn Đắc Trí', N'Huỳnh Đức Hà'
);

UPDATE [Members] SET Department = 'BTT' WHERE Department = N'Truyền thông';
UPDATE [Members] SET Department = 'BPT' WHERE Department = N'Phong trào';

UPDATE [Members] 
SET Position = N'Chủ nhiệm'
WHERE FullName = N'Trần Lê Minh';