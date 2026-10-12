const defaultApi = ['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:8080/api' : 'https://trip-next.onrender.com/api';
const API = (window.TRIPNEST_API || defaultApi).replace(/\/$/, '');
const $ = (selector) => document.querySelector(selector);
const token = () => sessionStorage.getItem('tripnest_token');
const pagePrefix = () => location.pathname.includes('/pages/') ? '' : 'pages/';
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

async function request(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;
  const response = await fetch(API + path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'The service is unavailable. Please try again.');
  return payload;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}
function showMessage(element, message) { if (element) element.textContent = message; }
function setBusy(form, busy) { const button = form?.querySelector('button[type="submit"]'); if (button) { button.disabled = busy; button.dataset.label ||= button.textContent; button.textContent = busy ? 'Working…' : button.dataset.label; } }

function card(accommodation) {
  const image = accommodation.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80';
  return `<article class="card"><a href="${pagePrefix()}accommodation-details.html?id=${accommodation.id}"><img src="${escapeHtml(image)}" alt="${escapeHtml(accommodation.name)}"><div class="card-body"><p class="eyebrow">${escapeHtml(accommodation.city)}, ${escapeHtml(accommodation.country)}</p><h3>${escapeHtml(accommodation.name)}</h3><p class="muted">${escapeHtml(accommodation.shortDescription)}</p><strong>${money(accommodation.pricePerNight)} <span class="muted">/ night · ★ ${escapeHtml(accommodation.rating)}</span></strong></div></a><button class="wishlist-button" data-wishlist="${accommodation.id}" aria-label="Save ${escapeHtml(accommodation.name)}" title="Save stay">♡</button></article>`;
}

async function loadStays() {
  const output = $('#stays'); if (!output) return;
  try {
    const params = new URLSearchParams(location.search);
    ['q', 'type', 'minPrice', 'maxPrice', 'minRating', 'sort', 'amenity'].forEach((key) => { const input = document.getElementById(key); if (input && params.has(key)) input.value = params.get(key); });
    const data = await request('/accommodations' + (params.toString() ? `?${params}` : ''));
    output.innerHTML = data.length ? data.map(card).join('') : '<p class="muted">No stays matched those filters. Try a different destination or price range.</p>';
    bindWishlist();
  } catch (error) { output.innerHTML = `<p class="message">${escapeHtml(error.message)}</p>`; }
}

function bindWishlist() {
  document.querySelectorAll('[data-wishlist]').forEach((button) => button.addEventListener('click', async (event) => {
    event.preventDefault(); event.stopPropagation();
    if (!token()) { location.href = `${pagePrefix()}login.html`; return; }
    try { await request(`/wishlist/${button.dataset.wishlist}`, { method: 'PUT' }); button.textContent = '♥'; button.setAttribute('aria-label', 'Saved stay'); }
    catch (error) { showMessage($('#message'), error.message); }
  }));
}

$('#searchForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const params = new URLSearchParams();
  ['q', 'type', 'minPrice', 'maxPrice', 'minRating', 'sort', 'amenity'].forEach((key) => { const value = document.getElementById(key)?.value.trim(); if (value) params.set(key, value); });
  location.href = `${pagePrefix()}accommodations.html${params.toString() ? `?${params}` : ''}`;
});

$('#loginForm')?.addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; const message = $('#message'); setBusy(form, true);
  try { const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: $('#email').value.trim(), password: $('#password').value }) }); sessionStorage.setItem('tripnest_token', result.token); sessionStorage.setItem('tripnest_user', JSON.stringify(result.user)); location.href = result.user.role === 'ADMIN' ? 'admin.html' : 'dashboard.html'; }
  catch (error) { showMessage(message, error.message); setBusy(form, false); }
});

