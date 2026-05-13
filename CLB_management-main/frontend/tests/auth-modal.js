// ================================================
// auth-modal.js
// Modal đăng nhập / đăng ký / quên mật khẩu / OTP
// Dùng chung cho toàn bộ website - chèn vào bất kỳ trang nào
// ================================================

(function () {

  // ── Inject HTML modal vào body ──────────────────────────────────────────────
  function injectModal() {
    if (document.getElementById('authModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
<div id="authModal" style="
  position:fixed;inset:0;z-index:9000;
  background:rgba(0,0,0,0.75);
  backdrop-filter:blur(6px);
  display:none;align-items:center;justify-content:center;
  opacity:0;transition:opacity 0.22s">

  <div id="authBox" style="
    background:#111827;border:1px solid rgba(255,255,255,0.09);
    border-radius:16px;padding:32px 30px;width:100%;max-width:420px;
    margin:16px;max-height:90vh;overflow-y:auto;
    transform:scale(0.96) translateY(10px);
    transition:transform 0.22s">

    <!-- Logo + close -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px">
      <span style="font-size:17px;font-weight:700;color:white">CTXH<span style="color:#ff2d55">DUT</span></span>
      <button onclick="AuthModal.close()" style="
        width:28px;height:28px;border-radius:50%;background:#1e293b;
        border:1px solid rgba(255,255,255,0.08);color:#94a3b8;font-size:14px;
        cursor:pointer;display:flex;align-items:center;justify-content:center;
        transition:background 0.2s;font-family:Arial,sans-serif"
        onmouseover="this.style.background='#ff2d55';this.style.color='white'"
        onmouseout="this.style.background='#1e293b';this.style.color='#94a3b8'">✕</button>
    </div>

    <!-- ── PANEL: ĐĂNG NHẬP ── -->
    <div id="am-login">
      <div style="margin-bottom:22px">
        <div style="font-size:20px;font-weight:700;margin-bottom:4px">Đăng nhập</div>
        <div style="font-size:13px;color:#64748b">Chào mừng trở lại!</div>
      </div>

      <!-- Google button -->
      <button onclick="AuthModal.loginGoogle()" style="
        width:100%;padding:10px;border-radius:8px;
        background:#fff;border:1px solid #e2e8f0;color:#111;
        font-size:14px;font-weight:600;cursor:pointer;
        display:flex;align-items:center;justify-content:center;gap:10px;
        transition:background 0.2s;margin-bottom:18px;font-family:Arial,sans-serif"
        onmouseover="this.style.background='#f8fafc'"
        onmouseout="this.style.background='#fff'">
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.9 7.1 29.2 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.6-.4-3.9z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.8 18.9 13 24 13c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.9 7.1 29.2 5 24 5c-7.7 0-14.4 4.4-17.7 9.7z"/>
          <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 36.3 26.8 37 24 37c-5.3 0-9.7-3.5-11.3-8.3L6 33.8C9.3 40.3 16.1 45 24 45z"/>
          <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.2 5.2C41.4 35.3 44 30.5 44 25c0-1.3-.1-2.6-.4-3.9z"/>
        </svg>
        Tiếp tục với Google
      </button>

      <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
        <div style="flex:1;height:1px;background:rgba(255,255,255,0.07)"></div>
        <span style="font-size:12px;color:#334155">hoặc</span>
        <div style="flex:1;height:1px;background:rgba(255,255,255,0.07)"></div>
      </div>

      <div style="margin-bottom:14px">
        <label style="display:block;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">Tên đăng nhập</label>
        <input id="am-username" type="text" placeholder="Nhập tên đăng nhập..." style="
          width:100%;padding:10px 13px;background:#1e293b;border:1px solid rgba(255,255,255,0.07);
          border-radius:8px;color:white;font-size:14px;outline:none;font-family:Arial,sans-serif;
          transition:border-color 0.2s;box-sizing:border-box"
          onfocus="this.style.borderColor='#ff2d55'" onblur="this.style.borderColor='rgba(255,255,255,0.07)'"
          onkeydown="if(event.key==='Enter')AuthModal.doLogin()">
      </div>

      <div style="margin-bottom:6px">
        <label style="display:block;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">Mật khẩu</label>
        <div style="position:relative">
          <input id="am-password" type="password" placeholder="••••••••" style="
            width:100%;padding:10px 40px 10px 13px;background:#1e293b;
            border:1px solid rgba(255,255,255,0.07);border-radius:8px;
            color:white;font-size:14px;outline:none;font-family:Arial,sans-serif;
            transition:border-color 0.2s;box-sizing:border-box"
            onfocus="this.style.borderColor='#ff2d55'" onblur="this.style.borderColor='rgba(255,255,255,0.07)'"
            onkeydown="if(event.key==='Enter')AuthModal.doLogin()">
          <button onclick="AuthModal.togglePwd('am-password',this)" style="
            position:absolute;right:10px;top:50%;transform:translateY(-50%);
            background:none;border:none;color:#475569;cursor:pointer;font-size:14px;
            font-family:Arial,sans-serif;padding:2px">👁</button>
        </div>
      </div>

      <div style="text-align:right;margin-bottom:18px">
        <button onclick="AuthModal.show('forgot')" style="
          background:none;border:none;color:#ff2d55;font-size:12px;
          cursor:pointer;font-family:Arial,sans-serif;padding:0">Quên mật khẩu?</button>
      </div>

      <button id="am-loginBtn" onclick="AuthModal.doLogin()" style="
        width:100%;padding:11px;background:#ff2d55;border:none;border-radius:8px;
        color:white;font-size:15px;font-weight:700;cursor:pointer;
        transition:background 0.2s;font-family:Arial,sans-serif;margin-bottom:16px"
        onmouseover="this.style.background='#e0203d'" onmouseout="this.style.background='#ff2d55'">
        Đăng nhập →
      </button>

      <div style="text-align:center;font-size:13px;color:#475569">
        Chưa có tài khoản?
        <button onclick="AuthModal.show('register')" style="
          background:none;border:none;color:#ff2d55;font-size:13px;font-weight:700;
          cursor:pointer;font-family:Arial,sans-serif;padding:0 0 0 4px">Đăng ký ngay</button>
      </div>
    </div>

    <!-- ── PANEL: ĐĂNG KÝ ── -->
    <div id="am-register" style="display:none">
      <div style="margin-bottom:20px">
        <div style="font-size:20px;font-weight:700;margin-bottom:4px">Tạo tài khoản</div>
        <div style="font-size:13px;color:#64748b">Gia nhập CLB CTXH DUT!</div>
      </div>

      <!-- Google -->
      <button onclick="AuthModal.loginGoogle()" style="
        width:100%;padding:10px;border-radius:8px;background:#fff;
        border:1px solid #e2e8f0;color:#111;font-size:14px;font-weight:600;
        cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;
        transition:background 0.2s;margin-bottom:16px;font-family:Arial,sans-serif"
        onmouseover="this.style.background='#f8fafc'"
        onmouseout="this.style.background='#fff'">
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.9 7.1 29.2 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.6-.4-3.9z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.8 18.9 13 24 13c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.9 7.1 29.2 5 24 5c-7.7 0-14.4 4.4-17.7 9.7z"/>
          <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 36.3 26.8 37 24 37c-5.3 0-9.7-3.5-11.3-8.3L6 33.8C9.3 40.3 16.1 45 24 45z"/>
          <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.2 5.2C41.4 35.3 44 30.5 44 25c0-1.3-.1-2.6-.4-3.9z"/>
        </svg>
        Đăng ký bằng Google
      </button>

      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <div style="flex:1;height:1px;background:rgba(255,255,255,0.07)"></div>
        <span style="font-size:12px;color:#334155">hoặc điền thông tin</span>
        <div style="flex:1;height:1px;background:rgba(255,255,255,0.07)"></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div>
          <label style="display:block;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">Họ và tên *</label>
          <input id="am-fullname" placeholder="Nguyễn Văn A" style="
            width:100%;padding:9px 12px;background:#1e293b;border:1px solid rgba(255,255,255,0.07);
            border-radius:8px;color:white;font-size:13px;outline:none;font-family:Arial,sans-serif;
            transition:border-color 0.2s;box-sizing:border-box"
            onfocus="this.style.borderColor='#ff2d55'" onblur="this.style.borderColor='rgba(255,255,255,0.07)'">
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">Lớp</label>
          <input id="am-class" placeholder="22TCLC_DT1" style="
            width:100%;padding:9px 12px;background:#1e293b;border:1px solid rgba(255,255,255,0.07);
            border-radius:8px;color:white;font-size:13px;outline:none;font-family:Arial,sans-serif;
            transition:border-color 0.2s;box-sizing:border-box"
            onfocus="this.style.borderColor='#ff2d55'" onblur="this.style.borderColor='rgba(255,255,255,0.07)'">
        </div>
      </div>

      <div style="margin-bottom:12px">
        <label style="display:block;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">Tên đăng nhập *</label>
        <input id="am-reg-username" placeholder="vana123" style="
          width:100%;padding:9px 12px;background:#1e293b;border:1px solid rgba(255,255,255,0.07);
          border-radius:8px;color:white;font-size:13px;outline:none;font-family:Arial,sans-serif;
          transition:border-color 0.2s;box-sizing:border-box"
          onfocus="this.style.borderColor='#ff2d55'" onblur="this.style.borderColor='rgba(255,255,255,0.07)'">
      </div>

      <div style="margin-bottom:12px">
        <label style="display:block;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">
          Email * <span style="color:#f59e0b;font-weight:400;text-transform:none">(nhận mã xác thực)</span>
        </label>
        <input id="am-email" type="email" placeholder="vana@gmail.com" style="
          width:100%;padding:9px 12px;background:#1e293b;border:1px solid rgba(255,255,255,0.07);
          border-radius:8px;color:white;font-size:13px;outline:none;font-family:Arial,sans-serif;
          transition:border-color 0.2s;box-sizing:border-box"
          onfocus="this.style.borderColor='#ff2d55'" onblur="this.style.borderColor='rgba(255,255,255,0.07)'">
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <div>
          <label style="display:block;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">Mật khẩu *</label>
          <input id="am-reg-pwd" type="password" placeholder="••••••" minlength="6" style="
            width:100%;padding:9px 12px;background:#1e293b;border:1px solid rgba(255,255,255,0.07);
            border-radius:8px;color:white;font-size:13px;outline:none;font-family:Arial,sans-serif;
            transition:border-color 0.2s;box-sizing:border-box"
            onfocus="this.style.borderColor='#ff2d55'" onblur="this.style.borderColor='rgba(255,255,255,0.07)'">
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">Nhập lại *</label>
          <input id="am-reg-confirm" type="password" placeholder="••••••" style="
            width:100%;padding:9px 12px;background:#1e293b;border:1px solid rgba(255,255,255,0.07);
            border-radius:8px;color:white;font-size:13px;outline:none;font-family:Arial,sans-serif;
            transition:border-color 0.2s;box-sizing:border-box"
            onfocus="this.style.borderColor='#ff2d55'" onblur="this.style.borderColor='rgba(255,255,255,0.07)'">
        </div>
      </div>

      <button id="am-registerBtn" onclick="AuthModal.doRegister()" style="
        width:100%;padding:11px;background:#ff2d55;border:none;border-radius:8px;
        color:white;font-size:15px;font-weight:700;cursor:pointer;
        transition:background 0.2s;font-family:Arial,sans-serif;margin-bottom:14px"
        onmouseover="this.style.background='#e0203d'" onmouseout="this.style.background='#ff2d55'">
        📧 Gửi mã xác thực
      </button>

      <div style="text-align:center;font-size:13px;color:#475569">
        Đã có tài khoản?
        <button onclick="AuthModal.show('login')" style="
          background:none;border:none;color:#ff2d55;font-size:13px;font-weight:700;
          cursor:pointer;font-family:Arial,sans-serif;padding:0 0 0 4px">Đăng nhập</button>
      </div>
    </div>

    <!-- ── PANEL: OTP ── -->
    <div id="am-otp" style="display:none">
      <div style="text-align:center;margin-bottom:22px">
        <div style="font-size:2.2rem;margin-bottom:10px">📧</div>
        <div style="font-size:19px;font-weight:700;margin-bottom:6px">Xác thực Email</div>
        <div style="font-size:13px;color:#64748b;line-height:1.6">
          Mã 6 chữ số đã gửi đến<br>
          <strong id="am-otp-email" style="color:#e2e8f0"></strong>
        </div>
      </div>

      <!-- 6 ô OTP -->
      <div id="am-otp-boxes" style="display:flex;gap:8px;justify-content:center;margin-bottom:20px">
        <input class="am-otp-input" maxlength="1" style="width:44px;height:52px;text-align:center;font-size:20px;font-weight:700;border-radius:10px;border:2px solid rgba(255,255,255,0.1);background:#1e293b;color:white;outline:none;font-family:Arial,sans-serif;transition:border-color 0.2s">
        <input class="am-otp-input" maxlength="1" style="width:44px;height:52px;text-align:center;font-size:20px;font-weight:700;border-radius:10px;border:2px solid rgba(255,255,255,0.1);background:#1e293b;color:white;outline:none;font-family:Arial,sans-serif;transition:border-color 0.2s">
        <input class="am-otp-input" maxlength="1" style="width:44px;height:52px;text-align:center;font-size:20px;font-weight:700;border-radius:10px;border:2px solid rgba(255,255,255,0.1);background:#1e293b;color:white;outline:none;font-family:Arial,sans-serif;transition:border-color 0.2s">
        <input class="am-otp-input" maxlength="1" style="width:44px;height:52px;text-align:center;font-size:20px;font-weight:700;border-radius:10px;border:2px solid rgba(255,255,255,0.1);background:#1e293b;color:white;outline:none;font-family:Arial,sans-serif;transition:border-color 0.2s">
        <input class="am-otp-input" maxlength="1" style="width:44px;height:52px;text-align:center;font-size:20px;font-weight:700;border-radius:10px;border:2px solid rgba(255,255,255,0.1);background:#1e293b;color:white;outline:none;font-family:Arial,sans-serif;transition:border-color 0.2s">
        <input class="am-otp-input" maxlength="1" style="width:44px;height:52px;text-align:center;font-size:20px;font-weight:700;border-radius:10px;border:2px solid rgba(255,255,255,0.1);background:#1e293b;color:white;outline:none;font-family:Arial,sans-serif;transition:border-color 0.2s">
      </div>

      <!-- Đếm ngược -->
      <div style="text-align:center;margin-bottom:18px;font-size:13px;color:#475569">
        Mã hết hạn sau <strong id="am-countdown" style="color:#f59e0b">10:00</strong>
      </div>

      <button id="am-verifyBtn" onclick="AuthModal.doVerifyOtp()" disabled style="
        width:100%;padding:11px;background:#ff2d55;border:none;border-radius:8px;
        color:white;font-size:15px;font-weight:700;cursor:pointer;opacity:0.4;
        transition:background 0.2s,opacity 0.2s;font-family:Arial,sans-serif;margin-bottom:14px">
        ✅ Xác thực
      </button>

      <div style="text-align:center;margin-bottom:10px">
        <span style="font-size:13px;color:#475569">Không nhận được? </span>
        <button id="am-resendBtn" onclick="AuthModal.doResendOtp()" disabled style="
          background:none;border:none;color:#ff2d55;font-size:13px;font-weight:700;
          cursor:pointer;font-family:Arial,sans-serif;opacity:0.4;transition:opacity 0.2s">
          Gửi lại
        </button>
      </div>

      <div style="text-align:center">
        <button onclick="AuthModal.show('register')" style="
          background:none;border:none;color:#475569;font-size:13px;
          cursor:pointer;font-family:Arial,sans-serif">← Quay lại</button>
      </div>
    </div>

    <!-- ── PANEL: QUÊN MẬT KHẨU ── -->
    <div id="am-forgot" style="display:none">
      <div style="margin-bottom:22px">
        <div style="font-size:20px;font-weight:700;margin-bottom:4px">Quên mật khẩu?</div>
        <div style="font-size:13px;color:#64748b;line-height:1.6">
          Nhập email đăng ký, chúng tôi sẽ gửi<br>hướng dẫn đặt lại mật khẩu.
        </div>
      </div>

      <div style="margin-bottom:18px">
        <label style="display:block;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">Email đăng ký</label>
        <input id="am-forgot-email" type="email" placeholder="your@gmail.com" style="
          width:100%;padding:10px 13px;background:#1e293b;border:1px solid rgba(255,255,255,0.07);
          border-radius:8px;color:white;font-size:14px;outline:none;font-family:Arial,sans-serif;
          transition:border-color 0.2s;box-sizing:border-box"
          onfocus="this.style.borderColor='#ff2d55'" onblur="this.style.borderColor='rgba(255,255,255,0.07)'"
          onkeydown="if(event.key==='Enter')AuthModal.doForgotPwd()">
      </div>

      <button id="am-forgotBtn" onclick="AuthModal.doForgotPwd()" style="
        width:100%;padding:11px;background:#ff2d55;border:none;border-radius:8px;
        color:white;font-size:15px;font-weight:700;cursor:pointer;
        transition:background 0.2s;font-family:Arial,sans-serif;margin-bottom:14px"
        onmouseover="this.style.background='#e0203d'" onmouseout="this.style.background='#ff2d55'">
        📧 Gửi hướng dẫn
      </button>

      <div style="text-align:center">
        <button onclick="AuthModal.show('login')" style="
          background:none;border:none;color:#475569;font-size:13px;
          cursor:pointer;font-family:Arial,sans-serif">← Quay lại đăng nhập</button>
      </div>
    </div>

    <!-- ── PANEL: FORGOT SUCCESS ── -->
    <div id="am-forgot-sent" style="display:none;text-align:center;padding:10px 0">
      <div style="font-size:2.5rem;margin-bottom:14px">✉️</div>
      <div style="font-size:19px;font-weight:700;margin-bottom:8px">Đã gửi!</div>
      <div style="font-size:13px;color:#64748b;line-height:1.7;margin-bottom:22px">
        Kiểm tra hộp thư <strong id="am-forgot-sent-email" style="color:#e2e8f0"></strong><br>
        và làm theo hướng dẫn trong email.
      </div>
      <button onclick="AuthModal.show('login')" style="
        width:100%;padding:11px;background:#ff2d55;border:none;border-radius:8px;
        color:white;font-size:15px;font-weight:700;cursor:pointer;
        font-family:Arial,sans-serif"
        onmouseover="this.style.background='#e0203d'" onmouseout="this.style.background='#ff2d55'">
        Về trang đăng nhập
      </button>
    </div>

  </div>
</div>

<style>
@keyframes am-shake{0%,100%{transform:scale(0.96) translateY(10px) translateX(0)}25%{transform:scale(0.96) translateY(10px) translateX(-8px)}75%{transform:scale(0.96) translateY(10px) translateX(8px)}}
#authModal::-webkit-scrollbar{width:4px}#authModal::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px}
#authBox::-webkit-scrollbar{width:4px}#authBox::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px}
.am-otp-input:focus{border-color:#ff2d55 !important}
</style>`);

    // Đóng khi click nền
    document.getElementById('authModal').addEventListener('click', function (e) {
      if (e.target === this) AuthModal.close();
    });

    // Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') AuthModal.close();
    });
  }

  // ── State ────────────────────────────────────────────────────────────────────
  let _pendingEmail = '';
  let _pendingRegData = null;
  let _countdownTimer = null;

  // ── Public API ────────────────────────────────────────────────────────────────
  window.AuthModal = {

    open(panel) {
      injectModal();
      this.show(panel || 'login');
      const overlay = document.getElementById('authModal');
      overlay.style.display = 'flex';
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        document.getElementById('authBox').style.transform = 'scale(1) translateY(0)';
      });
      setTimeout(() => {
        const first = document.querySelector('#am-' + (panel || 'login') + ' input');
        first?.focus();
      }, 250);
    },

    close() {
      const overlay = document.getElementById('authModal');
      if (!overlay) return;
      overlay.style.opacity = '0';
      document.getElementById('authBox').style.transform = 'scale(0.96) translateY(10px)';
      setTimeout(() => { overlay.style.display = 'none'; }, 220);
      clearInterval(_countdownTimer);
    },

    show(panel) {
      ['login','register','otp','forgot','forgot-sent'].forEach(p => {
        const el = document.getElementById('am-' + p);
        if (el) el.style.display = 'none';
      });
      const target = document.getElementById('am-' + panel);
      if (target) target.style.display = 'block';

      if (panel === 'otp') {
        this._setupOtpInputs();
        this._startCountdown(10 * 60);
      }
    },

    togglePwd(inputId, btn) {
      const inp = document.getElementById(inputId);
      if (!inp) return;
      inp.type = inp.type === 'password' ? 'text' : 'password';
      btn.textContent = inp.type === 'password' ? '👁' : '🙈';
    },

    // ── Đăng nhập ─────────────────────────────────────────────────────────────
    async doLogin() {
      const username = document.getElementById('am-username')?.value.trim();
      const password = document.getElementById('am-password')?.value;
      const btn = document.getElementById('am-loginBtn');

      if (!username || !password) { this._toast('Vui lòng nhập đầy đủ thông tin', 'error'); return; }

      btn.disabled = true; btn.textContent = '⏳ Đang đăng nhập...';

      try {
        const r = await API.login({ username, password });
        Auth.setToken(r.data.token);
        Auth.setUser(r.data);
        this.close();
        this._toast(`Chào mừng ${r.data.username}! 👋`, 'success');
        updateNavbar();

        if (r.data.role === 'Admin' || r.data.role === 'ExecutiveBoard') {
          setTimeout(() => location.href = 'Admin-dashboard.html', 800);
        }
      } catch (e) {
        const msg = e.message.includes('chưa xác thực') || e.message.includes('401')
          ? 'Tài khoản chưa xác thực email hoặc thông tin không đúng'
          : e.message;
        this._toast(msg, 'error');
        btn.disabled = false; btn.textContent = 'Đăng nhập →';
      }
    },

    // ── Đăng ký → gửi OTP ────────────────────────────────────────────────────
    async doRegister() {
      const fullName  = document.getElementById('am-fullname')?.value.trim();
      const username  = document.getElementById('am-reg-username')?.value.trim();
      const email     = document.getElementById('am-email')?.value.trim();
      const password  = document.getElementById('am-reg-pwd')?.value;
      const confirm   = document.getElementById('am-reg-confirm')?.value;
      const className = document.getElementById('am-class')?.value.trim();
      const btn = document.getElementById('am-registerBtn');

      if (!fullName || !username || !email || !password) {
        this._toast('Vui lòng điền đầy đủ thông tin bắt buộc (*)', 'error'); return;
      }
      if (password !== confirm) { this._toast('Mật khẩu xác nhận không khớp', 'error'); return; }
      if (password.length < 6)  { this._toast('Mật khẩu tối thiểu 6 ký tự', 'error'); return; }

      btn.disabled = true; btn.textContent = '⏳ Đang gửi mã...';

      _pendingRegData = { fullName, username, email, password, className: className || null };
      _pendingEmail = email;

      try {
        await API.register(_pendingRegData);
        this._toast('Mã OTP đã gửi đến Gmail của bạn! 📧', 'success');
        document.getElementById('am-otp-email').textContent = email;
        this.show('otp');
      } catch (e) {
        this._toast(e.message, 'error');
        btn.disabled = false; btn.textContent = '📧 Gửi mã xác thực';
      }
    },

    // ── Xác thực OTP ──────────────────────────────────────────────────────────
    async doVerifyOtp() {
      const otp = [...document.querySelectorAll('.am-otp-input')].map(i => i.value).join('');
      if (otp.length < 6) { this._toast('Nhập đủ 6 chữ số', 'error'); return; }

      const btn = document.getElementById('am-verifyBtn');
      btn.disabled = true; btn.textContent = '⏳ Đang xác thực...';

      try {
        const res = await fetch(`${typeof API_BASE !== 'undefined' ? API_BASE : 'http://localhost:5190/api'}/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: _pendingEmail, otp })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Xác thực thất bại');

        Auth.setToken(data.data.token);
        Auth.setUser(data.data);
        clearInterval(_countdownTimer);
        this.close();
        this._toast('🎉 Đăng ký thành công! Chào mừng bạn!', 'success');
        updateNavbar();
      } catch (e) {
        this._toast(e.message, 'error');
        // Rung hộp OTP
        const boxes = document.getElementById('am-otp-boxes');
        boxes.style.animation = 'am-shake 0.4s';
        setTimeout(() => boxes.style.animation = '', 400);
        btn.disabled = false; btn.textContent = '✅ Xác thực';
      }
    },

    // ── Gửi lại OTP ───────────────────────────────────────────────────────────
    async doResendOtp() {
      const btn = document.getElementById('am-resendBtn');
      btn.disabled = true; btn.style.opacity = '0.4';

      try {
        const res = await fetch(`${typeof API_BASE !== 'undefined' ? API_BASE : 'http://localhost:5190/api'}/auth/resend-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: _pendingEmail })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Gửi lại thất bại');

        this._toast('Đã gửi lại mã OTP mới!', 'success');
        this._setupOtpInputs();
        this._startCountdown(10 * 60);
      } catch (e) {
        this._toast(e.message, 'error');
        btn.disabled = false; btn.style.opacity = '1';
      }
    },

    // ── Quên mật khẩu ────────────────────────────────────────────────────────
    async doForgotPwd() {
      const email = document.getElementById('am-forgot-email')?.value.trim();
      const btn   = document.getElementById('am-forgotBtn');

      if (!email) { this._toast('Vui lòng nhập email', 'error'); return; }

      btn.disabled = true; btn.textContent = '⏳ Đang gửi...';

      // Gọi API forgot password (nếu có) hoặc mock
      try {
        // await fetch(`${API_BASE}/auth/forgot-password`, {...})
        // Tạm thời simulate thành công sau 1.5s
        await new Promise(r => setTimeout(r, 1500));
        document.getElementById('am-forgot-sent-email').textContent = email;
        this.show('forgot-sent');
      } catch (e) {
        this._toast(e.message, 'error');
        btn.disabled = false; btn.textContent = '📧 Gửi hướng dẫn';
      }
    },

    // ── Google Login (placeholder) ─────────────────────────────────────────────
    loginGoogle() {
      this._toast('Tính năng Google OAuth đang được phát triển!', 'info');
    },

    // ── Setup 6 ô OTP ─────────────────────────────────────────────────────────
    _setupOtpInputs() {
      const inputs = document.querySelectorAll('.am-otp-input');
      inputs.forEach((inp, i) => {
        inp.value = '';
        inp.style.borderColor = 'rgba(255,255,255,0.1)';

        inp.oninput = () => {
          inp.value = inp.value.replace(/\D/g, '').slice(0, 1);
          if (inp.value && i < inputs.length - 1) inputs[i + 1].focus();
          const complete = [...inputs].every(x => x.value);
          const btn = document.getElementById('am-verifyBtn');
          btn.disabled = !complete;
          btn.style.opacity = complete ? '1' : '0.4';
          btn.style.cursor  = complete ? 'pointer' : 'not-allowed';
        };

        inp.onkeydown = (e) => {
          if (e.key === 'Backspace' && !inp.value && i > 0) inputs[i - 1].focus();
        };

        inp.onpaste = (e) => {
          e.preventDefault();
          const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
          [...text].slice(0, 6).forEach((ch, j) => { if (inputs[i + j]) inputs[i + j].value = ch; });
          const next = Math.min(i + text.length, inputs.length - 1);
          inputs[next].focus();
          inputs[next].dispatchEvent(new Event('input'));
        };

        inp.onfocus = () => { inp.style.borderColor = '#ff2d55'; };
        inp.onblur  = () => { inp.style.borderColor = inp.value ? 'rgba(255,45,85,0.35)' : 'rgba(255,255,255,0.1)'; };
      });

      setTimeout(() => inputs[0]?.focus(), 100);
    },

    // ── Đồng hồ đếm ngược ─────────────────────────────────────────────────────
    _startCountdown(seconds) {
      clearInterval(_countdownTimer);
      const resendBtn = document.getElementById('am-resendBtn');
      if (resendBtn) { resendBtn.disabled = true; resendBtn.style.opacity = '0.4'; }

      let remaining = seconds;
      _countdownTimer = setInterval(() => {
        remaining--;
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        const el = document.getElementById('am-countdown');
        if (el) el.textContent = `${m}:${s.toString().padStart(2, '0')}`;

        if (remaining <= 0) {
          clearInterval(_countdownTimer);
          const el2 = document.getElementById('am-countdown');
          if (el2) { el2.textContent = 'Đã hết hạn'; el2.style.color = '#ef4444'; }
          document.getElementById('am-verifyBtn').disabled = true;
          if (resendBtn) { resendBtn.disabled = false; resendBtn.style.opacity = '1'; }
        }
      }, 1000);
    },

    // ── Toast nhỏ bên trong modal ─────────────────────────────────────────────
    _toast(msg, type) {
      if (typeof Toast !== 'undefined') {
        Toast[type]?.(msg) || Toast.info(msg);
      } else {
        alert(msg);
      }
    }
  };

  // ── Patch navbar buttons khi DOM ready ────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // Nút Đăng Nhập / Đăng Ký trên navbar → mở modal thay vì chuyển trang
    document.querySelectorAll('.login[onclick]').forEach(btn => {
      btn.removeAttribute('onclick');
      btn.addEventListener('click', () => AuthModal.open('login'));
    });
    document.querySelectorAll('.signup[onclick]').forEach(btn => {
      btn.removeAttribute('onclick');
      btn.addEventListener('click', () => AuthModal.open('register'));
    });
  });

})();