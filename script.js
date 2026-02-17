// Configuracion inicial // // Configuracion inicial // // Configuracion inicial //
function sanitizeHTML(str){
if(!str) return '';
const div = document.createElement('div');
div.textContent = str;
return div.innerHTML;
}
function sanitizeData(obj){
if(typeof obj === 'string') return sanitizeHTML(obj);
if(Array.isArray(obj)) return obj.map(sanitizeData);
if(typeof obj === 'object' && obj !== null){
const sanitized = {};
for(let key in obj){
sanitized[key] = sanitizeData(obj[key]);
}
return sanitized;
}
return obj;
}
// Configuracion sobre el menu secreto // // Configuracion sobre el menu secreto // // Configuracion sobre el menu secreto //
let logoClickCount = 0;
let logoClickTimer = null;
let adminMenuActivated = false;
let datosListaCargados = false;
document.addEventListener('DOMContentLoaded', function(){
const logo = document.querySelector('.app-header__logo');
const adminTab = document.getElementById('admin-tab');
if(logo && adminTab){
logo.addEventListener('click', function(){
if(adminMenuActivated) return;
logo.classList.add('clicking');
setTimeout(() => {
logo.classList.remove('clicking');
}, 600);
logoClickCount++;
if(logoClickTimer){
clearTimeout(logoClickTimer);
}
if (logoClickCount >= 10) {
adminMenuActivated = true;
adminTab.style.display = 'flex';
logoClickCount = 0;
console.log('Menú de Administrador activado');
setTimeout(() => inicializarNavegacionAdmin(), 100);
}
logoClickTimer = setTimeout(()=>{
logoClickCount = 0;
},2000);
});
}
});
// Proteccion de envio para Google Sheets //
class ProteccionEnvio {
constructor() {
this.lockKey = 'envio_en_proceso';
this.lastHashKey = 'ultimo_hash_enviado';
this.lockTimeout = 30000;
this.hashTimeout = 300000; 
}
generarHash(quinielas) {
const data = quinielas.map(q =>
`${q.userName}|${q.selections}|${q.price}`
).join('||');
let hash = 0;
for (let i = 0; i < data.length; i++) {
const char = data.charCodeAt(i);
hash = ((hash << 5) - hash) + char;
hash = hash & hash;
}
return hash.toString(36);
}
puedoEnviar(quinielas) {
const lock = localStorage.getItem(this.lockKey);
if (lock) {
const lockTime = parseInt(lock);
const ahora = Date.now();
if (ahora - lockTime < this.lockTimeout) {
console.warn('⚠️ Envío en proceso, espera...');
return { permitido: false, razon: 'EN_PROCESO' };
} else {
localStorage.removeItem(this.lockKey);
}
}
const hashActual = this.generarHash(quinielas);
const ultimoEnvio = localStorage.getItem(this.lastHashKey);
if (ultimoEnvio) {
const [hash, timestamp] = ultimoEnvio.split('|');
const ahora = Date.now();
if (hash === hashActual && (ahora - parseInt(timestamp)) < this.hashTimeout) {
console.warn('⚠️ Pedido duplicado detectado');
return { permitido: false, razon: 'DUPLICADO' };
}
}
return { permitido: true, hash: hashActual };
}
activarLock() {
localStorage.setItem(this.lockKey, Date.now().toString());
}
liberarLock(hash) {
localStorage.removeItem(this.lockKey);
if (hash) {
localStorage.setItem(this.lastHashKey, `${hash}|${Date.now()}`);
}
}
mostrarAlerta(razon) {
const mensajes = {
'EN_PROCESO': 'Ya hay un envío en proceso. Espera unos segundos ⏳ .',
'DUPLICADO': 'Este pedido ya fue enviado hace un momento ⚠️ .'
};
const modal = document.createElement('div');
modal.style.cssText = `
position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
background: white; padding: 25px; border-radius: 15px;
box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 10001;
border: 3px solid #ff6b6b; text-align: center; max-width: 320px;
`;
modal.innerHTML = `
<div style="font-size: 60px; margin-bottom: 10px;">🚫</div>
<p style="color: #333; font-size: 16px; margin: 0 0 15px 0; font-weight: 600;">
${mensajes[razon]}
</p>
<button onclick="this.closest('div').remove()"
style="padding: 10px 20px; background: #ff6b6b; color: white;
border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">
Entendido
</button>
`;
document.body.appendChild(modal);
setTimeout(() => modal.remove(), 4000);
}
}
const proteccionEnvio = new ProteccionEnvio();
//Trabaja en la Quiniela semanal // //Trabaja en la Quiniela semanal // //Trabaja en la Quiniela semanal //
const QuinielaJ1 = {
matchesData: [
{ id: 1, local: 'Tigres', visit: 'Pachuca', imgL: 'logos/tigres.png', imgV: 'logos/pachuca.png' },
{ id: 2, local: 'Puebla', visit: 'América', imgL: 'logos/puebla.png', imgV: 'logos/america.png' },
{ id: 3, local: 'Atlas', visit: 'San Luis', imgL: 'logos/atlas.png', imgV: 'logos/san luis.png' },
{ id: 4, local: 'León', visit: 'Santos', imgL: 'logos/leon.png', imgV: 'logos/santos.png' },
{ id: 5, local: 'Necaxa', visit: 'Toluca', imgL: 'logos/necaxa.png', imgV: 'logos/toluca.png' },
{ id: 6, local: 'Cruz Azul', visit: 'Chivas', imgL: 'logos/cruz azul.png', imgV: 'logos/chivas.png' },
{ id: 7, local: 'Pumas', visit: 'Monterrey', imgL: 'logos/pumas.png', imgV: 'logos/monterrey.png' },
{ id: 8, local: 'Querétaro', visit: 'Juárez', imgL: 'logos/queretaro.png', imgV: 'logos/juarez.png' },
{ id: 9, local: 'Tijuana', visit: 'Mazatlán', imgL: 'logos/tijuana.png', imgV: 'logos/mazatlan.png' }
],
userSelections: {},
vendedor: 'Juan de Dios',
buttonsAttached: false,
init() {
this.verificarTiempoRestante();
this.loadFromLocalStorage();
this.renderMatches();
this.attachSelectionEvents();
if (!this.buttonsAttached) {
this.attachButtonEvents();
this.buttonsAttached = true;
}
this.updateCounter();
this.updateCombinationsAndPrice();
console.log('Quiniela J1 inicializada ✅');
},
verificarTiempoRestante() {
const fechaLimite = new Date('2026-02-20T15:00:00');
this.mostrarCuentaRegresiva(fechaLimite);
},
mostrarCuentaRegresiva(fechaLimite) {
const modal = document.createElement('div');
modal.id = 'modalTiempo';
modal.style.cssText = `
position: fixed; top: 0; left: 0; right: 0; bottom: 0;
background: rgba(0,0,0,0.9); z-index: 10000;
display: flex; align-items: center; justify-content: center;
padding: 20px; animation: fadeIn 0.3s;
`; 
modal.innerHTML = `
<div style="
background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
border-radius: 25px; padding: 40px; max-width: 400px; width: 100%;
box-shadow: 0 20px 60px rgba(255,107,107,0.4);
border: 3px solid #ff6b6b; text-align: center;
">
<div style="font-size: 100px; margin-bottom: 20px; animation: pulse 2s infinite;">⏰</div>
<h2 style="color: #ff6b6b; margin: 0 0 15px 0; font-size: 26px; font-weight: 900; text-shadow: 0 0 20px rgba(255,107,107,0.5);">
¡Tiempo límite!
</h2>
<p style="color: #fff; font-size: 15px; margin: 0 0 10px 0; opacity: 0.9;">
La jornada cerrará el
</p>
<p style="color: #ffd700; font-size: 18px; margin: 0 0 25px 0; font-weight: 700;">
Viernes a las 3:00 pm
</p>
<div id="countdown" style="
background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
padding: 25px; border-radius: 15px; margin-bottom: 25px;
box-shadow: 0 10px 30px rgba(255,107,107,0.3);
">
<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
<div>
<div id="dias" style="color: #fff; font-size: 36px; font-weight: 900;">00</div>
<div style="color: rgba(255,255,255,0.8); font-size: 10px; font-weight: 600;">DÍAS</div>
</div>
<div>
<div id="horas" style="color: #fff; font-size: 36px; font-weight: 900;">00</div>
<div style="color: rgba(255,255,255,0.8); font-size: 10px; font-weight: 600;">HORAS</div>
</div>
<div>
<div id="minutos" style="color: #fff; font-size: 36px; font-weight: 900;">00</div>
<div style="color: rgba(255,255,255,0.8); font-size: 10px; font-weight: 600;">MIN</div>
</div>
<div>
<div id="segundos" style="color: #fff; font-size: 36px; font-weight: 900;">00</div>
<div style="color: rgba(255,255,255,0.8); font-size: 10px; font-weight: 600;">SEG</div>
</div>
</div>
</div>
<button onclick="document.getElementById('modalTiempo').remove()" style="
width: 100%; padding: 15px;
background: linear-gradient(135deg, #006847 0%, #009c3b 100%);
color: white; border: none; border-radius: 12px;
font-size: 17px; font-weight: 700; cursor: pointer;
box-shadow: 0 8px 20px rgba(0,104,71,0.4);
">
Entendido ✓
</button>
</div>
<style>
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideDown { from { transform: translateY(-50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
</style>
`;  
document.body.appendChild(modal); 
const interval = setInterval(() => {
const ahora = new Date();
const diferencia = fechaLimite - ahora;   
if (diferencia <= 0) {
clearInterval(interval);
document.getElementById('dias').textContent = '00';
document.getElementById('horas').textContent = '00';
document.getElementById('minutos').textContent = '00';
document.getElementById('segundos').textContent = '00';
return;
}
const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);   
document.getElementById('dias').textContent = String(dias).padStart(2, '0');
document.getElementById('horas').textContent = String(horas).padStart(2, '0');
document.getElementById('minutos').textContent = String(minutos).padStart(2, '0');
document.getElementById('segundos').textContent = String(segundos).padStart(2, '0');
}, 1000);
},
renderMatches() {
const matchListContainer = document.getElementById('matchList');
if (!matchListContainer) return;
matchListContainer.innerHTML = '';
this.matchesData.forEach(match => {
const card = document.createElement('div');
card.className = 'match-card-new';
card.innerHTML = `
<div class="match-grid-new">
<button class="option-btn-new" data-id="${match.id}" data-type="L">L</button>
<div class="team-logo-new"><img src="${match.imgL}" alt="${match.local}"></div>
<span class="team-name-new local">${match.local}</span>
<button class="option-btn-new" data-id="${match.id}" data-type="E">E</button>
<span class="team-name-new visit">${match.visit}</span>
<div class="team-logo-new"><img src="${match.imgV}" alt="${match.visit}"></div>
<button class="option-btn-new" data-id="${match.id}" data-type="V">V</button>
</div>
`;
matchListContainer.appendChild(card);
});
},
attachSelectionEvents() {
const buttons = document.querySelectorAll('.option-btn-new');
buttons.forEach(btn => {
btn.addEventListener('click', () => {
const matchId = parseInt(btn.dataset.id);
const type = btn.dataset.type;
this.toggleSelection(matchId, type);
});
});
},
toggleSelection(matchId, type) {
if (!this.userSelections[matchId]) {
this.userSelections[matchId] = [];
}
const index = this.userSelections[matchId].indexOf(type);
if (index > -1) {
this.userSelections[matchId].splice(index, 1);
if (this.userSelections[matchId].length === 0) {
delete this.userSelections[matchId];
}
} else {
this.userSelections[matchId].push(type);
const currentLength = this.userSelections[matchId].length;
if (currentLength === 2) {
const doublesCount = Object.values(this.userSelections).filter(sel => sel.length === 2).length;
if (doublesCount > 3) {
this.userSelections[matchId].splice(this.userSelections[matchId].indexOf(type), 1);
this.showErrorAlert('No se permiten más de 3 dobles ❌');
return;
}
} else if (currentLength === 3) {
const triplesCount = Object.values(this.userSelections).filter(sel => sel.length === 3).length;
if (triplesCount > 3) {
this.userSelections[matchId].splice(this.userSelections[matchId].indexOf(type), 1);
this.showErrorAlert('No se permiten más de 3 triples ❌');
return;
}
}
}
this.updateUI();
this.updateCombinationsAndPrice();
},
updateUI() {
const buttons = document.querySelectorAll('.option-btn-new');
buttons.forEach(btn => {
const mId = parseInt(btn.dataset.id);
const type = btn.dataset.type;
if (this.userSelections[mId] && this.userSelections[mId].includes(type)) {
btn.classList.add('active');
} else {
btn.classList.remove('active');
}
});
},
calculateCombinations() {
const keys = Object.keys(this.userSelections);
if (keys.length === 0) return 0;
let total = 1;
keys.forEach(matchId => {
const selections = this.userSelections[matchId];
total *= selections.length;
});
return total;
},
updateCombinationsAndPrice() {
const combos = this.calculateCombinations();
const pricePerCombo = 30;
const totalPrice = combos * pricePerCombo;
const btnCombos = document.getElementById('btnCombos');
const btnTotal = document.getElementById('btnTotal');
if (btnCombos) {
btnCombos.querySelector('.btn-content').textContent = combos;
}
if (btnTotal) {
btnTotal.querySelector('.btn-content').textContent = `$${totalPrice}`;
}
},
attachButtonEvents() {
const btnDelete = document.getElementById('btnDelete');
const btnRandom = document.getElementById('btnRandom');
const btnInfo = document.getElementById('btnInfo');
const headerPrice = document.getElementById('headerPrice');
const btnSaveHeader = document.getElementById('btnSaveHeader');
const btnLoadSaved = document.getElementById('btnLoadSaved');
const btnSend = document.getElementById('btnSend');
if (btnDelete) btnDelete.addEventListener('click', () => this.clearSelections());
if (btnRandom) btnRandom.addEventListener('click', () => this.generateRandom());
if (btnInfo) btnInfo.addEventListener('click', () => this.showReglamento());
if (headerPrice) headerPrice.addEventListener('click', () => this.showPrecios());
if (btnSaveHeader) btnSaveHeader.addEventListener('click', () => this.saveQuiniela());
if (btnLoadSaved) btnLoadSaved.addEventListener('click', () => this.showSavedQuinielas());
if (btnSend) btnSend.addEventListener('click', () => this.sendQuiniela());
},
clearSelections() {
this.userSelections = {};
this.updateUI();
this.updateCombinationsAndPrice();
console.log(' Selecciones borradas🗑️');
},
generateRandom() {
this.userSelections = {};
let doublesCount = 0;
let triplesCount = 0;
this.matchesData.forEach(match => {
const rand = Math.random();
if (rand < 0.75) {
const options = ['L', 'E', 'V'];
this.userSelections[match.id] = [options[Math.floor(Math.random() * 3)]];
} else if (rand < 0.95 && doublesCount < 3) {
const options = ['L', 'E', 'V'];
const idx1 = Math.floor(Math.random() * 3);
let idx2 = Math.floor(Math.random() * 3);
while (idx2 === idx1) idx2 = Math.floor(Math.random() * 3);
this.userSelections[match.id] = [options[idx1], options[idx2]];
doublesCount++;
} else if (triplesCount < 3) {
this.userSelections[match.id] = ['L', 'E', 'V'];
triplesCount++;
} else {
const options = ['L', 'E', 'V'];
this.userSelections[match.id] = [options[Math.floor(Math.random() * 3)]];
}
});
this.updateUI();
this.updateCombinationsAndPrice();
console.log(' Quiniela aleatoria generada🎲');
},
showErrorAlert(message) {
const modal = document.createElement('div');
modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;`;
modal.innerHTML = `
<div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border-radius: 20px; padding: 25px; max-width: 600px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); border: 3px solid #ce1126; text-align: center;">
<img src="logos/tarjetaroja.png" alt="Error" style="width: 120px; height: 120px; object-fit: contain; margin: 0 auto 15px auto; display: block;">
<h2 style="color: #ce1126; margin: 0 0 15px 0; font-size: 22px; font-weight: 800;">Acción Incorrecta</h2>
<p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">${message}</p>
<button onclick="this.closest('div').parentElement.remove()" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #ce1126 0%, #9d0d1f 100%); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer;">Entendido</button>
</div>
`;
document.body.appendChild(modal);
},
showReglamento() {
const modal = document.createElement('div');
modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;`;
modal.innerHTML = `
<div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border-radius: 20px; padding: 25px; max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); border: 3px solid #006847;">
<div style="text-align: center; margin-bottom: 20px;">
<div style="font-size: 60px; margin-bottom: 10px;">⚽</div>
<h2 style="color: #006847; margin: 0; font-size: 24px; font-weight: 800;">Reglamento</h2>
</div>
<div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #ce1126; max-height: 400px; overflow-y: auto;">
<p style="color: #333; line-height: 1.8; margin: 0; font-size: 14px;">
1-Primer Lugar: Será el participante que obtenga el mayor número de aciertos.<br>
En caso de empate , el monto total del premio se repartirá en partes iguales.<br>
2-Segundo lugar: Un acierto menos que el primer lugar.<br>
Solamente será repartido y entregado el monto asignado al segundo lugar, siempre y cuando se cumpla el requisito. <br>
3-El monto publicado es lo que se le entregará al ganador(es).<br>
4-Solo se podrá apostar por: equipo local, empate o equipo visitante.<br>
El resultado válido para cada partido será únicamente el obtenido durante el tiempo reglamentario, es decir,
los 90 minutos más el tiempo agregado.<br>
5-Es responsabilidad del participante verificar que su quiniela esté correctamente registrada.<br>
En caso de existir algún error y no ser reportado antes de la publicación de la lista final, no se podrán realizar correcciones posteriormente.<br>
6-Quiniela no capturada:<br>
Si tu quiniela no fue registrada por algún error, ya sea por parte del vendedor o por un fallo nuestro, se te reembolsará el costo total de la quiniela.<br>
7-Participación de la quiniela:<br>
Tu quiniela participará conforme a cómo fue capturada y publicada en la lista final.<br>
Si no estás de acuerdo con los resultados registrados, podrás solicitar el reembolso antes de que inicie el 2 partido.<br>
8-Publicación de la lista final:<br>
Cada semana, antes de iniciar el primer partido, se publicará la lista final de participantes, la cual no podrá ser modificada una vez publicada. <br>
9-Partidos suspendidos o pospuestos:<br>
Si un partido es suspendido durante su transcurso, se tomará en cuenta siempre y cuando se reanude y finalice dentro de la misma jornada.<br>
De lo contrario, se considerará como resultado oficial el marcador al momento de la suspensión.<br>
Por otra parte, si un partido es pospuesto antes de iniciar y no se juega dentro de la misma jornada, dicho partido no será tomado en cuenta.<br>
</div>
<button onclick="this.closest('div').parentElement.remove()" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #006847 0%, #009c3b 100%); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer;">Entendido ✓</button>
</div>
`;
document.body.appendChild(modal);
},
showPrecios() {
const modal = document.createElement('div');
modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;`;
modal.innerHTML = `
<div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border-radius: 20px; padding: 25px; max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); border: 3px solid #ffd700;">
<div style="text-align: center; margin-bottom: 20px;">
<div style="font-size: 60px; margin-bottom: 10px;">💰</div>
<h2 style="color: #006847; margin: 0; font-size: 24px; font-weight: 800;">Precios</h2>
</div>
<div style="background: linear-gradient(135deg, #006847 0%, #009c3b 100%); padding: 20px; border-radius: 12px; margin-bottom: 15px; text-align: center;">
<div style="color: #ffd700; font-size: 14px; font-weight: 600; margin-bottom: 5px;">Precio</div>
<div style="color: white; font-size: 36px; font-weight: 900; margin-bottom: 5px;">$30</div>
<div style="color: rgba(255,255,255,0.9); font-size: 12px;">Por quiniela</div>
</div>
<div style="background: linear-gradient(135deg, #ce1126 0%, #9d0d1f 100%); padding: 20px; border-radius: 12px; text-align: center; position: relative;">
<div style="position: absolute; top: 10px; right: 10px; background: #ffd700; color: #ce1126; padding: 5px 5px; border-radius: 20px; font-size: 8px; font-weight: 500;">Promo 🔥</div>
<div style="color: #ffd700; font-size: 13px; font-weight: 600; margin-bottom: 8px;">Para que invites a tus amigos</div>
<div style="color: white; font-size: 16px; font-weight: 700; margin-bottom: 5px;">10 o más quinielas</div>
<div style="color: white; font-size: 32px; font-weight: 900;">$30 cada una</div>
</div>
<button onclick="this.closest('div').parentElement.remove()" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #006847 0%, #009c3b 100%); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 20px;">Cerrar</button>
</div>
`;
document.body.appendChild(modal);
},
expandCombinations(selections) {
const matchIds = Object.keys(selections);
if (matchIds.length === 0) return [];
const generateCombinations = (obj, keys, index = 0, current = {}) => {
if (index === keys.length) return [{ ...current }];
const key = keys[index];
const values = obj[key];
let results = [];
values.forEach(value => {
const newCurrent = { ...current, [key]: value };
results = results.concat(generateCombinations(obj, keys, index + 1, newCurrent));
});
return results;
};
return generateCombinations(selections, matchIds);
},
loadFromLocalStorage() {
this.userSelections = {};
localStorage.removeItem('currentQuiniela');
this.updateUI();
this.updateCombinationsAndPrice();
},
updateCounter() {
const saved = JSON.parse(localStorage.getItem('quinielasGuardadas') || '[]');
const btnLoadSaved = document.getElementById('btnLoadSaved');
if (btnLoadSaved) {
const counter = btnLoadSaved.querySelector('.btn-content');
if (saved.length > 0) {
counter.innerHTML = `💾 <span style="position: absolute; top: 8px; right: -10px; background: #ffd700; color: #ce1126; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; border: 2px solid white;">${saved.length}</span>`;
counter.style.position = 'relative';
} else {
counter.textContent = '💾';
}
}
},
saveQuiniela() {
const userName = document.getElementById('userName').value.trim();
if (!userName) {
this.showErrorAlert('Ingresa tu nombre antes de guardar la quiniela ❌');
return;
}
const selectedMatches = Object.keys(this.userSelections).length;
if (selectedMatches < 9) {
this.showErrorAlert(`Faltan ${9 - selectedMatches} partido(s) por seleccionar ❌`);
return;
}
const allCombinations = this.expandCombinations(this.userSelections);
let saved = JSON.parse(localStorage.getItem('quinielasGuardadas') || '[]');
allCombinations.forEach((combo, index) => {
const quiniela = {
id: Date.now() + index,
userName: userName,
vendedor: this.vendedor,
selections: JSON.stringify(combo),
combinations: 1,
price: 30,
date: new Date().toLocaleString('es-MX')
};
saved.push(quiniela);
});
localStorage.setItem('quinielasGuardadas', JSON.stringify(saved));
document.getElementById('userName').value = '';
this.userSelections = {};
this.updateUI();
this.updateCombinationsAndPrice();
this.updateCounter();
const modal = document.createElement('div');
modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;`;
modal.innerHTML = `
<div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border-radius: 20px; padding: 25px; max-width: 350px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); border: 3px solid #006847; text-align: center;">
<div style="font-size: 80px; margin-bottom: 15px;">✅</div>
<h2 style="color: #006847; margin: 0 0 10px 0; font-size: 24px; font-weight: 800;">${allCombinations.length} Quinielas guardadas</h2>
<p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">Tus quinielas se guardaron correctamente</p>
<button onclick="this.closest('div').parentElement.remove()" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #006847 0%, #009c3b 100%); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer;">Aceptar</button>
</div>
`;
document.body.appendChild(modal);
console.log(`${allCombinations.length} Quinielas guardadas 💾`);
},
showSavedQuinielas() {
const saved = JSON.parse(localStorage.getItem('quinielasGuardadas') || '[]');
if (saved.length === 0) {
this.showErrorAlert('No tienes quinielas guardadas ❌');
return;
}
const modal = document.createElement('div');
modal.className = 'modal-guardadas';
modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;`;
let quinielasHTML = '';
let totalPrice = 0;
saved.forEach((q, index) => {
const selections = JSON.parse(q.selections);
let miniQuinielaHTML = '';
totalPrice += q.price;
this.matchesData.forEach(match => {
const sel = selections[match.id];
if (sel) {
miniQuinielaHTML += `
<div style="display: grid; grid-template-columns: 22px 60px auto 60px 22px; align-items: center; gap: 4px; padding: 4px; background: #f8f9fa; border-radius: 6px; margin-bottom: 3px;">
<img src="${match.imgL}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: contain;">
<div style="font-size: 9px; font-weight: 700; color: #333; text-align: left;">${match.local}</div>
<div style="background: white; color: #333; padding: 3px 6px; border-radius: 5px; font-size: 10px; font-weight: 900; text-align: center; border: 2px solid #e5e7eb;">${sel}</div>
<div style="font-size: 9px; font-weight: 700; color: #333; text-align: right;">${match.visit}</div>
<img src="${match.imgV}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: contain;">
</div>
`;
}
});
quinielasHTML += `
<div style="background: white; border-radius: 10px; padding: 12px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); position: relative; border-left: 4px solid #006847; width: 100%; max-width: 600px;">
<button class="btn-delete-quiniela" data-quiniela-id="${q.id}" style="position: absolute; top: 8px; right: 8px; background: #ce1126; color: white; border: none; border-radius: 50%; width: 26px; height: 26px; cursor: pointer; font-size: 15px; font-weight: 700; z-index: 10;">×</button>
<div style="margin-bottom: 10px;">
<div style="color: #006847; font-size: 14px; font-weight: 800;">${q.userName}</div>
<div style="color: #666; font-size: 11px;">Vendedor: ${q.vendedor}</div>
<div style="color: #999; font-size: 10px;">${q.date}</div>
</div>
<div style="margin-bottom: 10px; max-height: 300px; overflow-y: auto;">${miniQuinielaHTML}</div>
</div>
`;
});
modal.innerHTML = `
<div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border-radius: 20px; padding: 20px; max-width: 550px; width: 100%; max-height: 85vh; overflow-y: auto;">
<div style="text-align: center; margin-bottom: 18px; position: sticky; top: 0; background: white; padding-bottom: 12px; z-index: 1;">
<h2 style="color: #006847; margin: 0; font-size: 22px; font-weight: 800;">Quinielas guardadas</h2>
</div>
${quinielasHTML}
<div style="background: linear-gradient(135deg, #006847 0%, #009c3b 100%); border-radius: 12px; padding: 20px; margin: 20px 0 15px 0; text-align: center;">
<div style="display: flex; justify-content: space-around; align-items: center;">
<div>
<div style="color: rgba(255,255,255,0.9); font-size: 12px; margin-bottom: 5px;">Quinielas guardadas</div>
<div style="color: #ffd700; font-size: 32px; font-weight: 900;">${saved.length}</div>
</div>
<div style="width: 2px; height: 50px; background: rgba(255,255,255,0.4);"></div>
<div>
<div style="color: rgba(255,255,255,0.9); font-size: 12px; margin-bottom: 5px;">Precio total</div>
<div style="color: #ffd700; font-size: 32px; font-weight: 900;">$${totalPrice}</div>
</div>
</div>
</div>
<button class="btn-close-modal" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #006847 0%, #009c3b 100%); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer; position: sticky; bottom: 0;">Cerrar</button>
</div>
`;
document.body.appendChild(modal);
const deleteButtons = modal.querySelectorAll('.btn-delete-quiniela');
deleteButtons.forEach(btn => {
btn.addEventListener('click', (e) => {
e.stopPropagation();
const quinielaId = parseInt(btn.getAttribute('data-quiniela-id'));
QuinielaJ1.deleteQuiniela(quinielaId);
});
});
const closeBtn = modal.querySelector('.btn-close-modal');
closeBtn.addEventListener('click', () => modal.remove());
},
deleteQuiniela(id){
let saved = JSON.parse(localStorage.getItem('quinielasGuardadas') || []);
saved = saved.filter(q => q.id !== id);
localStorage.setItem('quinielasGuardadas', JSON.stringify(saved));
this.updateCounter();
const modal = document.querySelector('.modal-guardadas');
if(modal) modal.remove();
if(saved.length > 0){
this.showSavedQuinielas();
}
console.log('Quiniela eliminada: ✅', id);
},
sendQuiniela() {
const saved = JSON.parse(localStorage.getItem('quinielasGuardadas') || '[]');
if (saved.length === 0) {
this.showErrorAlert('No tienes quinielas guardadas para enviar ❌ ');
return;
}
const modal = document.createElement('div');
modal.style.cssText = `
position: fixed; top: 0; left: 0; right: 0; bottom: 0;
background: rgba(0,0,0,0.85); z-index: 10000;
display: flex; align-items: center; justify-content: center; padding: 20px;
`;
const totalPrice = saved.reduce((sum, q) => sum + q.price, 0);
modal.innerHTML = `
<div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
border-radius: 20px; padding: 25px; max-width: 350px; width: 100%;
box-shadow: 0 20px 60px rgba(0,0,0,0.3); border: 3px solid #006847;
text-align: center;">
<div style="font-size: 80px; margin-bottom: 15px;">📲</div>
<h2 style="color: #006847; margin: 0 0 10px 0; font-size: 22px; font-weight: 800;">
Enviar por WhatsApp
</h2>
<div style="background: #f8f9fa; padding: 15px; border-radius: 12px; margin: 15px 0;">
<div style="color: #666; font-size: 13px; margin-bottom: 8px;">
<strong>${saved.length}</strong> quiniela${saved.length !== 1 ? 's' : ''} guardada${saved.length !== 1 ? 's 📋' : ''}
</div>
<div style="color: #006847; font-size: 24px; font-weight: 900;">
$${totalPrice}
</div>
</div>
<p style="color: #666; font-size: 13px; margin: 15px 0;">
Para finalizar, envía todas tus quinielas por WhatsApp ⚠️
</p>
<button class="btn-enviar-confirmar"
style="width: 100%; padding: 14px; margin-bottom: 10px;
background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
color: white; border: none; border-radius: 10px;
font-size: 16px; font-weight: 700; cursor: pointer;
box-shadow: 0 4px 12px rgba(37, 211, 102, 0.4);">
Enviar ahora ✓
</button>
<button class="btn-cancelar"
style="width: 100%; padding: 12px;
background: transparent; color: #999; border: 2px solid #ddd;
border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer;">
Cancelar
</button>
</div>
`;
document.body.appendChild(modal);
modal.querySelector('.btn-enviar-confirmar').addEventListener('click', () => {
modal.remove();
this.procesarEnvioWhatsApp(saved, totalPrice);
});
modal.querySelector('.btn-cancelar').addEventListener('click', () => {
modal.remove();
});
},
//Todo lo de abajo trabaja en el envio de Whats App // //Todo lo de abajo trabaja en el envio de Whats App // //Todo lo de abajo trabaja en el envio de Whats App //
procesarEnvioWhatsApp(saved, totalPrice) {
const verificacion = proteccionEnvio.puedoEnviar(saved);
if (!verificacion.permitido) {
proteccionEnvio.mostrarAlerta(verificacion.razon);
return;
}
proteccionEnvio.activarLock();
this._hashActual = verificacion.hash;
const numeroWhatsApp = '5218128897266';
let mensaje = '';
const quinielasParaSheets = [];
saved.forEach((quiniela, index) => {
const selections = JSON.parse(quiniela.selections);
mensaje += `${quiniela.userName}\n`;
this.matchesData.forEach((match, partidoIdx) => {
const sel = selections[match.id];
if (sel) {
mensaje += `P${partidoIdx + 1}: ${sel}\n`;
}
});
if (index < saved.length - 1) {
mensaje += `\n`;
}
quinielasParaSheets.push({
nombre: quiniela.userName,
partido1: selections[1] || '',
partido2: selections[2] || '',
partido3: selections[3] || '',
partido4: selections[4] || '',
partido5: selections[5] || '',
partido6: selections[6] || '',
partido7: selections[7] || '',
partido8: selections[8] || '',
partido9: selections[9] || ''
});
});
mensaje += `\nMis quinielas: ${saved.length}\n`;
mensaje += `Total a pagar: $${totalPrice}\n`;
mensaje += `En unos momentos te envío el comprobante.`;
this.enviarQuinielasASheets(quinielasParaSheets);
const url = `https://api.whatsapp.com/send?phone=${numeroWhatsApp}&text=${encodeURIComponent(mensaje)}`;
window.open(url, '_blank');
const quinielasEnviadas = JSON.parse(localStorage.getItem('quinielasEnviadas') || '[]');
saved.forEach(q => {
q.fechaEnvio = new Date().toLocaleString('es-MX');
quinielasEnviadas.push(q);
});
localStorage.setItem('quinielasEnviadas', JSON.stringify(quinielasEnviadas));
localStorage.setItem('quinielasGuardadas', '[]');
this.updateCounter();
this.mostrarConfirmacionEnvio(saved.length, totalPrice);
setTimeout(() => proteccionEnvio.liberarLock(this._hashActual), 500);
},
async enviarQuinielasASheets(quinielas) {
try {
console.log('📤 Enviando a Google Sheets (No confirmadas)...', quinielas);
await fetch(GOOGLE_SHEETS_ADMIN_URL, {
method: 'POST',
mode: 'no-cors',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
action: 'guardar',
quinielas: quinielas
})
});
console.log('Petición enviada ✅ (no-cors). El navegador no muestra la respuesta, revisa la hoja.');
} catch (error) {
console.error('Error al conectar con Sheets❌:', error);
}
},
mostrarConfirmacionEnvio(cantidad, total) {
const modal = document.createElement('div');
modal.style.cssText = `
position: fixed; top: 0; left: 0; right: 0; bottom: 0;
background: rgba(0,0,0,0.85); z-index: 10000;
display: flex; align-items: center; justify-content: center; padding: 20px;
`;
modal.innerHTML = `
<div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
border-radius: 20px; padding: 25px; max-width: 350px; width: 100%;
box-shadow: 0 20px 60px rgba(0,0,0,0.3); border: 3px solid #25D366;
text-align: center;">
<div style="font-size: 80px; margin-bottom: 15px;">✅</div>
<h2 style="color: #25D366; margin: 0 0 10px 0; font-size: 24px; font-weight: 800;">
¡WhatsApp abierto!
</h2>
<p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
${cantidad} quiniela${cantidad !== 1 ? 's' : ''} lista${cantidad !== 1 ? 's' : ''} por <strong>$${total}</strong><br><br>
<button onclick="this.closest('div').parentElement.remove()"
style="width: 100%; padding: 12px;
background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
color: white; border: none; border-radius: 10px;
font-size: 16px; font-weight: 700; cursor: pointer;">
Entendido
</button>
</div>
`;
document.body.appendChild(modal);
setTimeout(() => {
if (document.body.contains(modal)) {
modal.remove();
}
}, 10000);
}
};
window.QuinielaJ1 = QuinielaJ1;
window.eliminarQuinielaEnviada = function(id) {
const quinielasEnviadas = JSON.parse(localStorage.getItem('quinielasEnviadas') || '[]');
const filtradas = quinielasEnviadas.filter(q => q.id !== id);
localStorage.setItem('quinielasEnviadas', JSON.stringify(filtradas));
if (typeof cargarSeccionQuinielas === 'function') {      cargarSeccionQuinielas();
}
console.log('✅ Quiniela enviada eliminada:', id);
};
//===Navegacion principal entre las 6 pestañas===// //===Navegacion principal entre las 6 pestañas===// //===Navegacion principal entre las 6 pestañas===//
document.addEventListener('DOMContentLoaded', function(){
const navButtons         = document.querySelectorAll('.bottom-nav__item');
const views              = document.querySelectorAll('.view');
const subNavInicio       = document.getElementById('sub-nav-inicio');
const subNavAnalisis     = document.getElementById('sub-nav-analisis');
const subNavResultados   = document.getElementById('sub-nav-resultados');
const subNavAdministrador= document.getElementById('sub-nav-administrador');
function mostrarSoloSubNav(targetView){
if(subNavInicio)        subNavInicio.style.display        = (targetView === 'view-inicio')        ? 'flex' : 'none';
if(subNavAnalisis)      subNavAnalisis.style.display      = (targetView === 'view-analisis')      ? 'flex' : 'none';
if(subNavResultados)    subNavResultados.style.display    = (targetView === 'view-resultados')    ? 'flex' : 'none';
if(subNavAdministrador) subNavAdministrador.style.display = (targetView === 'view-administrador') ? 'flex' : 'none';
}
navButtons.forEach(button=>{
button.addEventListener('click', function(){
const targetView = this.getAttribute('data-view');
if(!targetView) return;
navButtons.forEach(btn=>btn.classList.remove('bottom-nav__item--active'));
views.forEach(view=>view.classList.remove('view--active'));
this.classList.add('bottom-nav__item--active');
const viewEl = document.getElementById(targetView);
if(viewEl) viewEl.classList.add('view--active');
mostrarSoloSubNav(targetView);
if (targetView === 'view-analisis') {
const horariosBtn     = document.querySelector('#sub-nav-analisis [data-section="analisis"]');
const horariosSection = document.getElementById('analisis');
if (horariosBtn && horariosSection) {
const subNavAnalisisButtons = document.querySelectorAll('#sub-nav-analisis .sub-nav__item');
const analisisSections      = document.querySelectorAll('#view-analisis .app-main');
subNavAnalisisButtons.forEach(btn => btn.classList.remove('sub-nav__item--active'));
analisisSections.forEach(sec => sec.classList.remove('active'));
horariosBtn.classList.add('sub-nav__item--active');
horariosSection.classList.add('active');
}
}
else if(targetView === 'view-resultados'){
setTimeout(()=>{
const quinielasBtn     = document.querySelector('#sub-nav-resultados [data-section="quinielas"]');
const quinielasSection = document.getElementById('quinielas');
if(quinielasBtn && quinielasSection){
const subNavResultadosButtons = document.querySelectorAll('#sub-nav-resultados .sub-nav__item');
const resultadosSections      = document.querySelectorAll('#view-resultados .app-main');
subNavResultadosButtons.forEach(btn=>btn.classList.remove('sub-nav__item--active'));
resultadosSections.forEach(sec=>sec.classList.remove('active'));
quinielasBtn.classList.add('sub-nav__item--active');
quinielasSection.classList.add('active');
}
},50);
if(typeof cargarSeccionQuinielas === 'function'){
cargarSeccionQuinielas();
}
}else if (targetView === 'view-quiniela') {
console.log('Click en pestaña Quiniela');
setTimeout(() => {
if (window.QuinielaJ1 && typeof QuinielaJ1.init === 'function') {
console.log('Llamando QuinielaJ1.init()...');
QuinielaJ1.init();
} else {
console.error('QuinielaJ1 NO existe en window');
}
}, 50);
}
});
});
});
//===Navegacion en subpestañas de analisis===// //===Navegacion en subpestañas de analisis===// //===Navegacion en subpestañas de analisis===//
const subNavAnalisisButtons = document.querySelectorAll('#sub-nav-analisis .sub-nav__item');
const analisisSections      = document.querySelectorAll('#view-analisis .app-main');
subNavAnalisisButtons.forEach(button => {
button.addEventListener('click', function () {
const targetSection = this.getAttribute('data-section');
subNavAnalisisButtons.forEach(btn => btn.classList.remove('sub-nav__item--active'));
analisisSections.forEach(section => section.classList.remove('active'));
this.classList.add('sub-nav__item--active');
const section = document.getElementById(targetSection);
if (section) section.classList.add('active');
if (targetSection === 'porcentajes' && typeof cargarPorcentajesEnTiempoReal === 'function') {
cargarPorcentajesEnTiempoReal();
}
});
});
//===Navegacion en subpestañas de resultados===// //===Navegacion en subpestañas de resultados===// //===Navegacion en subpestañas de resultados===//
const subNavResultadosButtons = document.querySelectorAll('#sub-nav-resultados .sub-nav__item');
const resultadosSections = document.querySelectorAll('#view-resultados div');
subNavResultadosButtons.forEach(button => {
button.addEventListener('click', function()
{
const targetSection = this.getAttribute('data-section');
subNavResultadosButtons.forEach(btn => btn.classList.remove('sub-nav__item--active'));
resultadosSections.forEach(section => section.classList.remove('active'));
this.classList.add('sub-nav__item--active');
const activeSection = document.getElementById(targetSection);
if (activeSection) {
activeSection.classList.add('active');
}
if (targetSection === 'quinielas') {
cargarSeccionQuinielas();
} else if (targetSection === 'lista') {
cargarTablaResultados();
} else if (targetSection === 'primero') {
cargarSeccionPrimero();
} else if (targetSection === 'segundo') {
cargarSeccionSegundo();
} else if (targetSection === 'verificar') {
cargarSeccionVerificar();
}
console.log('Sección Resultados seleccionada:', targetSection);
});
});
document.addEventListener('DOMContentLoaded', function() {
console.log('DOM Cargado - Iniciando precarga de datos ✅');
cargarTablaResultados();
console.log('Datos cargándose en segundo plano 📊 ...');
});
//===Horarios de los partidos y el movimiento===//
const matchesData = [
{ local: { name: 'Tigres', logo: 'logos/tigres.png' }, visitor: { name: 'Pachuca', logo: 'logos/pachuca.png' }, day: 'Viernes', hour: '7:00 PM', broadcaster: ['logos/tv azteca.png', 'logos/fox sports.png']},
{ local: { name: 'Puebla', logo: 'logos/puebla.png' }, visitor: { name: 'América', logo: 'logos/america.png' }, day: 'Viernes', hour: '9:06 PM', broadcaster: ['logos/tv azteca.png', 'logos/fox sports.png']},
{ local: { name: 'Atlas', logo: 'logos/atlas.png' }, visitor: { name: 'San Luis', logo: 'logos/san luis.png' }, day: 'Sábado', hour: '5:00 PM', broadcaster: ['logos/tudn.png', 'logos/vix.png']},
{ local: { name: 'León', logo: 'logos/leon.png' }, visitor: { name: 'Santos', logo: 'logos/santos.png' }, day: 'Sábado', hour: '7:00 PM', broadcaster: ['logos/fox sports.png']},
{ local: { name: 'Necaxa', logo: 'logos/necaxa.png' }, visitor: { name: 'Toluca', logo: 'logos/toluca.png' }, day: 'Sábado', hour: '7:00 PM', broadcaster: ['logos/tv azteca.png', 'logos/vix.png']},
{ local: { name: 'Cruz Azul', logo: 'logos/cruz azul.png' }, visitor: { name: 'Chivas', logo: 'logos/chivas.png' }, day: 'Sábado', hour: '9:00 PM', broadcaster: ['logos/tudn.png', 'logos/vix.png']},
{ local: { name: 'Pumas', logo: 'logos/pumas.png' }, visitor: { name: 'Monterrey', logo: 'logos/monterrey.png' }, day: 'Domingo', hour: '5:00 PM', broadcaster: ['logos/tudn.png', 'logos/vix.png']},
{ local: { name: 'Querétaro', logo: 'logos/queretaro.png' }, visitor: { name: 'Juárez', logo: 'logos/juarez.png' }, day: 'Domingo', hour: '7:00 PM', broadcaster: ['logos/fox sports.png']},
{ local: { name: 'Tijuana', logo: 'logos/tijuana.png' }, visitor: { name: 'Mazatlán', logo: 'logos/mazatlan.png' }, day: 'Sábado', hour: '11:10 PM', broadcaster: ['logos/fox sports.png']},
];
let currentMatchIndex = 0;
window.addEventListener('load', function() {
currentMatchIndex = 0;
if (typeof showMatchCard === 'function') {
showMatchCard(0);
}
});
document.addEventListener('visibilitychange', function() {
if (!document.hidden) {
currentMatchIndex = 0;
if (typeof showMatchCard === 'function') {
showMatchCard(0);
}
}
});
function createMatchCard(match, index) {
return `
<div class="match-card ${index === 0 ? 'active' : ''}" data-index="${index}">
<div class="match-header">
<img src="logos/liga mx.png" alt="Liga MX" class="liga-mx-logo">
<div class="header-info-horarios">
<div class="header-row-horarios">
<span class="liga-mx-text">Liga MX</span>
<span class="match-number">Partido ${index + 1}</span>
</div>
<div class="match-title-horarios">${match.local.name} vs ${match.visitor.name}</div>
</div>
</div>
<div class="match-datetime">
<span class="match-day">${match.day}</span>
<span class="match-hour">${match.hour}</span>
</div>
<div class="match-teams">
<div class="team-section">
<img src="${match.local.logo}" alt="${match.local.name}" class="team-logo">
</div>
<div class="match-center">
<div class="vs-text">Vs</div>
<div class="score-label">Marcador</div>
<div class="score-display">0-0</div>
</div>
<div class="team-section">
<img src="${match.visitor.logo}" alt="${match.visitor.name}" class="team-logo">
</div>
</div>
<div class="match-footer">
<div class="broadcast-label">Canal</div>
<div class="broadcaster-container">
${Array.isArray(match.broadcaster)
? match.broadcaster.map(logo => `<img src="${logo}" alt="Broadcaster" class="broadcaster-logo">`).join('')
: `<img src="${match.broadcaster}" alt="Broadcaster" class="broadcaster-logo">`
}
</div>
</div>
</div>
`;
}
let carouselRendered = false;
function renderCarousel() {
const carousel = document.getElementById('matchesCarousel');
if (!carousel) return;
carousel.innerHTML = '';
matchesData.forEach((match, index) => {
carousel.innerHTML += createMatchCard(match, index);
});
}
function showMatch(index) {
const cards = document.querySelectorAll('.match-card');
const dots = document.querySelectorAll('.indicator-dot');
cards.forEach((card, i) => {
card.classList.toggle('active', i === index);
});
dots.forEach((dot, i) => {
dot.classList.toggle('active', i === index);
});
currentMatchIndex = index;
}
window.goToMatch = function(index) {
showMatch(index);
}
let touchStartX = 0;
let touchEndX = 0;
document.addEventListener('touchstart', (e) => {
const target = e.target.closest('.horarios-wrapper');
if (target) {
touchStartX = e.changedTouches[0].screenX;
}
});
document.addEventListener('touchend', (e) => {
const target = e.target.closest('.horarios-wrapper');
if (target) {
touchEndX = e.changedTouches[0].screenX;
handleSwipe();
}
});
function handleSwipe() {
if (touchEndX < touchStartX - 50) {
const newIndex = (currentMatchIndex + 1) % matchesData.length;
showMatch(newIndex);
}
if (touchEndX > touchStartX + 50) {
const newIndex = (currentMatchIndex - 1 + matchesData.length) % matchesData.length;
showMatch(newIndex);
}
}
renderCarousel();
document.addEventListener('DOMContentLoaded', function() {
const listaSection = document.getElementById('lista');
if (listaSection && listaSection.classList.contains('active')) {
cargarTablaResultados();
}
});
//===Todo lo de abajo trabaja en la lista oficial===// //===Todo lo de abajo trabaja en la lista oficial===// //===Todo lo de abajo trabaja en la lista oficial===//
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzX7aekamUL0-dvJqrMwvOrGZgpY1qnEuJrZkjl4vZZbPPPkY-BLlLH3jvCXUOYnKwU1Q/exec'; // No mover//
const GOOGLE_SHEETS_ADMIN_URL  = 'https://script.google.com/macros/s/AKfycbzUQoqLxcJisfimT2OxjiqFeSPdX-ahHFeGmq0tsVrIKJ8hufHtK7zigWCs7PzHc2TH/exec';
const LOGOS_EQUIPOS = {
'Puebla': 'logos/puebla.png',
'Atlas': 'logos/atlas.png',
'Tijuana': 'logos/tijuana.png',
'Queretaro': 'logos/queretaro.png',
'Juarez': 'logos/juarez.png',
'America': 'logos/america.png',
'Santos': 'logos/santos.png',
'Pumas': 'logos/pumas.png',
'Toluca': 'logos/toluca.png',
'Necaxa': 'logos/necaxa.png',
'Cruz Azul': 'logos/cruz azul.png',
'Mazatlan': 'logos/mazatlan.png',
'Pachuca': 'logos/pachuca.png',
'Monterrey': 'logos/monterrey.png',
'Leon': 'logos/leon.png',
'San Luis': 'logos/san luis.png',
'Chivas': 'logos/chivas.png',
'Tigres': 'logos/tigres.png'
};
const PARTIDOS = [
{ local: 'Tigres', visitante: 'Pachuca' },
{ local: 'Puebla', visitante: 'America' },
{ local: 'Atlas', visitante: 'San Luis' },
{ local: 'Leon', visitante: 'Santos' },
{ local: 'Necaxa', visitante: 'Toluca' },
{ local: 'Cruz Azul', visitante: 'Chivas' },
{ local: 'Pumas', visitante: 'Monterrey' },
{ local: 'Queretaro', visitante: 'Juarez' },
{ local: 'Tijuana', visitante: 'Mazatlan' }
];
let participantesOriginales = [];
let claveOficialGuardada = [];
async function cargarTablaResultados() {
if (datosListaCargados) {
console.log('✅ Datos ya cargados previamente✅');
return;
}
const loading = document.getElementById('resultadosLoading');
const error = document.getElementById('resultadosError');
const container = document.getElementById('tablaResultadosContainer');
loading.style.display = 'block';
error.style.display = 'none';
container.style.display = 'none';
try {
const response = await fetch(GOOGLE_SHEETS_URL);
if (!response.ok) {
throw new Error(`Error HTTP: ${response.status}`);
}
const data = await response.json();
if (!data.participantes || data.participantes.length === 0) {
throw new Error('No hay datos');
}
participantesOriginales = data.participantes;
claveOficialGuardada = data.claveOficial;
renderizarTabla(data.participantes, data.claveOficial);
loading.style.display = 'none';
container.style.display = 'block';
datosListaCargados = true;
console.log('Tabla de resultados cargada ✅');
console.log('Total participantes 📊:', participantesOriginales.length);
} catch (err) {
console.error('❌ Error detallado:', err.message);
loading.style.display = 'none';
error.style.display = 'block';
}
}
function renderizarTabla(participantes, claveOficial) {
const headerContainer = document.getElementById('tablaHeader');
const bodyContainer = document.getElementById('tablaBody');
let headerHTML = `
<div class="tabla-header-text">#</div>
<div class="tabla-header-text">Nombre</div>
<div class="tabla-header-text">Vendedor</div>
`;
PARTIDOS.forEach(partido => {
headerHTML += `
<div class="partido-header">
<img src="${LOGOS_EQUIPOS[partido.local]}" alt="${partido.local}" class="logo-equipo-header" title="${partido.local}">
<div class="vs-header">vs</div>
<img src="${LOGOS_EQUIPOS[partido.visitante]}" alt="${partido.visitante}" class="logo-equipo-header" title="${partido.visitante}">
</div>
`;
});
headerHTML += `<div class="tabla-header-text">Puntos</div>`;
headerContainer.innerHTML = headerHTML;
const puntajePrimero = participantes[0].puntos;
const puntajesUnicos = [...new Set(participantes.map(p => p.puntos))].sort((a, b) => b - a);
const puntajeSegundo = puntajesUnicos[1];
let bodyHTML = '';
participantes.forEach((participante, index) => {
const posicion = participante.folio || (index + 1);
let posicionClass = '';
let filaClass = '';
if (participante.puntos === puntajePrimero) {
posicionClass = 'top1';
filaClass = 'top1';
} else if (participante.puntos === puntajeSegundo) {
posicionClass = 'top2';
filaClass = 'top2';
}
bodyHTML += `
<div class="fila-participante ${filaClass}" style="animation-delay: ${index * 0.05}s">
<div class="posicion ${posicionClass}">${posicion}</div>
<div class="nombre">${participante.nombre}</div>
<div class="vendedor">${participante.vendedor}</div>
`;
participante.picks.forEach((pick, idx) => {
const resultadoOficial = claveOficial[idx];
let claseResultado = 'pendiente';
if (resultadoOficial && resultadoOficial.trim() !== '' && resultadoOficial !== '–' && pick !== '–') {
if (pick === resultadoOficial) {
claseResultado = 'acierto';
} else {
claseResultado = 'error';
}
}
bodyHTML += `<div class="resultado ${claseResultado}">${pick || '–'}</div>`;
});
const puntosClass = participante.puntos < 5 ? 'puntos-bajos' : '';
let puntosColor = '';
if (participante.puntos === puntajePrimero) puntosColor = 'top1';
else if (participante.puntos === puntajeSegundo) puntosColor = 'top2';
bodyHTML += `<div class="puntos ${puntosClass} ${puntosColor}">${participante.puntos}</div>`;
bodyHTML += `</div>`;
});
bodyContainer.innerHTML = bodyHTML;
}
//===Funciones para secciones de Resultados===// //===Funciones para secciones de Resultados===// //===Funciones para secciones de Resultados===//
function cargarSeccionPrimero() {
const primeroSection = document.getElementById('primero');
if (participantesOriginales.length === 0) {
primeroSection.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: #fff;"><p>Carga primero la lista de resultados</p></div>`;
return;
}
const isBrave = document.body.classList.contains('browser-brave');
const isIPhone = document.body.classList.contains('device-iphone');
const isSafari = document.body.classList.contains('browser-safari');
let alturaAjuste = '200px';
if (isBrave) alturaAjuste = '215px';
else if (isIPhone) alturaAjuste = '208px';
else if (isSafari) alturaAjuste = '205px';
const primerParticipante = participantesOriginales[0];
const puntajePrimero = primerParticipante.puntos;
const primerosLugares = participantesOriginales.filter(p => p.puntos === puntajePrimero);
const totalPrimeros = primerosLugares.length;
primeroSection.innerHTML = `
<div style="
background: #000000;
min-height: calc(100vh - ${alturaAjuste});
max-height: calc(100vh - ${alturaAjuste});
padding: 0;
display: flex;
align-items: stretch;
justify-content: center;
font-family: 'Poppins', sans-serif;
overflow: hidden;
">
<div style="
background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
border-radius: 0;
padding: 60px 20px 100px 20px;
max-width: 100%;
width: 100%;
height: 100%;
box-shadow: 0 10px 40px rgba(255,215,0,0.5);
text-align: center;
box-sizing: border-box;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
">
<div style="
font-size: 120px;
margin-bottom: 55px;
filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
">
🥇
</div>
<h2 style="
color: #000000;
margin: 0 0 8px 0;
font-size: 26px;
font-weight: 900;
text-shadow: 2px 2px 4px rgba(255,255,255,0.5);
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
">
Primer Lugar
</h2>
<div style="
background: rgba(0,0,0,0.2);
padding: 20px;
border-radius: 14px;
margin: 25px 0;
border: 2px solid rgba(255,255,255,0.3);
">
<div style="
font-size: 18px;
color: #000000;
font-weight: 700;
margin-bottom: 10px;
opacity: 0.9;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
">
Total en primer lugar
</div>
<div style="
font-size: 64px;
font-weight: 900;
color: #FFFFFF;
text-shadow: 3px 3px 6px rgba(0,0,0,0.5);
line-height: 1;
">
${totalPrimeros.toLocaleString()}
</div>
<div style="
font-size: 16px;
color: #000000;
font-weight: 600;
margin-top: 10px;
opacity: 0.8;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
">
${totalPrimeros === 1 ? 'Participante' : 'Participantes'}
</div>
</div>
<div style="
font-size: 18px;
color: rgba(0,0,0,0.8);
margin-top: 10px;
font-weight: 700;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
">
Con ${puntajePrimero} ${puntajePrimero === 1 ? 'punto' : 'puntos'}
</div>
</div>
</div>`;
}
function cargarSeccionSegundo() {
const segundoSection = document.getElementById('segundo');
if (participantesOriginales.length === 0) {
segundoSection.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: #fff;"><p>Carga primero la lista de resultados</p></div>`;
return;
}
const isBrave = document.body.classList.contains('browser-brave');
const isIPhone = document.body.classList.contains('device-iphone');
const isSafari = document.body.classList.contains('browser-safari');
let alturaAjuste = '200px';
if (isBrave) alturaAjuste = '215px';
else if (isIPhone) alturaAjuste = '208px';
else if (isSafari) alturaAjuste = '205px';
const puntajesUnicos = [...new Set(participantesOriginales.map(p => p.puntos))].sort((a, b) => b - a);
const segundoPuntaje = puntajesUnicos[1] !== undefined ? puntajesUnicos[1] : 0;
const segundosLugares = participantesOriginales.filter(p => p.puntos === segundoPuntaje);
const totalSegundos = segundosLugares.length;
segundoSection.innerHTML = `
<div style="
background: #000000;
min-height: calc(100vh - ${alturaAjuste});
max-height: calc(100vh - ${alturaAjuste});
padding: 0;
display: flex;
align-items: stretch;
justify-content: center;
font-family: 'Poppins', sans-serif;
overflow: hidden;
">
<div style="
background: linear-gradient(135deg, #C0C0C0 0%, #808080 100%);
border-radius: 0;
padding: 60px 20px 100px 20px;
max-width: 100%;
width: 100%;
height: 100%;
box-shadow: 0 10px 40px rgba(192,192,192,0.5);
text-align: center;
box-sizing: border-box;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
">
<div style="
font-size: 120px;
margin-bottom: 55px;
filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
">
🥈
</div>
<h2 style="
color: #000000;
margin: 0 0 8px 0;
font-size: 26px;
font-weight: 900;
text-shadow: 2px 2px 4px rgba(255,255,255,0.5);
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
">
Segundo Lugar
</h2>
<div style="
background: rgba(0,0,0,0.2);
padding: 20px;
border-radius: 14px;
margin: 25px 0;
border: 2px solid rgba(255,255,255,0.3);
">
<div style="
font-size: 18px;
color: #000000;
font-weight: 700;
margin-bottom: 10px;
opacity: 0.9;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
">
Total en segundo lugar
</div>
<div style="
font-size: 64px;
font-weight: 900;
color: #FFFFFF;
text-shadow: 3px 3px 6px rgba(0,0,0,0.5);
line-height: 1;
">
${totalSegundos.toLocaleString()}
</div>
<div style="
font-size: 16px;
color: #000000;
font-weight: 600;
margin-top: 10px;
opacity: 0.8;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
">
${totalSegundos === 1 ? 'Participante' : 'Participantes'}
</div>
</div>
<div style="
font-size: 18px;
color: rgba(0,0,0,0.8);
margin-top: 10px;
font-weight: 700;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
">
Con ${segundoPuntaje} ${segundoPuntaje === 1 ? 'punto' : 'puntos'}
</div>
</div>
</div>`;
}
function cargarSeccionVerificar() {
const verificarSection = document.getElementById('verificar');
const isBrave = document.body.classList.contains('browser-brave');
const isIPhone = document.body.classList.contains('device-iphone');
const isSafari = document.body.classList.contains('browser-safari');
let alturaAjuste = '200px';
let alturaMaxResultados = 'calc(100vh - 380px)';
let paddingBottom = '20px';
if (isBrave) {
alturaAjuste = '215px';
alturaMaxResultados = 'calc(100vh - 395px)';
paddingBottom = '30px';
} else if (isIPhone) {
alturaAjuste = '208px';
alturaMaxResultados = 'calc(100vh - 388px)';
paddingBottom = '25px';
} else if (isSafari) {
alturaAjuste = '205px';
alturaMaxResultados = 'calc(100vh - 385px)';
paddingBottom = '25px';
}
verificarSection.innerHTML = `
<div style="
background: linear-gradient(135deg, #006847 0%, #009c3b 100%);
min-height: calc(100vh - ${alturaAjuste});
max-height: calc(100vh - ${alturaAjuste});
padding: 15px;
font-family: 'Poppins', sans-serif;
overflow-y: auto;
overflow-x: hidden;
-webkit-overflow-scrolling: touch;
">
<div style="
background: linear-gradient(135deg, #006847 0%, #009c3b 100%);
padding: 15px 18px;
border-radius: 14px;
margin-bottom: 15px;
box-shadow: 0 4px 16px rgba(0,104,71,0.3);
">
<div style="
font-size: 32px;
text-align: center;
margin-bottom: 8px;
">
🔍
</div>
<h3 style="
color: #FFFFFF;
text-align: center;
margin: 0 0 10px 0;
font-size: 18px;
font-weight: 800;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
">
Verificar Quiniela
</h3>
<div style="
background: rgba(255,255,255,0.95);
border-radius: 10px;
padding: 6px 12px;
display: flex;
align-items: center;
gap: 8px;
">
<i class="fa-solid fa-magnifying-glass" style="
color: #666;
font-size: 14px;
"></i>
<input type="text" id="busquedaVerificar" placeholder="Buscar por nombre o vendedor..." style="
flex: 1;
border: none;
background: transparent;
font-size: 13px;
outline: none;
padding: 6px 0;
color: #333;
font-weight: 600;
font-family: 'Poppins', sans-serif;
-webkit-tap-highlight-color: transparent;
"/>
</div>
<div id="contadorBusqueda" style="
color: rgba(255,255,255,0.9);
text-align: center;
font-size: 11px;
margin-top: 8px;
font-weight: 600;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
">
Ingresa un nombre para buscar
</div>
</div>
<div id="resultadosBusqueda" style="
background: #111111;
border-radius: 12px;
padding: 12px 12px ${paddingBottom} 12px;
min-height: 200px;
max-height: ${alturaMaxResultados};
overflow-y: auto;
overflow-x: hidden;
-webkit-overflow-scrolling: touch;
">
<div style="
text-align: center;
color: rgba(255,255,255,0.5);
padding: 30px 15px;
font-size: 13px;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
">
<div style="font-size: 40px; margin-bottom: 12px;">📋</div>
Escribe en el buscador para ver resultados
</div>
</div>
</div>`;
const inputBusqueda = document.getElementById('busquedaVerificar');
const resultadosDiv = document.getElementById('resultadosBusqueda');
const contadorDiv = document.getElementById('contadorBusqueda');
inputBusqueda.addEventListener('input', (e) => {
const query = e.target.value.trim().toLowerCase();
if (query.length === 0) {
resultadosDiv.innerHTML = `
<div style="
text-align: center;
color: rgba(255,255,255,0.5);
padding: 30px 15px;
font-size: 13px;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
">
<div style="font-size: 40px; margin-bottom: 12px;">📋</div>
Escribe en el buscador para ver resultados
</div>`;
contadorDiv.textContent = 'Ingresa un nombre para buscar';
return;
}
const resultados = participantesOriginales.filter(p => {
const nombre = p.nombre.toLowerCase();
const vendedor = p.vendedor.toLowerCase();
return nombre.includes(query) || vendedor.includes(query);
});
contadorDiv.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${resultados.length} ${resultados.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}`;
if (resultados.length === 0) {
resultadosDiv.innerHTML = `
<div style="
text-align: center;
color: rgba(255,255,255,0.7);
padding: 30px 15px;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
">
<div style="font-size: 40px; margin-bottom: 12px;">❌</div>
<div style="font-size: 15px; font-weight: 600;">No se encontraron resultados</div>
<div style="font-size: 11px; margin-top: 6px; opacity: 0.7;">Intenta con otro nombre</div>
</div>`;
return;
}
const puntajePrimero = participantesOriginales[0].puntos;
const puntajesUnicos = [...new Set(participantesOriginales.map(p => p.puntos))].sort((a, b) => b - a);
const puntajeSegundo = puntajesUnicos[1];
let htmlResultados = '';
resultados.forEach((participante) => {
const posicion = participante.folio || (participantesOriginales.indexOf(participante) + 1);
let medallaEmoji = '';
let colorBorde = '#333';
if (participante.puntos === puntajePrimero) {
medallaEmoji = '🥇';
colorBorde = '#FFD700';
} else if (participante.puntos === puntajeSegundo) {
medallaEmoji = '🥈';
colorBorde = '#C0C0C0';
}
htmlResultados += `
<div style="
background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
border-left: 4px solid ${colorBorde};
border-radius: 10px;
padding: 12px;
margin-bottom: 10px;
box-shadow: 0 3px 10px rgba(0,0,0,0.5);
">`;
htmlResultados += `
<div style="
display: flex;
justify-content: space-between;
align-items: center;
margin-bottom: 10px;
">`;
htmlResultados += `
<div>
<div style="
display: flex;
align-items: center;
justify-content: space-between;
gap: 8px;
margin-bottom: 3px;
">
<div style="
color: #FFFFFF;
font-size: 15px;
font-weight: 700;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
">
${participante.nombre}
</div>
${medallaEmoji ? `<div style="font-size: 20px;">${medallaEmoji}</div>` : ''}
</div>`;
htmlResultados += `
<div style="
color: rgba(255,255,255,0.6);
font-size: 11px;
font-weight: 500;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
">
Vendedor: ${participante.vendedor}
</div>
</div>`;
htmlResultados += `
<div style="
background: linear-gradient(135deg, #006847 0%, #009c3b 100%);
color: #FFFFFF;
padding: 6px 14px;
border-radius: 18px;
font-size: 18px;
font-weight: 900;
box-shadow: 0 3px 10px rgba(0,104,71,0.4);
">
${participante.puntos}
</div>`;
htmlResultados += `</div>`;
htmlResultados += `
<div style="
display: grid;
grid-template-columns: repeat(9, 1fr);
gap: 5px;
margin-top: 10px;
">`;
participante.picks.forEach((pick, idx) => {
const resultadoOficial = claveOficialGuardada[idx];
let claseResultado = 'pendiente';
if (resultadoOficial && resultadoOficial.trim() !== '' && resultadoOficial !== '–' && pick !== '–') {
if (pick === resultadoOficial) {
claseResultado = 'acierto';
} else {
claseResultado = 'error';
}
}
htmlResultados += `
<div class="resultado ${claseResultado}" style="
padding: 6px 3px;
text-align: center;
border-radius: 5px;
font-size: 12px;
font-weight: 900;
box-shadow: 0 2px 5px rgba(0,0,0,0.3);
">
${pick || '–'}
</div>`;
});
htmlResultados += `</div>`;
htmlResultados += `
<div style="
margin-top: 10px;
padding-top: 10px;
border-top: 1px solid rgba(255,255,255,0.1);
color: rgba(255,255,255,0.7);
font-size: 12px;
font-weight: 600;
text-align: center;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
">
Posición: #${posicion}
</div>`;
htmlResultados += `</div>`;
});
resultadosDiv.innerHTML = htmlResultados;
});
}
//===Esto de abajo trabaja la seccion de Mis quinielas en resultados ===// //===Esto de abajo trabaja la seccion de Mis quinielas en resultados ===//
function cargarSeccionQuinielas() {
const quinielasSection = document.getElementById('quinielas');
const quinielasEnviadas = JSON.parse(localStorage.getItem('quinielasEnviadas') || '[]');
const isBrave = document.body.classList.contains('browser-brave');
const isIPhone = document.body.classList.contains('device-iphone');
const isSafari = document.body.classList.contains('browser-safari');
let alturaAjuste = '200px';
if (isBrave) alturaAjuste = '215px';
else if (isIPhone) alturaAjuste = '208px';
else if (isSafari) alturaAjuste = '205px';
if (quinielasEnviadas.length === 0) {
quinielasSection.innerHTML = `
<div style="
background: linear-gradient(135deg, #ce1126 0%, #9d0d1f 100%);
width: 100%;
height: calc(100vh - ${alturaAjuste});
min-height: calc(100vh - ${alturaAjuste});
max-height: calc(100vh - ${alturaAjuste});
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
font-family: 'Poppins', sans-serif;
box-sizing: border-box;
padding: 20px;
overflow: hidden;
position: relative;
">
<div style="
color: #FFFFFF;
margin: 0 0 40px 0;
font-size: 32px;
font-weight: 900;
text-shadow: 3px 3px 8px rgba(0,0,0,0.6);
text-align: center;
line-height: 1.3;
display: block;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
">
No te quedes sin participar
</div>
<div style="
font-size: 120px;
margin: 0 0 30px 0;
filter: drop-shadow(0 6px 16px rgba(0,0,0,0.4));
">
❌
</div>
<div style="
background: rgba(0,0,0,0.3);
padding: 20px 25px;
border-radius: 16px;
border: 3px solid rgba(255,255,255,0.3);
box-shadow: 0 8px 24px rgba(0,0,0,0.3);
">
<p style="
color: #FFFFFF;
margin: 0;
font-size: 20px;
font-weight: 700;
text-shadow: 2px 2px 4px rgba(0,0,0,0.4);
text-align: center;
line-height: 1.5;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
">
Recuerda enviar tus quinielas
</p>
</div>
</div>`;
return;
}
const matchesData = [
{ id: 1, local: 'Tigres', visit: 'Pachuca', imgL: 'logos/tigres.png', imgV: 'logos/pachuca.png' },
{ id: 2, local: 'Puebla', visit: 'América', imgL: 'logos/puebla.png', imgV: 'logos/america.png' },
{ id: 3, local: 'Atlas', visit: 'San Luis', imgL: 'logos/atlas.png', imgV: 'logos/san luis.png' },
{ id: 4, local: 'León', visit: 'Santos', imgL: 'logos/leon.png', imgV: 'logos/santos.png' },
{ id: 5, local: 'Necaxa', visit: 'Toluca', imgL: 'logos/necaxa.png', imgV: 'logos/toluca.png' },
{ id: 6, local: 'Cruz Azul', visit: 'Chivas', imgL: 'logos/cruz azul.png', imgV: 'logos/chivas.png' },
{ id: 7, local: 'Pumas', visit: 'Monterrey', imgL: 'logos/pumas.png', imgV: 'logos/monterrey.png' },
{ id: 8, local: 'Querétaro', visit: 'Juárez', imgL: 'logos/queretaro.png', imgV: 'logos/juarez.png' },
{ id: 9, local: 'Tijuana', visit: 'Mazatlán', imgL: 'logos/tijuana.png', imgV: 'logos/mazatlan.png' }
];
quinielasEnviadas.forEach(quiniela => {
quiniela.encontrada = false;
quiniela.folio = null;
quiniela.numeroTelefono = null;
quiniela.puntos = 0;
const selections = JSON.parse(quiniela.selections);
if (claveOficialGuardada && claveOficialGuardada.length > 0) {
matchesData.forEach((match, idx) => {
const selQuiniela = selections[match.id];
const resultadoOficial = claveOficialGuardada[idx];
if (resultadoOficial && resultadoOficial.trim() !== '' && selQuiniela === resultadoOficial) {
quiniela.puntos += 1;
}
});
}
if (participantesOriginales && participantesOriginales.length > 0) {
participantesOriginales.forEach(participante => {
const nombreCoincide = participante.nombre.toLowerCase().trim() === quiniela.userName.toLowerCase().trim();
const vendedorCoincide = participante.vendedor.toLowerCase().trim() === quiniela.vendedor.toLowerCase().trim();
if (nombreCoincide && vendedorCoincide) {
let todosCoinciden = true;
matchesData.forEach((match, idx) => {
const selQuiniela = selections[match.id];
const selParticipante = participante.picks[idx];
if (selQuiniela !== selParticipante) {
todosCoinciden = false;
}
});
if (todosCoinciden) {
quiniela.encontrada = true;
quiniela.folio = participante.folio || (participantesOriginales.indexOf(participante) + 1);
quiniela.numeroTelefono = participante.numero || participante.telefono || participante.celular || null;
}
}
});
}
});
quinielasEnviadas.sort((a, b) => b.puntos - a.puntos);
let paddingBottom = '60px';
if (isBrave) paddingBottom = '100px';
else if (isIPhone) paddingBottom = '80px';
else if (isSafari) paddingBottom = '80px';
let quinielasHTML = `
<div style="
background: #ffffff;
min-height: calc(100vh - ${alturaAjuste});
max-height: calc(100vh - ${alturaAjuste});
padding: 0px;
font-family: 'Poppins', sans-serif;
overflow-y: auto;
overflow-x: hidden;
-webkit-overflow-scrolling: touch;
">
<div style="
text-align: center;
margin-bottom: 15px;
position: sticky;
top: 0;
background: #ffffff;
padding: 12px 0;
z-index: 10;
box-shadow: 0 2px 8px rgba(0,0,0,0.05);
">
<h2 style="
color: #006847;
margin: 0;
font-size: 20px;
font-weight: 800;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
">
Mis Quinielas Enviadas
</h2>
</div>
<div style="padding: 0 12px ${paddingBottom} 12px;">`;
quinielasEnviadas.forEach((q, index) => {
const selections = JSON.parse(q.selections);
const colorFondo = q.encontrada ? '#006847' : '#ce1126';
const colorBorde = q.encontrada ? '#009c3b' : '#9d0d1f';
const estadoTexto = q.encontrada ? 'Jugando ✓' : 'No Jugando ✗';
const estadoColor = q.encontrada ? '#4ade80' : '#f87171';
let miniQuinielaHTML = '';
matchesData.forEach((match, idx) => {
const sel = selections[match.id];
if (sel) {
let resultadoStyle = 'background: white;';
if (claveOficialGuardada && claveOficialGuardada[idx]) {
if (sel === claveOficialGuardada[idx]) {
resultadoStyle = 'background: #4ade80;';
} else if (claveOficialGuardada[idx] !== '' && claveOficialGuardada[idx] !== '-') {
resultadoStyle = 'background: #f87171;';
}
}
miniQuinielaHTML += `
<div style="
display: grid;
grid-template-columns: 22px 60px auto 60px 22px;
align-items: center;
gap: 4px;
padding: 4px;
background: #f8f9fa;
border-radius: 6px;
margin-bottom: 3px;
">
<img src="${match.imgL}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: contain;">
<div style="font-size: 9px; font-weight: 700; color: #333; text-align: left;">${match.local}</div>
<div style="${resultadoStyle} color: #333; padding: 3px 6px; border-radius: 5px; font-size: 10px; font-weight: 900; text-align: center; border: 2px solid #e5e7eb;">${sel}</div>
<div style="font-size: 9px; font-weight: 700; color: #333; text-align: right;">${match.visit}</div>
<img src="${match.imgV}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: contain;">
</div>`;
}
});
let medallaEmoji = '';
if (q.encontrada && participantesOriginales && participantesOriginales.length > 0) {
const puntajePrimero = participantesOriginales[0].puntos;
const puntajesUnicos = [...new Set(participantesOriginales.map(p => p.puntos))].sort((a, b) => b - a);
const puntajeSegundo = puntajesUnicos[1] !== undefined ? puntajesUnicos[1] : 0;
if (q.puntos === puntajePrimero && q.puntos > 0) {
medallaEmoji = '🥇';
} else if (q.puntos === puntajeSegundo && q.puntos > 0 && puntajeSegundo !== puntajePrimero) {
medallaEmoji = '🥈';
}
}
quinielasHTML += `
<div style="
background: linear-gradient(135deg, ${colorFondo} 0%, ${colorBorde} 100%);
border-radius: 10px;
padding: 12px;
margin-bottom: 12px;
box-shadow: 0 4px 12px rgba(0,0,0,0.2);
position: relative;
border: 2px solid ${colorBorde};
width: 100%;
max-width: 500px;
margin-left: auto;
margin-right: auto;
">
<button onclick="eliminarQuinielaEnviada(${q.id})" style="
position: absolute;
top: 8px;
right: 8px;
background: #ce1126;
color: white;
border: none;
border-radius: 50%;
width: 26px;
height: 26px;
cursor: pointer;
font-size: 16px;
font-weight: 700;
z-index: 5;
display: flex;
align-items: center;
justify-content: center;
box-shadow: 0 2px 8px rgba(0,0,0,0.3);
-webkit-tap-highlight-color: transparent;
">×</button>
<div style="
position: absolute;
top: 38px;
right: 8px;
background: ${estadoColor};
color: #333;
padding: 4px 10px;
border-radius: 20px;
font-size: 9px;
font-weight: 800;
">${estadoTexto}</div>
<div style="margin-bottom: 10px; padding-right: 120px; position: relative;">
<div style="color: #ffd700; font-size: 14px; font-weight: 800; position: relative;">
${q.userName}
${medallaEmoji ? `<span style="position: absolute; right: -100px; top: -2px; font-size: 24px;">${medallaEmoji}</span>` : ''}
</div>
<div style="color: rgba(255,255,255,0.9); font-size: 11px;">Vendedor: ${q.vendedor}</div>
<div style="color: rgba(255,255,255,0.7); font-size: 10px;">${q.fechaEnvio || q.date}</div>`;
if (q.encontrada && q.folio) {
quinielasHTML += `<div style="color: #ffd700; font-size: 12px; font-weight: 900; margin-top: 4px;">📋 Folio: ${q.folio}</div>`;
}
quinielasHTML += `</div>
<div style="margin-bottom: 10px; max-height: 300px; overflow-y: auto;">
${miniQuinielaHTML}
</div>
<div style="
text-align: center;
padding: 8px;
background: rgba(0,0,0,0.2);
border-radius: 8px;
color: #fff;
font-weight: 700;
">Puntos ⚽ : ${q.puntos}</div>
</div>`;
});
quinielasHTML += `</div></div>`;
quinielasSection.innerHTML = quinielasHTML;
console.log('Quinielas cargadas ✅ :', quinielasEnviadas.length);
console.log('Puntos calculados 📊 :', quinielasEnviadas.map(q => `${q.userName}: ${q.puntos}`));
}
//===Porcentajes en tiempo real===// //===Porcentajes en tiempo real===// //===Porcentajes en tiempo real===//
async function cargarPorcentajesEnTiempoReal() {
const porcentajesContainer = document.getElementById('porcentajesCarousel');
if (!porcentajesContainer) return;
if (!participantesOriginales || participantesOriginales.length === 0) {
console.log('Cargando datos para porcentajes⏳...');
try {
const response = await fetch(GOOGLE_SHEETS_URL);
const data = await response.json();
if (data.participantes && data.participantes.length > 0) {
participantesOriginales = data.participantes;
claveOficialGuardada = data.claveOficial;
console.log('Datos cargados para porcentajes ✅');
}
} catch (err) {
console.error('Error al cargar datos ❌:', err);
porcentajesContainer.innerHTML = '<div style="padding: 40px; text-align: center; color: #ce1126;">Error al cargar datos</div>';
return;
}
}
const partidos = [
{ id: 1, local: 'Tigres', visitante: 'Pachuca', logoLocal: 'logos/tigres.png', logoVisitante: 'logos/pachuca.png', claseLocal: 'tigres-local', claseVisitante: 'pachuca-visitante' },
{ id: 2, local: 'Puebla', visitante: 'América', logoLocal: 'logos/puebla.png', logoVisitante: 'logos/america.png', claseLocal: 'puebla-local', claseVisitante: 'america-visitante' },
{ id: 3, local: 'Atlas', visitante: 'San Luis', logoLocal: 'logos/atlas.png', logoVisitante: 'logos/san luis.png', claseLocal: 'atlas-local', claseVisitante: 'san-luis-visitante' },
{ id: 4, local: 'León', visitante: 'Santos', logoLocal: 'logos/leon.png', logoVisitante: 'logos/santos.png', claseLocal: 'leon-local', claseVisitante: 'santos-visitante' },
{ id: 5, local: 'Necaxa', visitante: 'Toluca', logoLocal: 'logos/necaxa.png', logoVisitante: 'logos/toluca.png', claseLocal: 'necaxa-local', claseVisitante: 'toluca-visitante' },
{ id: 6, local: 'Cruz Azul', visitante: 'Chivas', logoLocal: 'logos/cruz azul.png', logoVisitante: 'logos/chivas.png', claseLocal: 'cruz-azul-local', claseVisitante: 'chivas-visitante' },
{ id: 7, local: 'Pumas', visitante: 'Monterrey', logoLocal: 'logos/pumas.png', logoVisitante: 'logos/monterrey.png', claseLocal: 'pumas-local', claseVisitante: 'monterrey-visitante' },
{ id: 8, local: 'Querétaro', visitante: 'Juárez', logoLocal: 'logos/queretaro.png', logoVisitante: 'logos/juarez.png', claseLocal: 'queretaro-local', claseVisitante: 'juarez-visitante' },
{ id: 9, local: 'Tijuana', visitante: 'Mazatlán', logoLocal: 'logos/tijuana.png', logoVisitante: 'logos/mazatlan.png', claseLocal: 'tijuana-local', claseVisitante: 'mazatlan-visitante' }
];
const porcentajes = partidos.map((partido, idx) => {
let countL = 0, countE = 0, countV = 0;
if (participantesOriginales && participantesOriginales.length > 0) {
participantesOriginales.forEach(p => {
const pick = p.picks[idx];
if (pick === 'L') countL++;
else if (pick === 'E') countE++;
else if (pick === 'V') countV++;
});
}
const total = countL + countE + countV || 1;
return {
local: Math.round((countL / total) * 100),
empate: Math.round((countE / total) * 100),
visitante: Math.round((countV / total) * 100)
};
});
let html = '';
partidos.forEach((partido, idx) => {
const porc = porcentajes[idx];
html += `
<div class="match-percentage-card ${idx === 0 ? 'active' : ''}" data-index="${idx}">
<div class="match-card-header">
<img src="logos/liga mx.png" alt="Liga MX" class="liga-mx-logo-perc">
<div class="header-info">
<div class="header-row">
<span class="liga-text">Liga Mx</span>
<span class="partido-num">Partido ${idx + 1}</span>
</div>
<div class="match-title">${partido.local} vs ${partido.visitante}</div>
</div>
</div>
<div class="prediction-row">
<div class="label-text">Local (L)</div>
<div class="capsule ${partido.claseLocal}">
<div class="capsule-bg">
<span class="team-name-right">${partido.local}</span>
</div>
<div class="progress-fill" style="width: ${porc.local}%;">
<div class="gloss-overlay"></div>
<div class="content-left">
<div class="logo-circle">
<img src="${partido.logoLocal}" alt="${partido.local}">
</div>
<span class="porcentaje">${porc.local}%</span>
</div>
</div>
</div>
</div>
<div class="prediction-row">
<div class="label-text">Empate (E)</div>
<div class="capsule empate">
<div class="capsule-bg">
<span class="team-name-right">Empate</span>
</div>
<div class="progress-fill" style="width: ${porc.empate}%;">
<div class="gloss-overlay"></div>
<div class="content-left">
<div class="logo-circle draw-icon">
<div class="inner-ring"></div>
</div>
<span class="porcentaje">${porc.empate}%</span>
</div>
</div>
</div>
</div>
<div class="prediction-row">
<div class="label-text">Visitante (V)</div>
<div class="capsule ${partido.claseVisitante}">
<div class="capsule-bg">
<span class="team-name-right">${partido.visitante}</span>
</div>
<div class="progress-fill" style="width: ${porc.visitante}%;">
<div class="gloss-overlay"></div>
<div class="content-left">
<div class="logo-circle">
<img src="${partido.logoVisitante}" alt="${partido.visitante}">
</div>
<span class="porcentaje">${porc.visitante}%</span>
</div>
</div>
</div>
</div>
</div>
`;
});
porcentajesContainer.innerHTML = html;
console.log(' Porcentajes cargados📊 :', participantesOriginales.length, 'participantes');
}
let currentPercentageIndex = 0;
function showPercentageMatch(index) {
const cards = document.querySelectorAll('.match-percentage-card');
const dots = document.querySelectorAll('.indicator-dot-perc');
cards.forEach((card, i) => {
card.classList.toggle('active', i === index);
});
dots.forEach((dot, i) => {
dot.classList.toggle('active', i === index);
});
currentPercentageIndex = index;
}
window.nextPercentageMatch = function() {
const totalMatches = document.querySelectorAll('.match-percentage-card').length;
const newIndex = (currentPercentageIndex + 1) % totalMatches;
showPercentageMatch(newIndex);
}
window.prevPercentageMatch = function() {
const totalMatches = document.querySelectorAll('.match-percentage-card').length;
const newIndex = (currentPercentageIndex - 1 + totalMatches) % totalMatches;
showPercentageMatch(newIndex);
}
window.goToPercentageMatch = function(index) {
showPercentageMatch(index);
}
let touchStartXPerc = 0;
let touchEndXPerc = 0;
document.addEventListener('touchstart', e => {
const target = e.target.closest('.porcentajes-wrapper');
if (target) {
touchStartXPerc = e.changedTouches[0].screenX;
}
});
document.addEventListener('touchend', e => {
const target = e.target.closest('.porcentajes-wrapper');
if (target) {
touchEndXPerc = e.changedTouches[0].screenX;
handleSwipePercentage();
}
});
function handleSwipePercentage() {
if (touchEndXPerc < touchStartXPerc - 50) nextPercentageMatch();
if (touchEndXPerc > touchStartXPerc + 50) prevPercentageMatch();
}
//===Contenido de Ayuda===// //===Contenido de Ayuda===// //===Contenido de Ayuda===//
function mostrarAlertaAyuda(tipo) {
let titulo = '';
let contenido = '';
switch(tipo) {
case 'bienvenido':
titulo = 'Bienvenido 👋';
contenido = `
<div class="alert-ayuda">
<h3>${titulo}</h3>
<p>¡Bienvenido a Quinielas "El Wero"!</p>
<p>Si te gusta el fútbol, divertirte y, sobre todo, poner a prueba tu suerte, estás en el lugar correcto.</p>
<p>En Quinielas "El Wero" organizamos quinielas semanales para que puedas vivir toda la emoción de cada partido, hacer tus pronósticos y, con un poco de suerte, ganar premios.</p>
<p>Aquí no necesitas ser un experto: basta con animarte a participar, elegir tus resultados y disfrutar el juego.</p>
</div>
`;
break;
case 'como-jugar':
titulo = '¿Cómo jugar? 🎮';
contenido = `
<div class="alert-ayuda">
<h3>${titulo}</h3>
<ol>
<li>Elige el resultado de cada partido ⚽</li>
<li>Asegúrate de completar todos los partidos</li>
<li>Escribe tu nombre y guarda tu quiniela 💾</li>
<li>
¡Último paso! Envíala por <strong>WhatsApp</strong> 📲
<br>
<small>No olvides hacerlo antes del cierre</small>
</li>
`;
break;
case 'preguntas-frecuentes':
titulo = 'Preguntas frecuentes ❓';
contenido = `
<div class="alert-ayuda">
<h3>${titulo}</h3>
<ol>
<li><strong>¿Cómo te llamas?</strong><br>R: Irving Emilio Gonzalez Romero.</li>
<li><strong>¿Dónde se ubican?</strong><br>R: Cadereyta Jiménez.</li>
<li><strong>¿Cuánto es el premio?</strong><br>R: El premio se publica poco antes del primer partido.</li>
<li><strong>¿Qué pasa si hay varios ganadores?</strong><br>R: El premio se reparte entre las personas con mayor puntaje.</li>
<li><strong>¿A qué hora cierra la quiniela?</strong><br>R: El horario cambia cada semana.</li>
<li><strong>¿Cómo es el método de pago si gano?</strong><br>R: Se te pide una tarjeta para realizar el depósito.</li>
<li><strong>¿Cuándo se publica la lista de participantes?</strong><br>R: Poco antes del primer partido.</li>
<li><strong>¿Cuánto vale la quiniela?</strong><br>R: $30 pesos.</li>
</ol>
</div>
`;
break;
case 'cosas-que-debes-saber':
titulo = 'Cosas que debes de saber ⚠️';
contenido = `
<div class="alert-ayuda">
<h3>${titulo}</h3>
<ol>
<li>La lista de participantes se publica poco antes del primer partido.</li>
<li>La lista de ganadores se publica poco después del último partido.</li>
<li>Quinielas "El Wero" solo responde a la lista general.</li>
<li>La lista general no se modifica una vez publicada.</li>
<li>Quiniela no subida no se juega.</li>
<li>Quiniela con error debe revisarse con su vendedor.</li>
<li>Cualquier protesta debe realizarse antes de que finalice el segundo partido.</li>
<li>Quinielas incompletas o con doble resultado se capturan como empate.</li>
<li>Quinielas enviadas después de las 3 se pasan a la siguiente jornada.</li>
<li>Formatos distintos al oficial no son responsabilidad de Quinielas "El Wero".</li>
<li>Pagos incorrectos deberán verificarse.</li>
</ol>
</div>
`;
break;
}
const overlay = document.createElement('div');
overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 9999;';
overlay.onclick = () => {
document.body.removeChild(overlay);
document.body.removeChild(alertDiv);
};
const alertDiv = document.createElement('div');
alertDiv.innerHTML = contenido;
alertDiv.style.position = 'fixed';
alertDiv.style.top = '50%';
alertDiv.style.left = '50%';
alertDiv.style.transform = 'translate(-50%, -50%)';
alertDiv.style.zIndex = '10000';
alertDiv.style.width = '95%';
alertDiv.style.maxWidth = '600px';
alertDiv.style.maxHeight = '80vh';
alertDiv.style.overflow = 'auto';
const innerAlert = alertDiv.querySelector('.alert-ayuda');
if (innerAlert) {
innerAlert.style.position = 'relative';
const closeBtn = document.createElement('button');
closeBtn.innerHTML = '✕';
closeBtn.style.cssText = 'position: absolute; top: 10px; right: 10px; background: #006847; color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;';
closeBtn.onclick = () => {
document.body.removeChild(alertDiv);
document.body.removeChild(overlay);
};
innerAlert.appendChild(closeBtn);
}
document.body.appendChild(overlay);
document.body.appendChild(alertDiv);
}
let cuentaActualIndex = 0;
function navegarCuenta(direccion) {
const cuentas = document.querySelectorAll('.cuenta-item');
if (cuentas.length === 0) return;
cuentas[cuentaActualIndex].classList.remove('visible');
cuentaActualIndex = (cuentaActualIndex + direccion + cuentas.length) % cuentas.length;
cuentas[cuentaActualIndex].classList.add('visible');
}
function copiarCuenta(numero, banco) {
const textarea = document.createElement('textarea');
textarea.value = numero;
textarea.style.position = 'fixed';
textarea.style.top = '0';
textarea.style.left = '0';
textarea.style.opacity = '0';
document.body.appendChild(textarea);
textarea.focus();
textarea.select();
try {
const successful = document.execCommand('copy');
if (successful) {
mostrarNotificacionCopiado(banco, numero);
}
} catch (err) {
console.error('Error al copiar:', err);
}
document.body.removeChild(textarea);
}
function mostrarNotificacionCopiado(banco, numero) {
const modal = document.createElement('div');
modal.style.cssText = `
position: fixed;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
background: linear-gradient(135deg, #006847 0%, #009c3b 100%);
color: white;
padding: 20px 30px;
border-radius: 12px;
box-shadow: 0 8px 24px rgba(0, 104, 71, 0.4);
z-index: 10000;
text-align: center;
animation: fadeInOut 2s ease;
`;
modal.innerHTML = `
<div style="font-size: 40px; margin-bottom: 10px;">✅</div>
<div style="font-size: 16px; font-weight: 700; margin-bottom: 5px;">${banco}</div>
<div style="font-size: 14px; opacity: 0.9;">${numero} copiado</div>
`;
document.body.appendChild(modal);
setTimeout(() => modal.remove(), 2000);
}
//=== Esto de abajo trabaja el cache para no duplicar ===// //=== Esto de abajo trabaja el cache para no duplicar ===//
const quinielasProcesamientoCache = {
procesadas: new Set(),
marcarProcesada(fila) {
this.procesadas.add(fila);
const data = {
filas: [...this.procesadas],
timestamp: Date.now()
};
localStorage.setItem('quinielasProcesamientoCache', JSON.stringify(data));
},
estaProcesada(fila) {
return this.procesadas.has(fila);
},
cargarCache() {
try {
const cache = localStorage.getItem('quinielasProcesamientoCache');
if (cache) {
const data = JSON.parse(cache);
if (Date.now() - data.timestamp < 120000) {
this.limpiarCache();
} else {
this.procesadas = new Set(data.filas);
}
}
} catch (e) {
console.error('Error cargando cache', e);
this.limpiarCache();
}
},
limpiarCache() {
this.procesadas.clear();
localStorage.removeItem('quinielasProcesamientoCache');
}
};
quinielasProcesamientoCache.cargarCache();
let quinielasSeleccionadas = new Set();
// === Lock global para evitar procesos seguidos === //
let procesamientoEnCurso = false;
//=== Esto de abajo trabaja las alertas de progreso ===// //=== Esto de abajo trabaja las alertas de progreso ===//
function mostrarModalProgreso(total, tipo = 'aprobar') {
const modal = document.createElement('div');
modal.id = 'modal-progreso-admin';
modal.style.cssText = `
position:fixed;top:0;left:0;right:0;bottom:0;
background:rgba(0,0,0,0.9);z-index:99999;
display:flex;align-items:center;justify-content:center;
font-family:'Poppins',sans-serif;
`;
const config = {
aprobar: { icono: '⚙️', titulo: 'Confirmando', color: '#006847' },
rechazar: { icono: '🗑️', titulo: 'Rechazando', color: '#dc2626' }
};
const actual = config[tipo];
modal.innerHTML = `
<div style="background:linear-gradient(135deg,#ffffff 0%,#f8f9fa 100%);
border-radius:20px;padding:40px;max-width:500px;width:90%;
box-shadow:0 20px 60px rgba(0,0,0,0.5);text-align:center">
<div style="font-size:80px;margin-bottom:20px">${actual.icono}</div>
<h2 style="color:${actual.color};font-size:24px;font-weight:900;margin:0 0 10px 0">
${actual.titulo}
</h2>
<p style="color:#666;font-size:14px;margin:0 0 25px 0">
Por favor espera, no cierres esta ventana
</p>
<div style="background:#e5e7eb;border-radius:12px;height:24px;overflow:hidden;margin-bottom:15px;position:relative">
<div id="barra-progreso"
style="background:linear-gradient(135deg,${actual.color} 0%,${actual.color} 100%);
height:100%;width:0%;transition:width 0.3s ease;border-radius:12px"></div>
</div>
<div style="display:flex;justify-content:space-between;align-items:center">
<span id="progreso-texto" style="color:#666;font-size:14px;font-weight:600">
0 de ${total}
</span>
<span id="progreso-porcentaje" style="color:${actual.color};font-size:18px;font-weight:900">
0%
</span>
</div>
<div id="progreso-mensaje"
style="margin-top:20px;color:#999;font-size:12px;min-height:20px"></div>
</div>
`;
document.body.appendChild(modal);
return modal;
}
function actualizarProgreso(actual, total, mensaje = '') {
const barra      = document.getElementById('barra-progreso');
const texto      = document.getElementById('progreso-texto');
const porcentaje = document.getElementById('progreso-porcentaje');
const mensajeEl  = document.getElementById('progreso-mensaje');
if (barra && texto && porcentaje) {
const porcentajeNum = Math.round((actual / total) * 100);
barra.style.width   = `${porcentajeNum}%`;
texto.textContent   = `${actual} de ${total}`;
porcentaje.textContent = `${porcentajeNum}%`;
if (mensajeEl && mensaje) mensajeEl.textContent = mensaje;
}
}
function cerrarModalProgreso() {
const modal = document.getElementById('modal-progreso-admin');
if (modal) {
modal.style.opacity = '0';
modal.style.transition = 'opacity 0.3s ease';
setTimeout(() => modal.remove(), 300);
}
}
//=== Esto de abajo trabaja el proceso de envío a Google Sheets por lotes ===// //=== Esto de abajo trabaja el proceso de envío a Google Sheets por lotes ===//
async function procesarQuinielasPorLotes(filas, accion) {
const total = filas.length;
try {
actualizarProgreso(0, total, `Procesando ${total} quinielas...`);
await fetch(GOOGLE_SHEETS_ADMIN_URL, {
method: 'POST',
mode: 'no-cors',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ action: accion, filas })
});
for (let i = 0; i < total; i++) {
await new Promise(r => setTimeout(r, 200));
actualizarProgreso(i + 1, total, `✅ Procesando ${i + 1}/${total}...`);
}
return filas.map(fila => ({ fila, exito: true }));
} catch (err) {
console.error('❌ Error:', err);
return filas.map(fila => ({ fila, exito: false }));
}
}
//=== Esto de abajo trabaja los contadores ===// //=== Esto de abajo trabaja los contadores ===//
function actualizarContadoresGlobal() {
const contenedor = document.getElementById('admin-por-aprobar');
if (!contenedor) return;
const cardsVisibles = contenedor.querySelectorAll('.quiniela-card');
const checkboxesVisibles = contenedor.querySelectorAll('.checkbox-quiniela');
const checkboxesSeleccionados = contenedor.querySelectorAll('.checkbox-quiniela:checked');
quinielasSeleccionadas.clear();
checkboxesSeleccionados.forEach(cb => {
const fila = parseInt(cb.getAttribute('data-fila'));
quinielasSeleccionadas.add(fila);
});
const spanPendientes = document.getElementById('contador-pendientes');
if (spanPendientes) {
spanPendientes.textContent = cardsVisibles.length;
}
const countRechazar = document.getElementById('count-rechazar');
const countAprobar = document.getElementById('count-aprobar');
if (countRechazar) countRechazar.textContent = quinielasSeleccionadas.size;
if (countAprobar) countAprobar.textContent = quinielasSeleccionadas.size;
const btnSeleccionar = document.getElementById('btn-seleccionar-todas');
const todasSeleccionadas = checkboxesSeleccionados.length === checkboxesVisibles.length && checkboxesVisibles.length > 0;
if (btnSeleccionar) {
btnSeleccionar.textContent = todasSeleccionadas ? 'Deseleccionar todas' : 'Seleccionar todas';
}
}
//=== Esto de abajo trabaja la sección de No confirmadas ===// //=== Esto de abajo trabaja la sección de No confirmadas ===//
async function cargarAdminNoConfirmadas() {
const contenedor = document.getElementById('admin-por-aprobar');
if (!contenedor) return;
contenedor.innerHTML = `
<div class="admin-loading admin-loading--quinielas">
<div class="admin-loading__card">
<div class="admin-loading__icon">📄</div>
<h2>Cargando quinielas no confirmadas...</h2>
<p>Estamos trabajando la información del vendedor, por favor espera unos segundos.</p>
<div class="admin-loading__bar">
<div class="admin-loading__bar-fill"></div>
</div>
</div>
</div>
`;
quinielasSeleccionadas.clear();
try {
const resp = await fetch(`${GOOGLE_SHEETS_ADMIN_URL}?tipo=no_confirmadas&t=${Date.now()}`);
const data = await resp.json();
let participantes = data.participantes || [];
if (!participantes.length) {
contenedor.innerHTML = `
<div style="background:#ffffff;min-height:calc(100vh - 70px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;font-family:Poppins,sans-serif;width:100vw;margin-left:calc(-50vw + 50%);position:relative;transform:translateY(-90px)">
<div style="font-size:120px;margin-bottom:30px;filter:drop-shadow(0 8px 16px rgba(0,0,0,0.4))">🕓</div>
<h2 style="color:#b91c1c;font-size:28px;font-weight:900;text-align:center;margin:0 0 20px 0;line-height:1.3">
Todavía no hay quinielas por confirmar
</h2>
<p style="color:#b91c1c;font-size:16px;text-align:center;max-width:400px;line-height:1.6;margin:0;font-weight:500">
En cuanto tus participantes envíen sus quinielas, las verás aquí.
</p>
</div>
`;
return;
}
const totalPendientes = participantes.length;
let botonesHTML = `
<div style="position:sticky;top:0;background:rgba(255,255,255,0.97);backdrop-filter:blur(6px);padding:6px 8px;display:flex;flex-direction:column;gap:6px;z-index:100;border-bottom:1px solid #e5e7eb;box-sizing:border-box">
<div style="display:flex;gap:6px">
<button id="btn-aprobar-seleccionadas"
style="flex:1;padding:5px 6px;background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);color:#fff;border:none;border-radius:999px;font-size:10px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px">
<span>Confirmar</span>
<span id="count-aprobar">0</span>
<span>✅</span>
</button>
<button id="btn-rechazar-seleccionadas"
style="flex:1;padding:5px 6px;background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);color:#fff;border:none;border-radius:999px;font-size:10px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px">
<span>Rechazar</span>
<span id="count-rechazar">0</span>
<span>❌</span>
</button>
</div>
<div style="display:flex;align-items:center;gap:6px;justify-content:space-between">
<button id="btn-seleccionar-todas"
style="flex:1;padding:5px 6px;background:linear-gradient(135deg,#006847 0%,#009c3b 100%);color:#fff;border:none;border-radius:999px;font-size:10px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center">
Seleccionar todas
</button>
<div style="padding:4px 8px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;white-space:nowrap">
Pendientes: <span id="contador-pendientes">${totalPendientes}</span>
</div>
</div>
</div>
`;
let quinielasHTML = '';
participantes.forEach(q => {
let miniQuinielaHTML = '';
const picksArray = q.picks || [];
for (let i = 0; i < 9; i++) {
const match = QuinielaJ1.matchesData[i];
const raw = picksArray[i] || '';
let sel = '-';
if (raw === '1' || raw === 'L') sel = 'L';
else if (raw === '2' || raw === 'E') sel = 'E';
else if (raw === '3' || raw === 'V') sel = 'V';
else if (raw) sel = raw;
miniQuinielaHTML += `
<div style="display:grid;grid-template-columns:16px 1fr 20px 1fr 16px;align-items:center;gap:2px;padding:2px 3px;background:#f8f9fa;border-radius:3px;margin-bottom:2px">
<img src="${match.imgL}" style="width:16px;height:16px;border-radius:50%;object-fit:contain">
<div style="font-size:7px;font-weight:700;color:#333;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${match.local}</div>
<div style="background:#fff;color:#111;border-radius:999px;font-size:7px;font-weight:900;border:1px solid #e5e7eb;width:18px;height:18px;display:flex;align-items:center;justify-content:center;margin:0 auto">${sel}</div>
<div style="font-size:7px;font-weight:700;color:#333;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${match.visit}</div>
<img src="${match.imgV}" style="width:16px;height:16px;border-radius:50%;object-fit:contain">
</div>
`;
}
const borderColor = '#ce1126';
const headerBg = 'linear-gradient(135deg,#b91c1c 0%,#7f1d1d 100%)';
quinielasHTML += `
<div class="quiniela-card" data-fila="${q.fila}"
style="background:#fff;border-radius:8px;padding:4px;box-shadow:0 3px 8px rgba(0,0,0,0.2);position:relative;border-left:3px solid ${borderColor};width:100%;box-sizing:border-box;display:flex;flex-direction:column">
<div style="margin-bottom:4px;padding:4px 6px;border-radius:6px;background:${headerBg};color:#fff;display:flex;align-items:center;gap:6px">
<input type="checkbox" class="checkbox-quiniela" data-fila="${q.fila}" style="width:14px;height:14px;cursor:pointer;margin:0">
<div style="font-size:9px;font-weight:800;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">
${q.nombre || q.userName}
</div>
</div>
<div>${miniQuinielaHTML}</div>
</div>
`;
});
const gridCols = participantes.length === 1 ? '1fr' : 'repeat(2,minmax(0,1fr))';
contenedor.innerHTML = `
<div style="min-height:calc(100vh - 70px);padding:72px 4px 8px 4px;box-sizing:border-box;width:100vw;margin-left:calc(-50vw + 50%);transform:translateY(-70px);background:#ffffff;font-family:Poppins,sans-serif;display:flex;flex-direction:column">
${botonesHTML}
<div style="flex:1;display:grid;grid-template-columns:${gridCols};gap:6px;box-sizing:border-box">
${quinielasHTML}
</div>
</div>
`;
const checkboxes = contenedor.querySelectorAll('.checkbox-quiniela');
checkboxes.forEach(cb => {
cb.addEventListener('change', e => {
const fila = parseInt(e.target.getAttribute('data-fila'));
if (e.target.checked) {
quinielasSeleccionadas.add(fila);
} else {
quinielasSeleccionadas.delete(fila);
}
actualizarContadoresGlobal();
});
});
document.getElementById('btn-seleccionar-todas')?.addEventListener('click', () => {
const checkboxesActuales = contenedor.querySelectorAll('.checkbox-quiniela');
const totalVisibles = checkboxesActuales.length;
const todasSeleccionadas = quinielasSeleccionadas.size === totalVisibles && totalVisibles > 0;
checkboxesActuales.forEach(cb => {
const fila = parseInt(cb.getAttribute('data-fila'));
cb.checked = !todasSeleccionadas;
if (!todasSeleccionadas) {
quinielasSeleccionadas.add(fila);
} else {
quinielasSeleccionadas.delete(fila);
}
});
actualizarContadoresGlobal();
});
// 🔒 Botones con confirmación + lock //  // 🔒 Botones con confirmación + lock // 
document.getElementById('btn-rechazar-seleccionadas')?.addEventListener('click', () => {
if (quinielasSeleccionadas.size === 0 || procesamientoEnCurso) return;
mostrarConfirmacionAccion('rechazar', quinielasSeleccionadas.size, async () => {
await adminRechazarQuinielas([...quinielasSeleccionadas]);
});
});
document.getElementById('btn-aprobar-seleccionadas')?.addEventListener('click', () => {
if (quinielasSeleccionadas.size === 0 || procesamientoEnCurso) return;
mostrarConfirmacionAccion('aprobar', quinielasSeleccionadas.size, async () => {
await adminAprobarQuinielas([...quinielasSeleccionadas]);
});
});
actualizarContadoresGlobal();
} catch (err) {
console.error('Error cargando no confirmadas', err);
contenedor.innerHTML = `
<div class="admin-error">
<p>Error al cargar quinielas no confirmadas ⚠️</p>
<button class="btn-reload" onclick="cargarAdminNoConfirmadas()">Reintentar</button>
</div>
`;
}
}
//=== Modal de confirmación para aprobar / rechazar ===// //=== Modal de confirmación para aprobar / rechazar ===//
function mostrarConfirmacionAccion(tipo, cantidad, callback) {
const config = {
rechazar: {
emoji: '🚫',
titulo: '¿Rechazar quinielas?',
mensaje: `Estás por rechazar <strong>${cantidad}</strong> quiniela${cantidad !== 1 ? 's' : ''}`,
advertencia: 'Esta acción eliminará las quinielas permanentemente.',
colorBoton: '#dc2626',
colorBorde: '#dc2626',
textoBoton: 'Sí, rechazar',
textoCancelar: 'No, mantenerlas'
},
aprobar: {
emoji: '✅',
titulo: '¿Confirmar quinielas?',
mensaje: `Estás por confirmar <strong>${cantidad}</strong> quiniela${cantidad !== 1 ? 's' : ''}`,
advertencia: 'Las quinielas se moverán a "Confirmadas" y participarán en la jornada.',
colorBoton: '#16a34a',
colorBorde: '#16a34a',
textoBoton: 'Sí, confirmar',
textoCancelar: 'Cancelar'
}
};
const cfg = config[tipo];
const modal = document.createElement('div');
modal.style.cssText = `
position: fixed; top: 0; left: 0; right: 0; bottom: 0;
background: rgba(0,0,0,0.85); z-index: 10001;
display: flex; align-items: center; justify-content: center; padding: 20px;
`;
modal.innerHTML = `
<div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
border-radius: 20px; padding: 25px; max-width: 380px; width: 100%;
box-shadow: 0 20px 60px rgba(0,0,0,0.3); border: 3px solid ${cfg.colorBorde};
text-align: center;">
<div style="font-size: 80px; margin-bottom: 15px;">${cfg.emoji}</div>
<h2 style="color: ${cfg.colorBoton}; margin: 0 0 15px 0; font-size: 24px; font-weight: 800;">
${cfg.titulo}
</h2>
<p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 10px 0;">
${cfg.mensaje}
</p>
<div style="background: #fef3c7; padding: 12px; border-radius: 10px; margin-bottom: 20px;
border-left: 4px solid #f59e0b;">
<p style="color: #92400e; font-size: 13px; margin: 0; font-weight: 600;">
⚠️ ${cfg.advertencia}
</p>
</div>
<button class="btn-confirmar-accion"
style="width: 100%; padding: 14px; margin-bottom: 10px;
background: linear-gradient(135deg, ${cfg.colorBoton} 0%, ${cfg.colorBoton}dd 100%);
color: white; border: none; border-radius: 10px;
font-size: 16px; font-weight: 700; cursor: pointer;
box-shadow: 0 4px 12px ${cfg.colorBoton}40;">
${cfg.textoBoton}
</button>
<button class="btn-cancelar-accion"
style="width: 100%; padding: 12px;
background: transparent; color: #666; border: 2px solid #ddd;
border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer;">
${cfg.textoCancelar}
</button>
</div>
`;
document.body.appendChild(modal);
modal.querySelector('.btn-confirmar-accion').addEventListener('click', () => {
modal.remove();
callback();
});
modal.querySelector('.btn-cancelar-accion').addEventListener('click', () => {
modal.remove();
});
}
//=== Esto de abajo trabaja la acción de Rechazar las quinielas ===// //=== Esto de abajo trabaja la acción de Rechazar las quinielas ===//
async function adminRechazarQuinielas(filas) {
if (!filas || filas.length === 0) return;
if (procesamientoEnCurso) return;
procesamientoEnCurso = true;
const filasAProcesar = [...filas];
const contenedor = document.getElementById('admin-por-aprobar');
try {
mostrarModalProgreso(filasAProcesar.length, 'rechazar');
const resultados = await procesarQuinielasPorLotes(filasAProcesar, 'rechazar');
resultados.forEach(({ fila }) => quinielasProcesamientoCache.marcarProcesada(fila));
cerrarModalProgreso();
// Animar y eliminar tarjetas
filasAProcesar.forEach(fila => {
const card = contenedor?.querySelector(`.quiniela-card[data-fila="${fila}"]`);
if (card) {
card.style.transition = 'all 0.3s ease';
card.style.opacity = '0';
card.style.transform = 'scale(0.9)';
setTimeout(() => card.remove(), 300);
}
quinielasSeleccionadas.delete(fila);
});
// Después de la animación, recargar la sección de no confirmadas
setTimeout(() => {
procesamientoEnCurso = false;
if (typeof cargarAdminNoConfirmadas === 'function') {
cargarAdminNoConfirmadas();
}
}, 500);
} catch (err) {
console.error('Error al rechazar quinielas:', err);
cerrarModalProgreso();
procesamientoEnCurso = false;
alert('Hubo un error al rechazar las quinielas. Refresca la página.');
}
}
//=== Esto de abajo trabaja la acción de confirmar las quinielas ===//
async function adminAprobarQuinielas(filas) {
if (!filas || filas.length === 0) return;
if (procesamientoEnCurso) return;
procesamientoEnCurso = true;
const filasAProcesar = [...filas];
const contenedor = document.getElementById('admin-por-aprobar');
try {
mostrarModalProgreso(filasAProcesar.length, 'aprobar');
const resultados = await procesarQuinielasPorLotes(filasAProcesar, 'aprobar');
resultados.forEach(({ fila }) => quinielasProcesamientoCache.marcarProcesada(fila));
cerrarModalProgreso();
// Animar y eliminar tarjetas
filasAProcesar.forEach(fila => {
const card = contenedor?.querySelector(`.quiniela-card[data-fila="${fila}"]`);
if (card) {
card.style.transition = 'all 0.3s ease';
card.style.opacity = '0';
card.style.transform = 'scale(0.9)';
setTimeout(() => card.remove(), 300);
}
quinielasSeleccionadas.delete(fila);
});
// Después de la animación, cargar confirmadas y cambiar de pestaña
setTimeout(() => {
procesamientoEnCurso = false;
if (typeof cargarAdminConfirmadas === 'function') {
cargarAdminConfirmadas();
}
setTimeout(() => {
const btnConfirmadas = document.querySelector('[data-admin-section="aprobadas"]');
if (btnConfirmadas) btnConfirmadas.click();
}, 100);
}, 500);
} catch (err) {
console.error('Error al aprobar quinielas:', err);
cerrarModalProgreso();
procesamientoEnCurso = false;
alert('Hubo un error al confirmar las quinielas. Refresca la página.');
}
}
//=== Esto de abajo trabaja la sección de confirmadas en administrador ===//
async function cargarAdminConfirmadas() {
const contenedor = document.getElementById('admin-aprobadas');
if (!contenedor) {
console.error('No existe #admin-aprobadas');
return;
}
contenedor.innerHTML = `
<div class="admin-loading admin-loading--quinielas-confirmadas">
<div class="admin-loading__card">
<div class="admin-loading__icon">📄</div>
<h2>Cargando quinielas confirmadas...</h2>
<p>Estamos preparando la lista de quinielas confirmadas, por favor espera unos segundos.</p>
<div class="admin-loading__bar">
<div class="admin-loading__bar-fill"></div>
</div>
</div>
</div>
`;
try {
const resp = await fetch(`${GOOGLE_SHEETS_ADMIN_URL}?tipo=confirmadas&t=${Date.now()}`);
const data = await resp.json();
const participantes = data.participantes || [];
if (!participantes.length) {
contenedor.innerHTML = `
<div style="background:#ffffff;min-height:calc(100vh - 70px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;font-family:Poppins,sans-serif;width:100vw;margin-left:calc(-50vw + 50%);position:relative;transform:translateY(-90px)">
<div style="font-size:120px;margin-bottom:30px;filter:drop-shadow(0 8px 16px rgba(0,0,0,0.4))">🕓</div>
<h2 style="color:#065f46;font-size:28px;font-weight:900;text-align:center;margin:0 0 16px 0;line-height:1.3">
Todavía no hay quinielas confirmadas
</h2>
<p style="color:#047857;font-size:16px;text-align:center;max-width:420px;line-height:1.6;margin:0;font-weight:500">
En cuanto confirmes las quinielas, se mostrarán en esta sección.
</p>
</div>
`;
return;
}
let quinielasHTML = '';
participantes.forEach(q => {
let miniQuinielaHTML = '';
const picksArray = q.picks || [];
for (let i = 0; i < 9; i++) {
const match = (QuinielaJ1?.matchesData || [])[i];
if (!match) continue;
const raw = picksArray[i] || '';
let sel = '-';
if (raw === '1' || raw === 'L') sel = 'L';
else if (raw === '2' || raw === 'E') sel = 'E';
else if (raw === '3' || raw === 'V') sel = 'V';
else if (raw) sel = raw;
miniQuinielaHTML += `
<div style="display:grid;grid-template-columns:16px 1fr 20px 1fr 16px;align-items:center;gap:2px;padding:2px 3px;background:#f8f9fa;border-radius:3px;margin-bottom:2px">
<img src="${match.imgL}" style="width:16px;height:16px;border-radius:50%;object-fit:contain">
<div style="font-size:7px;font-weight:700;color:#333;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${match.local}</div>
<div style="background:#fff;color:#111;border-radius:999px;font-size:7px;font-weight:900;border:1px solid #e5e7eb;width:18px;height:18px;display:flex;align-items:center;justify-content:center;margin:0 auto">${sel}</div>
<div style="font-size:7px;font-weight:700;color:#333;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${match.visit}</div>
<img src="${match.imgV}" style="width:16px;height:16px;border-radius:50%;object-fit:contain">
</div>
`;
}
const estaEnLista = !!q.estaEnLista;
const folio = q.folio || 'Sin folio';
const borderColor = estaEnLista ? '#16a34a' : '#ce1126';
const headerBg = estaEnLista ? 'linear-gradient(135deg,#16a34a 0%,#15803d 100%)' : 'linear-gradient(135deg,#b91c1c 0%,#7f1d1d 100%)';
const estadoTexto = estaEnLista ? `Jugando ${folio}` : 'No Jugando';
const estadoColor = estaEnLista ? '#16a34a' : '#ce1126';
quinielasHTML += `
<div class="quiniela-card" data-fila="${q.fila}"
style="background:#fff;border-radius:12px;padding:10px;box-shadow:0 8px 20px rgba(0,0,0,0.35);position:relative;border-left:4px solid ${borderColor};width:100%;box-sizing:border-box;display:flex;flex-direction:column">
<div style="position:absolute;top:6px;right:6px;padding:3px 10px;border-radius:999px;font-size:9px;font-weight:700;background:#fef3c7;color:${estadoColor};border:1px solid ${estadoColor}">
${estadoTexto}
</div>
<div style="margin-bottom:6px;padding:6px 8px;border-radius:8px;background:${headerBg};color:#fff;display:flex;flex-direction:column;gap:2px">
<div style="font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
${q.nombre || q.userName}
</div>
<div style="font-size:9px;font-weight:600;opacity:0.95">Vendedor: ${q.vendedor || '-'}</div>
<div style="font-size:8px;opacity:0.9">${q.fecha || q.date}</div>
</div>
<div style="margin-bottom:6px;max-height:220px;overflow-y:auto">
${miniQuinielaHTML}
</div>
<div style="text-align:center;padding:6px;border-radius:8px;background:rgba(0,0,0,0.2);color:#fff;font-size:10px;font-weight:700">
Puntos: ${q.puntos || 0}
</div>
</div>
`;
});
const headerHTML = `
<div style="position:sticky;top:0;background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);padding:10px 12px;display:flex;align-items:center;justify-content:center;z-index:100;border-radius:8px 8px 0 0;box-shadow:0 2px 8px rgba(0,0,0,0.15);margin-bottom:6px">
<div style="color:#fff;font-size:13px;font-weight:800;text-align:center;font-family:Poppins,sans-serif;display:flex;align-items:center;gap:6px">
<span>✅</span>
<span>Total de quinielas confirmadas</span>
<span style="background:rgba(255,255,255,0.25);padding:3px 10px;border-radius:12px;font-size:14px">
${participantes.length}
</span>
</div>
</div>
`;
const gridCols = participantes.length === 1 ? '1fr' : 'repeat(2,minmax(0,1fr))';
contenedor.innerHTML = `
<div style="min-height:calc(100vh - 70px);padding:72px 4px 8px 4px;box-sizing:border-box;width:100vw;margin-left:calc(-50vw + 50%);transform:translateY(-70px);background:#ffffff;font-family:Poppins,sans-serif;display:flex;flex-direction:column">
${headerHTML}
<div style="flex:1;display:grid;grid-template-columns:${gridCols};gap:6px;box-sizing:border-box">
${quinielasHTML}
</div>
</div>
`;
} catch (err) {
console.error('Error cargando confirmadas', err);
contenedor.innerHTML = `
<div class="admin-error">
<p>Error al cargar quinielas confirmadas ⚠️</p>
<button class="btn-reload" onclick="cargarAdminConfirmadas()">Reintentar</button>
</div>
`;
}
}
//=== Esto de abajo trabaja la sección de Jugando en administrador ===//
async function cargarAdminJugando() {
const contenedor = document.getElementById('admin-jugando');
if (!contenedor) return;
contenedor.innerHTML = `
<div class="admin-loading admin-loading--quinielas-jugando">
<div class="admin-loading__card">
<div class="admin-loading__icon">📄</div>
<h2>Cargando quinielas jugando...</h2>
<p>Estamos cargando las quinielas, espera un momento.</p>
<div class="admin-loading__bar">
<div class="admin-loading__bar-fill"></div>
</div>
</div>
</div>
`;
try {
const resp = await fetch(`${GOOGLE_SHEETS_URL}?tipo=lista&t=${Date.now()}`);
const data = await resp.json();
const VENDEDOR = 'Juan de Dios';
const participantes = data.participantes.filter(q => {
return q.vendedor.toLowerCase() === VENDEDOR.toLowerCase();
});
participantes.sort((a, b) => (b.puntos || 0) - (a.puntos || 0));
if (!participantes.length) {
contenedor.innerHTML = `
<div style="background:#ffffff;min-height:calc(100vh - 70px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;font-family:Poppins,sans-serif;width:100vw;margin-left:calc(-50vw + 50%);position:relative;transform:translateY(-90px)">
<div style="font-size:120px;margin-bottom:30px;filter:drop-shadow(0 8px 16px rgba(0,0,0,0.4))">🕓</div>
<h2 style="color:#ea580c;font-size:28px;font-weight:900;text-align:center;margin:0 0 16px 0;line-height:1.3">
Todavía no hay quinielas jugando
</h2>
<p style="color:#f97316;font-size:16px;text-align:center;max-width:420px;line-height:1.6;margin:0;font-weight:500">
Las quinielas que están jugando para la jornada aparecerán aquí.
</p>
</div>
`;
return;
}
let quinielasHTML = '';
participantes.forEach(q => {
let miniQuinielaHTML = '';
const picksArray = q.picks || [];
for (let i = 0; i < 9; i++) {
const match = QuinielaJ1.matchesData[i];
const raw = picksArray[i] || '';
let sel = '-';
if (raw === '1' || raw === 'L') sel = 'L';
else if (raw === '2' || raw === 'E') sel = 'E';
else if (raw === '3' || raw === 'V') sel = 'V';
else if (raw) sel = raw;
miniQuinielaHTML += `
<div style="display:grid;grid-template-columns:16px 1fr 20px 1fr 16px;align-items:center;gap:2px;padding:2px 3px;background:#f8f9fa;border-radius:3px;margin-bottom:2px">
<img src="${match.imgL}" style="width:16px;height:16px;border-radius:50%;object-fit:contain">
<div style="font-size:7px;font-weight:700;color:#333;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${match.local}</div>
<div style="background:#fff;color:#111;border-radius:999px;font-size:7px;font-weight:900;border:1px solid #e5e7eb;width:18px;height:18px;display:flex;align-items:center;justify-content:center;margin:0 auto">${sel}</div>
<div style="font-size:7px;font-weight:700;color:#333;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${match.visit}</div>
<img src="${match.imgV}" style="width:16px;height:16px;border-radius:50%;object-fit:contain">
</div>
`;
}
const folio = q.folio || 'Sin folio';
const borderColor = '#16a34a';
const headerBg = 'linear-gradient(135deg,#16a34a 0%,#15803d 100%)';
quinielasHTML += `
<div class="quiniela-card" data-fila="${q.fila}"
style="background:#fff;border-radius:12px;padding:10px;box-shadow:0 8px 20px rgba(0,0,0,0.35);position:relative;border-left:4px solid ${borderColor};width:100%;box-sizing:border-box;display:flex;flex-direction:column">
<div style="position:absolute;top:6px;right:6px;padding:3px 10px;border-radius:999px;font-size:9px;font-weight:700;background:#fef3c7;color:${borderColor};border:1px solid ${borderColor}">
Jugando
</div>
<div style="margin-bottom:6px;padding:6px 8px;border-radius:8px;background:${headerBg};color:#fff;display:flex;flex-direction:column;gap:2px">
<div style="font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
${q.nombre || q.userName}
</div>
<div style="font-size:9px;font-weight:600;opacity:0.95">Vendedor: ${q.vendedor || '-'}</div>
<div style="font-size:9px;font-weight:600;opacity:0.95">Folio: ${folio}</div>
<div style="font-size:8px;opacity:0.9">${q.fecha || q.date}</div>
</div>
<div style="margin-bottom:6px;max-height:220px;overflow-y:auto">
${miniQuinielaHTML}
</div>
<div style="text-align:center;padding:6px;border-radius:8px;background:rgba(0,0,0,0.2);color:#fff;font-size:10px;font-weight:700">
Puntos: ${q.puntos || 0}
</div>
</div>
`;
});
const headerHTML = `
<div style="position:sticky;top:0;background:linear-gradient(135deg,#ea580c 0%,#c2410c 100%);padding:10px 12px;display:flex;align-items:center;justify-content:center;z-index:100;border-radius:8px 8px 0 0;box-shadow:0 2px 8px rgba(0,0,0,0.15);margin-bottom:6px">
<div style="color:#fff;font-size:13px;font-weight:800;text-align:center;font-family:Poppins,sans-serif;display:flex;align-items:center;gap:6px">
<span>🏆</span>
<span>Total de quinielas jugando</span>
<span style="background:rgba(255,255,255,0.25);padding:3px 10px;border-radius:12px;font-size:14px">
${participantes.length}
</span>
</div>
</div>
`;
const gridCols = participantes.length === 1 ? '1fr' : 'repeat(2,minmax(0,1fr))';
contenedor.innerHTML = `
<div style="min-height:calc(100vh - 70px);padding:72px 4px 8px 4px;box-sizing:border-box;width:100vw;margin-left:calc(-50vw + 50%);transform:translateY(-70px);background:#ffffff;font-family:Poppins,sans-serif;display:flex;flex-direction:column">
${headerHTML}
<div style="flex:1;display:grid;grid-template-columns:${gridCols};gap:6px;box-sizing:border-box">
${quinielasHTML}
</div>
</div>
`;
} catch (err) {
console.error('Error cargando jugando', err);
contenedor.innerHTML = `
<div class="admin-error">
<p>Error al cargar quinielas en juego ⚠️</p>
<button class="btn-reload" onclick="cargarAdminJugando()">Reintentar</button>
</div>
`;
}
}
//=== Esto de abajo trabaja la navegación de administrador ===//
function inicializarNavegacionAdmin() {
const subNavAdmin = document.querySelectorAll('#sub-nav-administrador .sub-nav__item');
const adminSections = document.querySelectorAll('#view-administrador .app-main');
subNavAdmin.forEach(button => {
button.addEventListener('click', function() {
const targetSection = this.getAttribute('data-admin-section');
subNavAdmin.forEach(btn => btn.classList.remove('sub-nav__item--active'));
adminSections.forEach(section => section.classList.remove('active'));
this.classList.add('sub-nav__item--active');
const activeSection = document.getElementById(`admin-${targetSection}`);
if (activeSection) {
activeSection.classList.add('active');
}
if (targetSection === 'por-aprobar') {
cargarAdminNoConfirmadas();
} else if (targetSection === 'aprobadas') {
cargarAdminConfirmadas();
} else if (targetSection === 'jugando') {
cargarAdminJugando();
}
});
});
}
//=== Esto de abajo trabaja en activar el menú administrador ===//
document.addEventListener('DOMContentLoaded', function() {
const navButtons = document.querySelectorAll('.bottom-nav__item[data-view="view-administrador"]');
navButtons.forEach(btn => {
btn.addEventListener('click', () => {
setTimeout(() => {
inicializarNavegacionAdmin();
cargarAdminNoConfirmadas();
}, 100);
});
});
});
//===Esto de abajo trabaja "Vendedor (Depende) del inicio" ===// //===Esto de abajo trabaja "Vendedor (Depende) del inicio" ===//
window.addEventListener('DOMContentLoaded', function() {
setTimeout(function() {
const loadingScreen = document.getElementById('loading-screen');
if(loadingScreen){
loadingScreen.classList.add('fade-out');
}
}, 5000);
});
// Elimina el Scroll completamante de la quiniela //
document.addEventListener('DOMContentLoaded', function() {
const quinielaView = document.querySelector('#view-quiniela');
const wrapper = document.querySelector('.quiniela-pro-wrapper');
const container = document.querySelector('.match-container-q');
if (quinielaView && wrapper && container) {
const observer = new MutationObserver(function() {
if (quinielaView.classList.contains('view--active')) {
document.body.style.overflow = 'hidden';
wrapper.style.overflow = 'hidden';
container.style.overflow = 'hidden';
}
});
observer.observe(quinielaView, { attributes: true, attributeFilter: ['class'] });
}
});
// Cambios para visualizar mejor los navegadores //
function detectarNavegadorYDispositivo() {
const ua = navigator.userAgent;
const isBrave = navigator.brave && typeof navigator.brave.isBrave === 'function';
const isIPhone = /iPhone/i.test(ua);
const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
if (isBrave) {
document.body.classList.add('browser-brave');
} else if (isIPhone) {
document.body.classList.add('device-iphone');
} else if (isSafari) {
document.body.classList.add('browser-safari');
}
}
detectarNavegadorYDispositivo();