$('#registerForm')?.addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; const message = $('#message'); setBusy(form, true);
  try { await request('/auth/register', { method: 'POST', body: JSON.stringify({ fullName: $('#fullName').value.trim(), email: $('#email').value.trim(), password: $('#password').value }) }); showMessage(message, 'Account created. Redirecting to sign in…'); setTimeout(() => { location.href = 'login.html'; }, 700); }
  catch (error) { showMessage(message, error.message); setBusy(form, false); }
});

$('#logout')?.addEventListener('click', () => { sessionStorage.removeItem('tripnest_token'); sessionStorage.removeItem('tripnest_user'); location.href = '../index.html'; });

async function loadBookings() {
  const output = $('#bookings'); if (!output) return;
  if (!token()) { output.innerHTML = '<p class="muted">Please <a class="text-link" href="login.html">sign in</a> to view your bookings.</p>'; return; }
  try {
    const bookings = await request('/bookings');
    output.innerHTML = bookings.length ? bookings.map((booking) => `<article class="booking"><div><strong>${escapeHtml(booking.accommodation)}</strong><p class="muted">${booking.checkIn} → ${booking.checkOut} · ${booking.guests} guest(s) · ${escapeHtml(booking.status)}</p><small>Reference: ${escapeHtml(booking.reference)}</small></div><div><strong>${money(booking.totalAmount)}</strong>${booking.status === 'CONFIRMED' ? `<button class="secondary cancel-booking" data-reference="${escapeHtml(booking.reference)}">Cancel booking</button>` : ''}</div></article>`).join('') : '<p class="muted">Your journeys will appear here once you make a reservation.</p>';
    document.querySelectorAll('.cancel-booking').forEach((button) => button.addEventListener('click', async () => { if (!confirm('Cancel this booking?')) return; try { await request(`/bookings/${button.dataset.reference}/cancel`, { method: 'POST' }); await loadBookings(); } catch (error) { showMessage($('#message'), error.message); } }));
  } catch (error) { output.innerHTML = `<p class="message">${escapeHtml(error.message)}</p>`; }
}

async function loadDetail() {
  const output = $('#detail'); if (!output) return;
  try {
    const accommodation = await request(`/accommodations/${new URLSearchParams(location.search).get('id')}`);
    const image = accommodation.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80';
    output.innerHTML = `<img class="detail-image" src="${escapeHtml(image)}" alt="${escapeHtml(accommodation.name)}"><p class="eyebrow">${escapeHtml(accommodation.city)}, ${escapeHtml(accommodation.country)} · ★ ${escapeHtml(accommodation.rating)}</p><h1>${escapeHtml(accommodation.name)}</h1><p class="lede">${escapeHtml(accommodation.description)}</p><p><strong>${money(accommodation.pricePerNight)}</strong> per night · up to ${accommodation.maxGuests} guests</p><p class="muted">${escapeHtml((accommodation.amenities || []).join(' · '))}</p><form id="bookingForm" class="panel booking-form"><label>Check-in<input type="date" id="checkIn" required></label><label>Check-out<input type="date" id="checkOut" required></label><label>Guests<input type="number" id="guests" min="1" max="${accommodation.maxGuests}" value="1" required></label><button type="submit">Reserve this stay</button><p id="message" class="message"></p></form>`;
    const today = new Date().toISOString().slice(0, 10); $('#checkIn').min = today; $('#checkOut').min = today;
    $('#bookingForm').addEventListener('submit', async (event) => { event.preventDefault(); if (!token()) { location.href = 'login.html'; return; } const checkIn = $('#checkIn').value; const checkOut = $('#checkOut').value; if (checkOut <= checkIn) { showMessage($('#message'), 'Check-out must be after check-in.'); return; } try { const booking = await request(`/bookings/accommodations/${accommodation.id}`, { method: 'POST', body: JSON.stringify({ checkIn, checkOut, guests: Number($('#guests').value) }) }); sessionStorage.setItem('tripnest_confirmation', JSON.stringify(booking)); location.href = 'confirmation.html'; } catch (error) { showMessage($('#message'), error.message); } });
  } catch (error) { output.innerHTML = `<p class="message">${escapeHtml(error.message)}</p>`; }
}

