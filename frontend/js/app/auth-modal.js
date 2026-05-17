// ================================================
// auth-modal.js — UPDATED COMPLETE VERSION
// Luồng:
//   Đăng ký:  Điền form → Gửi OTP Gmail → Nhập OTP → Tạo tài khoản
//   Đăng nhập: Username/Password
//   Quên MK: Nhập email → OTP Gmail → Nhập MK mới → Đổi thành công
// ================================================

(function () {
  'use strict';

  const API_BASE = 'http://localhost:5190/api';

  // ── State ──────────────────────────────────────────────────────────────────
  let _pendingEmail = '';
  let _pendingPurpose = 'register'; // 'register' | 'forgot'
  let _countdownTimer = null;
  let _injected = false;

  // ── Inject HTML ────────────────────────────────────────────────────────────
  function injectModal() {
    if (_injected || document.getElementById('authModal')) { _injected = true; return; }
    _injected = true;

    document.body.insertAdjacentHTML('beforeend', buildModalHTML());

    // Đóng khi click overlay
    document.getElementById('authModal').addEventListener('click', function (e) {
      if (e.target === this) AuthModal.close();
    });
    // ESC để đóng
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') AuthModal.close();
    });

    setupOtpInputs();
  }

  // ── Build HTML ─────────────────────────────────────────────────────────────
  function buildModalHTML() {
    return `
<style>
  #authModal { position:fixed;inset:0;z-index:9900;background:rgba(0,0,0,0.70);
    backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;
    opacity:0;transition:opacity 0.25s }
  #authModal.visible { opacity:1 }
  #authBox { background:#ffffff;border-radius:20px;padding:36px 32px;width:100%;max-width:440px;
    margin:16px;max-height:92vh;overflow-y:auto;
    transform:scale(0.94) translateY(16px);transition:transform 0.25s;
    box-shadow:0 24px 64px rgba(0,0,0,0.18) }
  #authModal.visible #authBox { transform:scale(1) translateY(0) }
  .am-input { width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;
    font-size:14px;color:#111827;background:#f9fafb;outline:none;
    transition:border-color 0.2s,box-shadow 0.2s;box-sizing:border-box;font-family:inherit }
  .am-input:focus { border-color:#e8213a;background:#fff;box-shadow:0 0 0 3px rgba(232,33,58,0.10) }
  .am-input::placeholder { color:#9ca3af }
  .am-label { display:block;font-size:11px;font-weight:700;color:#6b7280;
    text-transform:uppercase;letter-spacing:0.07em;margin-bottom:5px }
  .am-group { margin-bottom:14px }
  .am-btn-primary { width:100%;padding:12px;background:#e8213a;border:none;border-radius:10px;
    color:#fff;font-size:15px;font-weight:700;cursor:pointer;
    font-family:inherit;transition:background 0.2s,transform 0.15s;margin-bottom:6px }
  .am-btn-primary:hover { background:#c01830;transform:translateY(-1px) }
  .am-btn-primary:disabled { opacity:0.55;cursor:not-allowed;transform:none }
  .am-btn-google { width:100%;padding:11px;background:#fff;border:1.5px solid #e5e7eb;
    border-radius:10px;color:#374151;font-size:14px;font-weight:600;cursor:pointer;
    font-family:inherit;display:flex;align-items:center;justify-content:center;gap:10px;
    transition:border-color 0.2s,box-shadow 0.2s;margin-bottom:18px }
  .am-btn-google:hover { border-color:#e8213a;box-shadow:0 2px 8px rgba(232,33,58,0.12) }
  .am-divider { display:flex;align-items:center;gap:10px;margin:16px 0;color:#9ca3af;font-size:12px }
  .am-divider::before,.am-divider::after { content:'';flex:1;height:1px;background:#e5e7eb }
  .am-link-btn { background:none;border:none;color:#e8213a;font-size:13px;font-weight:700;
    cursor:pointer;font-family:inherit;padding:0 }
  .am-link-btn:hover { text-decoration:underline }
  .am-switch { text-align:center;font-size:13px;color:#6b7280;margin-top:16px }
  .am-panel { display:none }
  .am-panel.active { display:block }
  /* OTP inputs */
  .otp-box { display:flex;gap:8px;justify-content:center;margin:20px 0 }
  .otp-input { width:46px;height:54px;text-align:center;font-size:22px;font-weight:700;
    border:2px solid #e5e7eb;border-radius:10px;color:#111827;background:#f9fafb;
    outline:none;font-family:inherit;transition:border-color 0.2s }
  .otp-input:focus { border-color:#e8213a;background:#fff }
  .otp-input.filled { border-color:#e8213a;background:#fef2f4 }
  /* Password strength */
  .pwd-bars { display:flex;gap:4px;margin-top:6px }
  .pwd-bar { flex:1;height:3px;border-radius:3px;background:#e5e7eb;transition:background 0.3s }
  @keyframes am-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
  .am-error { color:#e8213a;font-size:12px;margin-top:4px;display:none }
  .am-success-icon { font-size:3rem;text-align:center;margin-bottom:12px }
</style>

<div id="authModal" style="display:none;align-items:center;justify-content:center">
  <div id="authBox">

    <!-- ── Logo + Close ── -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div style="font-size:18px;font-weight:800;color:#111827">
        CTXH<span style="color:#e8213a">DUT</span>
        <span id="amModalTag" style="font-size:11px;font-weight:500;color:#9ca3af;margin-left:6px"></span>
      </div>
      <button onclick="AuthModal.close()"
        style="width:30px;height:30px;border-radius:50%;background:#f3f4f6;border:none;
               font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;
               color:#6b7280;transition:background 0.2s"
        onmouseover="this.style.background='#fee2e2';this.style.color='#e8213a'"
        onmouseout="this.style.background='#f3f4f6';this.style.color='#6b7280'">✕</button>
    </div>

    <!-- ════════════════════════════════
         PANEL: ĐĂNG NHẬP
         ════════════════════════════════ -->
    <div id="am-login" class="am-panel">
      <h2 style="font-size:22px;font-weight:800;margin:0 0 4px;color:#111827">Đăng nhập</h2>
      <p style="color:#6b7280;font-size:13px;margin:0 0 20px">Chào mừng trở lại!</p>

      <button class="am-btn-google" onclick="AuthModal.loginGoogle()">
        ${googleSVG()}
        Tiếp tục với Google
      </button>
      <div class="am-divider">hoặc</div>

      <div class="am-group">
        <label class="am-label">Tên đăng nhập hoặc Email</label>
        <input id="am-login-username" class="am-input" type="text" placeholder="Nhập tên đăng nhập..."
          onkeydown="if(event.key==='Enter')document.getElementById('am-login-pwd').focus()">
      </div>
      <div class="am-group">
        <label class="am-label">Mật khẩu</label>
        <div style="position:relative">
          <input id="am-login-pwd" class="am-input" type="password" placeholder="••••••••"
            style="padding-right:42px"
            onkeydown="if(event.key==='Enter')AuthModal.doLogin()">
          <button onclick="togglePwd('am-login-pwd',this)"
            style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;
                   border:none;cursor:pointer;font-size:16px;color:#9ca3af;padding:0">👁</button>
        </div>
      </div>

      <div style="text-align:right;margin-bottom:16px">
        <button class="am-link-btn" onclick="AuthModal.show('forgot')" style="font-size:12px">
          Quên mật khẩu?
        </button>
      </div>

      <button class="am-btn-primary" id="am-login-btn" onclick="AuthModal.doLogin()">
        Đăng nhập →
      </button>

      <div class="am-switch">
        Chưa có tài khoản?
        <button class="am-link-btn" onclick="AuthModal.show('register')">Đăng ký ngay</button>
      </div>
    </div>

    <!-- ════════════════════════════════
         PANEL: ĐĂNG KÝ (Bước 1)
         ════════════════════════════════ -->
    <div id="am-register" class="am-panel">
      <h2 style="font-size:22px;font-weight:800;margin:0 0 4px;color:#111827">Tạo tài khoản</h2>
      <p style="color:#6b7280;font-size:13px;margin:0 0 20px">Gia nhập CLB CTXH DUT!</p>

      <button class="am-btn-google" onclick="AuthModal.loginGoogle()">
        ${googleSVG()} Đăng ký bằng Google
      </button>
      <div class="am-divider">hoặc điền thông tin</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="am-group">
          <label class="am-label">Họ và tên *</label>
          <input id="am-reg-fullname" class="am-input" placeholder="Nhập họ và tên">
        </div>
        <div class="am-group">
          <label class="am-label">Lớp</label>
          <input id="am-reg-class" class="am-input" placeholder="Nhập lớp">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="am-group">
          <label class="am-label">Ngày sinh</label>
          <input id="am-reg-birthdate" class="am-input" type="date">
        </div>
        <div class="am-group">
          <label class="am-label">Khoa *</label>
          <select id="am-reg-faculty" class="am-input">
            <option value="">Chọn khoa</option>
            <option>Cơ khí</option>
            <option>Công nghệ thông tin</option>
            <option>Cơ khí giao thông</option>
            <option>Công nghệ Nhiệt - Điện lạnh</option>
            <option>Điện</option>
            <option>Điện tử - Viễn thông</option>
            <option>Hóa</option>
            <option>Xây dựng Cầu - Đường</option>
            <option>Xây dựng Dân dụng &amp; Công nghiệp</option>
            <option>Xây dựng Công trình Thủy</option>
            <option>Môi trường</option>
            <option>Quản lý dự án</option>
            <option>Khoa học Công nghệ tiên tiến</option>
          </select>
        </div>
      </div>

      <div class="am-group">
        <label class="am-label">Tên đăng nhập *</label>
        <input id="am-reg-username" class="am-input" placeholder="Nhập tên đăng nhập">
      </div>
      <div class="am-group">
        <label class="am-label">
          Email * <span style="font-weight:400;text-transform:none;color:#e8213a">(nhận mã OTP)</span>
        </label>
        <input id="am-reg-email" class="am-input" type="email" placeholder="Nhập email">
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="am-group">
          <label class="am-label">Mật khẩu *</label>
          <div style="position:relative">
            <input id="am-reg-pwd" class="am-input" type="password" placeholder="••••••"
              style="padding-right:42px" oninput="checkPwdStrength(this.value,'reg-bars')">
            <button onclick="togglePwd('am-reg-pwd',this)"
              style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;
                     border:none;cursor:pointer;font-size:16px;color:#9ca3af;padding:0">👁</button>
          </div>
          <div class="pwd-bars" id="reg-bars">
            <div class="pwd-bar"></div><div class="pwd-bar"></div>
            <div class="pwd-bar"></div><div class="pwd-bar"></div>
          </div>
        </div>
        <div class="am-group">
          <label class="am-label">Nhập lại *</label>
          <input id="am-reg-confirm" class="am-input" type="password" placeholder="••••••">
        </div>
      </div>

      <button class="am-btn-primary" id="am-reg-btn" onclick="AuthModal.doSendRegisterOtp()"
        style="margin-top:6px">
        📧 Gửi mã xác thực OTP
      </button>

      <div class="am-switch">
        Đã có tài khoản?
        <button class="am-link-btn" onclick="AuthModal.show('login')">Đăng nhập</button>
      </div>
    </div>

    <!-- ════════════════════════════════
         PANEL: XÁC THỰC OTP (Đăng ký & Quên MK)
         ════════════════════════════════ -->
    <div id="am-otp" class="am-panel">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:2.5rem;margin-bottom:10px">📧</div>
        <h2 style="font-size:20px;font-weight:800;margin:0 0 8px;color:#111827" id="am-otp-title">
          Xác thực Email
        </h2>
        <p style="font-size:13px;color:#6b7280;margin:0;line-height:1.6">
          Mã <strong>6 chữ số</strong> đã được gửi đến<br>
          <strong id="am-otp-email-display" style="color:#111827"></strong>
        </p>
      </div>

      <!-- 6 ô OTP -->
      <div class="otp-box" id="am-otp-boxes">
        <input class="otp-input" maxlength="1" inputmode="numeric">
        <input class="otp-input" maxlength="1" inputmode="numeric">
        <input class="otp-input" maxlength="1" inputmode="numeric">
        <input class="otp-input" maxlength="1" inputmode="numeric">
        <input class="otp-input" maxlength="1" inputmode="numeric">
        <input class="otp-input" maxlength="1" inputmode="numeric">
      </div>

      <div style="text-align:center;font-size:13px;color:#6b7280;margin-bottom:18px">
        Mã hết hạn sau <strong id="am-otp-countdown" style="color:#e8213a">10:00</strong>
      </div>

      <button class="am-btn-primary" id="am-otp-verify-btn" onclick="AuthModal.doVerifyOtp()" disabled>
        ✅ Xác thực
      </button>

      <div style="text-align:center;margin-top:12px;font-size:13px;color:#6b7280">
        Không nhận được?
        <button class="am-link-btn" id="am-otp-resend-btn" onclick="AuthModal.doResendOtp()" disabled
          style="font-size:13px">
          Gửi lại
        </button>
      </div>

      <div style="text-align:center;margin-top:8px">
        <button class="am-link-btn" id="am-otp-back-btn" onclick="AuthModal.show('register')"
          style="font-size:12px;color:#9ca3af">← Quay lại</button>
      </div>
    </div>

    <!-- ════════════════════════════════
         PANEL: QUÊN MẬT KHẨU (nhập email)
         ════════════════════════════════ -->
    <div id="am-forgot" class="am-panel">
      <button onclick="AuthModal.show('login')"
        style="background:none;border:none;cursor:pointer;color:#6b7280;font-size:13px;
               font-family:inherit;padding:0;margin-bottom:16px;display:flex;align-items:center;gap:4px">
        ← Quay lại đăng nhập
      </button>
      <h2 style="font-size:22px;font-weight:800;margin:0 0 8px;color:#111827">Quên mật khẩu?</h2>
      <p style="font-size:13px;color:#6b7280;margin:0 0 20px;line-height:1.6">
        Nhập email đã đăng ký. Chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.
      </p>

      <div class="am-group">
        <label class="am-label">Email đăng ký</label>
        <input id="am-forgot-email" class="am-input" type="email" placeholder="your@gmail.com"
          onkeydown="if(event.key==='Enter')AuthModal.doForgotPassword()">
      </div>

      <button class="am-btn-primary" id="am-forgot-btn" onclick="AuthModal.doForgotPassword()">
        📧 Gửi mã xác thực
      </button>
    </div>

    <!-- ════════════════════════════════
         PANEL: ĐẶT LẠI MẬT KHẨU (sau OTP quên MK)
         ════════════════════════════════ -->
    <div id="am-reset" class="am-panel">
      <h2 style="font-size:22px;font-weight:800;margin:0 0 4px;color:#111827">Đặt lại mật khẩu</h2>
      <p style="font-size:13px;color:#6b7280;margin:0 0 20px">
        Nhập mật khẩu mới cho tài khoản <strong id="am-reset-email-display" style="color:#111827"></strong>
      </p>

      <div class="am-group">
        <label class="am-label">Mật khẩu mới *</label>
        <div style="position:relative">
          <input id="am-reset-pwd" class="am-input" type="password" placeholder="Ít nhất 6 ký tự"
            style="padding-right:42px" oninput="checkPwdStrength(this.value,'reset-bars')">
          <button onclick="togglePwd('am-reset-pwd',this)"
            style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;
                   border:none;cursor:pointer;font-size:16px;color:#9ca3af;padding:0">👁</button>
        </div>
        <div class="pwd-bars" id="reset-bars">
          <div class="pwd-bar"></div><div class="pwd-bar"></div>
          <div class="pwd-bar"></div><div class="pwd-bar"></div>
        </div>
      </div>
      <div class="am-group">
        <label class="am-label">Xác nhận mật khẩu mới *</label>
        <input id="am-reset-confirm" class="am-input" type="password" placeholder="Nhập lại mật khẩu"
          onkeydown="if(event.key==='Enter')AuthModal.doResetPassword()">
      </div>

      <button class="am-btn-primary" id="am-reset-btn" onclick="AuthModal.doResetPassword()">
        🔑 Đặt lại mật khẩu
      </button>
    </div>

    <!-- ════════════════════════════════
         PANEL: THÀNH CÔNG (đăng ký / reset)
         ════════════════════════════════ -->
    <div id="am-success" class="am-panel" style="text-align:center;padding:10px 0">
      <div class="am-success-icon" id="am-success-icon">🎉</div>
      <h2 style="font-size:22px;font-weight:800;margin:0 0 8px;color:#111827" id="am-success-title">
        Thành công!
      </h2>
      <p style="font-size:14px;color:#6b7280;line-height:1.7;margin:0 0 24px" id="am-success-msg"></p>
      <button class="am-btn-primary" id="am-success-btn" onclick="AuthModal.close()">
        Tiếp tục
      </button>
    </div>

  </div>
</div>`;
  }

  // ── Google SVG Icon ────────────────────────────────────────────────────────
  function googleSVG() {
    return `<svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.9 7.1 29.2 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.6-.4-3.9z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.8 18.9 13 24 13c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.9 7.1 29.2 5 24 5c-7.7 0-14.4 4.4-17.7 9.7z"/>
      <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 36.3 26.8 37 24 37c-5.3 0-9.7-3.5-11.3-8.3L6 33.8C9.3 40.3 16.1 45 24 45z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.2 5.2C41.4 35.3 44 30.5 44 25c0-1.3-.1-2.6-.4-3.9z"/>
    </svg>`;
  }

  // ── Toggle password visibility ─────────────────────────────────────────────
  window.togglePwd = function(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
    btn.textContent = inp.type === 'password' ? '👁' : '🙈';
  };

  // ── Password strength ──────────────────────────────────────────────────────
  window.checkPwdStrength = function(val, barsId) {
    const bars = document.querySelectorAll(`#${barsId} .pwd-bar`);
    if (!bars.length) return;
    let score = 0;
    if (val.length >= 6)  score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const colors = ['#ef4444','#f59e0b','#3b82f6','#22c55e'];
    bars.forEach((b, i) => b.style.background = i < score ? colors[score - 1] : '#e5e7eb');
  };

  // ── Setup OTP inputs ───────────────────────────────────────────────────────
  function setupOtpInputs() {
    const boxes = document.getElementById('am-otp-boxes');
    if (!boxes) return;

    const inputs = boxes.querySelectorAll('.otp-input');
    const verifyBtn = document.getElementById('am-otp-verify-btn');

    function checkComplete() {
      const complete = [...inputs].every(i => i.value.trim().length === 1);
      verifyBtn.disabled = !complete;
    }

    inputs.forEach((inp, i) => {
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/\D/g, '').slice(0, 1);
        inp.classList.toggle('filled', !!inp.value);
        if (inp.value && i < inputs.length - 1) inputs[i + 1].focus();
        checkComplete();
      });

      inp.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !inp.value && i > 0) {
          inputs[i - 1].value = '';
          inputs[i - 1].classList.remove('filled');
          inputs[i - 1].focus();
          checkComplete();
        }
      });

      inp.addEventListener('paste', e => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData)
          .getData('text').replace(/\D/g, '').slice(0, 6);
        [...text].forEach((ch, j) => {
          if (inputs[i + j]) {
            inputs[i + j].value = ch;
            inputs[i + j].classList.add('filled');
          }
        });
        const next = Math.min(i + text.length, inputs.length - 1);
        inputs[next].focus();
        checkComplete();
      });
    });
  }

  function resetOtpInputs() {
    const inputs = document.querySelectorAll('#am-otp-boxes .otp-input');
    inputs.forEach(i => { i.value = ''; i.classList.remove('filled'); });
    const btn = document.getElementById('am-otp-verify-btn');
    if (btn) btn.disabled = true;
  }

  function getOtpValue() {
    return [...document.querySelectorAll('#am-otp-boxes .otp-input')]
      .map(i => i.value).join('');
  }

  // ── Countdown timer ────────────────────────────────────────────────────────
  function startCountdown(seconds = 600) {
    clearInterval(_countdownTimer);
    const resendBtn = document.getElementById('am-otp-resend-btn');
    if (resendBtn) { resendBtn.disabled = true; }

    let remaining = seconds;
    _countdownTimer = setInterval(() => {
      remaining--;
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      const el = document.getElementById('am-otp-countdown');
      if (el) el.textContent = `${m}:${s.toString().padStart(2, '0')}`;

      if (remaining <= 0) {
        clearInterval(_countdownTimer);
        if (el) { el.textContent = 'Đã hết hạn'; el.style.color = '#9ca3af'; }
        const vBtn = document.getElementById('am-otp-verify-btn');
        if (vBtn) vBtn.disabled = true;
        if (resendBtn) resendBtn.disabled = false;
      }
    }, 1000);
  }

  // ── API call helper ────────────────────────────────────────────────────────
  async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Lỗi ${res.status}`);
    return data;
  }

  // ── Toast helper ───────────────────────────────────────────────────────────
  function toast(msg, type = 'info') {
    if (typeof Toast !== 'undefined') {
      Toast[type]?.(msg) ?? Toast.info(msg);
    }
  }

  function setLoading(btnId, loading, originalText) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    if (loading) btn.innerHTML = '<span style="animation:spin 0.7s linear infinite;display:inline-block">⟳</span> Đang xử lý...';
    else if (originalText) btn.innerHTML = originalText;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════════════════════════════════
  window.AuthModal = {

    // ── Mở modal ──────────────────────────────────────────────────────────
    open(panel = 'login') {
      injectModal();
      this.show(panel);
      const overlay = document.getElementById('authModal');
      overlay.style.display = 'flex';
      requestAnimationFrame(() => overlay.classList.add('visible'));
      setTimeout(() => {
        const first = document.querySelector(`#am-${panel} .am-input, #am-${panel} input`);
        first?.focus();
      }, 260);
    },

    // ── Đóng modal ────────────────────────────────────────────────────────
    close() {
      const overlay = document.getElementById('authModal');
      if (!overlay) return;
      overlay.classList.remove('visible');
      clearInterval(_countdownTimer);
      setTimeout(() => { overlay.style.display = 'none'; }, 250);
    },

    // ── Chuyển panel ──────────────────────────────────────────────────────
    show(panel) {
      document.querySelectorAll('.am-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(`am-${panel}`)?.classList.add('active');
      const tags = {
        login: 'Đăng nhập', register: 'Đăng ký', otp: 'Xác thực',
        forgot: 'Quên mật khẩu', reset: 'Đặt lại mật khẩu', success: ''
      };
      const tagEl = document.getElementById('amModalTag');
      if (tagEl) tagEl.textContent = tags[panel] || '';

      // Focus input đầu tiên
      setTimeout(() => {
        const first = document.querySelector(`#am-${panel} .am-input, #am-${panel} input`);
        first?.focus();
      }, 100);
    },

    // ════════════════════════════════════════════════════════════════════════
    // ĐĂNG NHẬP
    // ════════════════════════════════════════════════════════════════════════
    async doLogin() {
      const username = document.getElementById('am-login-username')?.value.trim();
      const password = document.getElementById('am-login-pwd')?.value;
      if (!username || !password) { toast('Vui lòng nhập đầy đủ thông tin', 'error'); return; }

      setLoading('am-login-btn', true);
      try {
        const r = await apiPost('/auth/login', { username, password });
        const userData = r.data ?? r;
        Auth.setToken(userData.token);
        Auth.setUser(userData);
        this.close();
        toast(`Chào mừng ${userData.username}! 👋`, 'success');
        if (typeof updateNavbar === 'function') updateNavbar();
        if (userData.role === 'Admin' || userData.role === 'ExecutiveBoard') {
          setTimeout(() => location.href = '../pages/Admin-dashboard.html', 800);
        }
      } catch (e) {
        toast(e.message || 'Tên đăng nhập hoặc mật khẩu không đúng', 'error');
        setLoading('am-login-btn', false, 'Đăng nhập →');
      }
    },

    // ════════════════════════════════════════════════════════════════════════
    // ĐĂNG KÝ — Bước 1: Gửi OTP
    // ════════════════════════════════════════════════════════════════════════
    async doSendRegisterOtp() {
      const fullName = document.getElementById('am-reg-fullname')?.value.trim();
      const username = document.getElementById('am-reg-username')?.value.trim();
      const email    = document.getElementById('am-reg-email')?.value.trim();
      const password = document.getElementById('am-reg-pwd')?.value;
      const confirm  = document.getElementById('am-reg-confirm')?.value;
      const className = document.getElementById('am-reg-class')?.value.trim();
      const birthDate = document.getElementById('am-reg-birthdate')?.value || null;
      const faculty = document.getElementById('am-reg-faculty')?.value || '';

      if (!fullName) { toast('Vui lòng nhập họ tên', 'error'); return; }
      if (!faculty) { toast('Vui lòng chọn khoa', 'error'); return; }
      if (!username || username.length < 3) { toast('Tên đăng nhập phải có ít nhất 3 ký tự', 'error'); return; }
      if (!email || !email.includes('@')) { toast('Email không hợp lệ', 'error'); return; }
      if (!password || password.length < 6) { toast('Mật khẩu phải có ít nhất 6 ký tự', 'error'); return; }
      if (password !== confirm) { toast('Mật khẩu xác nhận không khớp', 'error'); return; }

      setLoading('am-reg-btn', true);
      try {
        await apiPost('/auth/send-otp', { fullName, username, email, password, className, faculty, birthDate });

        _pendingEmail = email;
        _pendingPurpose = 'register';

        // Chuyển sang màn OTP
        document.getElementById('am-otp-title').textContent = 'Xác thực đăng ký';
        document.getElementById('am-otp-email-display').textContent = email;
        document.getElementById('am-otp-back-btn').onclick = () => this.show('register');
        resetOtpInputs();
        startCountdown(600);
        this.show('otp');

        toast(`Mã OTP đã gửi đến ${email}. Kiểm tra hộp thư (kể cả Spam)!`, 'success');
      } catch (e) {
        toast(e.message, 'error');
      } finally {
        setLoading('am-reg-btn', false, '📧 Gửi mã xác thực OTP');
      }
    },

    // ════════════════════════════════════════════════════════════════════════
    // OTP — Xác thực (dùng cho cả đăng ký lẫn quên MK)
    // ════════════════════════════════════════════════════════════════════════
    async doVerifyOtp() {
      const otp = getOtpValue();
      if (otp.length < 6) { toast('Vui lòng nhập đủ 6 chữ số', 'error'); return; }

      setLoading('am-otp-verify-btn', true);
      try {
        if (_pendingPurpose === 'register') {
          // Xác thực OTP đăng ký → tạo tài khoản
          const r = await apiPost('/auth/verify-otp', {
            email: _pendingEmail,
            otp
          });
          clearInterval(_countdownTimer);
          const userData = r.data ?? r;
        Auth.setToken(userData.token);
          Auth.setUser(userData);

          // Hiển thị thành công
          document.getElementById('am-success-icon').textContent = '🎉';
          document.getElementById('am-success-title').textContent = 'Đăng ký thành công!';
          document.getElementById('am-success-msg').textContent =
            `Chào mừng ${userData.username} đến với CLB CTXH DUT! Tài khoản của bạn đã sẵn sàng.`;
          document.getElementById('am-success-btn').onclick = () => {
            this.close();
            if (typeof updateNavbar === 'function') updateNavbar();
          };
          this.show('success');
          toast('🎉 Đăng ký thành công!', 'success');

        } else if (_pendingPurpose === 'forgot') {
          // OTP quên MK đúng → chuyển sang màn đặt MK mới
          // Lưu OTP vào state để dùng ở bước reset
          window._forgotOtp = otp;
          clearInterval(_countdownTimer);

          document.getElementById('am-reset-email-display').textContent = _pendingEmail;
          document.getElementById('am-reset-pwd').value = '';
          document.getElementById('am-reset-confirm').value = '';
          this.show('reset');
        }
      } catch (e) {
        toast('Mã OTP không đúng hoặc đã hết hạn', 'error');
        // Rung hộp OTP
        const boxes = document.getElementById('am-otp-boxes');
        boxes.style.animation = 'am-shake 0.4s';
        setTimeout(() => boxes.style.animation = '', 400);
        setLoading('am-otp-verify-btn', false, '✅ Xác thực');
      }
    },

    // ── Gửi lại OTP ───────────────────────────────────────────────────────
    async doResendOtp() {
      const resendBtn = document.getElementById('am-otp-resend-btn');
      if (resendBtn) resendBtn.disabled = true;

      try {
        await apiPost('/auth/resend-otp', { email: _pendingEmail, purpose: _pendingPurpose });
        resetOtpInputs();
        startCountdown(600);
        document.getElementById('am-otp-countdown').style.color = '#e8213a';
        toast('Đã gửi lại mã OTP mới!', 'success');
        setTimeout(() => document.querySelector('#am-otp-boxes .otp-input')?.focus(), 100);
      } catch (e) {
        toast(e.message || 'Không thể gửi lại OTP', 'error');
        if (resendBtn) resendBtn.disabled = false;
      }
    },

    // ════════════════════════════════════════════════════════════════════════
    // QUÊN MẬT KHẨU — Gửi OTP
    // ════════════════════════════════════════════════════════════════════════
    async doForgotPassword() {
      const email = document.getElementById('am-forgot-email')?.value.trim();
      if (!email || !email.includes('@')) { toast('Vui lòng nhập email hợp lệ', 'error'); return; }

      setLoading('am-forgot-btn', true);
      try {
        await apiPost('/auth/forgot-password', { email });

        _pendingEmail = email;
        _pendingPurpose = 'forgot';

        // Chuyển sang màn OTP
        document.getElementById('am-otp-title').textContent = 'Xác thực đặt lại mật khẩu';
        document.getElementById('am-otp-email-display').textContent = email;
        document.getElementById('am-otp-back-btn').onclick = () => this.show('forgot');
        resetOtpInputs();
        startCountdown(600);
        this.show('otp');

        toast(`Mã OTP đã gửi đến ${email}. Kiểm tra hộp thư!`, 'info');
      } catch (e) {
        toast(e.message, 'error');
      } finally {
        setLoading('am-forgot-btn', false, '📧 Gửi mã xác thực');
      }
    },

    // ════════════════════════════════════════════════════════════════════════
    // ĐẶT LẠI MẬT KHẨU
    // ════════════════════════════════════════════════════════════════════════
    async doResetPassword() {
      const newPwd  = document.getElementById('am-reset-pwd')?.value;
      const confirm = document.getElementById('am-reset-confirm')?.value;

      if (!newPwd || newPwd.length < 6) { toast('Mật khẩu phải có ít nhất 6 ký tự', 'error'); return; }
      if (newPwd !== confirm) { toast('Mật khẩu xác nhận không khớp', 'error'); return; }

      setLoading('am-reset-btn', true);
      try {
        await apiPost('/auth/reset-password', {
          email:           _pendingEmail,
          otp:             window._forgotOtp || '',
          newPassword:     newPwd,
          confirmPassword: confirm
        });

        window._forgotOtp = null;

        document.getElementById('am-success-icon').textContent = '🔑';
        document.getElementById('am-success-title').textContent = 'Đặt lại mật khẩu thành công!';
        document.getElementById('am-success-msg').textContent =
          'Mật khẩu mới đã được cập nhật. Bạn có thể đăng nhập ngay bây giờ.';
        document.getElementById('am-success-btn').textContent = 'Đăng nhập';
        document.getElementById('am-success-btn').onclick = () => this.show('login');
        this.show('success');
        toast('Đặt lại mật khẩu thành công!', 'success');
      } catch (e) {
        toast(e.message || 'Đặt lại mật khẩu thất bại', 'error');
        setLoading('am-reset-btn', false, '🔑 Đặt lại mật khẩu');
      }
    },

    // ── Google OAuth (placeholder) ─────────────────────────────────────────
    loginGoogle() {
      toast('Tính năng đăng nhập Google đang được phát triển!', 'info');
      // Khi triển khai Google OAuth thực sự:
      // window.location.href = `${API_BASE}/auth/google-login`;
    }
  };

  // ── Patch navbar buttons ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[onclick*="AuthModal.open"]').forEach(el => {
      // Đã có onclick, không cần patch
    });
  });

  // ── Expose internal for backward compat ─────────────────────────────────────
  window._authModalInternals = { setupOtpInputs, resetOtpInputs, startCountdown };

})();
