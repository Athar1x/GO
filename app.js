import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, deleteDoc, updateDoc, query, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAjE-2q6PONBkCin9ZN22gDp9Q8pAH9ZW8",
    authDomain: "story-97cf7.firebaseapp.com",
    databaseURL: "https://story-97cf7-default-rtdb.firebaseio.com",
    projectId: "story-97cf7",
    storageBucket: "story-97cf7.firebasestorage.app",
    messagingSenderId: "742801388214",
    appId: "1:742801388214:web:32a305a8057b0582c5ec17",
    measurementId: "G-9DPPWX7CF0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ADMIN_PIN = "2024"; 
const WA_PHONE = "201202687082";
const SHIPPING_COST = 50;

const governorates = [
    "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "الشرقية", "المنوفية", 
    "القليوبية", "البحيرة", "الغربية", "بور سعيد", "دمياط", "الإسماعيلية", 
    "السويس", "كفر الشيخ", "الفيوم", "بني سويف", "المنيا", "أسيوط", 
    "سوهاج", "قنا", "الأقصر", "أسوان", "البحر الأحمر", "الوادي الجديد", 
    "مطروح", "شمال سيناء", "جنوب سيناء"
];

const systemColors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#800080', '#FFA500', '#A52A2A', '#808080', 
    '#D4AF37', '#FFC0CB', '#40E0D0', '#000080'
];

const colorNames = {
    '#000000': 'أسود', '#FFFFFF': 'أبيض', '#FF0000': 'أحمر', 
    '#00FF00': 'أخضر', '#0000FF': 'أزرق', '#FFFF00': 'أصفر', 
    '#800080': 'بنفسجي', '#FFA500': 'برتقالي', '#A52A2A': 'بني', 
    '#808080': 'رمادي', '#D4AF37': 'ذهبي', '#FFC0CB': 'بمبي', 
    '#40E0D0': 'فيروزي', '#000080': 'كحلي'
};

let cart = JSON.parse(localStorage.getItem('athar_cart')) || [];
let productsCache = [];
let slideIntervals = {}; 
let isAdmin = sessionStorage.getItem('isAdmin') === 'true';
let selectedColorsForNewProduct = []; 

window.addEventListener('DOMContentLoaded', async () => {
    checkHash();
});

window.checkHash = async () => {
    const hash = window.location.hash;
    if(hash.startsWith('#product=')) {
        const id = hash.split('=')[1];
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);
        if(docSnap.exists()) {
            productsCache = [{ id: docSnap.id, ...docSnap.data() }];
            router('product', id);
        } else {
            router('home');
        }
    } else {
        router('home');
    }
}

window.router = function(route, param = null) {
    const header = document.getElementById('main-header');
    const footer = document.getElementById('main-footer');
    const divider = document.getElementById('footer-divider');
    
    Object.values(slideIntervals).forEach(clearInterval);
    slideIntervals = {};
    window.scrollTo(0,0);
    updateAdminUI();

    if(route === 'home') {
        history.pushState(null, null, ' ');
        header.style.display = 'flex';
        renderHome(); 
    } else if (route === 'product') {
        header.style.display = 'none'; 
        footer.classList.add('hidden');
        divider.classList.add('hidden');
        renderProductPage(param);
    } else if (route === 'cart') {
        history.pushState(null, null, '#cart');
        header.style.display = 'flex';
        footer.classList.add('hidden');
        divider.classList.add('hidden');
        renderCartPage();
    } else if (route === 'admin-login') {
        header.style.display = 'none';
        footer.classList.add('hidden');
        divider.classList.add('hidden');
        renderAdminLogin();
    } else if (route === 'admin-add') {
        header.style.display = 'none';
        footer.classList.add('hidden');
        divider.classList.add('hidden');
        renderAddProductPage(param); 
    }
}

function updateAdminUI() {
    const addBtn = document.getElementById('admin-add-btn');
    addBtn.classList.toggle('hidden', !isAdmin);
}