async function loadWishlist() { const output = $('#wishlist'); if (!output) return; if (!token()) { output.innerHTML = '<p class="muted">Please sign in to view saved stays.</p>'; return; } try { const data = await request('/wishlist'); output.innerHTML = data.length ? data.map(card).join('') : '<p class="muted">Save stays while you explore and they will appear here.</p>'; bindWishlist(); } catch (error) { output.innerHTML = `<p class="message">${escapeHtml(error.message)}</p>`; } }

async function loadDashboard() {
  const upcoming = $('#dashboardUpcoming'); if (!upcoming) return; if (!token()) { location.href = 'login.html'; return; }
  try { const [user, bookings, wishlist] = await Promise.all([request('/users/me'), request('/bookings'), request('/wishlist')]); const today = new Date().toISOString().slice(0, 10); const future = bookings.filter((booking) => booking.checkOut >= today && booking.status !== 'CANCELLED'); const past = bookings.filter((booking) => booking.checkOut < today || booking.status === 'COMPLETED'); if ($('#dashboardGreeting')) $('#dashboardGreeting').textContent = `Welcome back, ${user.fullName.split(' ')[0]}`; if ($('#dashboardStats')) $('#dashboardStats').innerHTML = `<article class="stat-card"><span class="muted">Upcoming trips</span><strong>${future.length}</strong></article><article class="stat-card"><span class="muted">Completed trips</span><strong>${past.length}</strong></article><article class="stat-card"><span class="muted">Saved stays</span><strong>${wishlist.length}</strong></article>`; const bookingCard = (booking) => `<article class="booking"><div><strong>${escapeHtml(booking.accommodation)}</strong><p class="muted">${booking.checkIn} → ${booking.checkOut} · ${booking.guests} guest(s) · ${escapeHtml(booking.status)}</p><small>Reference: ${escapeHtml(booking.reference)}</small></div><strong>${money(booking.totalAmount)}</strong></article>`; upcoming.innerHTML = future.length ? future.map(bookingCard).join('') : '<p class="muted">No upcoming trips yet. Find a stay for your next journey.</p>'; if ($('#dashboardPast')) $('#dashboardPast').innerHTML = past.length ? past.map(bookingCard).join('') : '<p class="muted">Your completed journeys will appear here.</p>'; if ($('#dashboardWishlist')) $('#dashboardWishlist').innerHTML = wishlist.length ? wishlist.map(card).join('') : '<p class="muted">Save stays while you explore and they will appear here.</p>'; bindWishlist(); } catch (error) { showMessage($('#dashboardMessage'), error.message); }
}

