// Đảm bảo DOM đã load xong
document.addEventListener('DOMContentLoaded', function() {
    // Lấy các phần tử
    const loginBtn = document.querySelector('.login-btn');
    const loginDialog = document.getElementById('loginDialog');
    const cancelBtn = document.querySelector('.cancel-btn');
    const loginForm = document.querySelector('#loginDialog form');
    
    console.log('Login button:', loginBtn); // Kiểm tra có tìm thấy nút không
    console.log('Dialog:', loginDialog); // Kiểm tra có tìm thấy dialog không
    
    // 1. Khi click vào nút Đăng Nhập
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            console.log('Login button clicked!');
            if (loginDialog) {
                loginDialog.showModal();
            } else {
                console.error('Dialog not found!');
            }
        });
    } else {
        console.error('Login button not found! Check your CSS selector');
    }
    
    // 2. Khi click nút Hủy
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            loginDialog.close();
        });
    }
    
    // 3. Xử lý đăng nhập khi submit form
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Ngăn reload trang
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // Kiểm tra thông tin
            if (!username || !password) {
                alert('Vui lòng nhập đầy đủ thông tin!');
                return;
            }
            
            // Giả lập đăng nhập thành công
            console.log('Đăng nhập với:', username, password);
            
            // Thông báo thành công
            alert(`Xin chào ${username}! Đăng nhập thành công.`);
            
            // Đóng dialog
            loginDialog.close();
            
            // Đổi nút Đăng Nhập thành tên người dùng
            loginBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
                ${username}
            `;
            
            // Reset form
            loginForm.reset();
        });
    }
    
    // 4. Đóng dialog khi click ra ngoài (tùy chọn)
    loginDialog.addEventListener('click', function(event) {
        const rect = loginDialog.getBoundingClientRect();
        const isInDialog = (
            rect.top <= event.clientY && 
            event.clientY <= rect.top + rect.height &&
            rect.left <= event.clientX && 
            event.clientX <= rect.left + rect.width
        );
        
        if (!isInDialog) {
            loginDialog.close();
        }
    });
});