function updateFooter() {
    const footer = document.getElementById('main-footer');
    const divider = document.getElementById('footer-divider');
    if(footer) footer.classList.remove('hidden');
    if(divider) divider.classList.remove('hidden');
}

async function renderHome() {
    const appDiv = document.getElementById('app');
    document.body.style.background = 'var(--bg-grad)';
    
    appDiv.innerHTML = `<div class="product-grid">${Array(4).fill('<div class="img-box skeleton" style="height:250px;background:rgba(255,255,255,0.5);border-radius:24px;"></div>').join('')}</div>`;

    try {
        const q = query(collection(db, "products"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        productsCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        let html = '<div class="product-grid">';
        productsCache.forEach(p => {
            const images = p.images || [p.imageCode];
            const imgId = `img-${p.id}`;
            let discountHtml = '';
            let priceHtml = `<div class="price-tag">${p.price} ج.م</div>`;
            if(p.oldPrice && parseFloat(p.oldPrice) > parseFloat(p.price)) {
                discountHtml = `<div class="discount-badge">خصم</div>`;
            }

            let adminControls = '';
            if(isAdmin) {
                adminControls = `
                    <div class="admin-overlay-controls" style="position:absolute; top:10px; left:10px; z-index:20; display:flex; gap:5px;">
                        <button class="admin-btn-card btn-del-float" onclick="event.stopPropagation(); deleteProduct('${p.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="admin-btn-card btn-edit-float" onclick="event.stopPropagation(); router('admin-add', '${p.id}')">
                            <i class="fas fa-pen"></i>
                        </button>
                    </div>
                `;
            }

            html += `
                <div class="product-card" onclick="router('product', '${p.id}')">
                    <div class="ramadan-lantern">🏮</div>
                    ${adminControls}
                    <div class="img-box">
                        <img src="${images[0]}" class="p-img" id="${imgId}" loading="lazy">
                        <div class="price-overlay">
                            ${discountHtml}
                            ${priceHtml}
                        </div>
                    </div>
                    <div class="product-info">
                        <div class="product-title">${p.title}</div>
                        ${p.oldPrice ? `<div class="old-price-text">${p.oldPrice} ج.م</div>` : ''}
                    </div>
                </div>
            `;
            
            if(images.length > 1) {
                let idx = 0;
                slideIntervals[p.id] = setInterval(() => {
                    const el = document.getElementById(imgId);
                    if(el) {
                        idx = (idx + 1) % images.length;
                        el.style.opacity = '0';
                        setTimeout(() => {
                            el.src = images[idx];
                            el.style.opacity = '1';
                        }, 200);
                    }
                }, 3000);
            }
        });
        html += '</div>';
        appDiv.innerHTML = html;
        updateFooter();
    } catch(e) { console.error(e); }
}

window.renderProductPage = (id) => {
    const p = productsCache.find(x => x.id === id);
    if(!p) return router('home');
    const images = p.images || [p.imageCode];
    const appDiv = document.getElementById('app');

    setTimeout(() => {
        const imgEl = document.getElementById('main-view-img');
        if(imgEl) {
            const colorThief = new ColorThief();
            const applyColor = () => {
                const color = colorThief.getColor(imgEl);
                document.body.style.background = `rgb(${color[0]}, ${color[1]}, ${color[2]}, 0.15)`;
            };
            if(imgEl.complete) applyColor();
            else imgEl.onload = applyColor;
        }
    }, 100);

    let colorsHtml = '';
    if(p.colors && p.colors.length) {
        colorsHtml = `
            <div style="margin:20px 0;">
                <div style="margin-bottom:10px; font-weight:bold;">اختر اللون:</div>
                <div class="color-select-row">
                    ${p.colors.map((c, i) => 
                        `<div class="color-circle ${i===0?'active':''}" style="background:${c}" onclick="selectColor(this, '${c}')"></div>`
                    ).join('')}
                </div>
                <input type="hidden" id="sel-color" value="${p.colors[0]}">
            </div>
        `;
    }

    let thumbsHtml = '';
    if(images.length > 1) {
        thumbsHtml = `<div class="thumbnails-row">
            ${images.map((src, i) => `
                <img src="${src}" class="thumb-img ${i===0?'active':''}" onclick="changeMainImage('${src}', this)">
            `).join('')}
        </div>`;
    }

    appDiv.innerHTML = `
        <div class="full-page-view">
            <div style="padding:0 15px;">
                <button class="btn-back-circle" onclick="router('home')">
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
            
            <div class="product-detail-container">
                <div class="gallery-section">
                    <div class="main-image-frame">
                        <!-- زر مشاركة عائم فوق الصورة -->
                        <button class="floating-share-btn" onclick="shareProduct('${p.id}', '${p.title}')">
                            <i class="fas fa-share-alt"></i>
                        </button>

                        <img src="${images[0]}" class="main-img-full" id="main-view-img" crossorigin="anonymous">
                    </div>
                    ${thumbsHtml}
                </div>

                <div class="info-section">
                    <h1 class="cool-title">${p.title}</h1>
                    <div class="info-price-row" style="display:flex; gap:15px; align-items:center;">
                        <span style="font-size:1.8rem; color:var(--primary); font-family:'Amiri'; font-weight:bold;">${p.price} ج.م</span>
                        ${p.oldPrice ? `<span class="info-old-price" style="text-decoration:line-through; color:#999;">${p.oldPrice} ج.م</span>` : ''}
                    </div>
                    
                    <div class="info-desc">${p.description || 'لا يوجد وصف'}</div>
                    
                    ${colorsHtml}

                    <div style="display:flex; align-items:center; gap:15px; margin:25px 0;">
                        <span style="font-weight:bold;">الكمية:</span>
                        <div class="qty-box">
                            <button class="qty-btn" onclick="updQty(-1)">-</button>
                            <span id="qty-val" style="width:20px; text-align:center; font-weight:bold;">1</span>
                            <button class="qty-btn" onclick="updQty(1)">+</button>
                        </div>
                    </div>

                    <button class="btn-primary" onclick="addToCart('${p.id}')">
                        <i class="fas fa-cart-plus"></i> إضافة للسلة
                    </button>
                    <button class="btn-share-main" onclick="shareProduct('${p.id}', '${p.title}')">
                        <i class="fas fa-share"></i> مشاركة الرابط
                    </button>
                </div>
            </div>
        </div>
    `;
}

window.shareProduct = async (id, title) => {
    const url = `${window.location.origin}${window.location.pathname}#product=${id}`;
    if (navigator.share) {
        try { await navigator.share({ title: title, text: title, url: url }); } catch (err) {}
    } else {
        try { await navigator.clipboard.writeText(url); showToast("تم نسخ الرابط"); } catch (err) {}
    }
}
window.changeMainImage = (src, el) => {
    const img = document.getElementById('main-view-img');
    img.src = src;
    const colorThief = new ColorThief();
    img.onload = function() {
        const color = colorThief.getColor(img);
        document.body.style.background = `rgb(${color[0]}, ${color[1]}, ${color[2]}, 0.15)`;
    }
    document.querySelectorAll('.thumb-img').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
}
window.selectColor = (el, c) => {
    document.querySelectorAll('.color-circle').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('sel-color').value = c;
}
window.updQty = (n) => {
    let el = document.getElementById('qty-val');
    let v = parseInt(el.innerText) + n;
    if(v < 1) v = 1;
    el.innerText = v;
}
window.addToCart = (id) => {
    const p = productsCache.find(x => x.id === id);
    const qty = parseInt(document.getElementById('qty-val').innerText);
    const color = document.getElementById('sel-color')?.value || (p.colors?.[0] || '#000');
    
    const exist = cart.find(i => i.id === id && i.color === color);
    if(exist) exist.qty += qty;
    else cart.push({ ...p, color, qty, img: p.images?.[0] || p.imageCode });

    localStorage.setItem('athar_cart', JSON.stringify(cart));
    updateBadge();
    showToast("تمت الإضافة للسلة");
}
window.renderCartPage = () => {
    document.body.style.background = 'var(--bg-grad)';
    const appDiv = document.getElementById('app');
    
    if(!cart.length) {
        appDiv.innerHTML = `
        <div class="cart-page-container" style="text-align:center; padding-top:50px;">
            <i class="fas fa-shopping-bag fa-3x" style="color:#ccc; margin-bottom:20px;"></i>
            <h3>السلة فارغة</h3>
            <button class="btn-sec" onclick="router('home')">تسوق الآن</button>
        </div>`;
        return;
    }

    let total = 0;
    const items = cart.map((item, i) => {
        total += item.price * item.qty;
        return `
            <div class="cart-item glass-card" style="display:flex; gap:10px; margin-bottom:10px; padding:10px;">
                <img src="${item.img}" style="width:70px; height:70px; border-radius:12px; object-fit:cover;">
                <div style="flex:1;">
                    <div style="font-weight:bold; font-size:1rem;">${item.title}</div>
                    <div style="font-size:0.85rem; color:#666; margin:4px 0;">
                        ${colorNames[item.color] || 'لون'} 
                        <span onclick="editColorCart(${i})" style="color:var(--primary); cursor:pointer; font-weight:bold;">(تعديل)</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:bold; color:var(--primary);">${item.price} ج.م</span>
                        <div class="qty-box" style="padding:2px 8px;">
                            <button class="qty-btn" style="width:25px; height:25px;" onclick="updateCartItemQty(${i}, -1)">-</button>
                            <span style="font-size:0.9rem; margin:0 5px;">${item.qty}</span>
                            <button class="qty-btn" style="width:25px; height:25px;" onclick="updateCartItemQty(${i}, 1)">+</button>
                        </div>
                    </div>
                </div>
                <button onclick="remCart(${i})" style="border:none; background:none; color:#ef4444; cursor:pointer;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');

    const govOptions = governorates.map(g => `<option value="${g}">${g}</option>`).join('');

    appDiv.innerHTML = `
        <div class="cart-page-container glass-card">
            <h2 style="margin-bottom:20px; font-size:1.3rem;">مراجعة الطلب</h2>
            <div style="margin-bottom:25px;">${items}</div>
            <div style="background:rgba(255,255,255,0.5); padding:20px; border-radius:16px; margin-bottom:25px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>المجموع</span><span>${total} ج.م</span></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>الشحن</span><span>${SHIPPING_COST} ج.م</span></div>
                <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.2rem; border-top:1px solid #ddd; padding-top:10px;">
                    <span>الإجمالي</span><span>${total+SHIPPING_COST} ج.م</span>
                </div>
            </div>
            <h3 style="margin-bottom:15px;">بيانات الشحن</h3>
            <div class="form-group"><input id="c-name" class="form-input" placeholder="الاسم ثلاثي" required></div>
            <div class="form-group"><input id="c-phone" type="tel" class="form-input" placeholder="رقم واتساب" required></div>
            <div class="form-group">
                <select id="c-gov" class="form-select">
                    <option value="" disabled selected>اختر المحافظة</option>
                    ${govOptions}
                </select>
            </div>
            <div class="form-group" style="display:flex; gap:10px;">
                <input id="c-city" class="form-input" placeholder="المدينة/المركز" required>
                <input id="c-area" class="form-input" placeholder="الحي/المنطقة" required>
            </div>
            <button class="btn-primary" onclick="sendWA(${total+SHIPPING_COST})">
                <i class="fab fa-whatsapp"></i> إرسال الطلب
            </button>
        </div>
    `;
}
// باقي الدوال (Add, Admin, etc.) كما هي في الكود السابق
window.updateCartItemQty = (i, change) => { let newQty = cart[i].qty + change; if(newQty >= 1) { cart[i].qty = newQty; localStorage.setItem('athar_cart', JSON.stringify(cart)); renderCartPage(); updateBadge(); } }
window.sendWA = (total) => {
    const name = document.getElementById('c-name').value;
    const phone = document.getElementById('c-phone').value;
    const gov = document.getElementById('c-gov').value;
    const city = document.getElementById('c-city').value;
    const area = document.getElementById('c-area').value;
    if(!name || !phone || !gov || !city || !area) return showToast("أكمل البيانات");
    let msg = `*طلب جديد - Athar*\n👤 الاسم: ${name}\n📱 رقم: ${phone}\n📍 العنوان: ${gov} - ${city} - ${area}\n----------------\n`;
    cart.forEach(i => { msg += `- ${i.title} (${colorNames[i.color] || 'لون'}) عدد ${i.qty}\n`; });
    msg += `----------------\n*الإجمالي: ${total} ج.م*`;
    window.location.href = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(msg)}`;
    localStorage.removeItem('athar_cart'); cart = []; updateBadge(); router('home');
}
window.checkAdminAccess = () => { if(isAdmin) router('admin-add'); else router('admin-login'); }
window.renderAdminLogin = () => {
    document.body.style.background = 'var(--bg-grad)';
    document.getElementById('app').innerHTML = `<div class="login-wrapper"><div class="login-card glass-card"><i class="fas fa-user-shield fa-3x" style="color:var(--primary); margin-bottom:15px;"></i><h3 style="margin-bottom:20px;">لوحة المدير</h3><input type="password" id="admin-pin" class="form-input" style="text-align:center; margin-bottom:20px;" placeholder="الرمز السري"><button class="btn-primary" onclick="verifyPin()">دخول</button><button class="btn-back-circle" style="margin:20px auto 0;" onclick="router('home')"><i class="fas fa-arrow-right"></i></button></div></div>`;
}
window.verifyPin = () => { if(document.getElementById('admin-pin').value === ADMIN_PIN) { isAdmin = true; sessionStorage.setItem('isAdmin', 'true'); showToast("مرحباً بك!"); router('home'); } else { showToast("رمز خاطئ"); } }
window.renderAddProductPage = (editId = null) => {
    const appDiv = document.getElementById('app'); document.body.style.background = 'var(--bg-grad)';
    let data = { title: '', price: '', oldPrice: '', description: '', colors: [] }; let formTitle = "إضافة منتج"; selectedColorsForNewProduct = [];
    if(editId) { const p = productsCache.find(x => x.id === editId); if(p) { data = p; selectedColorsForNewProduct = p.colors || []; } formTitle = "تعديل منتج"; } else { selectedColorsForNewProduct = ['#000000', '#FFFFFF']; }
    appDiv.innerHTML = `<div style="padding:20px; max-width:600px; margin:0 auto;"><button class="btn-back-circle" onclick="router('home')"><i class="fas fa-arrow-right"></i></button><div class="glass-card"><h3 style="margin-bottom:20px;">${formTitle}</h3><form id="prod-form"><div class="form-group"><label>اسم المنتج</label><input id="p-title" class="form-input" value="${data.title}" required></div><div class="form-group" style="display:flex; gap:10px;"><div style="flex:1"><label>السعر الحالي</label><input id="p-price" type="number" class="form-input" value="${data.price}" required></div><div style="flex:1"><label>السعر قبل الخصم</label><input id="p-old-price" type="number" class="form-input" value="${data.oldPrice || ''}"></div></div><div class="form-group"><label>الوصف</label><textarea id="p-desc" class="form-input" style="height:80px;">${data.description || ''}</textarea></div><div class="form-group"><label>الألوان المتاحة:</label><div id="new-prod-colors" style="display:flex; gap:5px; flex-wrap:wrap; margin:5px 0;"></div><div style="margin-top:10px; border-top:1px solid #ccc; padding-top:10px;"><small>أضف لون:</small><div style="display:flex; gap:5px; flex-wrap:wrap;">${systemColors.map(c => `<div class="color-circle" style="background:${c}; width:25px; height:25px;" onclick="addColToNew('${c}')"></div>`).join('')}</div></div></div><div class="form-group"><label>الصور</label><input type="file" id="p-imgs" multiple accept="image/*" class="form-input">${editId ? '<small style="color:red">اترك الصور فارغة إذا لم ترد تغييرها</small>' : ''}</div><button type="submit" id="save-btn" class="btn-primary">حفظ</button></form></div></div>`;
    renderNewProdColors();
    document.getElementById('prod-form').onsubmit = async (e) => {
        e.preventDefault(); const btn = document.getElementById('save-btn'); btn.innerText = 'جاري...'; btn.disabled = true;
        const title = document.getElementById('p-title').value; const price = document.getElementById('p-price').value; const oldPrice = document.getElementById('p-old-price').value; const desc = document.getElementById('p-desc').value; const files = document.getElementById('p-imgs').files;
        let imgs = []; if(editId && files.length === 0) { imgs = productsCache.find(x => x.id === editId).images; } else if (files.length > 0) { for(let f of files) imgs.push(await compress(f)); }
        if(!imgs || !imgs.length) { showToast('الصور مطلوبة'); btn.disabled=false; btn.innerText='حفظ'; return; }
        const payload = { title, price, oldPrice, description: desc, images: imgs, imageCode: imgs[0], colors: selectedColorsForNewProduct, timestamp: Date.now() };
        if(editId) { await updateDoc(doc(db, "products", editId), payload); showToast("تم التعديل"); } else { await addDoc(collection(db, "products"), payload); showToast("تمت الإضافة"); } router('home');
    };
}
window.renderNewProdColors = () => { const div = document.getElementById('new-prod-colors'); if(!div) return; div.innerHTML = selectedColorsForNewProduct.map(c => `<div class="color-circle" style="background:${c}; position:relative;" onclick="remColFromNew('${c}')"><i class="fas fa-times" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border-radius:50%; font-size:10px; width:12px; height:12px; display:flex; align-items:center; justify-content:center;"></i></div>`).join(''); }
window.addColToNew = (c) => { if(!selectedColorsForNewProduct.includes(c)) { selectedColorsForNewProduct.push(c); renderNewProdColors(); } }
window.remColFromNew = (c) => { selectedColorsForNewProduct = selectedColorsForNewProduct.filter(x => x !== c); renderNewProdColors(); }
window.deleteProduct = async (id) => { if(confirm('حذف المنتج نهائياً؟')) { await deleteDoc(doc(db, "products", id)); showToast("تم الحذف"); router('home'); } }
function compress(file) { return new Promise(r => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = e => { const img = new Image(); img.src = e.target.result; img.onload = () => { const cvs = document.createElement('canvas'); const ctx = cvs.getContext('2d'); const s = 800/img.width; cvs.width = 800; cvs.height = img.height * s; ctx.drawImage(img,0,0,cvs.width,cvs.height); r(cvs.toDataURL('image/jpeg', 0.8)); } } }); }
function showToast(msg) { const t = document.getElementById('toast'); document.getElementById('toast-msg').innerText = msg; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3000); }
window.remCart = (i) => { cart.splice(i, 1); localStorage.setItem('athar_cart', JSON.stringify(cart)); renderCartPage(); updateBadge(); }
window.editColorCart = (i) => { const item = cart[i]; const p = productsCache.find(x => x.id === item.id); if(!p || !p.colors) return; document.getElementById('modal-colors-area').innerHTML = p.colors.map(c => `<div class="color-circle" style="background:${c};" onclick="cart[${i}].color='${c}'; confirmColorUpdate()"></div>`).join(''); document.getElementById('color-modal').classList.remove('hidden'); }
window.confirmColorUpdate = () => { localStorage.setItem('athar_cart', JSON.stringify(cart)); closeColorModal(); renderCartPage(); }
window.closeColorModal = () => document.getElementById('color-modal').classList.add('hidden');
function updateBadge() { document.getElementById('cart-badge').innerText = cart.reduce((a,b)=>a+b.qty,0); }

updateBadge(); updateAdminUI();