function editStay(stay) {
  ['name','type','city','country','address','shortDescription','description','pricePerNight','maxGuests','rating'].forEach((key) => { const element = document.getElementById(key); if (element) element.value = stay[key] ?? ''; });
  if ($('#stayId')) $('#stayId').value = stay.id;
  if ($('#images')) $('#images').value = (stay.images || []).join('\n');
  if ($('#amenities')) $('#amenities').value = (stay.amenities || []).join(', ');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadAdmin() {
  const output = $('#adminStays'); if (!output) return;
  try {
    const data = await request('/admin/accommodations');
    output.innerHTML = data.length ? data.map((stay) => `<article class="booking"><div><strong>${escapeHtml(stay.name)}</strong><p class="muted">${escapeHtml(stay.city)}, ${escapeHtml(stay.country)} · ${money(stay.pricePerNight)} · ${stay.active ? 'Active' : 'Inactive'}</p></div><div><button data-edit="${stay.id}">Edit</button> <button class="secondary" data-delete="${stay.id}">Deactivate</button></div></article>`).join('') : '<p class="muted">No listings yet.</p>';
    data.forEach((stay) => { document.querySelector(`[data-edit="${stay.id}"]`)?.addEventListener('click', () => editStay(stay)); document.querySelector(`[data-delete="${stay.id}"]`)?.addEventListener('click', async () => { if (!confirm('Deactivate this listing?')) return; try { await request(`/admin/accommodations/${stay.id}`, { method: 'DELETE' }); await loadAdmin(); } catch (error) { showMessage($('#adminMessage'), error.message); } }); });
    const statistics = await request('/admin/stats'); if ($('#adminStats')) $('#adminStats').textContent = `Bookings: ${statistics.bookings} · Revenue: ${money(statistics.revenue)}`;
    const bookingOutput = $('#adminBookings');
    if (bookingOutput) { const bookings = await request('/admin/bookings'); bookingOutput.innerHTML = bookings.length ? bookings.map((booking) => `<article class="booking"><div><strong>${escapeHtml(booking.reference)}</strong><p class="muted">${escapeHtml(booking.accommodation)} · ${booking.checkIn} → ${booking.checkOut}</p></div><select data-status="${escapeHtml(booking.reference)}"><option ${booking.status === 'CONFIRMED' ? 'selected' : ''}>CONFIRMED</option><option ${booking.status === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option><option ${booking.status === 'CANCELLED' ? 'selected' : ''}>CANCELLED</option></select></article>`).join('') : '<p class="muted">No bookings yet.</p>'; document.querySelectorAll('[data-status]').forEach((select) => select.addEventListener('change', async () => { try { await request(`/admin/bookings/${select.dataset.status}/status`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) }); } catch (error) { showMessage($('#adminMessage'), error.message); } })); }
  } catch (error) { output.innerHTML = `<p class="message">${escapeHtml(error.message)} Admin access is required.</p>`; }
}

$('#stayForm')?.addEventListener('submit', async (event) => { event.preventDefault(); const value = (id) => document.getElementById(id).value; const body = { name:value('name'), type:value('type'), city:value('city'), country:value('country'), address:value('address'), shortDescription:value('shortDescription'), description:value('description'), pricePerNight:Number(value('pricePerNight')), maxGuests:Number(value('maxGuests')), rating:Number(value('rating')), images:value('images').split('\n').map((x) => x.trim()).filter(Boolean), amenities:value('amenities').split(',').map((x) => x.trim()).filter(Boolean) }; try { const id = value('stayId'); await request(`/admin/accommodations${id ? `/${id}` : ''}`, { method:id ? 'PUT' : 'POST', body:JSON.stringify(body) }); showMessage($('#adminMessage'), 'Listing saved.'); $('#clearForm')?.click(); await loadAdmin(); } catch (error) { showMessage($('#adminMessage'), error.message); } });
$('#clearForm')?.addEventListener('click', () => { $('#stayForm')?.reset(); if ($('#stayId')) $('#stayId').value = ''; });

function addSharedNavigation() {
  const nav = document.querySelector('header nav'); if (!nav) return;
  if (!document.querySelector('[data-dashboard-link]')) { const link = document.createElement('a'); link.href = `${pagePrefix()}dashboard.html`; link.textContent = 'Dashboard'; link.dataset.dashboardLink = 'true'; nav.prepend(link); }
  const current = location.pathname.split('/').pop() || 'index.html'; nav.querySelectorAll('a').forEach((link) => { if (link.getAttribute('href')?.split('?')[0].endsWith(current)) link.classList.add('active'); });
  const themeButton = document.createElement('button'); themeButton.className = 'link-button theme-toggle'; themeButton.type = 'button'; themeButton.textContent = localStorage.getItem('tripnest_theme') === 'dark' ? 'Light mode' : 'Dark mode'; themeButton.onclick = () => { const dark = document.body.classList.toggle('dark'); localStorage.setItem('tripnest_theme', dark ? 'dark' : 'light'); themeButton.textContent = dark ? 'Light mode' : 'Dark mode'; }; nav.append(themeButton); if (localStorage.getItem('tripnest_theme') === 'dark') document.body.classList.add('dark');
}

addSharedNavigation(); loadStays(); loadBookings(); loadDetail(); loadWishlist(); loadDashboard(); loadAdmin();
