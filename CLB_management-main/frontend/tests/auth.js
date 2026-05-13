// auth.js - Login & Register logic
document.addEventListener('DOMContentLoaded', () => {
  if (Auth.isLoggedIn()) { location.href = 'index1.html'; return; }
  document.getElementById('loginForm')?.addEventListener('submit', doLogin);
  document.getElementById('registerForm')?.addEventListener('submit', doRegister);
});

async function doLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const f = e.target;
  btn.disabled = true; btn.textContent = 'Đang đăng nhập...';
  try {
    const r = await API.login({ username: f.username.value.trim(), password: f.password.value });

    console.log('🔍 Login response:', JSON.stringify(r)); // DEBUG — xóa sau khi xác nhận fix xong

    // Lấy token an toàn — thử nhiều vị trí có thể có tùy backend
    const token = r.data?.token || r.token || r.data?.accessToken || r.accessToken;
    if (!token) throw new Error('Server không trả về token. Xem Console (F12) để kiểm tra response.');

    // Lưu token riêng, lưu user info riêng (không lẫn token vào object user)
    Auth.setToken(token);
    const userInfo = { ...r.data };
    delete userInfo.token;
    delete userInfo.accessToken;
    Auth.setUser(userInfo);

    Toast.success(`Chào mừng ${r.data.username}!`);
    setTimeout(() => {
      location.href = (r.data.role === 'Admin' || r.data.role === 'ExecutiveBoard')
        ? 'Admin-dashboard.html'
        : 'index1.html';
    }, 700);
  } catch(e) {
    Toast.error(e.message);
    btn.disabled = false; btn.textContent = 'Đăng nhập →';
  }
}

async function doRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('registerBtn');
  const f = e.target;
  if (f.password.value !== f.confirm.value) { Toast.error('Mật khẩu không khớp'); return; }
  if (f.password.value.length < 6) { Toast.error('Mật khẩu tối thiểu 6 ký tự'); return; }
  btn.disabled = true; btn.textContent = 'Đang đăng ký...';
  try {
    // FIX: Đổi API.register -> API.registerUser
    const r = await API.registerUser({
      username: f.username.value.trim(),
      email: f.email.value.trim(),
      password: f.password.value,
      fullName: f.fullName.value.trim(),
      phone: f.phone?.value.trim() || null,
      className: f.className?.value.trim() || null,
      faculty: f.faculty?.value.trim() || null,
    });

    const token = r.data?.token || r.token || r.data?.accessToken || r.accessToken;
    if (!token) throw new Error('Server không trả về token sau đăng ký.');

    Auth.setToken(token);
    const userInfo = { ...r.data };
    delete userInfo.token;
    delete userInfo.accessToken;
    Auth.setUser(userInfo);

    Toast.success('Đăng ký thành công! Chào mừng bạn!');
    setTimeout(() => location.href = 'index1.html', 700);
  } catch(e) {
    Toast.error(e.message);
    btn.disabled = false; btn.textContent = '🎉 Đăng ký ngay';
  }
}